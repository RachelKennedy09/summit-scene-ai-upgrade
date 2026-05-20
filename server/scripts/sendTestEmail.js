import dotenv from "dotenv";

import { sendVerificationEmail } from "../services/emailService.js";

dotenv.config();

const to = String(process.argv[2] || "").trim();

if (!to) {
  console.error("Usage: node scripts/sendTestEmail.js <recipient-email>");
  process.exit(1);
}

try {
  await sendVerificationEmail({
    to,
    token: "test-verification-token",
  });

  console.log(`Test verification email requested for ${to}.`);
} catch (error) {
  console.error("Could not send test email.");
  console.error(error.message);

  if (
    String(error.message || "").includes("SmtpClientAuthentication is disabled")
  ) {
    console.error(
      [
        "",
        "Microsoft rejected SMTP login because Authenticated SMTP is disabled for this mailbox.",
        "Enable Authenticated SMTP for the mailbox, or use a transactional email provider instead.",
      ].join("\n")
    );
  }

  process.exit(1);
}
