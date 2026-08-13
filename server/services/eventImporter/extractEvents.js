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

  if (lower.includes("chateau-lake-louise.com")) {
    return {
      venue: "Fairmont Chateau Lake Louise",
      address: "111 Lake Louise Drive, Lake Louise, AB",
      category: "Resort Activities",
    };
  }

  if (lower.includes("skibig3.com")) {
    return {
      venue: "SkiBig3",
      address: "Banff and Lake Louise, AB",
      category: "Outdoors & Sports",
    };
  }

  if (lower.includes("explorecanmore.ca")) {
    return {
      venue: "Canmore Kananaskis",
      address: "Canmore, AB",
      category: "Inclusive Community",
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

function readDateRangeText(text) {
  const normalized = cleanText(text);
  const rangeMatch = normalized.match(
    new RegExp(
      `\\b(${MONTH_PATTERN})\\.?\\s+(\\d{1,2})(?:,?\\s+(\\d{4}))?\\s*-\\s*` +
        `(?:(?:${MONTH_PATTERN})\\.?\\s+)?\\d{1,2},?\\s+\\d{4}\\b`,
      "i"
    )
  );
  if (rangeMatch) return cleanText(rangeMatch[0]);

  const noYearRangeMatch = normalized.match(
    new RegExp(
      `\\b(${MONTH_PATTERN})\\.?\\s+\\d{1,2}\\s*-\\s*(?:${MONTH_PATTERN})\\.?\\s+\\d{1,2}\\b`,
      "i"
    )
  );
  if (noYearRangeMatch) return cleanText(noYearRangeMatch[0]);

  const singleMatch = normalized.match(
    new RegExp(`\\b(${MONTH_PATTERN})\\.?\\s+\\d{1,2},?\\s+\\d{4}\\b`, "i")
  );
  if (singleMatch) return cleanText(singleMatch[0]);

  const noYearSingleMatch = normalized.match(
    new RegExp(`\\b(${MONTH_PATTERN})\\.?\\s+\\d{1,2}\\b`, "i")
  );
  if (noYearSingleMatch) return cleanText(noYearSingleMatch[0]);

  const dayFirstMatch = normalized.match(
    new RegExp(
      `\\b(?:${WEEKDAY_PATTERN})?\\.?[,]?\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_PATTERN})\\.?\\s+\\d{4}\\b`,
      "i"
    )
  );
  return dayFirstMatch ? cleanText(dayFirstMatch[0]) : "";
}

function splitDateRangeText(dateText) {
  const normalized = cleanText(dateText);
  const rangeMatch = normalized.match(
    new RegExp(
      `^(${MONTH_PATTERN})\\.?\\s+(\\d{1,2})(?:,?\\s+(\\d{4}))?\\s*-\\s*` +
        `(?:((${MONTH_PATTERN})\\.? )?(\\d{1,2}),?\\s+(\\d{4}))$`,
      "i"
    )
  );

  if (rangeMatch) {
    const startMonth = rangeMatch[1];
    const startDay = rangeMatch[2];
    const startYear = rangeMatch[3] || rangeMatch[7];
    const endMonth = rangeMatch[5] || startMonth;
    const endDay = rangeMatch[6];
    const endYear = rangeMatch[7];

    return {
      startDate: cleanText(`${startMonth} ${startDay} ${startYear}`),
      endDate: cleanText(`${endMonth} ${endDay} ${endYear}`),
    };
  }

  const noYearRangeMatch = normalized.match(
    new RegExp(
      `^(${MONTH_PATTERN})\\.?\\s+(\\d{1,2})\\s*-\\s*(${MONTH_PATTERN})\\.?\\s+(\\d{1,2})$`,
      "i"
    )
  );
  if (noYearRangeMatch) {
    return {
      startDate: cleanText(`${noYearRangeMatch[1]} ${noYearRangeMatch[2]}`),
      endDate: cleanText(`${noYearRangeMatch[3]} ${noYearRangeMatch[4]}`),
    };
  }

  return { startDate: normalized, endDate: "" };
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

function findNearbySkiLouiseCard($, linkNode) {
  const closestCard = linkNode.closest(
    "article,li,.card,[class*='card' i],[class*='event' i],[class*='post' i]"
  );
  if (closestCard.length && closestCard.find("h2,h3").length) {
    return closestCard;
  }

  const parent = linkNode.parent();
  if (parent.length && parent.find("h2,h3").length) {
    return parent;
  }

  return closestCard.length ? closestCard : parent;
}

function inferSkiLouiseCategory(text) {
  const lower = String(text || "").toLowerCase();
  if (/(music|acoustic|band|patio party)/i.test(lower)) return "Music & Nightlife";
  if (/(beer|pint|bbq|dining|draft)/i.test(lower)) return "Food & Drink";
  if (/(litter|community|volunteer)/i.test(lower)) return "Inclusive Community";
  return "Outdoors & Sports";
}

function inferChateauCategory(text) {
  const lower = String(text || "").toLowerCase();
  if (/(yoga|meditation|mobility|wellness|spa|fitness)/i.test(lower)) return "Wellness";
  if (/(wine|dine|beer|culinary|afternoon tea|food)/i.test(lower)) return "Food & Drink";
  if (/(kids|family|camp)/i.test(lower)) return "Family & Pets";
  if (/(art|culture|music|craft)/i.test(lower)) return "Arts & Creativity";
  if (/(canoe|bike|e-bike|hike|outdoor|adventure)/i.test(lower)) return "Outdoors & Sports";
  return "Tours & Experiences";
}

function inferSkiBig3Category(text) {
  const lower = String(text || "").toLowerCase();
  if (/(music|dj|concert|apres|après|party|festival)/i.test(lower)) return "Music & Nightlife";
  if (/(beer|pint|food|dining|patio|bbq)/i.test(lower)) return "Food & Drink";
  if (/(family|kids|children)/i.test(lower)) return "Family & Pets";
  if (/(community|fundraiser|volunteer)/i.test(lower)) return "Inclusive Community";
  if (/(yoga|wellness|fitness)/i.test(lower)) return "Wellness";
  return "Outdoors & Sports";
}

function inferExploreCanmoreCategory(text) {
  const lower = String(text || "").toLowerCase();
  if (/(music|musical|concert|country|dj|duo|band|festival)/i.test(lower)) return "Music & Nightlife";
  if (/(dinner|food|brew|wine|market|restaurant|friends)/i.test(lower)) return "Food & Drink";
  if (/(paint|art|journal|gallery|theatre|cultural)/i.test(lower)) return "Arts & Creativity";
  if (/(disc golf|biathlon|race|sport|run|bike|trail)/i.test(lower)) return "Outdoors & Sports";
  if (/(family|kids|children)/i.test(lower)) return "Family & Pets";
  return "Inclusive Community";
}

function readGoogleAddressFromCard($, card) {
  const googleLink = card
    .find("a[href*='google.com'],a[href*='maps.google']")
    .first();
  return cleanText(googleLink.text());
}

function readExploreCanmoreEvents($, sourceUrl) {
  if (!String(sourceUrl || "").toLowerCase().includes("explorecanmore.ca")) {
    return [];
  }

  const events = [];
  const seen = new Set();
  const knownDetails = getKnownSourceDetails(sourceUrl);
  const candidates = [
    "article",
    "li",
    ".card",
    "[class*='card' i]",
    "[class*='event' i]",
    "[class*='listing' i]",
  ].join(",");

  $(candidates).each((_, element) => {
    const card = $(element);
    const cardText = cleanText(card.text());
    if (!/more details/i.test(cardText) || /featured stories/i.test(cardText)) return;

    const dateText = readDateRangeText(cardText);
    if (!dateText) return;

    const titleLink = card
      .find("a[href]")
      .filter((__, link) => {
        const text = cleanText($(link).text());
        return text.length > 4 && !/^(more details|visit website|load more)$/i.test(text);
      })
      .first();
    const title =
      cleanText(card.find("h1,h2,h3,h4,[class*='title' i]").first().text()) ||
      cleanText(titleLink.text());
    if (!title) return;

    const detailsLink =
      card
        .find("a[href]")
        .filter((__, link) => /^more details$/i.test(cleanText($(link).text())))
        .first()
        .attr("href") || titleLink.attr("href");
    const websiteLink = card
      .find("a[href]")
      .filter((__, link) => /^visit website$/i.test(cleanText($(link).text())))
      .first()
      .attr("href");
    const sourceLink = resolveUrl(detailsLink, sourceUrl) || sourceUrl;
    const ticketLink = resolveUrl(websiteLink, sourceUrl) || sourceLink;
    const key = `${sourceLink}|${title}|${dateText}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    const { startDate, endDate } = splitDateRangeText(dateText);
    const address = readGoogleAddressFromCard($, card) || knownDetails.address;
    const description =
      cleanText(card.find("p").first().text()) ||
      cleanText(
        cardText
          .replace(title, "")
          .replace(dateText, "")
          .replace(address, "")
          .replace(/More details/i, "")
          .replace(/Visit Website/i, "")
      );

    events.push({
      title,
      description,
      dateText,
      startDate,
      endDate,
      town: "Canmore",
      venue: knownDetails.venue,
      address,
      category: inferExploreCanmoreCategory(`${title} ${description}`),
      ticketUrl: ticketLink,
      sourceUrl: sourceLink,
      imageUrl: resolveUrl(card.find("img[src]").first().attr("src"), sourceUrl),
      extractionMethod: "explore-canmore-listing",
      raw: { text: cardText },
    });
  });

  return events;
}

function readSkiLouiseEvents($, sourceUrl) {
  if (!String(sourceUrl || "").toLowerCase().includes("skilouise.com")) {
    return [];
  }

  const events = [];
  const seen = new Set();
  const knownDetails = getKnownSourceDetails(sourceUrl);

  $("a[href]").each((_, element) => {
    const linkNode = $(element);
    if (!/^more details$/i.test(cleanText(linkNode.text()))) return;

    const sourceLink = resolveUrl(linkNode.attr("href"), sourceUrl) || sourceUrl;
    if (seen.has(sourceLink)) return;

    const card = findNearbySkiLouiseCard($, linkNode);
    const cardText = cleanText(card.text());
    const title =
      cleanText(card.find("h2,h3").first().text()) ||
      cleanText(linkNode.prevAll("h2,h3").first().text());
    const dateText = readDateRangeText(cardText);
    const description =
      cleanText(card.find("p").first().text()) ||
      cleanText(cardText.replace(title, "").replace(dateText, "").replace(/More Details/i, ""));

    if (!title || !dateText) return;
    seen.add(sourceLink);

    const { startDate, endDate } = splitDateRangeText(dateText);

    events.push({
      title,
      description,
      dateText,
      startDate,
      endDate,
      venue: knownDetails.venue,
      address: knownDetails.address,
      category: inferSkiLouiseCategory(`${title} ${description}`),
      ticketUrl: sourceLink,
      sourceUrl: sourceLink,
      imageUrl: resolveUrl(card.find("img[src]").first().attr("src"), sourceUrl),
      extractionMethod: "ski-louise-listing",
      raw: { text: cardText },
    });
  });

  return events;
}

function readSkiBig3Events($, sourceUrl) {
  if (!String(sourceUrl || "").toLowerCase().includes("skibig3.com")) {
    return [];
  }

  const events = [];
  const seen = new Set();
  const knownDetails = getKnownSourceDetails(sourceUrl);
  const cardSelector = [
    "article",
    "li",
    ".card",
    "[class*='card' i]",
    "[class*='event' i]",
    "[class*='post' i]",
  ].join(",");

  $(cardSelector).each((_, element) => {
    const card = $(element);
    const cardText = cleanText(card.text());
    const dateText = readDateRangeText(cardText);
    if (!dateText) return;

    const title =
      cleanText(card.find("h1,h2,h3,h4,[class*='title' i]").first().text()) ||
      cleanText(
        card
          .find("a[href]")
          .filter((__, link) => cleanText($(link).text()).length > 8)
          .first()
          .text()
      );
    if (!title || /^show all$/i.test(title)) return;

    const link =
      card.find("a[href]").filter((__, link) => {
        const text = cleanText($(link).text());
        const href = String($(link).attr("href") || "");
        return (
          /details|learn|read|view/i.test(text) ||
          (!href.includes("#") && !/book now|show all|shopping_cart/i.test(text))
        );
      }).first().attr("href") ||
      card.find("a[href]").first().attr("href");
    const sourceLink = resolveUrl(link, sourceUrl) || sourceUrl;
    const key = `${sourceLink}|${title}|${dateText}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    const { startDate, endDate } = splitDateRangeText(dateText);
    const description =
      cleanText(card.find("p").first().text()) ||
      cleanText(cardText.replace(title, "").replace(dateText, ""));

    events.push({
      title,
      description,
      dateText,
      startDate,
      endDate,
      venue: knownDetails.venue,
      address: knownDetails.address,
      category: inferSkiBig3Category(`${title} ${description}`),
      ticketUrl: sourceLink,
      sourceUrl: sourceLink,
      imageUrl: resolveUrl(card.find("img[src]").first().attr("src"), sourceUrl),
      extractionMethod: "skibig3-card",
      raw: { text: cardText },
    });
  });

  return events;
}

function parseChateauCalendarCardText(rawText, sourceUrl) {
  const lines = String(rawText || "")
    .split(/\n+/)
    .map(cleanText)
    .filter(Boolean)
    .filter((line) => !/^image:/i.test(line));
  const frequencyIndex = lines.findIndex((line) => /^(daily|weekly|one time)$/i.test(line));
  if (frequencyIndex < 0) return null;

  const frequencyLabel = lines[frequencyIndex].toLowerCase();
  const title = lines[frequencyIndex + 1];
  if (!title || /^(daily|weekly|one time|view details)$/i.test(title)) return null;

  const details = lines.slice(frequencyIndex + 2);
  const viewDetailsIndex = details.findIndex((line) => /^view details$/i.test(line));
  const usefulDetails = viewDetailsIndex >= 0 ? details.slice(0, viewDetailsIndex) : details;
  const locationIndex = usefulDetails.findIndex((line) =>
    [
      "Agnes",
      "Alpine Social",
      "Boathouse",
      "Concierge Desk",
      "Fairview Bar",
      "Guides Cabin",
      "Living Room",
      "Louise",
      "Rental Shop",
      "Victoria Ballroom",
      "Victoria Terrace",
    ].some((location) => location.toLowerCase() === line.toLowerCase())
  );
  const description = cleanText(
    usefulDetails.slice(0, locationIndex >= 0 ? locationIndex : 1).join(" ")
  );
  const location = locationIndex >= 0 ? usefulDetails[locationIndex] : "";
  const time = usefulDetails.find((line) =>
    /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i.test(line)
  );
  const knownDetails = getKnownSourceDetails(sourceUrl);
  const isRecurring = frequencyLabel === "daily" || frequencyLabel === "weekly";

  return {
    title,
    description,
    dateText: cleanText([frequencyLabel, time].filter(Boolean).join(" ")),
    startTime: time,
    scheduleType: isRecurring ? "recurring" : "single",
    recurrence: isRecurring
      ? {
          frequency: frequencyLabel === "daily" ? "daily" : "weekly",
          weekdays: [],
          dates: [],
        }
      : undefined,
    venue: location
      ? `${knownDetails.venue} - ${location}`
      : knownDetails.venue,
    address: knownDetails.address,
    category: inferChateauCategory(`${title} ${description} ${rawText}`),
    ticketUrl: sourceUrl,
    sourceUrl,
    extractionMethod: "chateau-calendar-card",
    raw: { text: cleanText(rawText) },
  };
}

function readChateauCalendarEvents($, sourceUrl) {
  if (!String(sourceUrl || "").toLowerCase().includes("chateau-lake-louise.com")) {
    return [];
  }

  const events = [];
  const seen = new Set();
  const candidates = [
    "[class*='event' i]",
    "[class*='calendar' i]",
    "[class*='activity' i]",
    "article",
    "li",
  ].join(",");

  $(candidates).each((_, element) => {
    const text = $(element).text();
    if (!/\b(daily|weekly|one time)\b/i.test(text) || !/view details/i.test(text)) {
      return;
    }

    const event = parseChateauCalendarCardText(text, sourceUrl);
    if (!event?.title) return;

    const key = `${event.title}|${event.startTime}|${event.venue}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    events.push(event);
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
  const exploreCanmoreEvents = readExploreCanmoreEvents($, sourceUrl);
  const skiLouiseEvents = readSkiLouiseEvents($, sourceUrl);
  const skiBig3Events = readSkiBig3Events($, sourceUrl);
  const chateauCalendarEvents = readChateauCalendarEvents($, sourceUrl);
  if (chateauCalendarEvents.length) {
    return [
      ...jsonLdEvents,
      ...nextDataEvents,
      ...chateauCalendarEvents,
      ...knownRecurringEvents,
    ].filter((event) => event.title);
  }

  if (exploreCanmoreEvents.length) {
    return [
      ...jsonLdEvents,
      ...nextDataEvents,
      ...exploreCanmoreEvents,
      ...knownRecurringEvents,
    ].filter((event) => event.title);
  }

  if (skiLouiseEvents.length) {
    return [
      ...jsonLdEvents,
      ...nextDataEvents,
      ...skiLouiseEvents,
      ...knownRecurringEvents,
    ].filter((event) => event.title);
  }

  if (skiBig3Events.length) {
    return [
      ...jsonLdEvents,
      ...nextDataEvents,
      ...skiBig3Events,
      ...knownRecurringEvents,
    ].filter((event) => event.title);
  }

  const genericEvents = readGenericHtmlEvents($, sourceUrl);

  return [
    ...jsonLdEvents,
    ...nextDataEvents,
    ...datedLinkEvents,
    ...knownRecurringEvents,
    ...genericEvents,
  ].filter((event) => event.title);
}
