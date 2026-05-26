export const EVENT_CATEGORY_GROUPS = [
  {
    title: "Arts & Creativity",
    options: [
      "Art Shows",
      "Craft Markets",
      "Creative Workshops",
      "Film Screenings",
      "Makers Markets",
      "Painting Nights",
      "Photography",
      "Pottery",
      "Writing Groups",
    ],
  },
  {
    title: "Family & Pets",
    options: [
      "Adoption Events",
      "Dog Friendly",
      "Family Friendly",
      "Kids Activities",
      "Pet Meetups",
    ],
  },
  {
    title: "Food & Drink",
    options: [
      "Breweries",
      "Brunch",
      "Cocktail Nights",
      "Coffee",
      "Cooking Classes",
      "Farmers Markets",
      "Food Tours",
      "Food Trucks",
      "Pop-Up Dinners",
      "Restaurant Specials",
      "Wine Tastings",
    ],
  },
  {
    title: "Inclusive Community",
    options: [
      "Allyship",
      "Inclusive Outdoors",
      "LGBTQ+ Meetups",
      "Pride Events",
      "Queer Community",
      "Trans & Non-Binary Inclusive",
    ],
  },
  {
    title: "Learning",
    options: [
      "AI & Tech",
      "Business Workshops",
      "Career Events",
      "Coding Meetups",
      "Finance",
      "Language Exchange",
      "Public Speaking",
      "Skill Sharing",
    ],
  },
  {
    title: "Music & Nightlife",
    options: [
      "After Parties",
      "Comedy",
      "Concerts",
      "Dance Nights",
      "DJs",
      "Festivals",
      "Karaoke",
      "Live Music",
      "Open Mic",
      "Pub Nights",
    ],
  },
  {
    title: "Outdoors & Sports",
    options: [
      "Backcountry",
      "Bouldering",
      "Camping",
      "Canoeing",
      "Climbing",
      "Cross-Country Skiing",
      "Curling",
      "Fishing",
      "Hiking",
      "Ice Skating",
      "Kayaking",
      "Mountain Biking",
      "Paddleboarding",
      "Photography Walks",
      "Skiing",
      "Snowboarding",
      "Snowshoeing",
      "Trail Running",
      "Yoga",
    ],
  },
  {
    title: "Tours & Experiences",
    options: [
      "Canoe Tours",
      "Canada Day",
      "Christmas Markets",
      "Guided Hikes",
      "Hiking Guides",
      "Holiday Events",
      "Local Tours",
      "Photography Tours",
      "Ski Clinics",
      "Ski Season Launch",
      "Stampede Events",
      "Summer Kickoff",
      "Visitor Experiences",
      "Wildlife Tours",
      "Yoga Retreats",
    ],
  },
  {
    title: "Community",
    options: [
      "Book Clubs",
      "Coffee Meetups",
      "Community Gatherings",
      "Cultural Events",
      "Digital Nomad Meetups",
      "Local Clubs",
      "Meetups",
      "Networking",
      "New in Town",
      "Student Events",
      "Volunteer Events",
    ],
  },
  {
    title: "Wellness",
    options: [
      "Breathwork",
      "Fitness Classes",
      "Gym Events",
      "Low-Impact Fitness",
      "Meditation",
      "Mental Wellness",
      "Recovery Sessions",
      "Run Clubs",
      "Sauna & Cold Plunges",
      "Sober Events",
      "Sound Baths",
      "Strength Training",
      "Walking Groups",
      "Wellness Retreats",
    ],
  },
  {
    title: "Other",
    options: ["Other"],
  },
];

export const EVENT_FORM_CATEGORIES = EVENT_CATEGORY_GROUPS.flatMap(
  (group) => group.options
);

export const EVENT_MAIN_CATEGORIES = EVENT_CATEGORY_GROUPS.map(
  (group) => group.title
);
export const EVENT_CATEGORY_TAGS = EVENT_CATEGORY_GROUPS.flatMap(
  (group) => group.options
);
export const EVENT_CATEGORY_VALUES = [
  ...new Set([...EVENT_MAIN_CATEGORIES, ...EVENT_CATEGORY_TAGS]),
];
export const MAX_CATEGORY_TAGS = 8;

export const EVENT_CATEGORIES = ["All", ...EVENT_MAIN_CATEGORIES];
export const EVENT_CATEGORY_GROUP_ALL_PREFIX = "All ";
export const MAX_VIBE_TAGS = 5;
export const VIBE_TAG_GROUPS = [
  {
    title: "Comfort & Pace",
    options: [
      "Beginner-friendly",
      "Low-impact",
      "No experience needed",
      "Quiet",
      "Relaxed pace",
      "Solo-friendly",
    ],
  },
  {
    title: "Social Feel",
    options: [
      "Date night",
      "Drop-in",
      "Good for groups",
      "Meet new people",
      "Newcomer-friendly",
      "Social",
    ],
  },
  {
    title: "Access & Cost",
    options: [
      "Accessible",
      "Budget-friendly",
      "Free",
      "Low-cost",
      "Registration required",
      "Wheelchair accessible",
    ],
  },
  {
    title: "Lifestyle & Safety",
    options: [
      "Alcohol-free",
      "Family-friendly",
      "Kid-friendly",
      "LGBTQ+ friendly",
      "Sober-friendly",
      "Women-led",
    ],
  },
  {
    title: "Setting",
    options: [
      "Dog-friendly",
      "Indoor",
      "Outdoor",
      "Rainy day",
      "Scenic",
      "Weather-dependent",
    ],
  },
  {
    title: "Activity Style",
    options: [
      "Creative",
      "Foodie",
      "Hands-on",
      "Live music",
      "Mindful",
      "Strength training",
    ],
  },
];
export const VIBE_TAGS = VIBE_TAG_GROUPS.flatMap((group) => group.options);

export const CATEGORY_ACCENTS = {
  "Arts & Creativity": { tint: "#F8E7EA", text: "#8A3D54", border: "#E8B8C4" },
  "Family & Pets": { tint: "#E5F0F7", text: "#365F7D", border: "#B8D2E4" },
  "Food & Drink": { tint: "#F8EBDD", text: "#8A5730", border: "#E8C7A5" },
  "Inclusive Community": { tint: "#EEE7F8", text: "#5A4385", border: "#CDBCE8" },
  Learning: { tint: "#ECEAF8", text: "#4D4A86", border: "#C4C1E8" },
  "Music & Nightlife": { tint: "#E9E7F3", text: "#453D72", border: "#BEB8D9" },
  "Outdoors & Sports": { tint: "#E2EFE8", text: "#2F684A", border: "#AFD2BE" },
  "Tours & Experiences": { tint: "#F8F0D8", text: "#806125", border: "#E5D09A" },
  Community: { tint: "#E4EFF4", text: "#345F70", border: "#B4D1DC" },
  Wellness: { tint: "#E6F0E6", text: "#426B49", border: "#B8D6BA" },
  Other: { tint: "#ECEAE4", text: "#5F5A4F", border: "#D6D2C4" },
};

export const PROFILE_INTEREST_GROUPS = EVENT_CATEGORY_GROUPS.filter(
  (group) => group.title !== "Other"
);

export const PROFILE_INTEREST_OPTIONS = PROFILE_INTEREST_GROUPS.flatMap(
  (group) => group.options
);

export const COMMUNITY_NOTICE_CATEGORIES = [
  "Community Notice",
  "Free Stuff",
  "Garage Sale",
  "Gear Sale / Swap",
  "Lost & Found",
  "Ride Share",
  "Volunteer Help",
];

export const COMMUNITY_CATEGORY_GROUPS = [
  ...EVENT_CATEGORY_GROUPS,
  {
    title: "Local Notices",
    options: COMMUNITY_NOTICE_CATEGORIES,
  },
];

export const COMMUNITY_FORM_CATEGORIES = COMMUNITY_CATEGORY_GROUPS.flatMap(
  (group) => group.options
);
export const COMMUNITY_MAIN_CATEGORIES = COMMUNITY_CATEGORY_GROUPS.map(
  (group) => group.title
);
export const COMMUNITY_CATEGORY_TAGS = COMMUNITY_CATEGORY_GROUPS.flatMap(
  (group) => group.options
);
export const COMMUNITY_CATEGORY_VALUES = [
  ...new Set([...COMMUNITY_MAIN_CATEGORIES, ...COMMUNITY_CATEGORY_TAGS]),
];

export function getEventCategoryGroups({
  includeAll = false,
  allLabel = "All",
  includeGroupAll = false,
} = {}) {
  const groups = includeGroupAll
    ? EVENT_CATEGORY_GROUPS.map((group) => ({
        ...group,
        options: [
          `${EVENT_CATEGORY_GROUP_ALL_PREFIX}${group.title}`,
          ...group.options,
        ],
      }))
    : EVENT_CATEGORY_GROUPS;

  if (!includeAll) return groups;

  return [
    {
      title: "All",
      options: [allLabel],
    },
    ...groups,
  ];
}

export function getEventCategoryFilterOptions(category) {
  if (!category || category === "All") return null;

  const group = EVENT_CATEGORY_GROUPS.find(
    (item) =>
      `${EVENT_CATEGORY_GROUP_ALL_PREFIX}${item.title}` === category ||
      item.title === category
  );

  return group ? [group.title, ...group.options] : [category];
}

export function getMainCategoryForTag(value) {
  if (!value) return "";

  const legacyMainCategoryMap = {
    "Learning & Workshops": "Learning",
    "Outdoors, Sports & Adventure": "Outdoors & Sports",
    "Seasonal & Tourism": "Tours & Experiences",
    "Social & Community": "Community",
  };

  if (legacyMainCategoryMap[value]) return legacyMainCategoryMap[value];

  const group = EVENT_CATEGORY_GROUPS.find(
    (item) => item.title === value || item.options.includes(value)
  );

  return group?.title || "";
}

export function getCategoryTagGroupsForCategories(categories = []) {
  const selected = Array.isArray(categories) ? categories : [categories];
  const selectedSet = new Set(selected.filter(Boolean));
  const groups = selectedSet.size
    ? EVENT_CATEGORY_GROUPS.filter((group) => selectedSet.has(group.title))
    : EVENT_CATEGORY_GROUPS;

  return groups
    .filter((group) => group.title !== "Other")
    .map((group) => ({
      title: group.title,
      options: group.options,
    }));
}

export function getCommunityCategoryGroups({
  includeAll = false,
  allLabel = "All",
} = {}) {
  if (!includeAll) return COMMUNITY_CATEGORY_GROUPS;

  return [
    {
      title: "All",
      options: [allLabel],
    },
    ...COMMUNITY_CATEGORY_GROUPS,
  ];
}
