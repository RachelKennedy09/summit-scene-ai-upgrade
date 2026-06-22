import nodemailer from "nodemailer";

const DEFAULT_FROM = "Summit Scene <no-reply@summitscene.ca>";
const DEFAULT_SECURITY_FROM = "Summit Scene <hello@summitscene.ca>";
const DEFAULT_PUBLIC_APP_URL = "https://summitscene.ca";

function isEmailDeliveryEnabled() {
  return process.env.EMAIL_DELIVERY_ENABLED === "true";
}

function getAppUrl() {
  const appUrl = (
    process.env.APP_PUBLIC_URL ||
    process.env.EXPO_PUBLIC_APP_URL ||
    DEFAULT_PUBLIC_APP_URL
  ).replace(/\/$/, "");

  try {
    const parsed = new URL(appUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("APP_PUBLIC_URL must start with http:// or https://");
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_PUBLIC_APP_URL;
  }
}

function buildUrl(path, token) {
  const url = new URL(path, getAppUrl());
  url.searchParams.set("token", token);
  return url.toString();
}

async function sendWithResend({ to, subject, text, from }) {
  if (!isEmailDeliveryEnabled()) {
    return false;
  }

  if (!process.env.RESEND_API_KEY) {
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: from || process.env.EMAIL_FROM || DEFAULT_FROM,
      to,
      subject,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Email provider failed: ${response.status} ${body}`);
  }

  return true;
}

async function sendWithSmtp({ to, subject, text, from }) {
  if (!isEmailDeliveryEnabled()) {
    return false;
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return false;
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: from || process.env.EMAIL_FROM || DEFAULT_FROM,
    to,
    subject,
    text,
  });

  return true;
}

async function sendEmail({ to, subject, text, devLink, from }) {
  const sent = await sendWithResend({ to, subject, text, from });
  if (sent) {
    return;
  }

  const smtpSent = await sendWithSmtp({ to, subject, text, from });
  if (smtpSent) {
    return;
  }

  if (!sent) {
    console.log(`[email delivery disabled] ${subject} for ${to}`);
    if (devLink) {
      console.log(`[email link] ${devLink}`);
    }
  }
}

function getModerationRecipient() {
  return (
    process.env.MODERATION_NOTIFICATION_EMAIL ||
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    process.env.SUPPORT_EMAIL ||
    ""
  ).trim();
}

export async function sendModerationReportNotification({
  report,
  reporter,
  targetUser,
  source = "report",
}) {
  const to = getModerationRecipient();
  if (!to || !report) {
    return;
  }

  const reportId = report._id || report.id;
  const reporterName = reporter?.name || reporter?.email || "Unknown reporter";
  const reporterEmail = reporter?.email || "No reporter email";
  const targetLabel =
    targetUser?.name || targetUser?.email || report.targetId || "Unknown target";
  const subject =
    source === "block"
      ? "Summit Scene moderation alert: user blocked"
      : "Summit Scene moderation alert: new report";

  await sendEmail({
    to,
    subject,
    text: [
      subject,
      "",
      `Report ID: ${reportId || "unknown"}`,
      `Source: ${source}`,
      `Target type: ${report.targetType}`,
      `Target ID: ${report.targetId}`,
      `Target user: ${targetLabel}`,
      `Reason: ${report.reason}`,
      `Reporter: ${reporterName}`,
      `Reporter email: ${reporterEmail}`,
      report.details ? `Details: ${report.details}` : "Details: none",
      "",
      "Review this in the Summit Scene app: Account > Moderation queue.",
      "Use the report ID above to match this email to the open report.",
    ]
      .filter(Boolean)
      .join("\n"),
  });
}

export async function sendVerificationEmail({ to, token }) {
  const link = buildUrl("/verify-email.html", token);
  const appLink = `summitscene://verify-email?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to,
    subject: "Verify your Summit Scene email",
    devLink: link,
    text: [
      "Verify your Summit Scene email address in the app:",
      appLink,
      "",
      "If the app link does not open, use this web fallback:",
      link,
      "",
      "This link expires in 24 hours.",
    ].join("\n"),
  });
}

export async function sendPasswordResetEmail({ to, token }) {
  const link = buildUrl("/reset-password.html", token);
  const appLink = `summitscene://reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to,
    subject: "Reset your Summit Scene password",
    devLink: link,
    text: [
      "Reset your Summit Scene password in the app:",
      appLink,
      "",
      "If the app link does not open, use this web fallback:",
      link,
      "",
      "This link expires in 1 hour. If you did not request this, ignore this email.",
    ].join("\n"),
  });
}

export async function sendEmailChangeConfirmation({ to, token }) {
  const link = buildUrl("/verify-email-change.html", token);
  const appLink = `summitscene://verify-email?token=${encodeURIComponent(
    token
  )}&mode=emailChange`;
  await sendEmail({
    to,
    subject: "Confirm your new Summit Scene email",
    devLink: link,
    text: [
      "Confirm this as your new Summit Scene email address in the app:",
      appLink,
      "",
      "If the app link does not open, use this web fallback:",
      link,
      "",
      "This link expires in 24 hours.",
    ].join("\n"),
  });
}

export async function sendPasswordChangedSecurityAlert({ to, name }) {
  if (!to) return;

  await sendEmail({
    to,
    from: process.env.SECURITY_EMAIL_FROM || DEFAULT_SECURITY_FROM,
    subject: "Your Summit Scene password was changed",
    text: [
      `Hi ${name || "there"},`,
      "",
      "Your Summit Scene password was changed.",
      "",
      "If this was you, no action is needed.",
      "If this was not you, reset your password right away and contact Summit Scene support at hello@summitscene.ca.",
    ].join("\n"),
  });
}

export async function sendEmailChangeRequestedSecurityAlert({
  to,
  name,
  newEmail,
}) {
  if (!to) return;

  await sendEmail({
    to,
    from: process.env.SECURITY_EMAIL_FROM || DEFAULT_SECURITY_FROM,
    subject: "Summit Scene email change requested",
    text: [
      `Hi ${name || "there"},`,
      "",
      `A request was made to change your Summit Scene login email to ${newEmail}.`,
      "",
      "If this was you, open the confirmation email sent to the new address.",
      "If this was not you, change your password right away and contact Summit Scene support at hello@summitscene.ca.",
    ].join("\n"),
  });
}

export async function sendEmailChangedSecurityAlert({ to, name, newEmail }) {
  if (!to) return;

  await sendEmail({
    to,
    from: process.env.SECURITY_EMAIL_FROM || DEFAULT_SECURITY_FROM,
    subject: "Your Summit Scene email was changed",
    text: [
      `Hi ${name || "there"},`,
      "",
      `Your Summit Scene login email was changed to ${newEmail}.`,
      "",
      "You will need to log in again with your new email.",
      "If this was not you, contact Summit Scene support at hello@summitscene.ca.",
    ].join("\n"),
  });
}
