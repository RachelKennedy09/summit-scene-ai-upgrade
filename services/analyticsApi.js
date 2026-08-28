import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://summit-scene-backend.onrender.com";
const ANALYTICS_SESSION_KEY = "analyticsSessionId";
const AUTH_TOKEN_KEY = "authToken";
const REQUEST_TIMEOUT_MS = 5000;
const impressionCache = new Set();

function buildHeaders(token) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function buildSessionId() {
  const randomPart = Math.random().toString(36).slice(2, 12);
  return `anon_${Date.now().toString(36)}_${randomPart}`;
}

async function getAnalyticsSessionId() {
  const existing = await AsyncStorage.getItem(ANALYTICS_SESSION_KEY);
  if (existing) return existing;

  const nextSessionId = buildSessionId();
  await AsyncStorage.setItem(ANALYTICS_SESSION_KEY, nextSessionId);
  return nextSessionId;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function shouldSkipClientImpression(type, eventId) {
  if (type !== "event_impression" || !eventId) return false;

  const day = new Date().toISOString().slice(0, 10);
  const cacheKey = `${type}:${eventId}:${day}`;
  if (impressionCache.has(cacheKey)) return true;

  impressionCache.add(cacheKey);
  return false;
}

export function trackAnalytics(type, payload = {}) {
  const eventId = payload.eventId || payload.event?._id || payload.event?.id;
  if (shouldSkipClientImpression(type, eventId)) {
    return;
  }

  // Fire and forget: analytics must never block taps, navigation, or sharing.
  Promise.resolve()
    .then(async () => {
      const [sessionId, token] = await Promise.all([
        getAnalyticsSessionId(),
        AsyncStorage.getItem(AUTH_TOKEN_KEY).catch(() => null),
      ]);

      const res = await fetchWithTimeout(`${API_BASE_URL}/api/analytics/track`, {
        method: "POST",
        headers: buildHeaders(token),
        body: JSON.stringify({
          type,
          ...payload,
          eventId,
          sessionId,
        }),
      });

      if (!res.ok && __DEV__) {
        console.log("Analytics tracking skipped", type, res.status);
      }
    })
    .catch((error) => {
      if (__DEV__) {
        console.log("Analytics tracking issue", type, error?.message);
      }
    });
}

async function readJsonSafely(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export async function fetchAnalyticsSummary(token, days = "30") {
  const params = new URLSearchParams();
  params.set("days", String(days || "30"));

  const res = await fetchWithTimeout(
    `${API_BASE_URL}/api/analytics/summary?${params.toString()}`,
    { headers: buildHeaders(token) }
  );
  const data = await readJsonSafely(res);

  if (!res.ok) {
    throw new Error(data.message || `Failed to load analytics (${res.status})`);
  }

  return data;
}

export async function fetchBusinessAnalytics(businessId, token, days = "30") {
  const params = new URLSearchParams();
  params.set("days", String(days || "30"));

  const res = await fetchWithTimeout(
    `${API_BASE_URL}/api/analytics/business/${businessId}?${params.toString()}`,
    { headers: buildHeaders(token) }
  );
  const data = await readJsonSafely(res);

  if (!res.ok) {
    throw new Error(
      data.message || `Failed to load business analytics (${res.status})`
    );
  }

  return data;
}

export async function fetchAnalyticsAttributions(token, days = "30") {
  const params = new URLSearchParams();
  params.set("days", String(days || "30"));

  const res = await fetchWithTimeout(
    `${API_BASE_URL}/api/analytics/attributions?${params.toString()}`,
    { headers: buildHeaders(token) }
  );
  const data = await readJsonSafely(res);

  if (!res.ok) {
    throw new Error(
      data.message || `Failed to load analytics sources (${res.status})`
    );
  }

  return data;
}

export async function fetchAttributionAnalytics(attributionKey, token, days = "30") {
  const params = new URLSearchParams();
  params.set("days", String(days || "30"));

  const res = await fetchWithTimeout(
    `${API_BASE_URL}/api/analytics/attribution/${encodeURIComponent(
      attributionKey
    )}?${params.toString()}`,
    { headers: buildHeaders(token) }
  );
  const data = await readJsonSafely(res);

  if (!res.ok) {
    throw new Error(
      data.message || `Failed to load source analytics (${res.status})`
    );
  }

  return data;
}

export async function deleteAttributionAnalytics(attributionKey, token) {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/api/analytics/attribution/${encodeURIComponent(
      attributionKey
    )}`,
    {
      method: "DELETE",
      headers: buildHeaders(token),
    }
  );
  const data = await readJsonSafely(res);

  if (!res.ok) {
    throw new Error(
      data.message || `Failed to delete source analytics (${res.status})`
    );
  }

  return data;
}
