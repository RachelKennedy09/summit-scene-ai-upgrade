import { isImportedEventListing } from "./importedEventHost";
import { getMainCategoryForTag } from "../constants/eventCategories";

const CATEGORY_IMAGE_SOURCES = {
  "Arts & Creativity": require("../assets/event-categories/art.png"),
  "Family & Pets": require("../assets/event-categories/family.png"),
  "Food & Drink": require("../assets/event-categories/food-drink.png"),
  "Inclusive Community": require("../assets/event-categories/market.png"),
  Learning: require("../assets/event-categories/workshop.png"),
  "Music & Nightlife": require("../assets/event-categories/music.png"),
  "Outdoors & Sports": require("../assets/event-categories/outdoors.png"),
  "Tours & Experiences": require("../assets/event-categories/other.png"),
  Community: require("../assets/event-categories/market.png"),
  Wellness: require("../assets/event-categories/wellness.png"),
  "Art Shows": require("../assets/event-categories/art.png"),
  "Craft Markets": require("../assets/event-categories/market.png"),
  "Creative Workshops": require("../assets/event-categories/workshop.png"),
  "Farmers Markets": require("../assets/event-categories/market.png"),
  "Makers Markets": require("../assets/event-categories/market.png"),
  "Market": require("../assets/event-categories/market.png"),
  "Markets": require("../assets/event-categories/market.png"),
  "Painting Nights": require("../assets/event-categories/art.png"),
  "Pottery": require("../assets/event-categories/workshop.png"),
  "Shopping": require("../assets/event-categories/retail.png"),
  "Workshops": require("../assets/event-categories/workshop.png"),
  Other: require("../assets/event-categories/other.png"),
};

const DEFAULT_EVENT_IMAGE_SOURCE = require("../assets/event-categories/other.png");

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
