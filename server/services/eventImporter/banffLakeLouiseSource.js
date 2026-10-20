import * as cheerio from "cheerio";
import { fetchSource } from "./fetchSource.js";
import { parseEventTime, parseEventTimeRange } from "./dateParsing.js";

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveUrl(value, baseUrl) {
  if (!value) return undefined;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return undefined;
  }
}

function detailUrlForSlug(slug, sourceUrl) {
  const cleaned = cleanText(slug);
  if (!cleaned) return "";
  try {
    return new URL(`/events/${encodeURIComponent(cleaned)}`, sourceUrl).toString();
  } catch {
    return "";
  }
}

function formatTimeFromIso(value) {
  if (!value || !/T\d{2}:\d{2}/.test(String(value))) return undefined;
  return parseEventTime(value);
}

function formatAddress(address) {
  if (!address || typeof address !== "object") return "";
  return [
    address.address_1,
    address.streetAddress,
    address.address_2,
    address.city || address.addressLocality,
    address.province || address.addressRegion,
    address.postcode || address.postalCode,
  ]
    .map(cleanText)
    .filter(Boolean)
    .join(", ");
}

function flattenJsonLdItems(item) {
  if (!item) return [];
  if (Array.isArray(item)) return item.flatMap(flattenJsonLdItems);
  if (Array.isArray(item?.["@graph"])) return item["@graph"].flatMap(flattenJsonLdItems);
  return [item];
}

function readJsonLdEvent($) {
  let event = null;

  $("script[type='application/ld+json']").each((_, element) => {
    if (event) return;

    try {
      const parsed = JSON.parse($(element).contents().text());
      event = flattenJsonLdItems(parsed).find((item) =>
        String(item?.["@type"] || "").includes("Event")
      );
    } catch {
      // Ignore malformed JSON-LD; the Next.js payload is still the primary source.
    }
  });

  return event;
}

function readDetailPayload(html) {
  const $ = cheerio.load(html || "");
  const rawJson = $("#__NEXT_DATA__").text();
  const jsonLdEvent = readJsonLdEvent($);
  if (!rawJson) return { data: null, jsonLdEvent };

  try {
    const data = JSON.parse(rawJson)?.props?.pageProps?.data;
    const isEvent = data?._type === "event" || data?.type === "event";
    return { data: isEvent ? data : null, jsonLdEvent };
  } catch {
    return { data: null, jsonLdEvent };
  }
}

function getPrimaryLocation(data) {
  const contentLocations = Array.isArray(data?.content)
    ? data.content.flatMap((section) => section?.locations || [])
    : [];
  const calloutLocations = Array.isArray(data?.locationCallOuts)
    ? data.locationCallOuts.flatMap((item) => item?.locations || item || [])
    : [];

  return [...contentLocations, ...calloutLocations].find(
    (item) => Number.isFinite(item?.lat) && Number.isFinite(item?.lng)
  );
}

function mapTourismDetailToExtractedEvent(data, detailUrl, sourceUrl, jsonLdEvent) {
  if (!data) return null;

  const firstDate = Array.isArray(data.dates) ? data.dates[0] : null;
  const button = Array.isArray(data.buttons) ? data.buttons[0] : null;
  const memberTicketLink = data.memberTicketLink || {};
  const exactLink =
    memberTicketLink.link ||
    button?.memberLink?.link ||
    button?.external ||
    button?.customButton?.url ||
    jsonLdEvent?.offers?.url ||
    "";
  const location = getPrimaryLocation(data);
  const jsonLdLocation = jsonLdEvent?.location || {};
  const venue =
    cleanText(data.displayVenue) ||
    cleanText(data.venue) ||
    cleanText(data.locationLabel) ||
    cleanText(jsonLdLocation.name) ||
    cleanText(memberTicketLink.title) ||
    cleanText(button?.memberLink?.entity?.title);
  const address =
    formatAddress(data.address) ||
    formatAddress(jsonLdLocation.address);

  return {
    title: cleanText(data.title),
    dateText: cleanText(data.dateInfo || firstDate?.start),
    startDate: firstDate?.start,
    endDate: firstDate?.end,
    startTime: formatTimeFromIso(firstDate?.start) || formatTimeFromIso(jsonLdEvent?.startDate) || parseEventTimeRange(data.dateInfo).startTime,
    endTime: formatTimeFromIso(firstDate?.end) || formatTimeFromIso(jsonLdEvent?.endDate) || parseEventTimeRange(data.dateInfo).endTime,
    venue,
    address,
    ticketUrl: resolveUrl(exactLink, sourceUrl),
    sourceUrl: detailUrl,
    latitude: location?.lat,
    longitude: location?.lng,
    extractionMethod: "banff-lake-louise-detail",
  };
}

async function fetchEventDetail(item, sourceUrl, options) {
  const detailUrl = detailUrlForSlug(item?.slug, sourceUrl);
  if (!detailUrl) return null;

  const { html } = await fetchSource({ url: detailUrl }, options);
  const { data, jsonLdEvent } = readDetailPayload(html);
  return mapTourismDetailToExtractedEvent(data, detailUrl, sourceUrl, jsonLdEvent);
}

function mapTourismItemToExtractedEvent(item, sourceUrl) {
  const firstDate = Array.isArray(item?.dates) ? item.dates[0] : null;

  return {
    title: cleanText(item?.title),
    description: cleanText(item?.cardSummary),
    category: cleanText(item?.tag),
    dateText: cleanText(item?.dateInfo || firstDate?.start),
    startDate: firstDate?.start,
    endDate: firstDate?.end,
    startTime: formatTimeFromIso(firstDate?.start),
    endTime: formatTimeFromIso(firstDate?.end),
    sourceUrl: detailUrlForSlug(item?.slug, sourceUrl) || sourceUrl,
    extractionMethod: "banff-lake-louise-list-data",
  };
}

function readListConfigFromHtml(html) {
  const $ = cheerio.load(html || "");
  const rawJson = $("#__NEXT_DATA__").text();
  if (!rawJson) return null;

  try {
    const parsed = JSON.parse(rawJson);
    const list = parsed?.props?.pageProps?.data?.content
      ?.flatMap((section) => section?.lists || [])
      ?.find((item) => item?.documentType === "event");

    if (!list) return null;
    return {
      documentType: list.documentType,
      hiddenFilters: list.hiddenFilters || null,
      itemsPerPage: list.itemsPerPage || 12,
      totalItems: list.totalItems || 0,
    };
  } catch {
    return null;
  }
}

async function fetchListPage(sourceUrl, page, listConfig, options) {
  const config = {
    selected: {},
    dateStart: null,
    dateEnd: null,
    searchTerm: "",
    page,
    hiddenFilters: listConfig.hiddenFilters,
    documentType: listConfig.documentType,
    itemsPerPage: listConfig.itemsPerPage,
    hasAside: false,
    season: null,
    includeMapViewData: false,
  };
  const endpoint = new URL("/api/list-data/", sourceUrl);
  endpoint.searchParams.set("config", JSON.stringify(config));

  const { html } = await fetchSource({ url: endpoint.toString() }, options);
  return JSON.parse(html);
}

export async function fetchBanffLakeLouiseEvents(source, html, options = {}) {
  if (!String(source?.url || "").includes("banfflakelouise.com/events")) {
    return null;
  }

  const listConfig = readListConfigFromHtml(html);
  if (!listConfig?.totalItems) return null;

  const maxPages = Math.max(1, options.maxPagesPerSource || 8);
  const totalPages = Math.min(
    maxPages,
    Math.ceil(listConfig.totalItems / listConfig.itemsPerPage)
  );
  const events = [];
  const seenUrls = new Set();

  for (let page = 1; page <= totalPages; page += 1) {
    const data = await fetchListPage(source.url, page, listConfig, options).catch((error) => {
      if (/robots\.txt/i.test(error.message)) return null;
      throw error;
    });
    if (!data) return null;

    for (const item of data.items || []) {
      const baseEvent = mapTourismItemToExtractedEvent(item, source.url);
      const detailEvent = await fetchEventDetail(item, source.url, options).catch(
        () => null
      );
      const event = {
        ...baseEvent,
        ...(detailEvent || {}),
      };
      if (!event.title || seenUrls.has(event.sourceUrl)) continue;
      seenUrls.add(event.sourceUrl);
      events.push(event);
    }
  }

  return events;
}

export { mapTourismDetailToExtractedEvent, mapTourismItemToExtractedEvent };
