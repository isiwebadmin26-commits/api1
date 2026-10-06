import { config } from "dotenv";
import path from "path";
config({ path: path.join(process.cwd(), ".env.local") });

import nodemailer from "nodemailer";

async function testSmtp() {
  console.log("Testing SMTP connection with settings:");
  console.log("Host:", process.env.SMTP_HOST);
  console.log("Port:", process.env.SMTP_PORT);
  console.log("User:", process.env.SMTP_USER);
  console.log("From:", process.env.EMAIL_FROM);
  console.log("To:", process.env.EMAIL_TO);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    debug: true,
    logger: true,
  });

  try {
    console.log("\nVerifying transporter...");
    await transporter.verify();
    console.log("Transporter verification successful!");

    console.log("\nSending test diagnostic email...");
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: "poojasri.aram@gmail.com, bv@trustflow.in",
      subject: "Test Diagnostic Email - " + new Date().toISOString(),
      text: "This is a direct SMTP test to confirm delivery.",
      html: "<p>This is a direct SMTP test to confirm delivery to poojasri.aram@gmail.com and bv@trustflow.in.</p>",
    });

    console.log("\nSendMail result:");
    console.log("Message ID:", info.messageId);
    console.log("Accepted:", info.accepted);
    console.log("Rejected:", info.rejected);
    console.log("Pending:", info.pending);
    console.log("Response:", info.response);
  } catch (err: any) {
    console.error("SMTP error:", err);
  }
}

testSmtp();
