import * as cheerio from "cheerio";

const EVENT_SELECTOR =
  "[class*='event' i], [id*='event' i], article, li, .card";

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

function readGenericHtmlEvents($, sourceUrl) {
  const events = [];
  const seen = new Set();

  $(EVENT_SELECTOR).each((_, element) => {
    const node = $(element);
    const text = cleanText(node.text());
    if (text.length < 30 || text.length > 3000) return;

    const title =
      cleanText(node.find("h1,h2,h3,h4,[class*='title' i]").first().text()) ||
      cleanText(node.attr("aria-label")) ||
      text.slice(0, 90);
    if (!title || title.length < 3) return;

    const link = node.find("a[href]").first().attr("href");
    const image = node.find("img[src]").first().attr("src");
    const key = `${title.toLowerCase()}|${text.slice(0, 120).toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);

    events.push({
      title,
      description: text,
      dateText: text,
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
  const genericEvents = readGenericHtmlEvents($, sourceUrl);

  return [...jsonLdEvents, ...genericEvents].filter((event) => event.title);
}
