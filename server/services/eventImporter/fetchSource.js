import { EVENT_IMPORT_CONFIG } from "./config.js";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchSource(source, options = {}) {
  const timeoutMs = options.timeoutMs || EVENT_IMPORT_CONFIG.timeoutMs;
  const retries = Number.isFinite(options.retries)
    ? options.retries
    : EVENT_IMPORT_CONFIG.retries;
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(source.url, {
        headers: {
          "User-Agent":
            "SummitSceneBot/1.0 (+https://summitscene.ca; event discovery)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Source returned HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "";
      const html = await response.text();
      return {
        html,
        finalUrl: response.url || source.url,
        contentType,
      };
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await delay(300 * (attempt + 1));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}
