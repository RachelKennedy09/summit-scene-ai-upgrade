import {
  CATEGORY_ACCENTS,
  VIBE_TAG_GROUPS,
  getMainCategoryForTag,
} from "../constants/eventCategories";

export function getCategoryAccent(category, theme = {}) {
  const vibeGroupTitle =
    VIBE_TAG_GROUPS.find(
      (group) => group.title === category || group.options.includes(category)
    )?.title || "";
  const mainCategory =
    getMainCategoryForTag(category) || vibeGroupTitle || category || "Other";
  return (
    CATEGORY_ACCENTS[mainCategory] || {
      tint: theme.accentSoft || theme.card,
      text: theme.accent || theme.text,
      border: theme.border,
    }
  );
}

export function getVisibleTags(tags = [], limit = 3) {
  const values = Array.isArray(tags) ? tags.filter(Boolean) : [];
  return {
    visible: values.slice(0, limit),
    hiddenCount: Math.max(values.length - limit, 0),
  };
}
