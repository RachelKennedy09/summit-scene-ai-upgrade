const DEFAULT_ADMIN_EMAILS = ["admin@summitscene.ca"];

export function isSummitSceneAdmin(user) {
  if (!user) return false;

  const normalizedEmail = String(user.email || "").trim().toLowerCase();
  return Boolean(user.isAdmin) || DEFAULT_ADMIN_EMAILS.includes(normalizedEmail);
}
