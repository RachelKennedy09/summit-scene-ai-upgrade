import nodemailer from "nodemailer";

const DEFAULT_FROM = "Summit Scene <summitscene@outlook.com>";

function getAppUrl() {
  return (
    process.env.APP_PUBLIC_URL ||
    process.env.EXPO_PUBLIC_APP_URL ||
    "http://localhost:8081"
  ).replace(/\/$/, "");
}

function buildUrl(path, token) {
  const url = new URL(path, getAppUrl());
  url.searchParams.set("token", token);
  return url.toString();
}

async function sendWithResend({ to, subject, text }) {
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
    console.log(`[email disabled] ${subject} for ${to}`);
    if (devLink) {
      console.log(`[email link] ${devLink}`);
    }
  }
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
