import { isImportedEventListing } from "./importedEventHost";
import { getMainCategoryForTag } from "../constants/eventCategories";

const CATEGORY_IMAGE_SOURCES = {
  "Arts & Creativity": require("../assets/avatars/business_art_culture.png"),
  "Family & Pets": require("../assets/avatars/business_community.png"),
  "Food & Drink": require("../assets/avatars/business_food_drink.png"),
  "Inclusive Community": require("../assets/avatars/business_community.png"),
  Learning: require("../assets/avatars/business_general.png"),
  "Music & Nightlife": require("../assets/avatars/business_music_nightlife.png"),
  "Outdoors & Sports": require("../assets/avatars/business_outdoor_adventure.png"),
  "Tours & Experiences": require("../assets/avatars/business_stay_lodging.png"),
  Community: require("../assets/avatars/business_community.png"),
  Wellness: require("../assets/avatars/business_wellness.png"),
  Other: require("../assets/landing-hero-mobile.png"),
};

const DEFAULT_EVENT_IMAGE_SOURCE = require("../assets/landing-hero-mobile.png");

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

function getEventCategory(event) {
  const categories =
    Array.isArray(event?.categories) && event.categories.length
      ? event.categories
      : event?.category
        ? [event.category]
        : [];

  const directCategory = categories.find((item) => CATEGORY_IMAGE_SOURCES[item]);
  if (directCategory) return directCategory;

  return categories.map(getMainCategoryForTag).find(Boolean) || "Other";
}

export function getEventImageSource(event) {
  const eventImageUrl = getEventImageUrl(event);
  if (eventImageUrl) return { uri: eventImageUrl };

  return CATEGORY_IMAGE_SOURCES[getEventCategory(event)] || DEFAULT_EVENT_IMAGE_SOURCE;
}
