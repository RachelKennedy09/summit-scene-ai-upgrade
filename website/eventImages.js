import { getMainCategoryForTag } from "../constants/eventCategories.js";

// Mirrors the app's bundled category illustrations in utils/eventImages.js.
// These are fallbacks, not photographs of the particular event.
const CATEGORY_IMAGES = {
  "Arts & Creativity": "art", "Family & Pets": "family", "Food & Drink": "food-drink",
  "Inclusive Community": "market", Learning: "workshop", "Music & Nightlife": "music",
  "Outdoors & Sports": "outdoors", "Tours & Experiences": "other", Community: "market",
  Wellness: "wellness", "Art Shows": "art", "Craft Markets": "art", "Creative Workshops": "workshop",
  "Farmers Markets": "art", "Makers Markets": "market", Market: "market", Markets: "market",
  "Painting Nights": "art", Pottery: "workshop", Shopping: "retail", Workshops: "workshop", Other: "other",
};
export const CATEGORY_IMAGE_FILES = [...new Set(Object.values(CATEGORY_IMAGES))]
  .flatMap((name) => [320, 800].map((width) => `assets/event-categories/${name}-${width}.jpg`));
export function categoryImagePath(event, width = 800) {
  const categories = Array.isArray(event?.categories) && event.categories.length ? event.categories : [event?.category];
  const direct = categories.find((category) => CATEGORY_IMAGES[category]);
  const category = direct || categories.map(getMainCategoryForTag).find(Boolean) || "Other";
  return `/assets/event-categories/${CATEGORY_IMAGES[category] || "other"}-${width === 320 ? 320 : 800}.jpg`;
}
