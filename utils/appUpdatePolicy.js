// Shared by the native client and API. No React Native dependencies.
export const UPDATE_MESSAGE = "A new version of the app is available. Please update to continue.";
export const STORE_URLS = {
  ios: "https://apps.apple.com/app/summit-scene/id6777819596",
  android: "https://play.google.com/store/apps/details?id=com.rachellauren.summitscene",
};

function numericParts(value, maxParts) {
  if (typeof value !== "string" || value.length > 40 ||
      !new RegExp(`^\\d+(?:\\.\\d+){0,${maxParts - 1}}$`).test(value)) return null;
  const parts = value.split(".").map(Number);
  return parts.every(Number.isSafeInteger) ? parts : null;
}

export function compareVersions(left, right) {
  const a = numericParts(left, 3);
  const b = numericParts(right, 3);
  if (!a || !b) throw new Error("Invalid numeric version.");
  for (let i = 0; i < 3; i += 1) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) < (b[i] || 0) ? -1 : 1;
  }
  return 0;
}

function validBuild(build, platform) {
  if (build === null) return true;
  const parts = numericParts(build, platform === "android" ? 1 : 3);
  return Boolean(parts && parts[0] > 0 &&
    (platform !== "android" || parts[0] <= 2100000000));
}

export function validateUpdatePolicy(value, platform) {
  if (!Object.prototype.hasOwnProperty.call(STORE_URLS, platform) || !value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid platform update policy.");
  }
  const keys = ["minimumVersion", "minimumBuild", "latestVersion", "latestBuild", "mandatoryEnabled", "storeAvailable", "storeUrl", "message"];
  if (Object.keys(value).some((key) => !keys.includes(key))) throw new Error("Unknown policy field.");
  if (typeof value.mandatoryEnabled !== "boolean" || typeof value.storeAvailable !== "boolean" ||
      typeof value.message !== "string" || !value.message.trim() || value.message.length > 500) {
    throw new Error("Enabled, availability, and message fields are required.");
  }
  if (compareVersions(value.minimumVersion, value.latestVersion) > 0) {
    throw new Error("Minimum version cannot exceed latest version.");
  }
  if (!validBuild(value.minimumBuild, platform) || !validBuild(value.latestBuild, platform)) {
    throw new Error("Invalid platform native build number.");
  }
  if (value.minimumBuild !== null && (value.latestBuild === null ||
      compareVersions(value.minimumBuild, value.latestBuild) > 0)) {
    throw new Error("Latest build must be at least the minimum build.");
  }
  // Restrict remote links to the actual listings already used by this app.
  if (value.storeUrl !== STORE_URLS[platform]) throw new Error("Use the configured platform store listing.");
  if (value.mandatoryEnabled && !value.storeAvailable) {
    throw new Error("Confirm store availability before enabling mandatory updates.");
  }
  return Object.fromEntries(keys.map((key) => [key, key === "message" ? value[key].trim() : value[key]]));
}

export function defaultUpdatePolicy(platform) {
  return {
    minimumVersion: "1.0.2", minimumBuild: null,
    latestVersion: "1.0.2", latestBuild: null,
    mandatoryEnabled: false, storeAvailable: false,
    storeUrl: STORE_URLS[platform], message: UPDATE_MESSAGE,
  };
}

export function evaluateUpdatePolicy(policy, installed, platform) {
  const config = validateUpdatePolicy(policy, platform);
  let version;
  try { version = compareVersions(installed?.version, config.minimumVersion); }
  catch { return { required: false, optional: false, unknown: true }; }
  // Native builds are independent floors within each platform. A newer marketing
  // version cannot bypass an Android versionCode floor.
  const needsBuild = config.minimumBuild !== null;
  if (needsBuild && (!installed?.build || !validBuild(installed.build, platform))) {
    return { required: false, optional: false, unknown: true };
  }
  const unsupported = version < 0 || (needsBuild && compareVersions(installed.build, config.minimumBuild) < 0);
  const latestVersion = compareVersions(installed.version, config.latestVersion);
  const behindLatest = latestVersion < 0 || (config.latestBuild !== null &&
    validBuild(installed.build, platform) && installed.build !== null &&
    compareVersions(installed.build, config.latestBuild) < 0);
  return {
    required: config.mandatoryEnabled && config.storeAvailable && unsupported,
    optional: config.storeAvailable && behindLatest && !(config.mandatoryEnabled && unsupported),
    unknown: false,
  };
}
