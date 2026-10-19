const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "https://summit-scene-backend.onrender.com";

export async function fetchAppVersionInfo({ timeoutMs = 8000, fetchImpl = fetch } = {}) {
  const controller = new AbortController();
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error("Update check timed out."));
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      (async () => {
        const response = await fetchImpl(`${API_BASE_URL}/api/app-version`, {
          signal: controller.signal, cache: "no-store", headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("Could not check app version.");
        return response.json();
      })(), timeout,
    ]);
  } finally { clearTimeout(timeoutId); }
}
