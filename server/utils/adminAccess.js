const DEFAULT_ADMIN_EMAILS = ["admin@summitscene.ca"];

export function getAdminEmails() {
  const configuredEmails = String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set([...DEFAULT_ADMIN_EMAILS, ...configuredEmails]));
}

export function isAdminEmail(email) {
  return Boolean(email) && getAdminEmails().includes(String(email).toLowerCase());
}
