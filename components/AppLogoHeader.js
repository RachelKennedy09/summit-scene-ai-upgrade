// components/AppLogoHeader.js
import React from "react";
import { View, Image, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";
import logo from "../assets/logo.png"; // update path if needed

export default function AppLogoHeader() {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: theme.border }]}>
      <Image
        source={logo}
        style={[
          styles.logo,
          {
            tintColor: theme.text, // auto-adapts to light/dark
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingTop: 8,
    paddingBottom: 12,
    alignItems: "center",
    borderBottomWidth: 0.5,
    marginBottom: 8,
  },
  logo: {
    width: 100,
    height: 100,
  },
});
