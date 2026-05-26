const EVENT_CATEGORY_TO_BUDDY_TYPE = {
  "Arts & Creativity": "art",
  "Family & Pets": "general",
  "Food & Drink": "event",
  "Inclusive Community": "general",
  Learning: "general",
  "Learning & Workshops": "general",
  "Music & Nightlife": "event",
  "Outdoors & Sports": "hiking",
  "Outdoors, Sports & Adventure": "hiking",
  "Seasonal & Tourism": "event",
  "Tours & Experiences": "event",
  Community: "general",
  "Social & Community": "general",
  Wellness: "walking",
  Hiking: "hiking",
  "Trail Running": "hiking",
  Climbing: "hiking",
  Bouldering: "hiking",
  Skiing: "skiing",
  Snowboarding: "snowboarding",
  "Cross-Country Skiing": "skiing",
  Backcountry: "skiing",
  "Mountain Biking": "hiking",
  Paddleboarding: "event",
  Kayaking: "event",
  Canoeing: "event",
  Camping: "hiking",
  Fishing: "event",
  "Wildlife Tours": "event",
  "Photography Walks": "walking",
  "Ice Skating": "skiing",
  Snowshoeing: "hiking",
  "Outdoor Yoga": "walking",
  Meetups: "general",
  "New in Town": "general",
  "Community Gatherings": "general",
  Networking: "general",
  "Coffee Meetups": "general",
  "Book Clubs": "bookclub",
  "Cultural Events": "art",
  "Volunteer Events": "general",
  "Local Clubs": "general",
  "Student Events": "general",
  "Digital Nomad Meetups": "general",
  Brunch: "event",
  Coffee: "event",
  Breweries: "event",
  "Wine Tastings": "event",
  "Cocktail Nights": "event",
  "Food Trucks": "event",
  "Food Tours": "event",
  "Farmers Markets": "shopping",
  "Pop-Up Dinners": "event",
  "Restaurant Specials": "event",
  "Cooking Classes": "event",
  "Live Music": "event",
  DJs: "event",
  "Open Mic": "event",
  Karaoke: "event",
  "Dance Nights": "event",
  Festivals: "event",
  Concerts: "event",
  "Pub Nights": "event",
  "After Parties": "event",
  Comedy: "event",
  Yoga: "walking",
  Meditation: "walking",
  Breathwork: "walking",
  "Sauna & Cold Plunges": "walking",
  "Wellness Retreats": "walking",
  "Sound Baths": "walking",
  "Fitness Classes": "walking",
  "Run Clubs": "walking",
  "Gym Events": "walking",
  "Low-Impact Fitness": "walking",
  "Mental Wellness": "walking",
  "Recovery Sessions": "walking",
  "Sober Events": "event",
  "Strength Training": "walking",
  "Walking Groups": "walking",
  "Art Shows": "art",
  Pottery: "art",
  "Painting Nights": "art",
  Photography: "art",
  "Writing Groups": "art",
  "Creative Workshops": "art",
  "Film Screenings": "art",
  "Craft Markets": "art",
  "Makers Markets": "art",
  "Business Workshops": "general",
  "Coding Meetups": "general",
  "AI & Tech": "general",
  Finance: "general",
  "Career Events": "general",
  "Public Speaking": "general",
  "Skill Sharing": "general",
  "Language Exchange": "general",
  "Holiday Events": "event",
  "Canada Day": "event",
  "Christmas Markets": "shopping",
  "Summer Kickoff": "event",
  "Ski Season Launch": "skiing",
  "Stampede Events": "event",
  "Local Tours": "event",
  "Visitor Experiences": "event",
  "Guided Hikes": "hiking",
  "Hiking Guides": "hiking",
  "Canoe Tours": "event",
  "Photography Tours": "walking",
  "Ski Clinics": "skiing",
  "Yoga Retreats": "walking",
  "Family Friendly": "event",
  "Kids Activities": "event",
  "Dog Friendly": "general",
  "Pet Meetups": "general",
  "Adoption Events": "general",
  "Garage Sale": "notice",
  "Gear Sale / Swap": "notice",
  "Free Stuff": "notice",
  "Lost & Found": "notice",
  "Ride Share": "notice",
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
  const selectedCategory =
    category && category !== "All" && !category.startsWith("All ")
      ? category
      : "";
  const normalizedTown = normalizeTown(town, userTown);
  const categoryLabel = selectedCategory || "local event";
  const article = getArticle(categoryLabel);
  const placeLabel = normalizedTown ? ` in ${normalizedTown}` : "";

  return {
    type: getBuddyTypeForEventCategory(selectedCategory),
    category: selectedCategory,
    categories: selectedCategory ? [selectedCategory] : [],
    categoryTags: [],
    communityType: "local-plan",
    town: normalizedTown,
    activityText: `Anyone want to organize ${article} ${categoryLabel.toLowerCase()} plan${placeLabel}?`,
  };
}
