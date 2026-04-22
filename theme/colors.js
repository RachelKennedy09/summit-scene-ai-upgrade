// theme/colors.js
// Global color palette for SummitScene
// Centralizes brand colors so we stay consistent across screens and components.

export const colors = {
  // BRAND COLORS
  primary: "#0b1522", // deep mountain blue (backgrounds, headers)
  secondary: "#1e293b", // slate dark (cards, tab backgrounds)
  accent: "#3b82f6", // bright blue (buttons, categories)
  pinkAccent: "#f7b4d5ff", // optional accent for chips or highlights

  // TEXT
  textLight: "#e2e8f0", // light gray-blue (text on dark backgrounds)
  textDark: "#0f172a", // dark slate (text on white cards)
  textMuted: "#94a3b8", // soft muted gray for subtitles

  // SURFACES
  card: "#ffffff", // event cards or white elements
  cardDark: "#334155", // dark mode card

  // BORDERS & LINES
  border: "#475569",

  // STATUS COLORS
  success: "#22c55e",
  error: "#ef4444",
  warning: "#facc15",
  successTint: "#022c22",

  // MAP MARKER COLORS (FUTURE for custom pin colors)
  markerDefault: "#3b82f6",
  markerFood: "#f97316",
  markerMusic: "#8b5cf6",
  markerOutdoor: "#22c55e",

  // Misc brand helpers
  cta: "#FF8A3D", // call-to-action orange (buttons, highlights)
  danger: "#b91c1c", // delete buttons
  teal: "#0f766e", // business-owner badge color
  tealTint: "#0f766e10", // soft teal translucent background
};
