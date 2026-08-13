import * as cheerio from "cheerio";
import { mapTourismItemToExtractedEvent } from "./banffLakeLouiseSource.js";

const EVENT_SELECTOR =
  "[class*='event' i], [id*='event' i], article, li, .card";
const MONTH_PATTERN =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const WEEKDAY_PATTERN =
  "mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?";
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

function getKnownSourceDetails(sourceUrl) {
  const lower = String(sourceUrl || "").toLowerCase();

  if (lower.includes("roseandcrown.ca")) {
    return {
      venue: "Rose & Crown Banff",
      address: "202 Banff Ave, Banff, AB",
      category: "Music & Nightlife",
    };
  }

  if (lower.includes("dustybootbanff.com")) {
    return {
      venue: "The Dusty Boot Banff",
      address: "Banff, AB",
      category: "Music & Nightlife",
    };
  }

  if (lower.includes("fatoxbanff.ca")) {
    return {
      venue: "The Fat Ox",
      address: "415 Banff Ave, Banff, AB",
      category: "Food & Drink",
    };
  }

  if (lower.includes("skilouise.com")) {
    return {
      venue: "Lake Louise Ski Resort",
      address: "Lake Louise, AB",
      category: "Outdoors & Sports",
    };
  }

  return {};
}

function stripLinkChrome(text) {
  return cleanText(text)
    .replace(/\b(?:learn more|read more|view details|book now|reserve)\b\.?$/i, "")
    .trim();
}

function parseDatedLinkText(rawText) {
  const text = stripLinkChrome(rawText);
  if (!text || text.length < 8 || text.length > 180) return null;
  if (/^(reserve|menu|contact|instagram|facebook|tiktok|open in google maps)$/i.test(text)) {
    return null;
  }

  const startsWithDate = text.match(
    new RegExp(
      `^(?:(?:${WEEKDAY_PATTERN})\\.?[,]?\\s+)?` +
        `(${MONTH_PATTERN})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?` +
        `(?:,?\\s+(\\d{4}))?` +
        `(?:\\s+(\\d{1,2}(?::\\d{2})?\\s*(?:a\\.?m\\.?|p\\.?m\\.?)))?` +
        `\\s+(.+)$`,
      "i"
    )
  );

  if (startsWithDate) {
    const [, month, day, year, time, title] = startsWithDate;
    return {
      title: stripLinkChrome(title),
      dateText: cleanText([month, day, year, time].filter(Boolean).join(" ")),
      startTime: cleanText(time),
    };
  }

  const endsWithDate = text.match(
    new RegExp(
      `^(.+?)\\s+(${MONTH_PATTERN})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?$`,
      "i"
    )
  );

  if (endsWithDate) {
    const [, title, month, day, year] = endsWithDate;
    return {
      title: stripLinkChrome(title),
      dateText: cleanText([month, day, year].filter(Boolean).join(" ")),
    };
  }

  return null;
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
      .map((item) => ({
        ...mapTourismItemToExtractedEvent(item, sourceUrl),
        extractionMethod: "next-data",
      }));
  } catch {
    return [];
  }
}

function readDatedLinkEvents($, sourceUrl) {
  const events = [];
  const seen = new Set();
  const knownDetails = getKnownSourceDetails(sourceUrl);

  $("a[href]").each((_, element) => {
    const node = $(element);
    const parsed = parseDatedLinkText(node.text());
    if (!parsed?.title || parsed.title.length < 3) return;

    const link = node.attr("href");
    const resolvedLink = resolveUrl(link, sourceUrl) || sourceUrl;
    const key = `${resolvedLink}|${parsed.dateText}|${parsed.title}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    events.push({
      title: parsed.title,
      description: cleanText(node.closest("article,li,.card,[class*='event' i]").text()) || parsed.title,
      dateText: parsed.dateText,
      startTime: parsed.startTime,
      venue: knownDetails.venue,
      address: knownDetails.address,
      category: knownDetails.category,
      ticketUrl: resolvedLink,
      sourceUrl: resolvedLink,
      imageUrl: resolveUrl(
        node.closest("article,li,.card,[class*='event' i]").find("img[src]").first().attr("src"),
        sourceUrl
      ),
      extractionMethod: "dated-link",
      raw: { text: cleanText(node.text()) },
    });
  });

  return events;
}

function buildRecurringSourceEvent({
  title,
  description,
  sourceUrl,
  startTime,
  endTime,
  weekdays,
  category = "Music & Nightlife",
}) {
  const knownDetails = getKnownSourceDetails(sourceUrl);

  return {
    title,
    description,
    dateText: description,
    startTime,
    endTime,
    scheduleType: "recurring",
    recurrence: {
      frequency: weekdays?.length ? "selected_weekdays" : "daily",
      weekdays,
      dates: [],
    },
    venue: knownDetails.venue,
    address: knownDetails.address,
    category,
    ticketUrl: sourceUrl,
    sourceUrl,
    extractionMethod: "known-recurring-source",
    raw: { text: description },
  };
}

function readKnownRecurringEvents($, sourceUrl) {
  const lower = String(sourceUrl || "").toLowerCase();
  const text = cleanText($.root().text());
  const events = [];

  if (lower.includes("dustybootbanff.com")) {
    if (/50%\s+off\s+select\s+cocktails/i.test(text)) {
      events.push(
        buildRecurringSourceEvent({
          title: "Dusty Boot Happy Hour - Monday to Thursday",
          description:
            "50% off select cocktails and $6 Bud and Coors. Monday to Thursday, 5:00 PM to 7:00 PM.",
          sourceUrl,
          startTime: "5:00 PM",
          endTime: "7:00 PM",
          weekdays: ["Monday", "Tuesday", "Wednesday", "Thursday"],
          category: "Food & Drink",
        }),
        buildRecurringSourceEvent({
          title: "Dusty Boot Happy Hour - Friday to Sunday",
          description:
            "50% off select cocktails and $6 Bud and Coors. Friday to Sunday, 4:00 PM to 6:00 PM.",
          sourceUrl,
          startTime: "4:00 PM",
          endTime: "6:00 PM",
          weekdays: ["Friday", "Saturday", "Sunday"],
          category: "Food & Drink",
        })
      );
    }

    if (/line\s+dancing/i.test(text)) {
      events.push(
        buildRecurringSourceEvent({
          title: "Free Line Dancing at The Dusty Boot",
          description:
            "Free instructed line dancing on Tuesday, Wednesday and Sunday nights.",
          sourceUrl,
          startTime: "8:30 PM",
          weekdays: ["Tuesday", "Wednesday", "Sunday"],
        })
      );
    }

    if (/friday\s+live\s+music|live\s+music\s+from\s+6:30pm/i.test(text)) {
      events.push(
        buildRecurringSourceEvent({
          title: "Friday Live Music at The Dusty Boot",
          description: "Live music from 6:30 PM late every Friday.",
          sourceUrl,
          startTime: "6:30 PM",
          weekdays: ["Friday"],
        })
      );
    }

    if (/saturday\s+live\s+music|live\s+music\s+from\s+6:30pm/i.test(text)) {
      events.push(
        buildRecurringSourceEvent({
          title: "Saturday Live Music at The Dusty Boot",
          description: "Live music from 6:30 PM late every Saturday.",
          sourceUrl,
          startTime: "6:30 PM",
          weekdays: ["Saturday"],
        })
      );
    }
  }

  return events;
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

  const datedLinkEvents = readDatedLinkEvents($, sourceUrl);
  const knownRecurringEvents = readKnownRecurringEvents($, sourceUrl);
  const genericEvents = readGenericHtmlEvents($, sourceUrl);

  return [
    ...jsonLdEvents,
    ...nextDataEvents,
    ...datedLinkEvents,
    ...knownRecurringEvents,
    ...genericEvents,
  ].filter((event) => event.title);
}
