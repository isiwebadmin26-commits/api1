import {
  fetchAllSheetTabs,
  findMatchingSheetName,
  readSheetValues,
  getSpreadsheetUrl,
} from "./google-sheets";
import { downloadDriveFile } from "./google-drive";
import { sendEmail, getCareerRecipients, EmailAttachment } from "./email";
import { parseSheetDate, formatDateKolkata } from "./analytics-report";

export interface CareerCandidate {
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  resumeName: string;
  driveLink: string;
  driveId: string;
  coverLetter: string;
  date: string;
}

/**
 * Builds the HTML template for the Monthly Career Digest.
 * Faithful to Apps Script buildMonthlyCareerEmailHtml.
 */
export function buildMonthlyCareerEmailHtml(
  monthLabel: string,
  candidates: CareerCandidate[],
  sheetUrl: string
): string {
  const candidateRows = candidates
    .map(function (c, idx) {
      const resumeCell = c.driveLink
        ? '<a href="' +
          c.driveLink +
          '" target="_blank" style="color:#003380;font-weight:bold;text-decoration:none;">📄 View Resume</a>'
        : '<span style="color:#94a3b8;">Attached to Email</span>';

      return (
        '<tr style="background:' +
        (idx % 2 === 0 ? "#ffffff" : "#f8fafc") +
        ';">' +
        '<td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#0f172a;font-size:13px;">' +
        c.name +
        "</td>" +
        '<td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;color:#003380;font-weight:600;font-size:12px;">' +
        c.jobTitle +
        "</td>" +
        '<td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:12px;"><a href="mailto:' +
        c.email +
        '" style="color:#0284c7;text-decoration:none;">' +
        c.email +
        "</a><br>" +
        c.phone +
        "</td>" +
        '<td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:11px;">' +
        c.date +
        "</td>" +
        '<td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;text-align:center;">' +
        resumeCell +
        "</td>" +
        "</tr>"
      );
    })
    .join("");

  return [
    "<!DOCTYPE html>",
    "<html>",
    '<head><meta charset="utf-8"></head>',
    '<body style="font-family:Segoe UI,Arial,sans-serif;background-color:#f1f5f9;margin:0;padding:25px 15px;">',
    ' <div style="max-width:700px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.06);border:1px solid #e2e8f0;">',
    '  <div style="background:linear-gradient(135deg,#1e1b4b 0%,#4338ca 100%);padding:30px 25px;color:#ffffff;">',
    '   <div style="display:inline-block;background:#6366f1;color:#ffffff;font-size:11px;font-weight:800;padding:4px 12px;border-radius:20px;letter-spacing:0.06em;margin-bottom:10px;">MONTHLY TALENT PIPELINE</div>',
    '   <h2 style="margin:0;font-size:22px;font-weight:800;">ISI Career Applications & Resumes</h2>',
    '   <p style="margin:6px 0 0 0;color:#c7d2fe;font-size:13px;">Compiled talent applications for ' +
      monthLabel +
      " • Total Applicants: <strong>" +
      candidates.length +
      "</strong></p>",
    "  </div>",
    '  <div style="padding:25px;">',
    '   <p style="color:#475569;font-size:14px;margin:0 0 20px 0;">Below is the consolidated list of candidates who applied for open positions at ISI Security over the past month. Candidate resume files are attached directly to this email and archived in Google Drive.</p>',
    '   <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">',
    "    <thead>",
    '     <tr style="background:#0f172a;color:#ffffff;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">',
    '      <th style="padding:10px;text-align:left;">Candidate</th>',
    '      <th style="padding:10px;text-align:left;">Position</th>',
    '      <th style="padding:10px;text-align:left;">Contact</th>',
    '      <th style="padding:10px;text-align:left;">Date</th>',
    '      <th style="padding:10px;text-align:center;">Resume</th>',
    "     </tr>",
    "    </thead>",
    "    <tbody>" + candidateRows + "</tbody>",
    "   </table>",
    '   <div style="text-align:center;margin-top:25px;">',
    '    <a href="' +
      sheetUrl +
      '" style="background:#003380;color:#ffffff;text-decoration:none;padding:12px 25px;border-radius:8px;font-weight:700;font-size:13px;display:inline-block;">Open Career Applications Sheet</a>',
    "   </div>",
    "  </div>",
    '  <div style="background:#f8fafc;padding:18px 25px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;">',
    "   &copy; " +
      new Date().getFullYear() +
      " Industrial Security & Intelligence (India) Pvt Ltd.<br>",
    "   Confidential Notification • Distributed to authorized ISI team members only.",
    "  </div>",
    " </div>",
    "</body>",
    "</html>",
  ].join("\n");
}

/**
 * Executes forwardMonthlyCareerApplications migration.
 * Preserves exact Apps Script filtering:
 * now = new Date()
 * thirtyDaysAgo = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000)
 */
export async function runCareerReport({ dryRun = false }: { dryRun?: boolean }) {
  console.log("🚀 Starting Monthly Career Applications Digest Forwarder...");

  const allTabs = await fetchAllSheetTabs();
  const careerTab =
    findMatchingSheetName("CareerApplications", allTabs) ||
    findMatchingSheetName("Career_Applications", allTabs);

  if (!careerTab) {
    throw new Error("CareerApplications sheet not found in main spreadsheet.");
  }

  const data = await readSheetValues(careerTab.title);
  if (!data || data.length < 2) {
    return {
      success: true,
      report: "career",
      dryRun,
      candidatesCount: 0,
      message: "No career applications found.",
    };
  }

  const headers = data[0] as string[];
  const nameCol = headers.indexOf("Name");
  const emailCol = headers.indexOf("Email");
  const phoneCol = headers.indexOf("Phone");
  const jobTitleCol = headers.indexOf("Job Title");
  const resumeNameCol = headers.indexOf("Resume File Name");
  const driveLinkCol = headers.indexOf("Resume Drive Link");
  const driveIdCol = headers.indexOf("Drive File ID");
  const coverCol = headers.indexOf("Cover Letter");
  let tsCol = headers.indexOf("Timestamp");
  if (tsCol === -1) tsCol = headers.indexOf("timestamp");

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);

  const candidates: CareerCandidate[] = [];
  const attachments: EmailAttachment[] = [];
  let totalAttachmentSize = 0;
  const MAX_TOTAL_ATTACHMENT_BYTES = 20 * 1024 * 1024; // 20 MB safety limit for Gmail (max 25MB)

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const ts = parseSheetDate(row[tsCol]);

    // Filter by applications submitted in last 31 days
    if (ts && ts >= thirtyDaysAgo) {
      const candidate: CareerCandidate = {
        name: row[nameCol] || "Applicant",
        email: row[emailCol] || "",
        phone: row[phoneCol] || "",
        jobTitle: row[jobTitleCol] || "General Role",
        resumeName: row[resumeNameCol] || "Resume.pdf",
        driveLink: (driveLinkCol !== -1 ? row[driveLinkCol] : "") || "",
        driveId: (driveIdCol !== -1 ? row[driveIdCol] : "") || "",
        coverLetter: row[coverCol] || "",
        date: formatDateKolkata(ts, "dd-MMM-yyyy"),
      };

      // Attempt to attach resume file from Drive
      if (candidate.driveId && !dryRun) {
        try {
          const downloaded = await downloadDriveFile(candidate.driveId);
          if (downloaded) {
            const size = downloaded.size;
            if (totalAttachmentSize + size < MAX_TOTAL_ATTACHMENT_BYTES) {
              const safeName =
                candidate.name.replace(/[^a-zA-Z0-9_\s]/g, "") +
                "_" +
                (candidate.resumeName || "Resume.pdf");
              attachments.push({
                filename: safeName,
                content: downloaded.buffer,
                contentType: downloaded.mimeType,
              });
              totalAttachmentSize += size;
            } else {
              console.warn(
                "Attachment size threshold reached. Candidate resume linked via Drive: " +
                  candidate.name
              );
            }
          }
        } catch (fileErr: any) {
          console.error(
            "Could not fetch Drive file ID: " + candidate.driveId,
            fileErr.toString()
          );
        }
      }

      candidates.push(candidate);
    }
  }

  if (candidates.length === 0) {
    return {
      success: true,
      report: "career",
      dryRun,
      candidatesCount: 0,
      message: "ℹ️ No career applications recorded in the past 30 days.",
    };
  }

  // Build Monthly Career Digest HTML
  const monthLabel = formatDateKolkata(now, "MMMM yyyy");
  const sheetUrl = getSpreadsheetUrl();
  const emailHtml = buildMonthlyCareerEmailHtml(monthLabel, candidates, sheetUrl);
  const subject =
    "📁 [Career Applications Lead Generation] Monthly Resumes Digest – " +
    monthLabel +
    " (" +
    candidates.length +
    " Applicants)";

  if (!dryRun) {
    const recipients = getCareerRecipients();
    await sendEmail({
      to: recipients,
      subject,
      html: emailHtml,
      attachments,
      from: process.env.EMAIL_FROM || "ISI HR & Talent Acquisition Engine <info@isisecurity.in>",
    });
    console.log(
      "✅ Successfully sent Monthly Career Applications Digest (" +
        candidates.length +
        " applicants, " +
        attachments.length +
        " attached resumes) to: " +
        recipients.join(", ")
    );
  }

  return {
    success: true,
    report: "career",
    dryRun,
    candidatesCount: candidates.length,
    attachmentsCount: attachments.length,
    month: monthLabel,
    candidates: candidates.map((c) => ({
      name: c.name,
      jobTitle: c.jobTitle,
      email: c.email,
      phone: c.phone,
      date: c.date,
      hasDriveId: Boolean(c.driveId),
    })),
    ...(dryRun ? { html: emailHtml, subject } : {}),
  };
}
