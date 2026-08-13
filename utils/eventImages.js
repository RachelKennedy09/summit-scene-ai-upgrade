import { isImportedEventListing } from "./importedEventHost";

function firstConnectedProfileImage(user) {
  if (!Array.isArray(user?.socialAccounts)) return "";
  return (
    user.socialAccounts.find((account) => account?.profileImageUrl)
      ?.profileImageUrl || ""
  );
}

export function getEventImageUrl(event) {
  const explicitImage = String(event?.imageUrl || "").trim();
  if (explicitImage) return explicitImage;

  if (isImportedEventListing(event)) return "";

  const host = event?.createdBy && typeof event.createdBy === "object"
    ? event.createdBy
    : null;

  return String(host?.profileImageUrl || firstConnectedProfileImage(host) || "").trim();
}
