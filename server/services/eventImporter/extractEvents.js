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

  if (lower.includes("thebossbanff.com")) {
    return {
      venue: "THE BOSS Kitchen & Bar",
      address: "229 Banff Avenue, Banff, AB",
      category: "Food & Drink",
    };
  }

  if (
    lower.includes("banffsocial.ca") ||
    lower.includes("sphere-aardvark-r8rf.squarespace.com")
  ) {
    return {
      venue: "Banff Social",
      address: "221 Bear St, Banff, AB",
      category: "Food & Drink",
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

  if (lower.includes("carter-ryan.com")) {
    return {
      venue: "Carter-Ryan Theatre",
      address: "705 Main Street, Canmore, AB",
      category: "Arts & Creativity",
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
            sourceUrl: resolveUrl(item.url, sourceUrl) || sourceUrl,
            extractionMethod: "json-ld",
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
      dateText: parsed.dateText,
      startTime: parsed.startTime,
      venue: knownDetails.venue,
      address: knownDetails.address,
      category: knownDetails.category,
      ticketUrl: resolvedLink,
      sourceUrl: resolvedLink,
      extractionMethod: "dated-link",
    });
  });

  return events;
}

function findNearbySkiLouiseCard($, linkNode) {
  let node = linkNode.parent();

  for (let depth = 0; depth < 8 && node.length; depth += 1) {
    const text = cleanText(node.text());
    const title = cleanText(node.find("h1,h2,h3,h4").first().text());

    if (
      title &&
      readDateRangeText(text) &&
      /more details/i.test(text) &&
      !/^the best views of the canadian rockies$/i.test(title)
    ) {
      return node;
    }

    node = node.parent();
  }

  return linkNode.closest(
    "article,li,.card,[class*='card' i],[class*='event' i],[class*='post' i]"
  );
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

function resolveFirstLinkByText($, sourceUrl, pattern) {
  const link = $("a[href]")
    .filter((_, element) => pattern.test(cleanText($(element).text())))
    .first()
    .attr("href");

  return resolveUrl(link, sourceUrl);
}

function getUniqueEventbriteLinks($, sourceUrl) {
  const seen = new Set();
  const links = [];

  $("a[href*='eventbrite']").each((_, element) => {
    const url = resolveUrl($(element).attr("href"), sourceUrl);
    if (!url || seen.has(url)) return;
    seen.add(url);
    links.push(url);
  });

  return links;
}

function buildCarterRyanRun({
  title,
  description,
  startDate,
  endDate,
  startTime,
  weekdays,
  venue,
  address,
  town = "Canmore",
  ticketUrl,
  sourceUrl,
}) {
  return {
    title,
    description,
    dateText: `${startDate} - ${endDate}`,
    startDate,
    endDate,
    startTime,
    scheduleType: "recurring",
    recurrence: {
      frequency: weekdays?.length ? "selected_weekdays" : "daily",
      weekdays: weekdays || [],
      dates: [],
      untilDate: endDate,
    },
    venue,
    address,
    town,
    category: "Arts & Creativity",
    ticketUrl: ticketUrl || sourceUrl,
    sourceUrl: ticketUrl || sourceUrl,
    extractionMethod: "carter-ryan-season",
  };
}

function readCarterRyanTheatreEvents($, sourceUrl) {
  if (!String(sourceUrl || "").toLowerCase().includes("carter-ryan.com")) {
    return [];
  }

  const text = cleanText($.root().text());
  const eventbriteLinks = getUniqueEventbriteLinks($, sourceUrl);
  const ohAnneLink =
    resolveFirstLinkByText($, sourceUrl, /tickets\s+for\s+oh,\s*anne.*canmore/i) ||
    eventbriteLinks[0];
  const freeRangeLink =
    resolveFirstLinkByText($, sourceUrl, /^buy tickets$/i) ||
    eventbriteLinks[1] ||
    sourceUrl;
  const aintFunLink =
    resolveFirstLinkByText($, sourceUrl, /ain.?t\s+we\s+got\s+fun/i) ||
    sourceUrl;
  const banffLakeLouiseLink =
    resolveFirstLinkByText($, sourceUrl, /^event details$/i) || sourceUrl;
  const events = [];

  if (/OH ANNE!/i.test(text) && /AUG\s+21\s*-\s*SEPT\s+6,\s*2026/i.test(text)) {
    events.push(
      buildCarterRyanRun({
        title: "OH ANNE!",
        description:
          "A musical adaptation of Anne from Green Gables in Canmore.",
        startDate: "August 21 2026",
        endDate: "September 6 2026",
        venue: "Canmore Collegiate High School",
        address: "Canmore Collegiate High School, Canmore, AB",
        ticketUrl: ohAnneLink,
        sourceUrl,
      })
    );
  }

  if (/FREE RANGE COUNTRY/i.test(text) && /August\s+20\s*-\s*September\s+6,\s*2026/i.test(text)) {
    const shared = {
      description:
        "A live theatre celebration of country music history at Carter-Ryan Theatre.",
      startDate: "August 20 2026",
      endDate: "September 6 2026",
      venue: "Carter-Ryan Theatre",
      address: "705 Main Street, Canmore, AB",
      ticketUrl: freeRangeLink,
      sourceUrl,
    };
    events.push(
      buildCarterRyanRun({
        ...shared,
        title: "Free Range Country - Evening performances",
        startTime: "7:30 PM",
        weekdays: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      }),
      buildCarterRyanRun({
        ...shared,
        title: "Free Range Country - Matinee performances",
        startTime: "3:00 PM",
        weekdays: ["Wednesday", "Sunday"],
      })
    );
  }

  if (/AIN.?T WE GOT FUN/i.test(text) && /September\s+24\s*-\s*November\s+8,\s*2026/i.test(text)) {
    const shared = {
      description:
        "A new musical at Carter-Ryan Theatre in Canmore.",
      startDate: "September 24 2026",
      endDate: "November 8 2026",
      venue: "Carter-Ryan Theatre",
      address: "705 Main Street, Canmore, AB",
      ticketUrl: aintFunLink,
      sourceUrl,
    };
    events.push(
      buildCarterRyanRun({
        ...shared,
        title: "Ain't We Got Fun? - Evening performances",
        startTime: "7:30 PM",
        weekdays: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      }),
      buildCarterRyanRun({
        ...shared,
        title: "Ain't We Got Fun? - Matinee performances",
        startTime: "3:00 PM",
        weekdays: ["Saturday", "Sunday"],
      })
    );
  }

  if (/A Christmas Carol/i.test(text) && /November\s+27\s*-\s*December\s+27,\s*2026/i.test(text)) {
    events.push(
      buildCarterRyanRun({
        title: "A Christmas Carol",
        description:
          "A holiday theatre production at Carter-Ryan Theatre in Canmore.",
        startDate: "November 27 2026",
        endDate: "December 27 2026",
        venue: "Carter-Ryan Theatre",
        address: "705 Main Street, Canmore, AB",
        ticketUrl: sourceUrl,
        sourceUrl,
      })
    );
  }

  if (/Bridget Ryan.?s CHRISTMAS PARTY/i.test(text) && /December\s+2\s*-\s*January\s+3,\s*2027/i.test(text)) {
    events.push(
      buildCarterRyanRun({
        title: "Bridget Ryan's Christmas Party",
        description:
          "A holiday cabaret at Carter-Ryan Theatre in Canmore.",
        startDate: "December 2 2026",
        endDate: "January 3 2027",
        venue: "Carter-Ryan Theatre",
        address: "705 Main Street, Canmore, AB",
        ticketUrl: sourceUrl,
        sourceUrl,
      })
    );
  }

  if (/In Search Of Christmas Spirit/i.test(text) && /NOVEMBER\s+14\s*-\s*DECEMBER\s+31,\s*2026/i.test(text)) {
    events.push(
      buildCarterRyanRun({
        title: "In Search Of Christmas Spirit",
        description:
          "A self-guided Christmas experience at Cascade of Time Gardens in Banff.",
        startDate: "November 14 2026",
        endDate: "December 31 2026",
        venue: "Cascade of Time Gardens",
        address: "Cascade of Time Gardens, Banff, AB",
        town: "Banff",
        ticketUrl: banffLakeLouiseLink,
        sourceUrl: banffLakeLouiseLink,
      })
    );
  }

  return events;
}

function readExploreCanmoreDateText(text) {
  const normalized = cleanText(text);

  const fullRangeMatch = normalized.match(
    new RegExp(
      `\\b(${MONTH_PATTERN})\\.?\\s+\\d{1,2}(?:,?\\s+\\d{4})?\\s*-\\s*` +
        `(?:(?:${MONTH_PATTERN})\\.?\\s+)?\\d{1,2},?\\s+\\d{4}\\b`,
      "i"
    )
  );
  if (fullRangeMatch) return cleanText(fullRangeMatch[0]);

  const noYearRangeMatch = normalized.match(
    new RegExp(
      `\\b(${MONTH_PATTERN})\\.?\\s+\\d{1,2}\\s*-\\s*(?:${MONTH_PATTERN})\\.?\\s+\\d{1,2}\\b`,
      "i"
    )
  );
  if (noYearRangeMatch) return cleanText(noYearRangeMatch[0]);

  const noYearSingleMatch = normalized.match(
    new RegExp(`\\b(${MONTH_PATTERN})\\.?\\s+\\d{1,2}\\b`, "i")
  );
  return noYearSingleMatch ? cleanText(noYearSingleMatch[0]) : "";
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
  const candidates = ".listing,.event-listing";

  $(candidates).each((_, element) => {
    const card = $(element);
    const cardText = cleanText(card.text());
    if (!/more details/i.test(cardText) || /featured stories/i.test(cardText)) return;

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
    if (!title || /^(festivals & events|upcoming events)$/i.test(title)) return;

    const dateText = readExploreCanmoreDateText(
      cleanText(cardText.replace(title, " "))
    );
    if (!dateText) return;

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
      extractionMethod: "explore-canmore-listing",
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
      cleanText(card.find("h1,h2,h3,h4").first().text()) ||
      cleanText(linkNode.prevAll("h1,h2,h3,h4").first().text());
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
      extractionMethod: "ski-louise-listing",
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
    if (!title || /^show all$/i.test(title) || title === dateText) return;

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
      extractionMethod: "skibig3-card",
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
  price,
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
    price,
    ticketUrl: sourceUrl,
    sourceUrl,
    extractionMethod: "known-recurring-source",
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

  if (lower.includes("thebossbanff.com") && /happy\s+hour/i.test(text)) {
    const bossHappyHourUrl = "https://thebossbanff.com/menu/";

    events.push(
      buildRecurringSourceEvent({
        title: "THE BOSS Happy Hour - Afternoon",
        description:
          "Lounge-only happy hour with food and drink specials daily from 3:00 PM to 6:00 PM.",
        sourceUrl: bossHappyHourUrl,
        startTime: "3:00 PM",
        endTime: "6:00 PM",
        price: "Items from $5",
        category: "Food & Drink",
      }),
      buildRecurringSourceEvent({
        title: "THE BOSS Happy Hour - Late Night",
        description:
          "Lounge-only happy hour with food and drink specials daily from 9:00 PM to 11:00 PM.",
        sourceUrl: bossHappyHourUrl,
        startTime: "9:00 PM",
        endTime: "11:00 PM",
        price: "Items from $5",
        category: "Food & Drink",
      })
    );
  }

  if (
    (lower.includes("banffsocial.ca") ||
      lower.includes("sphere-aardvark-r8rf.squarespace.com")) &&
    /happy\s+hour/i.test(text)
  ) {
    const banffSocialMenuUrl = "https://banffsocial.ca/menus";

    events.push(
      buildRecurringSourceEvent({
        title: "Banff Social Happy Hour - Afternoon",
        description:
          "Happy hour food and drink specials at Banff Social from 3:00 PM to 6:00 PM.",
        sourceUrl: banffSocialMenuUrl,
        startTime: "3:00 PM",
        endTime: "6:00 PM",
        price: "Items from $5",
        category: "Food & Drink",
      }),
      buildRecurringSourceEvent({
        title: "Banff Social Happy Hour - Evening",
        description:
          "Happy hour food and drink specials at Banff Social from 8:00 PM to close.",
        sourceUrl: banffSocialMenuUrl,
        startTime: "8:00 PM",
        price: "Items from $5",
        category: "Food & Drink",
      })
    );
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
    const venue = getKnownVenueFromText(text);
    const key = `${title.toLowerCase()}|${text.slice(0, 120).toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);

    events.push({
      title,
      dateText: text,
      venue,
      sourceUrl: resolveUrl(link, sourceUrl) || sourceUrl,
      extractionMethod: "generic-html",
    });
  });

  return events;
}

export function extractEvents(html, source) {
  const $ = cheerio.load(html || "");
  const sourceUrl = source?.url || "";
  const lowerSourceUrl = sourceUrl.toLowerCase();
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
  const carterRyanEvents = readCarterRyanTheatreEvents($, sourceUrl);
  if (carterRyanEvents.length) {
    return [
      ...jsonLdEvents,
      ...nextDataEvents,
      ...carterRyanEvents,
      ...knownRecurringEvents,
    ].filter((event) => event.title);
  }

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

  if (
    lowerSourceUrl.includes("chateau-lake-louise.com") ||
    lowerSourceUrl.includes("explorecanmore.ca") ||
    lowerSourceUrl.includes("skibig3.com") ||
    lowerSourceUrl.includes("skilouise.com")
  ) {
    return [
      ...jsonLdEvents,
      ...nextDataEvents,
      ...datedLinkEvents,
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
