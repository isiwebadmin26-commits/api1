import { sendEmail } from "./email";
import { getSpreadsheetUrl } from "./google-sheets";

function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function emailWrapper(title: string, subtitle: string, contentHtml: string): string {
  const sheetUrl = getSpreadsheetUrl();
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="620" border="0" cellspacing="0" cellpadding="0" style="max-width: 620px; width: 100%; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          <!-- HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #0b192c 0%, #1e3e62 100%); padding: 28px 24px; text-align: left;">
              <div style="font-size: 11px; font-weight: 800; color: #60a5fa; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px;">
                ISI Security &bull; Operations Intelligence
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; line-height: 1.2;">
                ${escapeHtml(title)}
              </h1>
              <div style="font-size: 13px; color: #94a3b8; margin-top: 6px;">
                ${subtitle}
              </div>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding: 24px;">
              ${contentHtml}

              <div style="text-align: center; margin-top: 28px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                <a href="${escapeHtml(sheetUrl)}" target="_blank" style="background: #003380; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 700; font-size: 13px; display: inline-block;">
                  Open Live Master Spreadsheet &rarr;
                </a>
              </div>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.6;">
              &copy; 2026 Industrial Security & Intelligence (India) Pvt Ltd.<br>
              Automated Operations Report &bull; Delivered to Authorized Leadership
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// 1. DAILY LEADS EMAIL
export async function sendDailyLeadsEmail(data: any) {
  const subject = `[ISI Security] Daily Leads Report - ${data.date}`;
  const forms = data.byForm || {};
  const pages = data.byPage || {};

  const formRows = Object.entries(forms).map(([k, v]) => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 8px 12px; font-size: 13px; color: #0f172a; font-weight: 600;">${escapeHtml(k)}</td>
      <td style="padding: 8px 12px; font-size: 13px; font-weight: 700; text-align: right; color: #059669;">${v}</td>
    </tr>
  `).join("");

  const pageRows = Object.entries(pages).map(([k, v]) => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 8px 12px; font-size: 13px; color: #0f172a; font-family: monospace;">${escapeHtml(k)}</td>
      <td style="padding: 8px 12px; font-size: 13px; font-weight: 700; text-align: right; color: #6366f1;">${v}</td>
    </tr>
  `).join("");

  const content = `
    <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
      <tr>
        <td width="48%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center;">
          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Direct Leads</div>
          <div style="font-size: 26px; font-weight: 800; color: #059669; margin-top: 4px;">${data.totalLeads || 0}</div>
        </td>
        <td width="4%"></td>
        <td width="48%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center;">
          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Total Submissions</div>
          <div style="font-size: 26px; font-weight: 800; color: #2563eb; margin-top: 4px;">${data.totalEnquiries || 0}</div>
        </td>
      </tr>
    </table>

    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 18px;">
      <div style="background: #f8fafc; padding: 10px 14px; font-size: 12px; font-weight: 800; color: #1e293b; border-bottom: 1px solid #e2e8f0; text-transform: uppercase;">
        Submissions by Form Category
      </div>
      <table width="100%" cellspacing="0" cellpadding="0">
        ${formRows || '<tr><td style="padding: 12px; color: #64748b; text-align: center;">No submissions recorded</td></tr>'}
      </table>
    </div>

    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background: #f8fafc; padding: 10px 14px; font-size: 12px; font-weight: 800; color: #1e293b; border-bottom: 1px solid #e2e8f0; text-transform: uppercase;">
        Top Landing Pages Captured
      </div>
      <table width="100%" cellspacing="0" cellpadding="0">
        ${pageRows || '<tr><td style="padding: 12px; color: #64748b; text-align: center;">No page activity recorded</td></tr>'}
      </table>
    </div>
  `;

  const html = emailWrapper("Daily Leads Report", `Date: ${data.date}`, content);
  return sendEmail({ subject, html });
}

// 2. DAILY TRAFFIC EMAIL
export async function sendDailyTrafficEmail(data: any) {
  const subject = `[ISI Security] Daily Traffic Report - ${data.date}`;
  const pages = (data.topPages || []).map((p: any) => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 8px 12px; font-size: 13px; color: #0f172a; font-family: monospace;">${escapeHtml(p.path)}</td>
      <td style="padding: 8px 12px; font-size: 13px; font-weight: 700; text-align: right; color: #6366f1;">${p.views}</td>
      <td style="padding: 8px 12px; font-size: 13px; text-align: right; color: #64748b;">${p.visitors}</td>
    </tr>
  `).join("");

  const sources = (data.sources || []).map((s: any) => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 8px 12px; font-size: 13px; color: #0f172a; font-weight: 600;">${escapeHtml(s.source)}</td>
      <td style="padding: 8px 12px; font-size: 13px; font-weight: 700; text-align: right; color: #2563eb;">${s.count}</td>
    </tr>
  `).join("");

  const content = `
    <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
      <tr>
        <td width="48%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center;">
          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Unique Visitors</div>
          <div style="font-size: 26px; font-weight: 800; color: #6366f1; margin-top: 4px;">${data.visitors || 0}</div>
        </td>
        <td width="4%"></td>
        <td width="48%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center;">
          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Total Sessions</div>
          <div style="font-size: 26px; font-weight: 800; color: #2563eb; margin-top: 4px;">${data.sessions || 0}</div>
        </td>
      </tr>
    </table>

    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 18px;">
      <div style="background: #f8fafc; padding: 10px 14px; font-size: 12px; font-weight: 800; color: #1e293b; border-bottom: 1px solid #e2e8f0; text-transform: uppercase;">
        Top Visited Pages
      </div>
      <table width="100%" cellspacing="0" cellpadding="0">
        <thead>
          <tr style="background:#f1f5f9; font-size: 11px; color: #64748b;">
            <th style="padding:6px 12px; text-align:left;">Page</th>
            <th style="padding:6px 12px; text-align:right;">Views</th>
            <th style="padding:6px 12px; text-align:right;">Visitors</th>
          </tr>
        </thead>
        <tbody>${pages}</tbody>
      </table>
    </div>

    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background: #f8fafc; padding: 10px 14px; font-size: 12px; font-weight: 800; color: #1e293b; border-bottom: 1px solid #e2e8f0; text-transform: uppercase;">
        Acquisition Sources
      </div>
      <table width="100%" cellspacing="0" cellpadding="0">
        <thead>
          <tr style="background:#f1f5f9; font-size: 11px; color: #64748b;">
            <th style="padding:6px 12px; text-align:left;">Channel</th>
            <th style="padding:6px 12px; text-align:right;">Hits</th>
          </tr>
        </thead>
        <tbody>${sources}</tbody>
      </table>
    </div>
  `;

  const html = emailWrapper("Daily Traffic Report", `Date: ${data.date}`, content);
  return sendEmail({ subject, html });
}

// 3. DAILY STATS & KPIS EMAIL
export async function sendDailyStatsEmail(data: any) {
  const subject = `[ISI Security] Daily Stats & KPIs Report - ${data.date}`;
  const kpis = data.kpis || {};
  const comp = data.comparison || {};

  const content = `
    <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
      <tr>
        <td width="23%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 10px; font-weight: 700; color: #64748b;">VISITORS</div>
          <div style="font-size: 20px; font-weight: 800; color: #1e293b; margin-top: 2px;">${kpis.visitors || 0}</div>
          <div style="font-size: 10px; font-weight: 700; color: ${comp.visitorsDelta?.startsWith('+') ? '#059669' : '#dc2626'};">${comp.visitorsDelta || '0%'}</div>
        </td>
        <td width="2%"></td>
        <td width="23%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 10px; font-weight: 700; color: #64748b;">SESSIONS</div>
          <div style="font-size: 20px; font-weight: 800; color: #1e293b; margin-top: 2px;">${kpis.sessions || 0}</div>
          <div style="font-size: 10px; font-weight: 700; color: ${comp.sessionsDelta?.startsWith('+') ? '#059669' : '#dc2626'};">${comp.sessionsDelta || '0%'}</div>
        </td>
        <td width="2%"></td>
        <td width="23%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 10px; font-weight: 700; color: #64748b;">LEADS</div>
          <div style="font-size: 20px; font-weight: 800; color: #059669; margin-top: 2px;">${kpis.leads || 0}</div>
          <div style="font-size: 10px; font-weight: 700; color: #64748b;">${comp.leadsDelta || '0%'}</div>
        </td>
        <td width="2%"></td>
        <td width="23%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 10px; font-weight: 700; color: #64748b;">SUBMISSIONS</div>
          <div style="font-size: 20px; font-weight: 800; color: #2563eb; margin-top: 2px;">${kpis.enquiries || 0}</div>
          <div style="font-size: 10px; font-weight: 700; color: ${comp.enquiriesDelta?.startsWith('+') ? '#059669' : '#dc2626'};">${comp.enquiriesDelta || '0%'}</div>
        </td>
      </tr>
    </table>

    ${data.trend?.chartUrl ? `
    <div style="margin-bottom: 20px; text-align: center; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #ffffff;">
      <div style="font-size: 11px; font-weight: 800; color: #64748b; margin-bottom: 8px; text-transform: uppercase;">24-Hour Traffic Trend</div>
      <img src="${escapeHtml(data.trend.chartUrl)}" alt="24-Hour Trend" style="max-width: 100%; height: auto; border-radius: 4px;" />
    </div>` : ''}
  `;

  const html = emailWrapper("Daily Stats & KPIs Report", `Date: ${data.date}`, content);
  return sendEmail({ subject, html });
}

// 4. DAILY PENDING FOLLOW-UP EMAIL
export async function sendDailyPendingFollowupEmail(data: any) {
  const subject = `[ISI Security] Daily Pending Follow-up Report - ${data.date} (${data.count} Leads)`;
  const leads = (data.pendingFollowups || []).map((lead: any) => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 10px 12px; font-size: 13px; font-weight: 700; color: #0f172a;">${escapeHtml(lead.name)}</td>
      <td style="padding: 10px 12px; font-size: 13px; color: #2563eb;">${escapeHtml(lead.email || '-')}</td>
      <td style="padding: 10px 12px; font-size: 13px; color: #475569;">${escapeHtml(lead.phone || '-')}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #059669; font-weight: 600;">${escapeHtml(lead.category || '-')}</td>
    </tr>
  `).join("");

  const content = `
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 20px;">
      <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Pending Follow-up Actions Required</div>
      <div style="font-size: 28px; font-weight: 800; color: ${data.count > 0 ? '#dc2626' : '#059669'}; margin-top: 4px;">
        ${data.count} ${data.count === 1 ? 'Lead' : 'Leads'}
      </div>
    </div>

    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background: #f8fafc; padding: 10px 14px; font-size: 12px; font-weight: 800; color: #1e293b; border-bottom: 1px solid #e2e8f0; text-transform: uppercase;">
        Actionable Lead Inquiries
      </div>
      <table width="100%" cellspacing="0" cellpadding="0">
        <thead>
          <tr style="background:#f1f5f9; font-size: 11px; color: #64748b;">
            <th style="padding:8px 12px; text-align:left;">Name</th>
            <th style="padding:8px 12px; text-align:left;">Email</th>
            <th style="padding:8px 12px; text-align:left;">Phone</th>
            <th style="padding:8px 12px; text-align:left;">Category</th>
          </tr>
        </thead>
        <tbody>
          ${leads || '<tr><td colspan="4" style="padding: 16px; color: #64748b; text-align: center;">Zero pending leads requiring follow-up. All clear!</td></tr>'}
        </tbody>
      </table>
    </div>
  `;

  const html = emailWrapper("Daily Pending Follow-up Report", `Date: ${data.date}`, content);
  return sendEmail({ subject, html });
}

// 5. WEEKLY TRAFFIC EMAIL
export async function sendWeeklyTrafficEmail(data: any) {
  const subject = `[ISI Security] Weekly Traffic Report - ${data.period}`;
  const pages = (data.topPages || []).slice(0, 8).map((p: any) => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 8px 12px; font-size: 13px; color: #0f172a; font-family: monospace;">${escapeHtml(p.path)}</td>
      <td style="padding: 8px 12px; font-size: 13px; font-weight: 700; text-align: right; color: #6366f1;">${p.views}</td>
      <td style="padding: 8px 12px; font-size: 13px; text-align: right; color: #64748b;">${p.visitors}</td>
    </tr>
  `).join("");

  const content = `
    <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
      <tr>
        <td width="48%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center;">
          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">7-Day Unique Visitors</div>
          <div style="font-size: 26px; font-weight: 800; color: #6366f1; margin-top: 4px;">${data.visitors || 0}</div>
          <div style="font-size: 11px; font-weight: 700; color: #059669; margin-top: 2px;">${data.comparison?.visitorsDelta || '0%'} vs Prior Week</div>
        </td>
        <td width="4%"></td>
        <td width="48%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center;">
          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">7-Day Total Sessions</div>
          <div style="font-size: 26px; font-weight: 800; color: #2563eb; margin-top: 4px;">${data.sessions || 0}</div>
          <div style="font-size: 11px; font-weight: 700; color: #059669; margin-top: 2px;">${data.comparison?.sessionsDelta || '0%'} vs Prior Week</div>
        </td>
      </tr>
    </table>

    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background: #f8fafc; padding: 10px 14px; font-size: 12px; font-weight: 800; color: #1e293b; border-bottom: 1px solid #e2e8f0; text-transform: uppercase;">
        Top Engaged Web Pages
      </div>
      <table width="100%" cellspacing="0" cellpadding="0">
        <thead>
          <tr style="background:#f1f5f9; font-size: 11px; color: #64748b;">
            <th style="padding:6px 12px; text-align:left;">Page</th>
            <th style="padding:6px 12px; text-align:right;">Views</th>
            <th style="padding:6px 12px; text-align:right;">Visitors</th>
          </tr>
        </thead>
        <tbody>${pages}</tbody>
      </table>
    </div>
  `;

  const html = emailWrapper("Weekly Traffic Report", `Period: ${data.period}`, content);
  return sendEmail({ subject, html });
}

// 6. WEEKLY CAREER APPLICATIONS EMAIL
export async function sendWeeklyCareerAppsEmail(data: any) {
  const subject = `[ISI Security] Weekly Career Applications Report - ${data.period} (${data.candidatesCount} Applicants)`;
  const rows = (data.candidates || []).slice(0, 15).map((c: any) => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 9px 12px; font-size: 13px; font-weight: 700; color: #0f172a;">${escapeHtml(c.name)}</td>
      <td style="padding: 9px 12px; font-size: 12px; color: #475569; font-weight: 600;">${escapeHtml(c.jobTitle)}</td>
      <td style="padding: 9px 12px; font-size: 12px; color: #2563eb;">${escapeHtml(c.email || '-')}</td>
      <td style="padding: 9px 12px; font-size: 12px; color: #64748b;">${escapeHtml(c.phone || '-')}</td>
      <td style="padding: 9px 12px; font-size: 12px; color: #94a3b8; text-align: right;">${escapeHtml(c.date)}</td>
    </tr>
  `).join("");

  const content = `
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 20px;">
      <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Job Candidates Received (Last 7 Days)</div>
      <div style="font-size: 28px; font-weight: 800; color: #2563eb; margin-top: 4px;">${data.candidatesCount} Candidates</div>
    </div>

    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background: #f8fafc; padding: 10px 14px; font-size: 12px; font-weight: 800; color: #1e293b; border-bottom: 1px solid #e2e8f0; text-transform: uppercase;">
        Recent Candidates
      </div>
      <table width="100%" cellspacing="0" cellpadding="0">
        <thead>
          <tr style="background:#f1f5f9; font-size: 11px; color: #64748b;">
            <th style="padding:6px 12px; text-align:left;">Candidate</th>
            <th style="padding:6px 12px; text-align:left;">Job Role</th>
            <th style="padding:6px 12px; text-align:left;">Email</th>
            <th style="padding:6px 12px; text-align:left;">Phone</th>
            <th style="padding:6px 12px; text-align:right;">Date</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  const html = emailWrapper("Weekly Career Applications Report", `Period: ${data.period}`, content);
  return sendEmail({ subject, html });
}

// 7. MONTHLY TRAFFIC EMAIL
export async function sendMonthlyTrafficEmail(data: any) {
  const subject = `[ISI Security] Monthly Traffic Report - ${data.month}`;
  const pages = (data.topPages || []).slice(0, 8).map((p: any) => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 8px 12px; font-size: 13px; color: #0f172a; font-family: monospace;">${escapeHtml(p.path)}</td>
      <td style="padding: 8px 12px; font-size: 13px; font-weight: 700; text-align: right; color: #6366f1;">${p.views}</td>
      <td style="padding: 8px 12px; font-size: 13px; text-align: right; color: #64748b;">${p.visitors}</td>
    </tr>
  `).join("");

  const content = `
    <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
      <tr>
        <td width="48%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center;">
          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Monthly Unique Visitors</div>
          <div style="font-size: 26px; font-weight: 800; color: #6366f1; margin-top: 4px;">${data.visitors || 0}</div>
          <div style="font-size: 11px; font-weight: 700; color: #059669; margin-top: 2px;">${data.comparison?.visitorsDelta || '0%'} MoM Growth</div>
        </td>
        <td width="4%"></td>
        <td width="48%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center;">
          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Monthly Total Sessions</div>
          <div style="font-size: 26px; font-weight: 800; color: #2563eb; margin-top: 4px;">${data.sessions || 0}</div>
          <div style="font-size: 11px; font-weight: 700; color: #059669; margin-top: 2px;">${data.comparison?.sessionsDelta || '0%'} MoM Growth</div>
        </td>
      </tr>
    </table>

    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background: #f8fafc; padding: 10px 14px; font-size: 12px; font-weight: 800; color: #1e293b; border-bottom: 1px solid #e2e8f0; text-transform: uppercase;">
        Monthly Top Pages
      </div>
      <table width="100%" cellspacing="0" cellpadding="0">
        <thead>
          <tr style="background:#f1f5f9; font-size: 11px; color: #64748b;">
            <th style="padding:6px 12px; text-align:left;">Page</th>
            <th style="padding:6px 12px; text-align:right;">Views</th>
            <th style="padding:6px 12px; text-align:right;">Visitors</th>
          </tr>
        </thead>
        <tbody>${pages}</tbody>
      </table>
    </div>
  `;

  const html = emailWrapper("Monthly Traffic Report", `Month: ${data.month}`, content);
  return sendEmail({ subject, html });
}

// 8. MONTHLY CAREER APPLICATIONS EMAIL
export async function sendMonthlyCareerAppsEmail(data: any) {
  const subject = `[ISI Security] Monthly Career Applications Report - ${data.month} (${data.candidatesCount} Applicants)`;
  const rows = (data.candidates || []).slice(0, 20).map((c: any) => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 9px 12px; font-size: 13px; font-weight: 700; color: #0f172a;">${escapeHtml(c.name)}</td>
      <td style="padding: 9px 12px; font-size: 12px; color: #475569; font-weight: 600;">${escapeHtml(c.jobTitle)}</td>
      <td style="padding: 9px 12px; font-size: 12px; color: #2563eb;">${escapeHtml(c.email || '-')}</td>
      <td style="padding: 9px 12px; font-size: 12px; color: #64748b;">${escapeHtml(c.phone || '-')}</td>
      <td style="padding: 9px 12px; font-size: 12px; color: #94a3b8; text-align: right;">${escapeHtml(c.date)}</td>
    </tr>
  `).join("");

  const content = `
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 20px;">
      <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Total Monthly Candidate Pipeline</div>
      <div style="font-size: 28px; font-weight: 800; color: #2563eb; margin-top: 4px;">${data.candidatesCount} Applicants</div>
    </div>

    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background: #f8fafc; padding: 10px 14px; font-size: 12px; font-weight: 800; color: #1e293b; border-bottom: 1px solid #e2e8f0; text-transform: uppercase;">
        Monthly Candidate Pool
      </div>
      <table width="100%" cellspacing="0" cellpadding="0">
        <thead>
          <tr style="background:#f1f5f9; font-size: 11px; color: #64748b;">
            <th style="padding:6px 12px; text-align:left;">Candidate</th>
            <th style="padding:6px 12px; text-align:left;">Job Role</th>
            <th style="padding:6px 12px; text-align:left;">Email</th>
            <th style="padding:6px 12px; text-align:left;">Phone</th>
            <th style="padding:6px 12px; text-align:right;">Date</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  const html = emailWrapper("Monthly Career Applications Report", `Month: ${data.month}`, content);
  return sendEmail({ subject, html });
}
