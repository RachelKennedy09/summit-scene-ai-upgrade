const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://summit-scene-backend.onrender.com";
const PLACES_REQUEST_TIMEOUT_MS = 10000;

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

async function readJsonSafely(response) {
  const text = await response.text();
  if (!text) return [];

  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
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

    const response = await fetchWithTimeout(
      `${BASE_URL}/api/places/autocomplete?${params.toString()}`
    );
    const data = await readJsonSafely(response);

    if (!response.ok) {
      throw new Error(
        data?.message || `Failed to load address suggestions (${response.status})`
      );
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw normalizePlacesError(
      error,
      "Address suggestions timed out. Please try again."
    );
  }
}
