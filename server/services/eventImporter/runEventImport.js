import EventSource from "../../models/EventSource.js";
import { EVENT_IMPORT_CONFIG } from "./config.js";
import { fetchSource } from "./fetchSource.js";
import { extractEvents } from "./extractEvents.js";
import { importExtractedEvent } from "./importEvent.js";
import { fetchBanffLakeLouiseEvents } from "./banffLakeLouiseSource.js";
import { reconcileSourceSync } from "./sourceSync.js";
import { coalesceExtractedEvents, enrichExtractedEvents } from "./enrichEvents.js";

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
    sourceSync: {
      seenTracked: 0,
      missingFirstSeen: 0,
      missingStill: 0,
      needsReview: 0,
      changed: 0,
    },
  };
}

function buildTodayString(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addSourceSyncSummary(summary, nextSummary) {
  Object.keys(summary.sourceSync).forEach((key) => {
    summary.sourceSync[key] += nextSummary?.[key] || 0;
  });
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

      const checkedAt = new Date();
      source.lastCheckedAt = checkedAt;
      try {
        const { html } = await fetchSource(source, options);
        const sourceSpecificEvents = await fetchBanffLakeLouiseEvents(
          source,
          html,
          options
        );
        const discoveredEvents = coalesceExtractedEvents(sourceSpecificEvents || extractEvents(html, source), source, options);
        const selectedEvents = discoveredEvents.slice(
          0,
          Math.max(0, maxEvents - summary.eventsDiscovered)
        );
        const extractedEvents = await enrichExtractedEvents(selectedEvents, source, options);
        summary.sourcesChecked += 1;
        summary.eventsDiscovered += extractedEvents.length;

        const seenCandidates = [];

        for (const extractedEvent of extractedEvents) {
          const result = await importExtractedEvent(extractedEvent, source, {
            ...options,
            checkedAt,
          });
          if (result.status === "created") summary.newCandidates += 1;
          else if (result.status === "updated") summary.updatedCandidates += 1;
          else if (result.status === "duplicate") summary.duplicates += 1;
          else summary.skipped += 1;
          if (result.sourceChanged) summary.sourceSync.changed += 1;

          if (result.candidate) {
            seenCandidates.push(result.candidate);
          }
        }

        // A batch limit is not evidence that omitted events were cancelled.
        const sourceSyncSummary = selectedEvents.length === discoveredEvents.length ? await reconcileSourceSync({
          source,
          seenCandidates,
          todayString: buildTodayString(options.now || checkedAt),
          checkedAt,
        }) : null;
        addSourceSyncSummary(summary, sourceSyncSummary);

        source.lastSuccessfulCheckAt = checkedAt;
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
