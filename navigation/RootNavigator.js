// navigation/RootNavigator.js
// Central navigator that decides:
// - If user is logged in -> show TabNavigator + authed stacks
// - If user is logged out -> show Login/Register screens

import React, { useEffect, useState } from "react";
import {
  View,
  ActivityIndicator,
  Image,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { colors } from "../theme/colors";
import logo from "../assets/logo-app-earth-transparent-alpha.png";

import TabNavigator from "./TabNavigator";

import EventDetailScreen from "../screens/events/EventDetailScreen";
import EditEventScreen from "../screens/events/EditEventScreen";
import HostEventsScreen from "../screens/events/HostEventsScreen";
import PostEventScreen from "../screens/events/PostEventScreen";

import CommunityPostScreen from "../screens/community/CommunityPostScreen";
import EditCommunityPostScreen from "../screens/community/EditCommunityPostScreen";
import CreateBuddyPostScreen from "../screens/community/CreateBuddyPostScreen";

import EditProfileScreen from "../screens/account/EditProfileScreen";
import ChangeEmailScreen from "../screens/account/ChangeEmailScreen";
import ChangePasswordScreen from "../screens/account/ChangePasswordScreen";
import BlockedUsersScreen from "../screens/account/BlockedUsersScreen";
import AdminAccountsScreen from "../screens/account/AdminAccountsScreen";
import BusinessHelpScreen from "../screens/account/BusinessHelpScreen";
import BusinessVerificationScreen from "../screens/account/BusinessVerificationScreen";
import LegalScreen from "../screens/account/LegalScreen";
import ModerationQueueScreen from "../screens/account/ModerationQueueScreen";
import EventImportReviewScreen from "../screens/account/EventImportReviewScreen";
import ReportBugScreen from "../screens/account/ReportBugScreen";
import SavedEventsScreen from "../screens/account/SavedEventsScreen";
import NotificationsScreen from "../screens/account/NotificationsScreen";
import DailyEventsNotificationScreen from "../screens/account/DailyEventsNotificationScreen";
import UserHelpScreen from "../screens/account/UserHelpScreen";

import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import SafetyTipsScreen from "../screens/auth/SafetyTipsScreen";
import SocialOnboardingScreen from "../screens/auth/SocialOnboardingScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/auth/ResetPasswordScreen";
import VerifyEmailScreen from "../screens/auth/VerifyEmailScreen";

const Stack = createNativeStackNavigator();
const BOOTSTRAP_FALLBACK_DELAY_MS = 12000;

function getFallbackTab(routeName) {
  if (
    [
      "CommunityPost",
      "EditCommunityPost",
      "CreateBuddyPost",
    ].includes(routeName)
  ) {
    return "Community";
  }

  if (
    [
      "EditProfile",
      "ChangeEmail",
      "ChangePassword",
      "BlockedUsers",
      "AdminAccounts",
      "SavedEvents",
      "Notifications",
      "UserHelp",
      "BusinessHelp",
      "Legal",
      "ReportBug",
      "ModerationQueue",
      "EventImportReview",
      "BusinessVerification",
    ].includes(routeName)
  ) {
    return "Account";
  }

  return "Hub";
}

function HeaderBackButton({ navigation, routeName, tintColor, theme }) {
  function handlePress() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate("tabs", { screen: getFallbackTab(routeName) });
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      onPress={handlePress}
      style={styles.headerBackButton}
    >
      <Ionicons
        name="chevron-back"
        size={30}
        color={tintColor || theme.text}
      />
    </Pressable>
  );
}

//  While auth is still checking for an existing token (restore from storage),
//  show a branded loading screen.

function AuthLoadingScreen({
  debugMessage,
  onRetry,
  onContinueToLogin,
}) {
  const [showFallbackActions, setShowFallbackActions] = useState(false);
  const showDebugDetails = typeof __DEV__ !== "undefined" && __DEV__;

  useEffect(() => {
    setShowFallbackActions(false);
    const timeoutId = setTimeout(() => {
      setShowFallbackActions(true);
    }, BOOTSTRAP_FALLBACK_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [debugMessage]);

  return (
    <View style={styles.loadingContainer}>
      <Image source={logo} style={styles.loadingLogo} resizeMode="contain" />
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={styles.loadingText}>
        Finding what's happening nearby...
      </Text>
      {showDebugDetails ? (
        <Text style={styles.debugText}>{debugMessage}</Text>
      ) : null}
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
      screenOptions={({ navigation, route }) => ({
        // Make the back button icon-only (no "< Back" text)
        headerBackButtonDisplayMode: "minimal",
        headerBackTitleVisible: false,
        headerBackVisible: false,

        // Use theme colors for header text + back icon
        headerTintColor: theme.text,

        //  give headers a themed background
        headerStyle: {
          backgroundColor: theme.background,
        },

        headerLeft: ({ tintColor }) => (
          <HeaderBackButton
            navigation={navigation}
            routeName={route.name}
            tintColor={tintColor}
            theme={theme}
          />
        ),
      })}
    >
      {user && !user.hasSeenSafetyTips ? (
        <>
          <Stack.Screen
            name="SafetyTips"
            component={SafetyTipsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SocialOnboarding"
            component={SocialOnboardingScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : (
        <>
            <Stack.Screen
              name="tabs"
              component={TabNavigator}
              options={{ headerShown: false }}
            />

            {/* Events flow */}
            <Stack.Screen
              name="EventDetail"
              component={EventDetailScreen}
              options={{ title: "Event Details" }}
            />
            <Stack.Screen
              name="HostEvents"
              component={HostEventsScreen}
              options={{ title: "Host Events" }}
            />
            {user ? (
              <>
                <Stack.Screen
                  name="EditEvent"
                  component={EditEventScreen}
                  options={{ title: "Edit Event" }}
                />
                <Stack.Screen
                  name="Post"
                  component={PostEventScreen}
                  options={{ title: "Create Event" }}
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
                <Stack.Screen
                  name="CreateBuddyPost"
                  component={CreateBuddyPostScreen}
                  options={{ title: "Create Buddy Post" }}
                />
              </>
            ) : null}

            {/* Account flow */}
            {user ? (
              <>
                <Stack.Screen
                  name="SocialOnboarding"
                  component={SocialOnboardingScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="EditProfile"
                  component={EditProfileScreen}
                  options={{ title: "Edit Profile" }}
                />
                <Stack.Screen
                  name="ChangeEmail"
                  component={ChangeEmailScreen}
                  options={{ title: "Change Email" }}
                />
                <Stack.Screen
                  name="ChangePassword"
                  component={ChangePasswordScreen}
                  options={{ title: "Change Password" }}
                />
                <Stack.Screen
                  name="BlockedUsers"
                  component={BlockedUsersScreen}
                  options={{ title: "Blocked Users" }}
                />
                <Stack.Screen
                  name="AdminAccounts"
                  component={AdminAccountsScreen}
                  options={{ title: "Admin Accounts" }}
                />
                <Stack.Screen
                  name="SavedEvents"
                  component={SavedEventsScreen}
                  options={{ title: "Saved Events" }}
                />
                <Stack.Screen
                  name="Notifications"
                  component={NotificationsScreen}
                  options={{ title: "Notifications" }}
                />
                <Stack.Screen
                  name="DailyEventsNotification"
                  component={DailyEventsNotificationScreen}
                  options={{ title: "Daily What's Happening" }}
                />
              </>
            ) : null}
            <Stack.Screen
              name="UserHelp"
              component={UserHelpScreen}
              options={{ title: "Help & FAQ" }}
            />
            <Stack.Screen
              name="BusinessHelp"
              component={BusinessHelpScreen}
              options={{ title: "Business Help" }}
            />
            <Stack.Screen
              name="Legal"
              component={LegalScreen}
              options={{ title: "Privacy & Terms" }}
            />
            {user ? (
              <>
                <Stack.Screen
                  name="ReportBug"
                  component={ReportBugScreen}
                  options={{ title: "Report a Bug" }}
                />
                <Stack.Screen
                  name="ModerationQueue"
                  component={ModerationQueueScreen}
                  options={{ title: "Moderation Queue" }}
                />
                <Stack.Screen
                  name="EventImportReview"
                  component={EventImportReviewScreen}
                  options={{ title: "Event Imports" }}
                />
                <Stack.Screen
                  name="BusinessVerification"
                  component={BusinessVerificationScreen}
                  options={{ title: "Business Verification" }}
                />
              </>
            ) : null}
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
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ title: "Forgot Password" }}
          />
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{ title: "Reset Password" }}
          />
          <Stack.Screen
            name="VerifyEmail"
            component={VerifyEmailScreen}
            options={{ title: "Verify Email" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerBackButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -6,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingLogo: {
    width: 170,
    height: 182,
    marginBottom: 20,
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
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: colors.textOnAccent,
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
