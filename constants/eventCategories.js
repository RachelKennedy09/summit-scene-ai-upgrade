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
      "BIPOC",
      "Inclusive Outdoors",
      "Indigenous",
      "LGBTQ+ Meetups",
      "Pride Events",
      "Queer Community",
      "Sensory Friendly",
      "Trans & Non-Binary Inclusive",
      "Wheelchair Accessible",
    ],
  },
  {
    title: "Learning",
    options: [
      "Career Events",
      "Language Exchange",
      "Employee Workshops",
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
      "Baseball",
      "Basketball",
      "Bouldering",
      "Camping",
      "Canoeing",
      "Climbing",
      "Cross-Country Skiing",
      "Curling",
      "Fishing",
      "Hiking",
      "Hockey",
      "Ice Skating",
      "Kayaking",
      "Marathons",
      "Mountain Biking",
      "Paddleboarding",
      "Pickleball",
      "Road Cycling",
      "Rugby",
      "Photography Walks",
      "Skiing",
      "Snowboarding",
      "Snowshoeing",
      "Soccer",
      "Softball",
      "Sports Watch Parties",
      "Tennis",
      "Trail Running",
      "Ultimate Frisbee",
      "Volleyball",
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
      "Senior Events",
      "Student Events",
      "Youth Events",
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

export const EVENT_CATEGORIES = ["All", ...EVENT_MAIN_CATEGORIES];
export const EVENT_CATEGORY_GROUP_ALL_PREFIX = "All ";
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
  "Arts & Creativity": { tint: "#FBE8E3", text: "#8A3F32", border: "#E9B8AD" },
  "Family & Pets": { tint: "#E2F1F8", text: "#2F6279", border: "#ACD2E3" },
  "Food & Drink": { tint: "#FFF0D8", text: "#7A531C", border: "#EBC884" },
  "Inclusive Community": { tint: "#F9E4EF", text: "#87405F", border: "#E6AFC8" },
  Learning: { tint: "#E7ECFA", text: "#3D5488", border: "#B8C5EA" },
  "Music & Nightlife": { tint: "#F0E6F6", text: "#63407E", border: "#CFB1E4" },
  "Outdoors & Sports": { tint: "#E2F0E8", text: "#2E6848", border: "#A8D1B8" },
  "Tours & Experiences": { tint: "#F7EFCB", text: "#74621D", border: "#DDCA78" },
  Community: { tint: "#DFF2EF", text: "#2B6A63", border: "#A1D4CE" },
  Wellness: { tint: "#EAF3DF", text: "#526B2F", border: "#C3D9A5" },
  "Comfort & Pace": { tint: "#EAF3DF", text: "#526B2F", border: "#C3D9A5" },
  "Social Feel": { tint: "#DFF2EF", text: "#2B6A63", border: "#A1D4CE" },
  "Access & Cost": { tint: "#E2F1F8", text: "#2F6279", border: "#ACD2E3" },
  "Lifestyle & Safety": { tint: "#F9E4EF", text: "#87405F", border: "#E6AFC8" },
  Setting: { tint: "#E2F0E8", text: "#2E6848", border: "#A8D1B8" },
  "Activity Style": { tint: "#FBE8E3", text: "#8A3F32", border: "#E9B8AD" },
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
    "AI & Tech": "Learning",
    "Business Workshops": "Learning",
    "Coding Meetups": "Learning",
    Finance: "Learning",
    "Public Speaking": "Learning",
    "Skill Sharing": "Learning",
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
