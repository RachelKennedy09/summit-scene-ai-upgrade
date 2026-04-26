// components/AppLogoHeader.js
import React from "react";
import { View, Image, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";
import logo from "../assets/logo-app-earth-transparent-alpha.png";

export default function AppLogoHeader() {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.headerBackground || theme.background,
        },
      ]}
    >
      <Image
        source={logo}
        style={styles.logo}
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
    marginBottom: 8,
  },
  logo: {
    width: 108,
    height: 116,
  },
});
