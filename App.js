// App.js
// Entry point of the app
// Sets up providers and NavigationContainer,
// then renders RootNavigator which decides Auth vs App stack.

import React from "react";
import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import RootNavigator from "./navigation/RootNavigator";

// Separate component so we can use the theme hook
function AppNavigation() {
  const { navTheme, isDark, theme } = useTheme();

  return (
    <>
      {/*  Status bar follows theme */}
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
      />
      <NavigationContainer theme={navTheme}>
        <RootNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <AppNavigation />
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
