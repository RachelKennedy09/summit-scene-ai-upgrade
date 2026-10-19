import { evaluateUpdatePolicy, validateUpdatePolicy } from "./appUpdatePolicy.js";

export const POLICY_LEASE_MS = 5 * 60 * 1000;

// Only a validated, recent server response can block. Nothing is persisted to
// device storage, so an offline launch cannot revive a stale mandatory policy.
export function createAppUpdateController({ platform, installed, fetchInfo, onChange, now = Date.now }) {
  let state = { checking: true, ready: false, required: false, optional: false, unknown: true, policy: null, expiresAt: 0, error: "" };
  let pending;
  let disposed = false;
  const publish = (next) => {
    state = { ...next, ready: state.ready || !next.checking };
    if (!disposed) onChange?.(state);
    return state;
  };
  const expire = () => {
    if (state.expiresAt && now() >= state.expiresAt) {
      publish({ ...state, required: false, optional: false, unknown: true, policy: null, expiresAt: 0 });
    }
    return state;
  };
  const check = () => {
    if (disposed) return Promise.resolve(state);
    if (pending) return pending;
    expire();
    publish({ ...state, checking: true });
    pending = (async () => {
      try {
        if (!["ios", "android"].includes(platform) || !installed?.version) {
          return publish({ ...state, checking: false, required: false, unknown: true });
        }
        const info = await fetchInfo();
        if (info?.schemaVersion !== 2) throw new Error("Invalid update settings.");
        const policy = validateUpdatePolicy(info.platforms?.[platform], platform);
        const decision = evaluateUpdatePolicy(policy, installed, platform);
        return publish({ ...decision, policy, checking: false, expiresAt: now() + POLICY_LEASE_MS, error: "" });
      } catch {
        expire();
        return publish({ ...state, checking: false, error: "Could not check for updates. Check your connection and try again." });
      }
    })().finally(() => { pending = null; });
    return pending;
  };
  return { check, expire, getState: () => state, dispose: () => { disposed = true; } };
}

export function attachUpdateLifecycle(controller, appState) {
  let previous = appState.currentState;
  const subscription = appState.addEventListener("change", (next) => {
    if (next === "active" && previous !== "active") controller.check();
    previous = next;
  });
  controller.check();
  return () => subscription.remove();
}

export async function openUpdateStore(policy, openURL) {
  try { await openURL(policy.storeUrl); return ""; }
  catch { return "Could not open the store. Try Update app again, or open your store and search for Summit Scene. Use Retry check to check the update requirement again."; }
}
