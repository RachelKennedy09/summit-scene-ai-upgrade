// components/AvatarPicker.js
// Renders all available avatars in a responsive grid.
// User taps an avatar → we call onChange(key) and highlight the selected one.

import React from "react";
import { View, Pressable, Image, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { AVATARS, AVATAR_KEYS } from "../assets/avatars/avatarConfig";

export default function AvatarPicker({ value, onChange }) {
  const { theme } = useTheme();

  return (
    <View style={styles.grid}>
      {AVATAR_KEYS.map((key) => {
        const source = AVATARS[key];
        const isSelected = key === value;

        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={[
              styles.avatarWrapper,
              {
                borderColor: isSelected
                  ? theme.accent // highlighted border
                  : "transparent",
                backgroundColor: theme.card, // theme-safe background
              },
            ]}
          >
            <Image source={source} style={styles.avatarImage} />
          </Pressable>
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
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
});
