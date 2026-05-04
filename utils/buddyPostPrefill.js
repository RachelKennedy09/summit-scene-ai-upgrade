const EVENT_CATEGORY_TO_BUDDY_TYPE = {
  "Book Club": "bookclub",
  "Disc Golf": "discgolf",
  Outdoors: "hiking",
  "Ski Hill Events": "skiing",
  Art: "art",
  "Live Music": "event",
  Karaoke: "event",
  Nightlife: "event",
  Wellness: "walking",
  "Happy Hour": "event",
  Specials: "shopping",
  "Food Trucks": "event",
  Markets: "shopping",
  Vendors: "shopping",
  Retail: "shopping",
  "Garage Sale": "notice",
  "Gear Sale / Swap": "notice",
  "Free Stuff": "notice",
  "Lost & Found": "notice",
  "Community Notice": "notice",
  "Volunteer Help": "notice",
};

function normalizeTown(town, userTown) {
  const candidate = town && town !== "All" ? town : userTown;

  if (!candidate || candidate === "All") {
    return "";
  }

  return candidate === "LL" ? "Lake Louise" : candidate;
}

function getArticle(label) {
  return /^[aeiou]/i.test(label) ? "an" : "a";
}

export function getBuddyTypeForEventCategory(category) {
  if (!category || category === "All") {
    return "event";
  }

  return EVENT_CATEGORY_TO_BUDDY_TYPE[category] || "event";
}

export function buildBuddyPostFromEventSearch({ category, town, userTown } = {}) {
  const selectedCategory = category && category !== "All" ? category : "";
  const normalizedTown = normalizeTown(town, userTown);
  const categoryLabel = selectedCategory || "local event";
  const article = getArticle(categoryLabel);
  const placeLabel = normalizedTown ? ` in ${normalizedTown}` : "";

  return {
    type: getBuddyTypeForEventCategory(selectedCategory),
    category: selectedCategory,
    communityType: "local-plan",
    town: normalizedTown,
    activityText: `Anyone want to organize ${article} ${categoryLabel.toLowerCase()} plan${placeLabel}?`,
  };
}
