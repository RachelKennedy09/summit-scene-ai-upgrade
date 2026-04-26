// screens/AccountScreen.js
// Account hub for logged-in users
// - Shows profile header
// - Links to Edit Profile (where avatar + details are edited)
// - Theme picker
// - Upgrade to business
// - Logout

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../../theme/colors";
import { useTheme } from "../../context/ThemeContext";
import AppLogoHeader from "../../components/AppLogoHeader";
import AccountHeaderCard from "../../components/account/AccountHeaderCard";
import ProfileCard from "../../components/account/ProfileCard";
import AppButton from "../../components/common/AppButton";
import PageHeader from "../../components/common/PageHeader";

function AccountScreen() {
  const { user, logout, isAuthLoading, upgradeToBusiness } = useAuth();
  const navigation = useNavigation();

  const { theme } = useTheme();

  const isBusiness = user?.role === "business";
  const isLocal = user?.role === "local";

  const [isUpgrading, setIsUpgrading] = useState(false);

  // Safeguard: AccountScreen should only show when user != null
  if (!user) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.background }]}
      >
        <View style={styles.container}>
          <Text style={[styles.title, { color: theme.text }]}>Account</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            You are not logged in. Please log in to view your account.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  async function handleUpgradeToBusiness() {
    try {
      setIsUpgrading(true);
      await upgradeToBusiness();

      // Small delay so the UI feels smoother after the role switch
      setTimeout(() => {
        Alert.alert(
          "Account upgraded",
          "Your account is now a business account. You can now post and manage events."
        );
      }, 200);
    } catch (error) {
      Alert.alert(
        "Upgrade failed",
        error.message || "Unable to upgrade account right now."
      );
    } finally {
      setIsUpgrading(false);
    }
  }

  // Format joined date nicely
  let joinedText = "Unknown";
  if (user.createdAt) {
    const date = new Date(user.createdAt);
    joinedText = date.toLocaleDateString();
  }

  const displayName = user.name || user.email;
  const town = user.town || "Rockies local";
  const roleLabel = isBusiness ? "Business account" : "Local account";

  async function handleLogout() {
    await logout();
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <AppLogoHeader />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <PageHeader title="Account" />

        {/* PROFILE HEADER CARD
           - Shows avatar, name, email, role, town, joined date
           - Avatar comes from user.avatarKey (chosen in Register / Edit Profile)
        */}
        <AccountHeaderCard
          theme={theme}
          displayName={displayName}
          roleLabel={roleLabel}
          email={user.email}
          town={town}
          joinedText={joinedText}
          avatarKey={user.avatarKey}
        />

        {/* PROFILE CARD
           - Quick summary of profile info and a button to Edit Profile
           - EditProfileScreen handles avatar selection + bio + links
        */}
        <ProfileCard
          theme={theme}
          user={user}
          isBusiness={isBusiness}
          onEditProfile={() => navigation.navigate("EditProfile")}
        />

        {/* LOCAL ONLY: UPGRADE TO BUSINESS */}
        {isLocal && (
          <Pressable
            style={[
              styles.accountButtonSecondary,
              {
                backgroundColor: theme.card,
                borderColor: theme.accent,
              },
              (isAuthLoading || isUpgrading) && styles.buttonDisabled,
            ]}
            onPress={handleUpgradeToBusiness}
            disabled={isAuthLoading || isUpgrading}
          >
            <Text
              style={[styles.accountButtonSecondaryText, { color: theme.text }]}
            >
              Upgrade to business account
            </Text>
            <Text
              style={[
                styles.accountButtonSecondarySubtext,
                { color: theme.textMuted },
              ]}
            >
              Become a verified local business or event organizer and start
              posting your own events.
            </Text>
          </Pressable>
        )}

        {/* LOG OUT */}
        <AppButton
          title={isAuthLoading ? "Logging out..." : "Log Out"}
          onPress={handleLogout}
          loading={isAuthLoading}
          variant="highlight"
          size="lg"
          style={{ marginTop: 4 }}
        />

        <Text style={[styles.helperText, { color: theme.textMuted }]}>
          Logging out will clear your session on this device.{"\n"}
          You can log back in anytime to post and manage events.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export default AccountScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textLight,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  accountButtonSecondary: {
    backgroundColor: colors.secondary,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  accountButtonSecondaryText: {
    color: colors.textLight,
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 4,
  },
  accountButtonSecondarySubtext: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  helperText: {
    marginTop: 14,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});
