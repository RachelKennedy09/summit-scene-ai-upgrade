import EventSource from "../../models/EventSource.js";
import { EVENT_IMPORT_CONFIG } from "./config.js";
import { fetchSource } from "./fetchSource.js";
import { extractEvents } from "./extractEvents.js";
import { importExtractedEvent } from "./importEvent.js";

let isImportRunning = false;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function emptySummary() {
  return {
    sourcesChecked: 0,
    eventsDiscovered: 0,
    newCandidates: 0,
    updatedCandidates: 0,
    duplicates: 0,
    skipped: 0,
    errors: 0,
    sourceErrors: [],
  };
}

export async function runEventImport(options = {}) {
  if (isImportRunning) {
    return {
      ...emptySummary(),
      skipped: 1,
      message: "Event import is already running.",
    };
  }

  isImportRunning = true;
  const summary = emptySummary();

  try {
    const maxSources = options.maxSources || EVENT_IMPORT_CONFIG.maxSources;
    const maxEvents = options.maxEvents || EVENT_IMPORT_CONFIG.maxEvents;
    const sourceQuery = options.sourceId
      ? { _id: options.sourceId }
      : { enabled: true };
    const sources = await EventSource.find(sourceQuery)
      .sort({ trusted: -1, lastCheckedAt: 1, name: 1 })
      .limit(maxSources);

    for (const source of sources) {
      if (summary.eventsDiscovered >= maxEvents) break;

      source.lastCheckedAt = new Date();
      try {
        const { html } = await fetchSource(source, options);
        const extractedEvents = extractEvents(html, source).slice(
          0,
          Math.max(0, maxEvents - summary.eventsDiscovered)
        );
        summary.sourcesChecked += 1;
        summary.eventsDiscovered += extractedEvents.length;

        for (const extractedEvent of extractedEvents) {
          const result = await importExtractedEvent(extractedEvent, source, options);
          if (result.status === "created") summary.newCandidates += 1;
          else if (result.status === "updated") summary.updatedCandidates += 1;
          else if (result.status === "duplicate") summary.duplicates += 1;
          else summary.skipped += 1;
        }

        source.lastSuccessfulCheckAt = new Date();
        source.consecutiveFailures = 0;
        await source.save();
      } catch (error) {
        summary.errors += 1;
        summary.sourceErrors.push({
          sourceId: source._id,
          sourceName: source.name,
          message: error.message,
        });
        source.consecutiveFailures = (source.consecutiveFailures || 0) + 1;
        await source.save().catch(() => {});
      }

      if (EVENT_IMPORT_CONFIG.delayMs > 0) {
        await delay(EVENT_IMPORT_CONFIG.delayMs);
      }
    }

    console.log("Event import completed", summary);
    return summary;
  } finally {
    isImportRunning = false;
  }
}
