import * as cheerio from "cheerio";

const EVENT_SELECTOR =
  "[class*='event' i], [id*='event' i], article, li, .card";
const KNOWN_BANFF_CENTRE_VENUES = [
  "Jeanne & Peter Lougheed Building",
  "Margaret Greenham Theatre",
  "Rolston Recital Hall",
  "Walter Phillips Gallery",
  "Jenny Belzberg Theatre",
  "Eric Harvie Theatre",
  "Glyde Hall",
  "CLVB '33",
  "Le Café",
];

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

function getKnownVenueFromText(text) {
  const afterDate = cleanText(text).replace(
    /^Date:\s+.+?\d{4}(?:\s*@\s*\d{1,2}:\d{2}\s*(?:AM|PM))?(?:\s*-\s*.+?\d{4})?\s+/i,
    ""
  );

  return KNOWN_BANFF_CENTRE_VENUES.find((venue) =>
    afterDate.toLowerCase().startsWith(venue.toLowerCase())
  );
}

function readJsonLdEvents($, sourceUrl) {
  const events = [];

  $("script[type='application/ld+json']").each((_, element) => {
    const rawJson = $(element).contents().text();
    if (!rawJson) return;

    try {
      const parsed = JSON.parse(rawJson);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const flattened = items.flatMap((item) => {
        if (Array.isArray(item?.["@graph"])) return item["@graph"];
        if (Array.isArray(item?.itemListElement)) {
          return item.itemListElement.map((entry) => entry.item || entry);
        }
        return [item];
      });

      flattened
        .filter((item) => String(item?.["@type"] || "").includes("Event"))
        .forEach((item) => {
          events.push({
            title: cleanText(item.name),
            description: cleanText(item.description),
            dateText: cleanText([item.startDate, item.endDate].filter(Boolean).join(" - ")),
            startDate: item.startDate,
            endDate: item.endDate,
            venue:
              cleanText(item.location?.name) ||
              cleanText(item.location?.address?.name),
            address:
              cleanText(item.location?.address?.streetAddress) ||
              cleanText(item.location?.address),
            price: cleanText(item.offers?.price || item.offers?.lowPrice),
            ticketUrl: resolveUrl(item.offers?.url || item.url, sourceUrl),
            imageUrl: resolveUrl(Array.isArray(item.image) ? item.image[0] : item.image, sourceUrl),
            sourceUrl: resolveUrl(item.url, sourceUrl) || sourceUrl,
            extractionMethod: "json-ld",
            raw: item,
          });
        });
    } catch {
      // Broken JSON-LD is common. The generic HTML pass still has a chance.
    }
  });

  return events;
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

function readNextDataEvents($, sourceUrl) {
  const rawJson = $("#__NEXT_DATA__").text();
  if (!rawJson) return [];

  try {
    const parsed = JSON.parse(rawJson);
    const lists = parsed?.props?.pageProps?.data?.content
      ?.flatMap((section) => section?.lists || [])
      ?.filter(Boolean) || [];
    const items = lists.flatMap((list) => list.initialItems || []);

    return items
      .filter((item) => item?.type === "event" && item?.title)
      .map((item) => {
        const firstDate = Array.isArray(item.dates) ? item.dates[0] : null;
        const imageUrl =
          item.bynderImage?.defaultUrl ||
          item.bynderImage?.previewUrl ||
          item.image?.asset?.url;

        return {
          title: cleanText(item.title),
          description: cleanText(item.cardSummary),
          category: cleanText(item.tag),
          dateText: cleanText(item.dateInfo || firstDate?.start),
          startDate: firstDate?.start,
          endDate: firstDate?.end,
          startTime: formatTimeFromIso(firstDate?.start),
          endTime: formatTimeFromIso(firstDate?.end),
          sourceUrl: resolveUrl(
            item.slug ? `/events/${cleanText(item.slug)}` : "",
            sourceUrl
          ) || sourceUrl,
          imageUrl: resolveUrl(imageUrl, sourceUrl),
          extractionMethod: "next-data",
          raw: item,
        };
      });
  } catch {
    return [];
  }
}

function readGenericHtmlEvents($, sourceUrl) {
  const events = [];
  const seen = new Set();

  $(EVENT_SELECTOR).each((_, element) => {
    const node = $(element);
    const text = cleanText(node.text());
    if (text.length < 30 || text.length > 3000) return;

    // Banff Centre pages expose nested date/venue fragments. Keep only full
    // event cards so review candidates do not get titles like "Date: Thu...".
    if (
      sourceUrl.includes("banffcentre.ca") &&
      text.startsWith("Date:") &&
      (text.length < 90 || !/(View Event|Attend Free|View Past Event|\$\d)/i.test(text))
    ) {
      return;
    }

    const title =
      cleanText(node.find("h1,h2,h3,h4,[class*='title' i]").first().text()) ||
      cleanText(node.attr("aria-label")) ||
      text.slice(0, 90);
    if (!title || title.length < 3) return;
    if (/^Date:/i.test(title)) return;

    const link = node.find("a[href]").first().attr("href");
    const image = node.find("img[src]").first().attr("src");
    const venue = getKnownVenueFromText(text);
    const key = `${title.toLowerCase()}|${text.slice(0, 120).toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);

    events.push({
      title,
      description: text,
      dateText: text,
      venue,
      sourceUrl: resolveUrl(link, sourceUrl) || sourceUrl,
      imageUrl: resolveUrl(image, sourceUrl),
      extractionMethod: "generic-html",
      raw: { text },
    });
  });

  return events;
}

export function extractEvents(html, source) {
  const $ = cheerio.load(html || "");
  const sourceUrl = source?.url || "";
  const jsonLdEvents = readJsonLdEvents($, sourceUrl);
  const nextDataEvents = readNextDataEvents($, sourceUrl);
  if (nextDataEvents.length) {
    return [...jsonLdEvents, ...nextDataEvents].filter((event) => event.title);
  }

  const genericEvents = readGenericHtmlEvents($, sourceUrl);

  return [...jsonLdEvents, ...nextDataEvents, ...genericEvents].filter(
    (event) => event.title
  );
}
