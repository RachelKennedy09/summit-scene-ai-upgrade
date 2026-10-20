export const PUBLIC_SITE_URL = (process.env.EXPO_PUBLIC_WEBSITE_URL || "https://summitscene.ca").replace(/\/+$/, "");
export function eventPath(event) {
  const id = String(event?._id || event?.id || "");
  if (!/^[a-f\d]{24}$/i.test(id)) return "";
  const slug = String(event.title || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100).replace(/-$/, "");
  return `/events/${id}${slug ? `/${slug}` : ""}`;
}
export function eventUrl(event, origin = PUBLIC_SITE_URL) {
  const path = eventPath(event);
  return path ? `${origin.replace(/\/+$/, "")}${path}` : "";
}
