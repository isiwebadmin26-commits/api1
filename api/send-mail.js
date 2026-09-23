const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const TARGET_EMAIL = "poojasri.aram@gmail.com";
const BCC_LIST = [
  "poojasri.aram@gmail.com",
  "bv@trustflow.in",
  "v.varshith@isisecurity.in"
];
const SUBJECT = "Are Security Gaps Putting Your Hospital at Risk?";

module.exports = async (req, res) => {
  // Prevent accidental email sends from a browser GET request.
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      success: false,
      error: "Method not allowed. Use POST."
    });
  }

  try {
    if (!process.env.EMAIL || !process.env.APP_PASSWORD) {
      return res.status(500).json({
        success: false,
        error: "EMAIL and APP_PASSWORD environment variables are required."
      });
    }

    const templatePath = path.join(
      process.cwd(),
      "templates",
      "hospital_template_dynamic.html"
    );

    if (!fs.existsSync(templatePath)) {
      return res.status(500).json({
        success: false,
        error: "Email template not found."
      });
    }

    let html = fs.readFileSync(templatePath, "utf8");

    // Unique marker for tracing each generated email.
    html += `
      <div style="display:none">
        ISI-Hospital-${Date.now()}
      </div>
    `;

    const transporter = nodemailer.createTransport({
      host: "mail.isisecurity.in",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.APP_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    await transporter.verify();

    const info = await transporter.sendMail({
      from: `"Akshay C S" <${process.env.EMAIL}>`,
      to: TARGET_EMAIL,
      bcc: BCC_LIST,
      subject: SUBJECT,
      html
    });

    return res.status(200).json({
      success: true,
      message: "Email sent successfully.",
      messageId: info.messageId,
      response: info.response
    });
  } catch (error) {
    console.error("Email send error:", error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
