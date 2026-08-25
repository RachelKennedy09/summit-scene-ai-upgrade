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
import AppUpdateGate from "./components/AppUpdateGate";
import RateAppPrompt from "./components/RateAppPrompt";
import RootNavigator from "./navigation/RootNavigator";

const navigationRef = createNavigationContainerRef();
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://summit-scene-backend.onrender.com";

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    fetch(`${API_BASE_URL}/api/health`, {
      signal: controller.signal,
    }).catch(() => {
      // The Hub event fetch has its own retry path; this only wakes the API early.
    }).finally(() => {
      clearTimeout(timeoutId);
    });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data || {};
        if (data.type === "daily-events" && navigationRef.isReady()) {
          navigationRef.navigate("tabs", {
            screen: "Hub",
            params: {
              dailyEventsOpenedAt: Date.now(),
              town: data.town || "All",
              dateFilter: "Today",
            },
          });
          return;
        }

        const eventId =
          data.eventId || "";
        if (eventId && navigationRef.isReady()) {
          navigationRef.navigate("EventDetail", { eventId });
          return;
        }

        const buddyPostId =
          data.buddyPostId || "";
        const communityPostId =
          data.communityPostId || "";
        if ((buddyPostId || communityPostId) && navigationRef.isReady()) {
          navigationRef.navigate("Notifications");
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
      <AppUpdateGate>
        <NavigationContainer ref={navigationRef} theme={navTheme} linking={linking}>
          <RateAppPrompt />
          <RootNavigator />
        </NavigationContainer>
      </AppUpdateGate>
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
