import { EVENT_MAIN_CATEGORIES } from "../constants/eventCategories.js";
import { dateRange, validDate } from "./publicEventDates.js";
export const TOWNS = { banff: "Banff", "lake-louise": "Lake Louise", canmore: "Canmore" };
const categories = EVENT_MAIN_CATEGORIES;
export function parsePublicFilters(input = {}, now = new Date()) {
  for (const key of ["town", "category", "when", "from", "to", "page"]) {
    if (input[key] !== undefined && input[key] !== null && typeof input[key] !== "string") throw new Error("Invalid filter value.");
  }
  const town = input.town || "";
  const category = input.category || "";
  const preset = input.when || "";
  if (town && !Object.values(TOWNS).includes(town)) throw new Error("Choose a valid town.");
  if (category && !categories.includes(category)) throw new Error("Choose a valid category.");
  if (preset && !["today", "tomorrow", "weekend"].includes(preset)) throw new Error("Choose a valid date filter.");
  for (const key of ["from", "to"]) if (input[key] && !validDate(input[key])) throw new Error("Choose a valid date.");
  const range = dateRange(preset, input.from, input.to, now);
  if (range.to < range.from || Date.parse(range.to) - Date.parse(range.from) > 366 * 86400000) throw new Error("Choose a date range within one year.");
  const page = Number(input.page || 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new Error("Invalid page.");
  return { town, category, preset, ...range, page };
}

