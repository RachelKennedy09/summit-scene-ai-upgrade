export const EVENT_CATEGORY_GROUPS = [
  {
    title: "Outdoors & Adventure",
    options: [
      "Hiking",
      "Trail Running",
      "Climbing",
      "Bouldering",
      "Skiing",
      "Snowboarding",
      "Cross-Country Skiing",
      "Backcountry",
      "Mountain Biking",
      "Paddleboarding",
      "Kayaking",
      "Canoeing",
      "Camping",
      "Fishing",
      "Wildlife Tours",
      "Photography Walks",
      "Ice Skating",
      "Snowshoeing",
      "Outdoor Yoga",
    ],
  },
  {
    title: "Social & Community",
    options: [
      "Meetups",
      "New in Town",
      "Community Gatherings",
      "Networking",
      "Coffee Meetups",
      "Cultural Events",
      "Volunteer Events",
      "Local Clubs",
      "Student Events",
      "Digital Nomad Meetups",
    ],
  },
  {
    title: "Inclusive Community",
    options: [
      "LGBTQ+ Meetups",
      "Pride Events",
      "Queer Community",
      "Trans & Non-Binary Inclusive",
      "Allyship",
      "Inclusive Outdoors",
    ],
  },
  {
    title: "Food & Drink",
    options: [
      "Brunch",
      "Coffee",
      "Breweries",
      "Wine Tastings",
      "Cocktail Nights",
      "Food Trucks",
      "Farmers Markets",
      "Pop-Up Dinners",
      "Restaurant Specials",
      "Cooking Classes",
    ],
  },
  {
    title: "Music & Nightlife",
    options: [
      "Live Music",
      "DJs",
      "Open Mic",
      "Karaoke",
      "Dance Nights",
      "Festivals",
      "Concerts",
      "Pub Nights",
      "After Parties",
      "Comedy",
    ],
  },
  {
    title: "Wellness",
    options: [
      "Yoga",
      "Meditation",
      "Breathwork",
      "Sauna & Cold Plunges",
      "Wellness Retreats",
      "Sound Baths",
      "Fitness Classes",
      "Run Clubs",
      "Gym Events",
      "Mental Wellness",
      "Recovery Sessions",
    ],
  },
  {
    title: "Arts & Creativity",
    options: [
      "Art Shows",
      "Pottery",
      "Painting Nights",
      "Photography",
      "Writing Groups",
      "Creative Workshops",
      "Film Screenings",
      "Craft Markets",
      "Makers Markets",
    ],
  },
  {
    title: "Learning & Workshops",
    options: [
      "Business Workshops",
      "Coding Meetups",
      "AI & Tech",
      "Finance",
      "Career Events",
      "Public Speaking",
      "Skill Sharing",
      "Language Exchange",
    ],
  },
  {
    title: "Seasonal & Tourism",
    options: [
      "Holiday Events",
      "Canada Day",
      "Christmas Markets",
      "Summer Kickoff",
      "Ski Season Launch",
      "Stampede Events",
      "Local Tours",
      "Visitor Experiences",
    ],
  },
  {
    title: "Family & Pets",
    options: [
      "Family Friendly",
      "Kids Activities",
      "Dog Friendly",
      "Pet Meetups",
      "Adoption Events",
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

export const EVENT_CATEGORIES = ["All", ...EVENT_FORM_CATEGORIES];
export const EVENT_CATEGORY_GROUP_ALL_PREFIX = "All ";

export const PROFILE_INTEREST_GROUPS = EVENT_CATEGORY_GROUPS.filter(
  (group) => group.title !== "Other"
);

export const PROFILE_INTEREST_OPTIONS = PROFILE_INTEREST_GROUPS.flatMap(
  (group) => group.options
);

export const COMMUNITY_NOTICE_CATEGORIES = [
  "Garage Sale",
  "Gear Sale / Swap",
  "Free Stuff",
  "Lost & Found",
  "Community Notice",
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
    (item) => `${EVENT_CATEGORY_GROUP_ALL_PREFIX}${item.title}` === category
  );

  return group ? group.options : [category];
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
