import React from "react";
import { Image, View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import logo from "../../assets/logo-app-earth-transparent-alpha.png";

export default function PageHeader({
  title,
  subtitle,
  rightAccessory,
  style,
  showLogo = true,
}) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          {showLogo ? (
            <Image source={logo} style={styles.logo} resizeMode="contain" />
          ) : null}
          <Text style={[styles.title, { color: theme.text || theme.textMain }]}>
            {title}
          </Text>
        </View>
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
    paddingTop: 6,
    marginBottom: 16,
  },
  copy: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 4,
  },
  logo: {
    width: 42,
    height: 42,
    flexShrink: 0,
  },
  title: {
    flex: 1,
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 23,
  },
  rightAccessory: {
    paddingTop: 2,
  },
});
