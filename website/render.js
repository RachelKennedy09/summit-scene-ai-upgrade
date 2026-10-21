import { EVENT_MAIN_CATEGORIES } from "../constants/eventCategories.js";
import { dateLabel, eventTimestamp, localDate, nextOccurrence, addDays } from "../utils/publicEventDates.js";
import { eventPath } from "../utils/eventLinks.js";
import { categoryImagePath } from "./eventImages.js";

export const TOWNS = { banff: "Banff", "lake-louise": "Lake Louise", canmore: "Canmore" };
export const escape = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
export function safeUrl(value) {
  try { const url = new URL(value); return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : ""; } catch { return ""; }
}
const json = (value) => JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
export const townCopy = {
  Banff: "Find a reason to head into town. Browse concerts, arts, local gatherings and other events in Banff, with venue and booking details together in one place.",
  "Lake Louise": "Make room for a local plan alongside your mountain day. Explore events in Lake Louise, from performances and seasonal gatherings to activities around the village.",
  Canmore: "See what’s happening beyond the trailhead. Find live music, creative events, community gatherings and things to do in Canmore.",
};
const store = "https://apps.apple.com/app/summit-scene/id6777819596";
function downloads() {
  const play = safeUrl(process.env.PUBLIC_GOOGLE_PLAY_URL || "https://play.google.com/store/apps/details?id=com.rachellauren.summitscene");
  return `<a class="primary" href="${store}" rel="noopener noreferrer" target="_blank">Download for iOS ↗</a>${play ? `<a class="secondary" href="${escape(play)}" rel="noopener noreferrer" target="_blank">Get it on Google Play ↗</a>` : ""}`;
}
function shell({ title, description, canonical, body, schema, noindex = false, image, origin }) {
  const socialImage = safeUrl(image) || `${origin}/assets/summit-scene-logo-transparent.png`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#254A3B">
<title>${escape(title)}</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="${escape(canonical)}">
<meta name="robots" content="${noindex ? "noindex,follow" : "index,follow"}"><meta property="og:type" content="website"><meta property="og:site_name" content="Summit Scene"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(canonical)}"><meta property="og:image" content="${escape(socialImage)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${escape(socialImage)}">
<link rel="icon" href="/assets/summit-scene-logo-transparent.png"><link rel="stylesheet" href="/events-web.css"><script src="/event-images.js" defer></script>${schema ? `<script type="application/ld+json">${json(schema)}</script>` : ""}</head>
<body><a class="skip" href="#main">Skip to content</a><header class="header"><a class="brand" href="/"><img src="/assets/summit-scene-logo-transparent.png" width="48" height="48" alt=""><span>Summit Scene</span></a><nav aria-label="Main navigation"><a href="/events">Explore events</a><a href="/business">For organizers</a><a class="nav-app" href="#download">Download ↓</a></nav></header>
<main id="main"><section class="download-banner" aria-label="Download Summit Scene"><span>Get Summit Scene. Find your next local plan.</span><div class="download-actions">${downloads()}</div></section>${body}</main><section class="download" id="download"><div><p class="eyebrow">Keep the valley in your pocket</p><h2>Same events. Wherever you are.</h2><p>Explore Summit Scene on your phone. No account needed to browse.</p></div><div class="download-actions">${downloads()}</div></section>
<footer><a class="brand" href="/">Summit Scene</a><p>Made for Banff, Canmore &amp; Lake Louise.</p><nav aria-label="Footer navigation"><a href="/events/banff">Banff events</a><a href="/events/canmore">Canmore events</a><a href="/events/lake-louise">Lake Louise events</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/support">Support</a><a href="/safety">Event safety</a><a href="/delete-account">Data requests</a></nav><small>© ${new Date().getUTCFullYear()} Summit Scene</small></footer></body></html>`;
}
export function renderError(status, origin, path = "/events") {
  const missing = status === 404;
  const invalid = status === 400;
  return shell({ title: `${missing ? "Event not found" : invalid ? "Check your event filters" : "Events temporarily unavailable"} | Summit Scene`,
    description: missing ? "This listing may have been removed. Browse current events in the Bow Valley." : "Please try again shortly to browse Summit Scene events.",
    canonical: `${origin}${path}`, noindex: true, origin,
    body: `<section class="empty"><p class="eyebrow">${status}</p><h1>${missing ? "This listing isn’t here." : invalid ? "Let’s check those filters." : "We couldn’t load events."}</h1><p>${missing ? "It may have been removed or the link may be incomplete." : invalid ? "Choose a valid town, category and date range within one year." : "The event service is temporarily unavailable. Your next plan can wait a moment."}</p><a class="primary" href="${missing ? "/events" : escape(path)}">${missing ? "Browse current events" : invalid ? "Reset filters" : "Try again"}</a></section>` });
}
function timeLabel(event) {
  if (event.isAllDay) return "All day";
  const slots = event.timeSlots?.length ? event.timeSlots : [{ startTime: event.time, endTime: event.endTime }];
  return slots.map((slot) => [slot.startTime, slot.endTime].filter(Boolean).join(" – ")).filter(Boolean).join(" · ") || "Time to be confirmed";
}
function eventImage(event, detail = false) {
  const photo = safeUrl(event.imageUrl);
  const fallback = categoryImagePath(event);
  const sizes = detail ? "(max-width:620px) calc(100vw - 40px), 720px" : "(max-width:620px) calc(100vw - 40px), (max-width:950px) 45vw, 400px";
  return `<img${detail ? ' class="detail-image"' : ""} src="${escape(photo || fallback)}"${photo ? "" : ` srcset="${categoryImagePath(event, 320)} 320w, ${fallback} 800w" sizes="${sizes}"`} data-fallback-src="${fallback}" alt="${detail ? escape(photo ? event.title : `${event.category || "Event"} category illustration`) : ""}" ${detail ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'} width="800" height="533">`;
}
function card(event) {
  const path = eventPath(event);
  const date = event.nextOccurrenceDate || event.date;
  return `<article class="event-card"><a class="card-image" href="${path}" tabindex="-1" aria-hidden="true">${eventImage(event)}</a><div class="card-body"><div class="card-tags"><span>${escape(event.category)}</span><span>${escape(event.town)}</span></div><p class="card-date">${escape(dateLabel(date))}</p><h2><a href="${path}">${escape(event.title)}</a></h2><p>${escape(timeLabel(event))}</p><p class="card-venue">${escape(event.locationName || event.location || "Venue to be confirmed")}</p>${event.scheduleType === "recurring" ? '<p class="recurring">Repeating event · Check the full schedule</p>' : ""}<span class="card-arrow" aria-hidden="true">↗</span></div></article>`;
}
export function renderListing(data, url, origin) {
  const townSlug = url.pathname.split("/")[2];
  const town = TOWNS[townSlug] || "";
  const path = town ? `/events/${townSlug}` : "/events";
  const filters = data.filters;
  const selected = (left, right) => left === right ? " selected" : "";
  const townOptions = Object.entries(TOWNS).map(([, name]) => `<option${selected(name, filters.town)}>${name}</option>`).join("");
  const categoryOptions = EVENT_MAIN_CATEGORIES.map((name) => `<option${selected(name, filters.category)}>${escape(name)}</option>`).join("");
  const quickLink = (when, label) => {
    const query = new URLSearchParams(url.search);
    ["page", "from", "to", "when"].forEach((key) => query.delete(key));
    if (when) query.set("when", when);
    return `<a class="chip${(filters.preset || "") === when ? " active" : ""}" href="${path}${query.size ? `?${escape(query.toString())}` : ""}">${label}</a>`;
  };
  const pageLink = (page, label) => {
    const query = new URLSearchParams(url.search); query.set("page", String(page));
    return `<a class="secondary" href="${path}?${escape(query.toString())}">${label}</a>`;
  };
  return shell({ title: town ? `${town} events & things to do | Summit Scene` : "Events in Banff, Canmore & Lake Louise | Summit Scene",
    description: town ? townCopy[town] : "Find live music, arts, sports and local events in Banff, Canmore and Lake Louise. Browse by town, category and date. No account needed.",
    canonical: `${origin}${path}`, noindex: url.search.length > 0, origin,
    body: `<section class="events-hero"><div><p class="eyebrow">Your next mountain-town plan</p><h1>${town ? `What’s on in<br><em>${town}.</em>` : "A little closer to<br><em>your next plan.</em>"}</h1><p>${escape(town ? townCopy[town] : "Good music. New experiences. Familiar faces. Find what’s happening in the Bow Valley, and make a little time for getting out.")}</p><p class="browse-note">Three mountain towns. No account needed.</p></div><div class="hero-brand" aria-hidden="true"><img src="/assets/summit-scene-logo-transparent.png" width="300" height="300" alt=""><span>Local plans. Mountain days.</span></div></section>
<nav class="town-tabs" aria-label="Browse by town"><a${!town ? ' aria-current="page"' : ""} href="/events">All towns</a>${Object.entries(TOWNS).map(([slug, name]) => `<a${town === name ? ' aria-current="page"' : ""} href="/events/${slug}">${name}</a>`).join("")}</nav>
<section class="listings" aria-labelledby="listing-title"><div class="listing-heading"><div><p class="eyebrow">Make time for something good</p><h2 id="listing-title">${town ? `${town}, coming up` : "Coming up in the valley"}</h2></div><span class="timezone">All times: Mountain Time</span></div>
<form class="filters" action="${path}" method="get"><label>Town<select name="town">${town ? `<option value="${town}">${town}</option>` : `<option value="">All towns</option>${townOptions}`}</select></label><label>Category<select name="category"><option value="">All categories</option>${categoryOptions}</select></label><label>From<input type="date" name="from" value="${escape(url.searchParams.get("from") || "")}"></label><label>To<input type="date" name="to" value="${escape(url.searchParams.get("to") || "")}"></label><button class="primary" type="submit">Find events ↗</button><a class="reset" href="${path}">Reset</a></form>
<nav class="quick-filters" aria-label="Quick date filters">${quickLink("", "Upcoming")}${quickLink("today", "Today")}${quickLink("tomorrow", "Tomorrow")}${quickLink("weekend", "This weekend")}</nav>
${data.events.length ? `<div class="event-grid">${data.events.map(card).join("")}</div>` : '<div class="empty"><h3>A little quiet here.</h3><p>No events match these filters. Try another date, category or town.</p><a href="' + path + '">Clear filters →</a></div>'}
<nav class="pagination" aria-label="Event pages">${data.page > 1 ? pageLink(data.page - 1, "← Previous") : ""}<span>Page ${data.page}</span>${data.hasMore ? pageLink(data.page + 1, "More events →") : ""}</nav><p class="listing-note">Looking for happy hours or ongoing offers? Find those in the app’s separate discovery sections. This feed focuses on events.</p></section>` });
}
const STATUS = { cancelled: "EventCancelled", canceled: "EventCancelled", postponed: "EventPostponed", rescheduled: "EventRescheduled", scheduled: "EventScheduled" };
export function eventSchema(event, origin) {
  // Recurring listings have one stable detail URL, but no single fixed start.
  // Do not mark up a series, promotion or incomplete physical location.
  if (event.listingKind !== "event" || event.scheduleType === "recurring" || event.timeSlots?.length > 1 || !event.locationName || !event.address || !event.date) return null;
  const slot = event.timeSlots?.[0];
  const start = event.isAllDay ? event.date : eventTimestamp(event.date, slot?.startTime || event.time);
  if (!start || (event.eventStatus && !STATUS[event.eventStatus])) return null;
  if (event.eventStatus === "rescheduled" && !event.previousStartDate) return null;
  const result = { "@context": "https://schema.org", "@type": "Event", name: event.title, url: `${origin}${eventPath(event)}`,
    startDate: start, eventStatus: `https://schema.org/${STATUS[event.eventStatus] || "EventScheduled"}`,
    location: { "@type": "Place", name: event.locationName, address: { "@type": "PostalAddress", streetAddress: event.address, addressLocality: event.town, addressRegion: "AB", addressCountry: "CA" } },
  };
  if (event.description) result.description = event.description;
  if (safeUrl(event.imageUrl)) result.image = [safeUrl(event.imageUrl)];
  if (event.organizer?.name) result.organizer = { "@type": "Organization", ...event.organizer };
  if (event.eventStatus === "rescheduled") result.previousStartDate = event.previousStartDate;
  const endTime = slot?.endTime || event.endTime;
  if (endTime) {
    let end = eventTimestamp(event.date, endTime);
    if (end && Date.parse(end) <= Date.parse(start)) end = eventTimestamp(addDays(event.date, 1), endTime);
    if (end) result.endDate = end;
  }
  // Price prose is shown as supplied; no invented currency/availability/offer.
  return result;
}
export function renderDetail(event, origin) {
  const image = safeUrl(event.imageUrl);
  const path = eventPath(event);
  const occurrence = event.scheduleType === "recurring" ? nextOccurrence(event, localDate()) : event.date;
  const schedule = event.recurrence;
  const status = STATUS[event.eventStatus] && event.eventStatus !== "scheduled" ? `<p class="status-banner">${escape(event.eventStatus === "rescheduled" ? "Rescheduled" : event.eventStatus === "postponed" ? "Postponed" : "Cancelled")}${event.previousStartDate ? ` · Previously ${escape(event.previousStartDate)}` : ""}</p>` : "";
  const row = (name, value) => value ? `<div><dt>${name}</dt><dd>${escape(value)}</dd></div>` : "";
  const link = safeUrl(event.bookingUrl) || safeUrl(event.sourceUrl);
  const description = event.description || `View available dates, times and venue details for ${event.title} in ${event.town}.`;
  return shell({ title: `${event.title} in ${event.town} | Summit Scene`, description: description.slice(0, 160), canonical: `${origin}${path}`, image, origin, schema: eventSchema(event, origin),
    body: `<section class="detail"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/events">Events</a><span>/</span><a href="/events/${Object.keys(TOWNS).find((key) => TOWNS[key] === event.town) || ""}">${escape(event.town)}</a></nav><div class="detail-heading"><p class="eyebrow">${escape(event.category)} · ${escape(event.town)}</p><h1>${escape(event.title)}</h1>${status}<p class="detail-date">${escape(dateLabel(occurrence || event.date))} · ${escape(timeLabel(event))}</p></div><div class="detail-grid"><div><figure class="detail-media">${eventImage(event, true)}<figcaption class="fine-print"${image ? " hidden" : ""}>Category illustration, not a photo of this event.</figcaption></figure><h2>About this ${event.listingKind === "promotion" ? "listing" : "event"}</h2><p class="event-description">${escape(event.description || "Check the organizer’s listing for more information.")}</p>${event.sourceName ? `<p class="source-note">Listing source: ${escape(event.sourceName)}</p>` : ""}</div><aside class="detail-facts" aria-label="Event details"><h2>The details</h2><dl>${row("Date", dateLabel(occurrence || event.date))}${row("Time", timeLabel(event) + " · Mountain Time")}${row("Venue", event.locationName || event.location || "Venue to be confirmed")}${row("Address", event.address)}${row("Price", event.priceRange)}${row("Organizer", event.organizer?.name)}</dl>${schedule ? `<div class="schedule"><h3>Repeating schedule</h3><p>${escape(schedule.frequency?.replace(/_/g, " ") || "Recurring")}${schedule.weekdays?.length ? ` · ${escape(schedule.weekdays.join(", "))}` : ""}</p>${schedule.untilDate ? `<p>Until ${escape(dateLabel(schedule.untilDate))}</p>` : ""}${schedule.dates?.length ? `<p>${schedule.dates.map((date) => escape(dateLabel(date))).join("<br>")}</p>` : ""}</div>` : ""}${link ? `<a class="primary booking" href="${escape(link)}" target="_blank" rel="noopener noreferrer">Booking &amp; source details ↗</a>` : ""}<p class="fine-print">Confirm availability and any changes directly with the organizer.</p></aside></div><a class="text-link" href="/events">← More events in the valley</a></section>` });
}
export function renderXml(entries, root = "urlset") {
  return `<?xml version="1.0" encoding="UTF-8"?><${root} xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map((entry) => `<${root === "sitemapindex" ? "sitemap" : "url"}><loc>${escape(entry.url)}</loc>${entry.updatedAt && !Number.isNaN(Date.parse(entry.updatedAt)) ? `<lastmod>${new Date(entry.updatedAt).toISOString()}</lastmod>` : ""}</${root === "sitemapindex" ? "sitemap" : "url"}>`).join("")}</${root}>`;
}
