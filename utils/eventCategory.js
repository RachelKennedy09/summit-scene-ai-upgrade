import { getMainCategoryForTag } from "../constants/eventCategories.js";

export function getEventCategory(event) {
  const category = event?.category || event?.categories?.[0] || "";
  return getMainCategoryForTag(category) || category;
}
