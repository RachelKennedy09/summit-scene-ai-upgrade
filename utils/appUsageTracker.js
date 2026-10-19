export const VISIT_IDLE_MS = 30 * 60 * 1000;
export const USAGE_QUEUE_KEY = "summitScene.appUsage.queue.v1";
const MAX_PENDING_OPENS = 20;

// Serialize storage and network work so repeated foreground notifications and
// retries cannot generate duplicate visits. A failed report retains its ID.
export function createAppUsageTracker({ storage, getInstallationId, send, metadata, now = Date.now,
  generateVisitId = () => `visit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}` }) {
  let work = Promise.resolve();
  let started = false;
  let backgroundAt = null;
  const serialize = (task) => {
    work = work.then(task).catch(() => {}); // Analytics never blocks app use.
    return work;
  };
  async function readQueue() {
    try {
      const parsed = JSON.parse(await storage.getItem(USAGE_QUEUE_KEY) || "[]");
      const validId = (value) => typeof value === "string" && /^[a-zA-Z0-9_-]{12,120}$/.test(value);
      return Array.isArray(parsed) ? parsed.filter((item) => validId(item?.visitId) &&
        validId(item?.installationId) && ["ios", "android"].includes(item?.platform)).slice(-MAX_PENDING_OPENS) : [];
    } catch { return []; }
  }
  async function flush() {
    const queue = await readQueue();
    while (queue.length) {
      await send(queue[0]);
      queue.shift();
      await storage.setItem(USAGE_QUEUE_KEY, JSON.stringify(queue));
    }
  }
  return {
    foreground: () => {
      const time = now();
      const newVisit = !started || (backgroundAt !== null && time - backgroundAt >= VISIT_IDLE_MS);
      started = true;
      backgroundAt = null;
      return serialize(async () => {
        if (newVisit) {
          const installationId = await getInstallationId();
          const queue = await readQueue();
          queue.push({ installationId, visitId: generateVisitId(), ...metadata });
          await storage.setItem(USAGE_QUEUE_KEY, JSON.stringify(queue.slice(-MAX_PENDING_OPENS)));
        }
        await flush();
      });
    },
    background: () => { if (backgroundAt === null) backgroundAt = now(); },
    retry: () => serialize(flush),
  };
}

export function attachAppUsageLifecycle(tracker, appState) {
  let previous = appState.currentState;
  if (previous === "active") tracker.foreground();
  const subscription = appState.addEventListener("change", (next) => {
    if (next === "active" && previous !== "active") tracker.foreground();
    else if (previous === "active" && next !== "active") tracker.background();
    previous = next;
  });
  return () => subscription.remove();
}
