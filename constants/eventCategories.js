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
    title: "Learning & Workshops",
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
    title: "Outdoors, Sports & Adventure",
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
      "Wildlife Tours",
      "Yoga",
    ],
  },
  {
    title: "Seasonal & Tourism",
    options: [
      "Canada Day",
      "Christmas Markets",
      "Holiday Events",
      "Local Tours",
      "Ski Season Launch",
      "Stampede Events",
      "Summer Kickoff",
      "Visitor Experiences",
    ],
  },
  {
    title: "Social & Community",
    options: [
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
      "Meditation",
      "Mental Wellness",
      "Recovery Sessions",
      "Run Clubs",
      "Sauna & Cold Plunges",
      "Sound Baths",
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

export const EVENT_CATEGORIES = ["All", ...EVENT_FORM_CATEGORIES];
export const EVENT_CATEGORY_GROUP_ALL_PREFIX = "All ";

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
