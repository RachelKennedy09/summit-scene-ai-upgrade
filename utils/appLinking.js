import { PUBLIC_SITE_URL } from "./eventLinks.js";

export const appLinkingConfig = {
  prefixes: ["summitscene://", PUBLIC_SITE_URL],
  config: { screens: {
    VerifyEmail: "verify-email",
    ResetPassword: "reset-password",
    EventDetail: "events/:eventId/:slug?",
    tabs: { screens: { Hub: "events" } },
  } },
};
export function eventLinkState(path) {
  const clean = path.split("?")[0].replace(/^\/+|\/+$/g, "");
  const towns = { banff: "Banff", "lake-louise": "Lake Louise", canmore: "Canmore" };
  const town = clean.startsWith("events/") ? towns[clean.slice(7)] : null;
  if (town) return { routes: [{ name: "tabs", state: { routes: [{ name: "Hub", params: { town, publicEventsLink: true, dateFilter: "All" } }] } }] };
  const match = clean.match(/^events\/([a-f\d]{24})(?:\/[^/]+)?$/i);
  if (match) return { routes: [{ name: "tabs" }, { name: "EventDetail", params: { eventId: match[1] } }], index: 1 };
  return undefined;
}
