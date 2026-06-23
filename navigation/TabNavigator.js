// navigation/TabNavigator.js
// Bottom tab navigation for the app — Hub, Map, Connect, Account
// Verified businesses also get a Create tab for official events.

import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import HubScreen from "../screens/hub/HubScreen";
import MapScreen from "../screens/map/MapScreen";
import MyEventsScreen from "../screens/events/MyEventsScreen";
import CommunityScreen from "../screens/community/CommunityScreen";
import AccountScreen from "../screens/account/AccountScreen";
import AuthGateScreen from "../screens/auth/AuthGateScreen";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const { user } = useAuth();
  const { theme } = useTheme();

  // Official event tools are only available after business review.
  const canUseBusinessTools =
    user?.isAdmin ||
    (user?.role === "business" &&
      user?.businessVerificationStatus === "verified");

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        // Use theme-provided tab bar colors (fall back to card/border)
        tabBarStyle: {
          backgroundColor: theme.tabBarBackground || theme.card,
          borderTopColor: theme.border,
        },
        tabBarActiveTintColor: theme.tabBarActive || theme.accent,
        tabBarInactiveTintColor: theme.tabBarInactive || theme.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },

        // Icon for each tab
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = "ellipse"; // default fallback

          if (route.name === "Hub") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Map") {
            iconName = focused ? "map" : "map-outline";
          } else if (route.name === "MyEvents") {
            iconName = focused ? "calendar" : "calendar-outline";
          } else if (route.name === "Community") {
            iconName = focused ? "chatbubbles" : "chatbubbles-outline";
          } else if (route.name === "Account") {
            iconName = focused ? "person" : "person-outline";
          }

          return (
            <Ionicons
              name={iconName}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      {/* Everyone gets Hub and Map */}
      <Tab.Screen name="Hub" component={HubScreen} options={{ title: "Events" }} />

      <Tab.Screen name="Map" component={MapScreen} options={{ title: "Map" }} />

      {canUseBusinessTools && (
        <Tab.Screen
          name="MyEvents"
          component={MyEventsScreen}
          options={{ title: "Manage" }}
        />
      )}

      <Tab.Screen
        name="Community"
        component={user ? CommunityScreen : AuthGateScreen}
        initialParams={user ? undefined : { mode: "community" }}
        options={{ title: "Connect" }}
      />

      {/* Everyone gets Account */}
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{ title: "Account" }}
      />
    </Tab.Navigator>
  );
}
