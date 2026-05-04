// components/AvatarPicker.js
// Renders all available avatars in a responsive grid.
// User taps an avatar → we call onChange(key) and highlight the selected one.

import React from "react";
import { View, Pressable, Image, StyleSheet, Text } from "react-native";
import { useTheme } from "../context/ThemeContext";
import {
  AVATAR_KEYS,
  BUSINESS_AVATAR_KEYS,
  BUSINESS_AVATAR_LABELS,
  AVATAR_PICKER_SOURCES,
} from "../assets/avatars/avatarConfig";

export default function AvatarPicker({ value, onChange, variant = "personal" }) {
  const { theme } = useTheme();
  const keys = variant === "business" ? BUSINESS_AVATAR_KEYS : AVATAR_KEYS;
  const showLabels = variant === "business";

  return (
    <View style={styles.grid}>
      {keys.map((key) => {
        const source = AVATAR_PICKER_SOURCES[key];
        const isSelected = key === value;

        return (
          <View key={key} style={showLabels ? styles.businessOption : null}>
            <Pressable
              onPress={() => onChange(key)}
              style={({ pressed }) => [
                styles.avatarWrapper,
                showLabels && styles.businessAvatarWrapper,
                {
                  borderColor: isSelected
                    ? theme.accent // highlighted border
                    : "transparent",
                  backgroundColor: theme.card, // theme-safe background
                },
                pressed && styles.pressed,
              ]}
            >
              <Image source={source} style={styles.avatarImage} />
            </Pressable>
            {showLabels ? (
              <Text
                style={[styles.businessLabel, { color: theme.textMuted }]}
                numberOfLines={2}
              >
                {BUSINESS_AVATAR_LABELS[key]}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  avatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 2,
  },
  businessOption: {
    width: 78,
    alignItems: "center",
  },
  businessAvatarWrapper: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  businessLabel: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }, { translateY: 1 }],
  },
});
