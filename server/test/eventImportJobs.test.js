import { expect } from "chai";
import { createImportJobs, IMPORT_JOB_STALE_MS } from "../services/eventImporter/importJobs.js";
import { waitForImportJob } from "../../utils/importJobClient.js";
import { assertCanFetchUrl } from "../services/eventImporter/fetchSource.js";
import { EVENT_IMPORT_CONFIG } from "../services/eventImporter/config.js";

function storage() {
  let row = null;
  return {
    findById: () => ({ lean: async () => row && { ...row } }),
    findOneAndUpdate: (query, update) => ({ lean: async () => {
      if (row?.status === "running") throw Object.assign(new Error("Duplicate slot"), { code: 11000 });
      row = { _id: "admin", ...update.$set };
      return { ...row };
    } }),
    updateOne: async (query, update) => {
      if (!row || (query.runId && row.runId !== query.runId) || row.status !== query.status ||
          (query.heartbeatAt && !(row.heartbeatAt < query.heartbeatAt.$lt))) return { matchedCount: 0 };
      Object.assign(row, update.$set);
      return { matchedCount: 1 };
    },
  };
}
const running = { runId: "run-one", status: "running" };
const noWait = async () => {};

describe("background importer jobs", () => {
  it("acknowledges immediately, shares simultaneous runs and saves completion", async () => {
    const callbacks = [];
    let calls = 0;
    const jobs = createImportJobs({ model: storage(), defer: (fn) => callbacks.push(fn),
      run: async () => { calls++; return { newCandidates: 3 }; } });
    const [one, two] = await Promise.all([jobs.start(), jobs.start()]);
    expect(one.runId).to.equal(two.runId);
    expect(one.status).to.equal("running");
    expect(calls).to.equal(0);
    expect(callbacks.length).to.equal(1);
    await callbacks[0]();
    expect(await jobs.current()).to.include({ status: "completed" });
    expect((await jobs.current()).summary.newCandidates).to.equal(3);
  });

  it("records a failure and permits another run", async () => {
    const callbacks = [];
    const jobs = createImportJobs({ model: storage(), defer: (fn) => callbacks.push(fn), log: () => {},
      run: async () => { throw new Error("Database unavailable"); } });
    const first = await jobs.start();
    await callbacks[0]();
    expect((await jobs.current()).status).to.equal("failed");
    expect((await jobs.start()).runId).not.to.equal(first.runId);
  });

  it("marks a stale run as interrupted after a worker restart", async () => {
    let time = new Date("2026-10-20T12:00:00Z");
    const jobs = createImportJobs({ model: storage(), defer: () => {}, now: () => time });
    await jobs.start();
    time = new Date(time.getTime() + IMPORT_JOB_STALE_MS + 1);
    const job = await jobs.current();
    expect(job.status).to.equal("failed");
    expect(job.message).to.include("Saved candidates are preserved");
  });

  it("passes a single-source retry to the worker", async () => {
    let options;
    const callbacks = [];
    const jobs = createImportJobs({ model: storage(), defer: (fn) => callbacks.push(fn),
      run: async (value) => { options = value; return {}; } });
    await jobs.start("507f1f77bcf86cd799439011");
    await callbacks[0]();
    expect(options).to.deep.equal({ sourceId: "507f1f77bcf86cd799439011", maxSources: 1 });
  });
});

describe("importer client status", () => {
  it("waits for completion without another start request", async () => {
    let reads = 0;
    const result = await waitForImportJob(running, async () => {
      reads++;
      return { ...running, status: "completed", summary: { newCandidates: 4 } };
    }, { sleep: noWait });
    expect(result.newCandidates).to.equal(4);
    expect(reads).to.equal(1);
  });
  it("reports a long-running import as pending rather than failed", async () => {
    const result = await waitForImportJob(running, async () => running, { sleep: noWait, maxPolls: 2 });
    expect(result.inProgress).to.equal(true);
  });
  it("distinguishes losing progress access from an importer failure", async () => {
    for (const [read, message] of [
      [async () => { throw new Error("Offline"); }, "may still be running"],
      [async () => ({ ...running, status: "failed", message: "Worker stopped" }), "Worker stopped"],
      [async () => ({ ...running, runId: "different" }), "Another import"],
    ]) {
      let error;
      try { await waitForImportJob(running, read, { sleep: noWait }); } catch (value) { error = value; }
      expect(error?.message).to.include(message);
    }
  });
});

describe("importer website request bounds", () => {
  it("aborts an unresponsive robots request", async () => {
    const originalFetch = globalThis.fetch;
    const originalTimeout = EVENT_IMPORT_CONFIG.timeoutMs;
    let aborted = false;
    try {
      EVENT_IMPORT_CONFIG.timeoutMs = 10;
      globalThis.fetch = async (_url, { signal }) => new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => { aborted = true; reject(new Error("Aborted")); });
      });
      await assertCanFetchUrl("https://robots-timeout.example/events");
      expect(aborted).to.equal(true);
    } finally {
      globalThis.fetch = originalFetch;
      EVENT_IMPORT_CONFIG.timeoutMs = originalTimeout;
    }
  });
});
