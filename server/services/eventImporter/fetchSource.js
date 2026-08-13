import { EVENT_IMPORT_CONFIG } from "./config.js";

const robotsCache = new Map();
const lastRequestByOrigin = new Map();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRobotsTxt(text) {
  const rulesByAgent = new Map();
  let activeAgents = [];

  String(text || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*/, "").trim())
    .filter(Boolean)
    .forEach((line) => {
      const [rawKey, ...rest] = line.split(":");
      const key = rawKey?.trim().toLowerCase();
      const value = rest.join(":").trim();
      if (!key) return;

      if (key === "user-agent") {
        activeAgents = [value.toLowerCase()];
        activeAgents.forEach((agent) => {
          if (!rulesByAgent.has(agent)) rulesByAgent.set(agent, []);
        });
        return;
      }

      if (!activeAgents.length) return;
      if (!["allow", "disallow", "crawl-delay"].includes(key)) return;

      activeAgents.forEach((agent) => {
        rulesByAgent.get(agent)?.push({ type: key, value });
      });
    });

  return rulesByAgent;
}

function pathMatchesRule(pathname, rulePath) {
  if (!rulePath) return false;
  const escaped = rulePath
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}`).test(pathname);
}

async function readRobotsRules(url) {
  const parsed = new URL(url);
  const origin = parsed.origin;
  if (robotsCache.has(origin)) return robotsCache.get(origin);

  try {
    const response = await fetch(`${origin}/robots.txt`, {
      headers: {
        "User-Agent":
          "SummitSceneBot/1.0 (+https://summitscene.ca; event discovery)",
        Accept: "text/plain,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      robotsCache.set(origin, new Map());
      return robotsCache.get(origin);
    }

    const rules = parseRobotsTxt(await response.text());
    robotsCache.set(origin, rules);
    return rules;
  } catch {
    robotsCache.set(origin, new Map());
    return robotsCache.get(origin);
  }
}

function chooseRulesForBot(rulesByAgent) {
  return [
    ...(rulesByAgent.get("summitscenebot") || []),
    ...(rulesByAgent.get("*") || []),
  ];
}

export async function assertCanFetchUrl(url) {
  const parsed = new URL(url);
  const rules = chooseRulesForBot(await readRobotsRules(url));
  const matchingRules = rules
    .filter((rule) => ["allow", "disallow"].includes(rule.type))
    .filter((rule) => pathMatchesRule(parsed.pathname, rule.value))
    .sort((left, right) => right.value.length - left.value.length);

  if (matchingRules[0]?.type === "disallow") {
    throw new Error(`Blocked by robots.txt: ${parsed.origin}${parsed.pathname}`);
  }
}

export async function waitForRateLimit(url) {
  const parsed = new URL(url);
  const rules = chooseRulesForBot(await readRobotsRules(url));
  const crawlDelaySeconds = rules
    .filter((rule) => rule.type === "crawl-delay")
    .map((rule) => Number(rule.value))
    .find((value) => Number.isFinite(value) && value >= 0);
  const delayMs = Math.max(
    EVENT_IMPORT_CONFIG.delayMs,
    crawlDelaySeconds ? crawlDelaySeconds * 1000 : 0
  );
  const lastRequestAt = lastRequestByOrigin.get(parsed.origin) || 0;
  const waitMs = Math.max(0, lastRequestAt + delayMs - Date.now());

  if (waitMs > 0) await delay(waitMs);
  lastRequestByOrigin.set(parsed.origin, Date.now());
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
      await assertCanFetchUrl(source.url);
      await waitForRateLimit(source.url);
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
