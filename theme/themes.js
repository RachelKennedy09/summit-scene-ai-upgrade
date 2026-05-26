// theme/themes.js
// Single fixed Summit Scene theme built from the sage-green brand system.

import { colors } from "./colors";

export const summitSceneTheme = {
  key: "summit-scene",
  label: "Summit Scene",
  isDark: false,

  // backgrounds
  background: colors.background,
  section: colors.section,
  card: colors.card,
  pill: colors.pill,

  // text
  text: colors.textPrimary,
  textMain: colors.textPrimary,
  textMuted: colors.textMuted,
  textOnAccent: colors.textOnAccent,
  onAccent: colors.textOnAccent,
  onSuccess: colors.textOnAccent,
  onDanger: colors.textOnAccent,

  // accents
  accent: colors.accent,
  accentSoft: colors.accentSoft,
  accentWarm: colors.accentWarm,
  teal: colors.teal,
  tealTint: colors.tealTint,

  // borders / dividers
  border: colors.border,
  hairline: colors.hairline,

  // navigation
  tabBarBackground: colors.surface,
  tabBarActive: colors.accent,
  tabBarInactive: colors.textMuted,
  tabActive: colors.accent,
  tabInactive: colors.textMuted,
  tabBackground: colors.surface,

  // semantic
  success: colors.success,
  error: colors.error,
  cta: colors.cta,
  danger: colors.danger,

  // helpers
  surface: colors.surface,
  surfaceMuted: colors.surfaceMuted,
  headerBackground: colors.background,
  logoWordmark: colors.logoWordmark,
};

export const themes = {
  summitScene: summitSceneTheme,
};
