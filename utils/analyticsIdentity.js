export const ANALYTICS_INSTALLATION_KEY = "analyticsSessionId";

export function createAnalyticsIdentity(storage, generate = () =>
  `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}_${Math.random().toString(36).slice(2, 12)}`) {
  let pending;
  return () => {
    if (!pending) {
      pending = (async () => {
        const existing = await storage.getItem(ANALYTICS_INSTALLATION_KEY);
        if (existing) return existing;
        const id = generate();
        await storage.setItem(ANALYTICS_INSTALLATION_KEY, id);
        return id;
      })().catch((error) => { pending = null; throw error; });
    }
    return pending;
  };
}
