// navigation/RootNavigator.js
// Central navigator that decides:
// - If user is logged in -> show TabNavigator + authed stacks
// - If user is logged out -> show Login/Register screens

import React, { useEffect, useState } from "react";
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { colors } from "../theme/colors";

import TabNavigator from "./TabNavigator";

import EventDetailScreen from "../screens/events/EventDetailScreen";
import EditEventScreen from "../screens/events/EditEventScreen";

import CommunityPostScreen from "../screens/community/CommunityPostScreen";
import EditCommunityPostScreen from "../screens/community/EditCommunityPostScreen";

import EditProfileScreen from "../screens/account/EditProfileScreen";

import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";

const Stack = createNativeStackNavigator();
const BOOTSTRAP_FALLBACK_DELAY_MS = 12000;

//  While auth is still checking for an existing token (restore from storage),
//  show a branded loading screen.

function AuthLoadingScreen({
  debugMessage,
  onRetry,
  onContinueToLogin,
}) {
  const [showFallbackActions, setShowFallbackActions] = useState(false);

  useEffect(() => {
    setShowFallbackActions(false);
    const timeoutId = setTimeout(() => {
      setShowFallbackActions(true);
    }, BOOTSTRAP_FALLBACK_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [debugMessage]);

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.textLight} />
      <Text style={styles.loadingText}>Loading Summit Scene...</Text>
      <Text style={styles.debugText}>{debugMessage}</Text>
      {showFallbackActions ? (
        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={onRetry}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={onContinueToLogin}>
            <Text style={styles.secondaryButtonText}>Continue to Login</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function RootNavigator() {
  const {
    user,
    isSessionBootstrapping,
    authDebugMessage,
    retrySessionRestore,
    skipSessionRestore,
  } = useAuth();
  const { theme } = useTheme();

  // While AuthContext is restoring user/token from AsyncStorage
  if (isSessionBootstrapping) {
    return (
      <AuthLoadingScreen
        debugMessage={authDebugMessage}
        onRetry={retrySessionRestore}
        onContinueToLogin={skipSessionRestore}
      />
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        // Make the back button icon-only (no "< Back" text)
        headerBackButtonDisplayMode: "minimal",
        headerBackTitleVisible: false,

        // Use theme colors for header text + back icon
        headerTintColor: theme.text,

        //  give headers a themed background
        headerStyle: {
          backgroundColor: theme.background,
        },

        // Custom Ionicons back icon
        headerBackImage: ({ tintColor }) => (
          <Ionicons
            name="chevron-back"
            size={26}
            color={tintColor || theme.text}
            style={{ marginLeft: 4 }}
          />
        ),
      }}
    >
      {user ? (
        // ---------- LOGGED IN STACK ----------
        <>
          <Stack.Screen
            name="tabs"
            component={TabNavigator}
            options={{ headerShown: false }}
          />

          {/* Events flow */}
          <Stack.Screen
            name="EditEvent"
            component={EditEventScreen}
            options={{ title: "Edit Event" }}
          />
          <Stack.Screen
            name="EventDetail"
            component={EventDetailScreen}
            options={{ title: "Event Details" }}
          />

          {/* Community flow */}
          <Stack.Screen
            name="CommunityPost"
            component={CommunityPostScreen}
            options={{ title: "New Community Post" }}
          />
          <Stack.Screen
            name="EditCommunityPost"
            component={EditCommunityPostScreen}
            options={{ title: "Edit Post" }}
          />

          {/* Account flow */}
          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{ title: "Edit Profile" }}
          />
        </>
      ) : (
        // ---------- LOGGED OUT STACK ----------
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ headerShown: false }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    color: colors.textMuted,
    fontSize: 14,
  },
  debugText: {
    marginTop: 10,
    paddingHorizontal: 24,
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
  },
  actions: {
    marginTop: 20,
    gap: 12,
    width: "100%",
    paddingHorizontal: 24,
  },
  primaryButton: {
    backgroundColor: colors.textLight,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.textMuted,
  },
  secondaryButtonText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
});
