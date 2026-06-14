const SUMMIT_SCENE_LABELS = new Set(["summit scene", "summit sene"]);
const SUMMIT_SCENE_ADMIN_LABELS = new Set([
  "summit scene admin",
  "summit scene",
]);

function cleanLabel(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  const normalized = trimmed.toLowerCase().replace(/\s+/g, " ");
  return SUMMIT_SCENE_LABELS.has(normalized) ? "" : trimmed;
}

export function getImportedEventHostLabel(event) {
  if (!isImportedEventListing(event)) return "";

  return (
    cleanLabel(event.venueName) ||
    cleanLabel(event.locationName) ||
    cleanLabel(event.hostName) ||
    "Venue TBA"
  );
}

export function isImportedEventListing(event) {
  if (!event) return false;
  if (event.importedBySummitScene) return true;

  const creator = event.createdBy && typeof event.createdBy === "object"
    ? event.createdBy
    : null;
  const creatorName = String(creator?.name || "").trim().toLowerCase();
  const hasVenueHost = Boolean(
    cleanLabel(event.venueName) || cleanLabel(event.locationName)
  );

  return hasVenueHost && SUMMIT_SCENE_ADMIN_LABELS.has(creatorName);
}
