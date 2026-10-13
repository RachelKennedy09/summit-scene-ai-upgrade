import { toUserFriendlyError } from "../utils/friendlyErrors";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://summit-scene-backend.onrender.com";
const PLACES_REQUEST_TIMEOUT_MS = 18000;
const PLACES_RETRY_ATTEMPTS = 2;
const PLACES_RETRY_DELAY_MS = 900;
const TOWN_COORDS = {
  Banff: { latitude: 51.1784, longitude: -115.5708 },
  Canmore: { latitude: 51.0892, longitude: -115.3593 },
  "Lake Louise": { latitude: 51.4254, longitude: -116.1773 },
};

function normalizePlacesError(error, fallbackMessage) {
  if (error?.name === "AbortError") {
    return new Error(fallbackMessage);
  }

  if (
    typeof error?.message === "string" &&
    error.message.toLowerCase().includes("aborted")
  ) {
    return new Error(fallbackMessage);
  }

  return error;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = PLACES_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryablePlacesError(error) {
  if (error?.name === "AbortError") return true;

  const message =
    typeof error?.message === "string" ? error.message.toLowerCase() : "";

  return (
    message.includes("aborted") ||
    message.includes("network request failed") ||
    message.includes("failed to fetch") ||
    message.includes("timed out") ||
    message.includes("timeout")
  );
}

async function fetchWithRetry(url, options = {}) {
  let lastError;

  for (let attempt = 1; attempt <= PLACES_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await fetchWithTimeout(url, options);
    } catch (error) {
      lastError = error;
      if (!isRetryablePlacesError(error) || attempt === PLACES_RETRY_ATTEMPTS) {
        throw error;
      }
      await delay(PLACES_RETRY_DELAY_MS * attempt);
    }
  }

  throw lastError;
}

async function readJsonSafely(response) {
  const text = await response.text();
  if (!text) return [];

  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
}

function buildManualAddressSuggestion(query, town) {
  const trimmedQuery = typeof query === "string" ? query.trim().replace(/\s+/g, " ") : "";
  const townName = typeof town === "string" ? town.trim() : "";
  const coords = TOWN_COORDS[townName];

  if (!trimmedQuery || trimmedQuery.length < 3 || !coords) {
    return [];
  }

  const address = [trimmedQuery, townName, "Alberta", "Canada"]
    .filter(Boolean)
    .join(", ");

  return [
    {
      id: `manual:${townName}:${trimmedQuery}`,
      name: "Use entered address",
      address,
      latitude: coords.latitude,
      longitude: coords.longitude,
      isApproximate: true,
    },
  ];
}

export async function searchAddressSuggestions(query, town) {
  try {
    const trimmedQuery = typeof query === "string" ? query.trim() : "";
    if (trimmedQuery.length < 3) {
      return [];
    }

    const params = new URLSearchParams({
      q: trimmedQuery,
    });

    if (town) {
      params.set("town", town);
    }

    const url =
      `${BASE_URL}/api/places/autocomplete?${params.toString()}`;
    const response = await fetchWithRetry(url);
    const data = await readJsonSafely(response);

    if (!response.ok) {
      throw new Error(
        data?.message || `Failed to load address suggestions (${response.status})`
      );
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    const manualSuggestion = buildManualAddressSuggestion(query, town);
    if (manualSuggestion.length) {
      return manualSuggestion;
    }

    throw toUserFriendlyError(
      normalizePlacesError(error, "Address suggestions timed out. Please try again."),
      "We couldn't load address suggestions right now. Please try again."
    );
  }
}
