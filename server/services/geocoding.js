const GEOCODING_TIMEOUT_MS = 12000;
const DEFAULT_GEOCODER_USER_AGENT = "SummitScene/1.0";
const AUTOCOMPLETE_LIMIT = 5;

function readJsonSafely(text) {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeAddressPart(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

function dedupeParts(parts) {
  const seen = new Set();

  return parts.filter((part) => {
    const normalized = normalizeAddressPart(part).toLowerCase();
    if (!normalized || seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

function buildGeocodingQueries(address, town) {
  const normalizedAddress = normalizeAddressPart(address);
  const normalizedTown = normalizeAddressPart(town);

  const queries = [
    [normalizedAddress],
    [normalizedAddress, normalizedTown],
    [normalizedAddress, normalizedTown, "Alberta"],
    [normalizedAddress, normalizedTown, "Alberta", "Canada"],
    [normalizedAddress, "Alberta", "Canada"],
  ]
    .map((parts) => dedupeParts(parts).join(", "))
    .filter(Boolean);

  return [...new Set(queries)];
}

async function runGeocodingQuery(query, signal) {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
    countrycodes: "ca",
    addressdetails: "1",
  });

  if (process.env.GEOCODING_EMAIL) {
    params.set("email", process.env.GEOCODING_EMAIL);
  }

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent":
          process.env.GEOCODING_USER_AGENT || DEFAULT_GEOCODER_USER_AGENT,
      },
      signal,
    }
  );

  const text = await response.text();
  const data = readJsonSafely(text);

  if (!response.ok) {
    throw new Error(`Geocoding failed with status ${response.status}.`);
  }

  const result = Array.isArray(data) ? data[0] : null;
  return result?.lat && result?.lon ? result : null;
}

function parseAutocompleteResult(result) {
  if (!result?.display_name || !result?.lat || !result?.lon) {
    return null;
  }

  const address = result.address || {};
  const name =
    result.name ||
    address.attraction ||
    address.shop ||
    address.amenity ||
    address.building ||
    address.road ||
    "";

  return {
    id: String(result.place_id || result.osm_id || result.display_name),
    name: name || "",
    address: result.display_name,
    latitude: Number(result.lat),
    longitude: Number(result.lon),
  };
}

export async function autocompleteEventAddresses({ query, town }) {
  const normalizedQuery = normalizeAddressPart(query);
  if (!normalizedQuery || normalizedQuery.length < 3) {
    return [];
  }

  const combinedQuery = dedupeParts([
    normalizedQuery,
    normalizeAddressPart(town),
    "Alberta",
    "Canada",
  ]).join(", ");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEOCODING_TIMEOUT_MS);

  try {
    const params = new URLSearchParams({
      q: combinedQuery || normalizedQuery,
      format: "jsonv2",
      limit: String(AUTOCOMPLETE_LIMIT),
      countrycodes: "ca",
      addressdetails: "1",
    });

    if (process.env.GEOCODING_EMAIL) {
      params.set("email", process.env.GEOCODING_EMAIL);
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent":
            process.env.GEOCODING_USER_AGENT || DEFAULT_GEOCODER_USER_AGENT,
        },
        signal: controller.signal,
      }
    );

    const text = await response.text();
    const data = readJsonSafely(text);

    if (!response.ok) {
      throw new Error(`Autocomplete failed with status ${response.status}.`);
    }

    return (Array.isArray(data) ? data : [])
      .map((result) => parseAutocompleteResult(result))
      .filter(Boolean);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Address suggestions timed out. Please try again.");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function geocodeEventAddress({ address, town }) {
  const queries = buildGeocodingQueries(address, town);

  if (!queries.length) {
    throw new Error("A full address is required for map placement.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEOCODING_TIMEOUT_MS);

  try {
    for (const query of queries) {
      const result = await runGeocodingQuery(query, controller.signal);

      if (result?.lat && result?.lon) {
        console.log("Geocoding matched event address:", {
          query,
          displayName: result.display_name,
        });

        return {
          latitude: Number(result.lat),
          longitude: Number(result.lon),
          geocodedAddress: result.display_name || query,
        };
      }
    }

    console.warn("Geocoding found no match for address:", { address, town, queries });
    throw new Error(
      "We could not find that address. Please check the street number, street name, and town."
    );
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Address lookup timed out. Please try again.");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
