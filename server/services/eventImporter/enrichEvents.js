import * as cheerio from "cheerio";
import { fetchSource } from "./fetchSource.js";
import { readStructuredEvents } from "./structuredEvents.js";
import { canonicalEventUrl, findDuplicateEvent, normalizeTitle } from "./detectDuplicate.js";
import { parseEventDate, parseEventTime } from "./dateParsing.js";
import { EVENT_IMPORT_CONFIG } from "./config.js";

const nonempty = (event) => Object.fromEntries(Object.entries(event).filter(([, value]) => value !== undefined && value !== null && value !== ""));
function comparable(event, source, options) {
  return { ...event, town: event.town || source.town,
    startDate: parseEventDate(event.startDate || event.dateText, options),
    startTime: parseEventTime(event.startTime || event.startDate || event.dateText) };
}

export function coalesceExtractedEvents(events, source, options = {}) {
  const result = [];
  for (const event of events) {
    const target = result.findIndex((item) => findDuplicateEvent(comparable(event, source, options), [comparable(item, source, options)]));
    if (target < 0) { result.push({ ...event }); continue; }
    const previous = result[target];
    // Structured facts take precedence over calendar summaries.
    result[target] = previous.extractionMethod === "json-ld"
      ? { ...nonempty(event), ...nonempty(previous) }
      : { ...nonempty(previous), ...nonempty(event) };
  }
  return result;
}

export async function enrichExtractedEvents(events, source, options = {}) {
  const fetchPage = options.fetchDetailPage || fetchSource;
  const cache = new Map();
  const maxPages = options.maxDetailPagesPerSource ?? EVENT_IMPORT_CONFIG.maxDetailPagesPerSource;
  const result = [];
  for (const event of events) {
    if (event.venue && parseEventTime(event.startTime || event.startDate || event.dateText) &&
        !/^(Banff|Canmore|Lake Louise|Canmore Kananaskis|SkiBig3|Rocky Mountain Live)$/i.test(event.venue)) {
      result.push(event);
      continue;
    }
    const url = canonicalEventUrl(event.sourceUrl);
    let allowed = false;
    try {
      allowed = new URL(url).origin === new URL(canonicalEventUrl(source.url)).origin &&
        url !== canonicalEventUrl(source.url) && !/\.(pdf|ics|jpg|png)(?:\?|$)/i.test(url);
    } catch { /* Invalid or external links do not get fetched. */ }
    if (!allowed || (!cache.has(url) && cache.size >= maxPages)) { result.push(event); continue; }
    if (!cache.has(url)) {
      try {
        const { html } = await fetchPage({ ...source, url }, options);
        const $ = cheerio.load(html || "");
        const structured = readStructuredEvents($, url);
        // Explicit microdata is useful on event pages without JSON-LD. Avoid
        // guessing venue names or times from navigation and footer content.
        if (!structured.length) {
          const text = (selector) => $(selector).first().attr("content") || $(selector).first().text().replace(/\s+/g, " ").trim();
          structured.push({
            title: $("h1").first().text().trim(),
            startDate: $('[itemprop="startDate"], time[datetime]').first().attr("content") || $('[itemprop="startDate"], time[datetime]').first().attr("datetime"),
            venue: text('[itemprop="location"] [itemprop="name"], .tribe-events-venue-details, [itemprop="location"]'),
            address: text('[itemprop="address"]'),
            startTime: text('[itemprop="startTime"]'),
          });
        }
        cache.set(url, structured);
      } catch { cache.set(url, []); } // Calendar facts survive a failed detail read.
    }
    const date = parseEventDate(event.startDate || event.dateText, options);
    const matches = cache.get(url).filter((detail) =>
      normalizeTitle(detail.title) === normalizeTitle(event.title) &&
      (!detail.startDate || !date || parseEventDate(detail.startDate, options) === date));
    const detail = matches.length === 1 ? matches[0] : matches.find((item) =>
      parseEventTime(item.startTime || item.startDate) === parseEventTime(event.startTime || event.dateText));
    result.push(detail ? { ...event, ...nonempty(detail), sourceUrl: event.sourceUrl } : event);
  }
  return coalesceExtractedEvents(result, source, options);
}
