// App.js
// Entry point of the app
// Sets up providers and NavigationContainer,
// then renders RootNavigator which decides Auth vs App stack.

import React, { useEffect } from "react";
import { StatusBar } from "react-native";
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import RateAppPrompt from "./components/RateAppPrompt";
import RootNavigator from "./navigation/RootNavigator";

const navigationRef = createNavigationContainerRef();

const linking = {
  prefixes: ["summitscene://"],
  config: {
    screens: {
      VerifyEmail: "verify-email",
      ResetPassword: "reset-password",
    },
  },
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Separate component so we can use the theme hook
function AppNavigation() {
  const { navTheme, isDark, theme } = useTheme();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const eventId =
          response.notification.request.content.data?.eventId || "";
        if (eventId && navigationRef.isReady()) {
          navigationRef.navigate("EventDetail", { eventId });
        }
      }
    );

    return () => subscription.remove();
  }, []);

  return (
    <>
      {/*  Status bar follows theme */}
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
      />
      <NavigationContainer ref={navigationRef} theme={navTheme} linking={linking}>
        <RateAppPrompt />
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
