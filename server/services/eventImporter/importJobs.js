import { randomUUID } from "node:crypto";
import EventImportRun from "../../models/EventImportRun.js";
import { runEventImport } from "./runEventImport.js";

export const IMPORT_JOB_STALE_MS = 10 * 60 * 1000;

export function createImportJobs({ model = EventImportRun, run = runEventImport,
  now = () => new Date(), defer = setImmediate, heartbeatMs = 30000,
  log = console.error } = {}) {
  async function current() {
    const cutoff = new Date(now().getTime() - IMPORT_JOB_STALE_MS);
    await model.updateOne({ _id: "admin", status: "running", heartbeatAt: { $lt: cutoff } },
      { $set: { status: "failed", finishedAt: now(),
        message: "The importer stopped responding, possibly because the server restarted. Saved candidates are preserved. You can run it again." } });
    return model.findById("admin").lean();
  }

  async function execute(job) {
    const query = { _id: "admin", runId: job.runId, status: "running" };
    const heartbeat = setInterval(() => {
      model.updateOne(query, { $set: { heartbeatAt: now() } })
        .catch((error) => log("Importer heartbeat failed", error));
    }, heartbeatMs);
    heartbeat.unref?.();
    try {
      const summary = await run(job.sourceId ? { sourceId: job.sourceId, maxSources: 1 } : {});
      await model.updateOne(query, { $set: { status: "completed", summary,
        finishedAt: now(), heartbeatAt: now(), message: summary.message || "" } });
    } catch (error) {
      log("Background event import failed", error);
      await model.updateOne(query, { $set: { status: "failed", finishedAt: now(),
        message: "The import stopped because of a server error. Saved candidates are preserved. Check the backend logs before retrying." } })
        .catch((saveError) => log("Could not save importer failure", saveError));
    } finally {
      clearInterval(heartbeat);
    }
  }

  async function start(sourceId) {
    const existing = await current();
    if (existing?.status === "running") return existing;
    let job;
    try {
      job = await model.findOneAndUpdate({ _id: "admin", status: { $ne: "running" } },
        { $set: { runId: randomUUID(), status: "running", sourceId: sourceId || "",
          startedAt: now(), heartbeatAt: now(), finishedAt: null, summary: null, message: "" } },
        { upsert: true, new: true }).lean();
    } catch (error) {
      // Another request won the singleton insertion/update race.
      if (error.code !== 11000) throw error;
      job = await current();
      if (!job) throw error;
      return job;
    }
    defer(() => execute(job).catch((error) => log("Importer job failed", error)));
    return job;
  }
  return { start, current };
}

export const importJobs = createImportJobs();
