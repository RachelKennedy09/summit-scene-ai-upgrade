// components/account/ThemeSection.js
// Allows users to customize the look of the app through two UI features:
//
// 1. App Theme Selector (Feminine / Masculine / Christmas)
//    - Changes the entire color palette using ThemeContext
//
// 2. Appearance Mode (Light / Dark)
//    - A quick toggle inside the selected theme
//    - Does NOT switch themes; only changes between the light/dark version
//      of the chosen theme.
//
// This section appears inside the Account Screen.

import React from "react";
import { View, Text, Pressable, Switch, StyleSheet } from "react-native";
import { colors } from "../../theme/colors"; // fallback values

export default function ThemeSection({
  theme, // current theme colors from ThemeContext
  themeName, // current theme ID ("feminine", "masculine", "christmas")
  setThemeName, // update the chosen theme
  isDark, // boolean: is appearance set to dark mode?
  toggleLightDark, // toggle: Light <-> Dark mode within this theme
}) {
  // The choices available for app themes
  const themes = [
    { id: "feminine", label: "Feminine" },
    { id: "masculine", label: "Masculine" },
    { id: "rainbow", label: "Christmas" }, // renaming the label for the UI
  ];

  return (
    <>
      {/* Section Title: App Theme */}
      <Text style={[styles.appThemeTitle, { color: theme.text }]}>
        App Theme
      </Text>

      {/*  Theme Selection Pills
          - Highlights active theme with accent/border */}
      <View style={styles.pillRow}>
        {themes.map((item) => {
          const isActive = themeName === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setThemeName(item.id)}
              style={[
                styles.themePill,
                {
                  borderColor: isActive ? theme.accent : theme.border,
                  backgroundColor: isActive
                    ? theme.accentSoft || theme.card
                    : theme.card,
                },
              ]}
            >
              <Text
                style={{
                  color: isActive ? theme.textOnAccent || "#000" : theme.text,
                  fontWeight: isActive ? "600" : "400",
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Light / Dark Mode Toggle 
          - Does NOT change themeName
          - Only toggles "appearance" of theme*/}
      <View
        style={[
          styles.themeCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.themeRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Appearance
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
              Switch quickly between light and dark for this theme.
            </Text>
          </View>

          {/* Right-side toggle */}
          <View style={{ alignItems: "center" }}>
            <Text
              style={{
                color: theme.textMuted,
                marginBottom: 4,
                fontSize: 12,
              }}
            >
              {isDark ? "Dark" : "Light"}
            </Text>

            <Switch
              value={isDark}
              onValueChange={toggleLightDark}
              trackColor={{
                false: theme.border,
                true: theme.accentSoft || theme.accent,
              }}
              thumbColor={isDark ? theme.accent : "#f4f3f4"}
            />
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  appThemeTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 24,
    marginBottom: 8,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  themePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 8,
  },
  themeCard: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textLight,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 10,
  },
});
