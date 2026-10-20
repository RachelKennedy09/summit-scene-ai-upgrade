// Polling only retries reads. Repeated POSTs must not be used as a network retry.
export async function waitForImportJob(job, readStatus, {
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  maxPolls = 60, intervalMs = 3000,
} = {}) {
  const runId = job?.runId;
  if (!runId) throw new Error("The server did not return an importer run ID.");
  for (let attempt = 0; attempt <= maxPolls; attempt++) {
    if (job?.runId !== runId) {
      throw new Error("Another import has started. Refresh the review list and check importer progress again.");
    }
    if (job.status === "completed") return job.summary;
    if (job.status === "failed") throw new Error(job.message || "The importer stopped. Saved candidates are preserved.");
    if (job.status !== "running") throw new Error("The server returned an invalid importer status.");
    if (attempt === maxPolls) {
      return { inProgress: true, message: "The importer is still running on the server. You can leave this screen. Press Run Importer again to check progress; it will reconnect to the active run." };
    }
    await sleep(intervalMs);
    try {
      job = await readStatus();
    } catch {
      throw new Error("Could not check importer progress. The import may still be running. Press Run Importer again to reconnect; saved candidates are preserved.");
    }
  }
}
