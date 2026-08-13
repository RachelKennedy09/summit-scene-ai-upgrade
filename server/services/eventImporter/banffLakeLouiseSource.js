import * as cheerio from "cheerio";
import { assertCanFetchUrl, waitForRateLimit } from "./fetchSource.js";

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

  const [, hourText, minuteText] = String(value).match(/T(\d{2}):(\d{2})/) || [];
  const hour24 = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isFinite(hour24) || !Number.isFinite(minute)) return undefined;

  const meridiem = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${meridiem}`;
}

function formatAddress(address) {
  if (!address || typeof address !== "object") return "";
  return [
    address.address_1,
    address.address_2,
    address.city,
    address.province,
    address.postcode,
  ]
    .map(cleanText)
    .filter(Boolean)
    .join(", ");
}

function readDetailData(html) {
  const $ = cheerio.load(html || "");
  const rawJson = $("#__NEXT_DATA__").text();
  if (!rawJson) return null;

  try {
    const data = JSON.parse(rawJson)?.props?.pageProps?.data;
    return data?._type === "event" ? data : null;
  } catch {
    return null;
  }
}

async function fetchEventDetail(item, sourceUrl) {
  const detailUrl = detailUrlForSlug(item?.slug, sourceUrl);
  if (!detailUrl) return null;

  await assertCanFetchUrl(detailUrl);
  await waitForRateLimit(detailUrl);
  const response = await fetch(detailUrl, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent":
        "SummitSceneBot/1.0 (+https://summitscene.ca; event discovery)",
    },
  });
  if (!response.ok) return null;

  const data = readDetailData(await response.text());
  if (!data) return null;

  const firstDate = Array.isArray(data.dates) ? data.dates[0] : null;
  const button = Array.isArray(data.buttons) ? data.buttons[0] : null;
  const exactLink =
    button?.memberLink?.link ||
    button?.external ||
    button?.customButton?.url ||
    "";
  const location = data.content
    ?.flatMap((section) => section?.locations || [])
    ?.find((item) => Number.isFinite(item?.lat) && Number.isFinite(item?.lng));

  return {
    title: cleanText(data.title),
    dateText: cleanText(data.dateInfo || firstDate?.start),
    startDate: firstDate?.start,
    endDate: firstDate?.end,
    startTime: formatTimeFromIso(firstDate?.start),
    endTime: formatTimeFromIso(firstDate?.end),
    venue: cleanText(data.displayVenue || data.venue || button?.memberLink?.entity?.title),
    address: formatAddress(data.address),
    ticketUrl: resolveUrl(exactLink, sourceUrl),
    sourceUrl: detailUrl,
    latitude: location?.lat,
    longitude: location?.lng,
  };
}

function mapTourismItemToExtractedEvent(item, sourceUrl) {
  const firstDate = Array.isArray(item?.dates) ? item.dates[0] : null;

  return {
    title: cleanText(item?.title),
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

async function fetchListPage(sourceUrl, page, listConfig) {
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

  await assertCanFetchUrl(endpoint.toString());
  await waitForRateLimit(endpoint.toString());
  const response = await fetch(endpoint.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "SummitSceneBot/1.0 (+https://summitscene.ca; event discovery)",
    },
  });
  if (!response.ok) {
    throw new Error(`Banff Lake Louise list-data returned HTTP ${response.status}`);
  }

  return response.json();
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
    const data = await fetchListPage(source.url, page, listConfig).catch((error) => {
      if (/robots\.txt/i.test(error.message)) return null;
      throw error;
    });
    if (!data) return null;

    for (const item of data.items || []) {
      const baseEvent = mapTourismItemToExtractedEvent(item, source.url);
      const detailEvent = await fetchEventDetail(item, source.url).catch(
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

export { mapTourismItemToExtractedEvent };
