import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../context/ThemeContext";

export default function PageHeader({ title, subtitle, rightAccessory, style }) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: theme.text || theme.textMain }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightAccessory ? (
        <View style={styles.rightAccessory}>{rightAccessory}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  rightAccessory: {
    paddingTop: 2,
  },
});
