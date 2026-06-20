import nodemailer from "nodemailer";

const DEFAULT_FROM = "Summit Scene <no-reply@summitscene.ca>";
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

async function sendWithResend({ to, subject, text }) {
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
      from: process.env.EMAIL_FROM || DEFAULT_FROM,
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

async function sendWithSmtp({ to, subject, text }) {
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
    from: process.env.EMAIL_FROM || DEFAULT_FROM,
    to,
    subject,
    text,
  });

  return true;
}

async function sendEmail({ to, subject, text, devLink }) {
  const sent = await sendWithResend({ to, subject, text });
  if (sent) {
    return;
  }

  const smtpSent = await sendWithSmtp({ to, subject, text });
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

function getReportAdminUrl(reportId) {
  const adminUrl = process.env.ADMIN_PUBLIC_URL || process.env.APP_PUBLIC_URL;
  if (!adminUrl || !reportId) {
    return "";
  }

  try {
    const url = new URL("/admin/moderation", adminUrl);
    url.searchParams.set("reportId", reportId.toString());
    return url.toString();
  } catch {
    return "";
  }
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
  const adminUrl = getReportAdminUrl(reportId);
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
    devLink: adminUrl,
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
      adminUrl ? `Admin review link: ${adminUrl}` : "",
      "",
      "Review this in the Summit Scene moderation queue.",
    ]
      .filter(Boolean)
      .join("\n"),
  });
}

export async function sendVerificationEmail({ to, token }) {
  const link = buildUrl("/verify-email.html", token);
  await sendEmail({
    to,
    subject: "Verify your Summit Scene email",
    devLink: link,
    text: [
      "Verify your Summit Scene email address:",
      link,
      "",
      "This link expires in 24 hours.",
    ].join("\n"),
  });
}

export async function sendPasswordResetEmail({ to, token }) {
  const link = buildUrl("/reset-password.html", token);
  await sendEmail({
    to,
    subject: "Reset your Summit Scene password",
    devLink: link,
    text: [
      "Reset your Summit Scene password:",
      link,
      "",
      "This link expires in 1 hour. If you did not request this, ignore this email.",
    ].join("\n"),
  });
}

export async function sendEmailChangeConfirmation({ to, token }) {
  const link = buildUrl("/verify-email-change.html", token);
  await sendEmail({
    to,
    subject: "Confirm your new Summit Scene email",
    devLink: link,
    text: [
      "Confirm this as your new Summit Scene email address:",
      link,
      "",
      "This link expires in 24 hours.",
    ].join("\n"),
  });
}
