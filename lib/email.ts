import nodemailer from "nodemailer";

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendMailOptions {
  to?: string | string[];
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  from?: string;
  replyTo?: string;
}

/**
 * Strips broken Unicode replacement characters (e.g. \uFFFD) and mojibake from email content.
 */
export function cleanEmailText(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/\uFFFD/g, "")
    .trim();
}

/**
 * Returns array of clean email recipients from environment variable or fallback.
 */
export function getReportRecipients(): string[] {
  const envVal = process.env.EMAIL_TO;
  if (envVal && envVal.trim()) {
    return envVal.split(",").map((e) => e.trim()).filter(Boolean);
  }
  return [
    "pooja@deeptrust.tech",
    "v.varshith@isisecurity.in",
    "bv@trustflow.in",
    "poojasri.aram@gmail.com",
  ];
}

/**
 * Returns array of career digest recipients from environment variable or fallback.
 */
export function getCareerRecipients(): string[] {
  const envVal = process.env.CAREER_EMAIL_TO;
  if (envVal && envVal.trim()) {
    return envVal.split(",").map((e) => e.trim()).filter(Boolean);
  }
  return [
    "hrms2026@isisecurity.in",
    "careers@isisecurity.in",
    "poojasri.aram@gmail.com",
  ];
}

export async function sendEmail({
  to,
  subject,
  html,
  attachments = [],
  from,
  replyTo,
}: SendMailOptions): Promise<{ messageId: string }> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error(
      "Missing SMTP configuration. Please ensure SMTP_HOST, SMTP_USER, and SMTP_PASSWORD are defined."
    );
  }

  const sender = from || process.env.EMAIL_FROM || user;
  const recipients = Array.isArray(to) ? to.join(", ") : to || getReportRecipients().join(", ");

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  const info = await transporter.sendMail({
    from: sender,
    to: recipients,
    replyTo: replyTo || "info@isisecurity.in",
    subject: cleanEmailText(subject),
    html,
    attachments: attachments.map((att) => ({
      filename: att.filename,
      content: att.content,
      contentType: att.contentType,
    })),
  });

  return { messageId: info.messageId };
}
