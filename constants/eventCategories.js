export const EVENT_CATEGORY_GROUPS = [
  {
    title: "Outdoors & Sports",
    options: ["Outdoors", "Ski Hill Events", "Disc Golf", "Sports/Watch Party"],
  },
  {
    title: "Music & Nightlife",
    options: ["Live Music", "Karaoke", "Nightlife"],
  },
  {
    title: "Arts & Learning",
    options: ["Art", "Workshop", "Book Club"],
  },
  {
    title: "Wellness & Community",
    options: ["Wellness", "Community Info Session", "Fundraiser", "Family"],
  },
  {
    title: "Food, Drink & Markets",
    options: ["Happy Hour", "Specials", "Food Trucks", "Markets", "Vendors"],
  },
  {
    title: "Retail & Local Business",
    options: ["Retail", "Networking"],
  },
  {
    title: "Seasonal",
    options: ["Seasonal/Holiday Special"],
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

export function getEventCategoryGroups({
  includeAll = false,
  allLabel = "All",
} = {}) {
  if (!includeAll) return EVENT_CATEGORY_GROUPS;

  return [
    {
      title: "All",
      options: [allLabel],
    },
    ...EVENT_CATEGORY_GROUPS,
  ];
}
