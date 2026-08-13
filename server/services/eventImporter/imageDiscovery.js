import * as cheerio from "cheerio";

const imageCache = new Map();
const SOURCE_FALLBACK_IMAGES = [
  {
    pattern: /banfflakelouise\.com/i,
    imageUrl:
      "https://banfflakelouise.bynder.com/m/9fd0f66d6f9b5d4/1000x540_jpg-2021_Banff_ArtinNatureTrail_RobertMassey_1.jpg",
  },
];

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveUrl(value, baseUrl) {
  if (!value) return "";
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return "";
  }
}

function firstSrcSetUrl(value) {
  const entries = String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (!entries.length) return "";

  return entries[entries.length - 1].split(/\s+/)[0];
}

function looksLikeUsableImage(url) {
  const lower = String(url || "").toLowerCase();
  if (!lower || lower.startsWith("data:")) return false;
  if (/\.(svg|ico)(?:$|\?)/i.test(lower)) return false;
  if (/(logo|favicon|sprite|placeholder|tracking|pixel|blank|avatar)/i.test(lower)) {
    return false;
  }
  return /\.(jpe?g|png|webp|avif)(?:$|\?)/i.test(lower) || /images?|uploads?|assets?/i.test(lower);
}

function addCandidate(candidates, value, baseUrl, score) {
  const resolved = resolveUrl(value, baseUrl);
  if (!looksLikeUsableImage(resolved)) return;
  candidates.push({ url: resolved, score });
}

function addJsonLdImages(candidates, $, baseUrl) {
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

      flattened.forEach((item) => {
        const image = item?.image;
        if (Array.isArray(image)) {
          image.forEach((entry) => {
            addCandidate(candidates, entry?.url || entry, baseUrl, 90);
          });
        } else {
          addCandidate(candidates, image?.url || image, baseUrl, 90);
        }
      });
    } catch {
      // Ignore malformed structured data; meta/img tags are still useful.
    }
  });
}

export function findBestImageUrlFromHtml(html, baseUrl) {
  const $ = cheerio.load(html || "");
  const candidates = [];

  [
    "meta[property='og:image']",
    "meta[property='og:image:secure_url']",
    "meta[name='twitter:image']",
    "meta[itemprop='image']",
  ].forEach((selector) => {
    addCandidate(candidates, $(selector).first().attr("content"), baseUrl, 100);
  });

  addJsonLdImages(candidates, $, baseUrl);

  $("img,source").each((_, element) => {
    const node = $(element);
    const className = cleanText(node.attr("class"));
    const alt = cleanText(node.attr("alt"));
    const score =
      /(event|hero|feature|listing|card|image|photo)/i.test(`${className} ${alt}`)
        ? 80
        : 55;
    addCandidate(
      candidates,
      node.attr("src") ||
        node.attr("data-src") ||
        node.attr("data-lazy-src") ||
        node.attr("data-original") ||
        firstSrcSetUrl(node.attr("srcset") || node.attr("data-srcset")),
      baseUrl,
      score
    );
  });

  const best = candidates
    .sort((left, right) => right.score - left.score)
    .find((candidate, index, list) => {
      return list.findIndex((other) => other.url === candidate.url) === index;
    });

  return best?.url || "";
}

export async function discoverDetailPageImageUrl(url, options = {}) {
  const sourceUrl = cleanText(url);
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) return "";
  if (imageCache.has(sourceUrl)) return imageCache.get(sourceUrl);

  const timeoutMs = options.timeoutMs || 7000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        "User-Agent":
          "SummitSceneBot/1.0 (+https://summitscene.ca; event image discovery)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`Image page returned HTTP ${response.status}`);
    const html = await response.text();
    const imageUrl = findBestImageUrlFromHtml(html, response.url || sourceUrl);
    imageCache.set(sourceUrl, imageUrl);
    return imageUrl;
  } catch {
    imageCache.set(sourceUrl, "");
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

export function getFallbackImageUrlForSource(value) {
  const text = cleanText(value);
  return SOURCE_FALLBACK_IMAGES.find((fallback) => fallback.pattern.test(text))
    ?.imageUrl || "";
}
