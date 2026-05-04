// navigation/TabNavigator.js
// Bottom tab navigation for the app — Hub, Map, Community, Account
// Businesses also get a "Post Event" tab

import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import HubScreen from "../screens/hub/HubScreen";
import MapScreen from "../screens/map/MapScreen";
import PostEventScreen from "../screens/events/PostEventScreen";
import MyEventsScreen from "../screens/events/MyEventsScreen";
import CommunityScreen from "../screens/community/CommunityScreen";
import AccountScreen from "../screens/account/AccountScreen";

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
          fontSize: canUseBusinessTools ? 10 : 11,
          fontWeight: "600",
        },
        tabBarItemStyle: canUseBusinessTools
          ? {
              paddingHorizontal: 0,
            }
          : undefined,

        // Icon for each tab
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = "ellipse"; // default fallback

          if (route.name === "Hub") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Map") {
            iconName = focused ? "map" : "map-outline";
          } else if (route.name === "Post") {
            iconName = focused ? "add-circle" : "add-circle-outline";
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
              size={canUseBusinessTools ? Math.max(20, size - 2) : size}
              color={color}
            />
          );
        },
      })}
    >
      {/* Everyone gets Hub and Map */}
      <Tab.Screen name="Hub" component={HubScreen} options={{ title: "Hub" }} />

      <Tab.Screen name="Map" component={MapScreen} options={{ title: "Map" }} />

      {canUseBusinessTools && (
        <Tab.Screen
          name="MyEvents"
          component={MyEventsScreen}
          options={{ title: "Mine" }}
        />
      )}

      {/* Only verified business users see Post Event */}
      {canUseBusinessTools && (
        <Tab.Screen
          name="Post"
          component={PostEventScreen}
          options={{ title: "Post" }}
        />
      )}

      {/* Community is available to locals, visitors, admins, and businesses. */}
      <Tab.Screen
        name="Community"
        component={CommunityScreen}
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
