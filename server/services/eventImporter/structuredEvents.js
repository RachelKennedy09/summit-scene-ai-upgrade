import { parseEventTime } from "./dateParsing.js";

const clean = (value) => typeof value === "string" || typeof value === "number" ? String(value).replace(/\s+/g, " ").trim() : "";
function link(value, base) {
  try { const url = new URL(value, base); return /^https?:$/.test(url.protocol) ? url.href : ""; } catch { return ""; }
}

// Traverse graphs and ItemLists as well as embedded subEvents. Resolve @id
// references used by schema.org publishers for their Place and Offer objects.
export function readStructuredEvents($, sourceUrl) {
  const nodes = [];
  function walk(value) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) { value.forEach(walk); return; }
    nodes.push(value);
    Object.values(value).forEach(walk);
  }
  $("script[type='application/ld+json']").each((_, element) => {
    try { walk(JSON.parse($(element).contents().text())); } catch { /* Fall back to HTML. */ }
  });
  const ids = new Map(nodes.filter((item) => item["@id"] && Object.keys(item).length > 1).map((item) => [item["@id"], item]));
  const resolve = (value) => {
    const first = Array.isArray(value) ? value[0] : value;
    return ids.get(first?.["@id"]) || first || {};
  };
  return nodes.filter((item) => [item["@type"]].flat().some((type) => /(?:^|[/#])\w*Event$/.test(type || ""))).map((item) => {
    const location = resolve(item.location);
    const address = resolve(location.address);
    const offer = resolve(item.offers);
    const price = offer.price ?? offer.lowPrice;
    return {
      title: clean(item.name), description: clean(item.description),
      dateText: [item.startDate, item.endDate].filter(Boolean).join(" - "),
      startDate: item.startDate, endDate: item.endDate,
      startTime: parseEventTime(item.startDate), endTime: parseEventTime(item.endDate),
      venue: clean(location.name) || clean(location),
      address: clean(address) || [address.streetAddress, address.addressLocality, address.addressRegion, address.postalCode].map(clean).filter(Boolean).join(", "),
      town: clean(address.addressLocality),
      price: price === 0 || price === "0" ? "Free" : clean(price),
      ticketUrl: link(offer.url || item.url || "", sourceUrl),
      sourceUrl: link(item.url || "", sourceUrl) || sourceUrl,
      extractionMethod: "json-ld",
    };
  }).filter((event) => event.title);
}
