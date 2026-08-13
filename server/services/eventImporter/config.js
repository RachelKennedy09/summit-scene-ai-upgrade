export const EVENT_IMPORT_CONFIG = {
  maxSources: Number(process.env.EVENT_IMPORT_MAX_SOURCES || 12),
  maxEvents: Number(process.env.EVENT_IMPORT_MAX_EVENTS || 150),
  maxPagesPerSource: Number(process.env.EVENT_IMPORT_MAX_PAGES_PER_SOURCE || 8),
  timeoutMs: Number(process.env.EVENT_IMPORT_TIMEOUT_MS || 12000),
  retries: Number(process.env.EVENT_IMPORT_RETRIES || 1),
  delayMs: Number(process.env.EVENT_IMPORT_DELAY_MS || 750),
  aiEnabled: String(process.env.EVENT_IMPORT_AI_ENABLED || "false") === "true",
};

export const TOWNS = ["Banff", "Canmore", "Lake Louise"];
