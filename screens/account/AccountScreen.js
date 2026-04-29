// screens/AccountScreen.js
// Account hub for logged-in users
// - Shows profile header
// - Links to Edit Profile (where avatar + details are edited)
// - Theme picker
// - Logout

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../../theme/colors";
import { useTheme } from "../../context/ThemeContext";
import AppLogoHeader from "../../components/AppLogoHeader";
import ProfileCard from "../../components/account/ProfileCard";
import AppButton from "../../components/common/AppButton";
import PageHeader from "../../components/common/PageHeader";

function AccountNavRow({ title, subtitle, onPress, theme }) {
  return (
    <Pressable
      style={[
        styles.navRow,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
      onPress={onPress}
    >
      <View style={styles.navRowCopy}>
        <Text style={[styles.navRowTitle, { color: theme.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.navRowSubtitle, { color: theme.textMuted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.navRowAction, { color: theme.accent }]}>Open</Text>
    </Pressable>
  );
}

function AccountScreen() {
  const {
    user,
    logout,
    isAuthLoading,
    revertToLocalProfile,
  } = useAuth();
  const navigation = useNavigation();

  const { theme } = useTheme();

  const isBusiness = user?.role === "business";
  const businessVerificationStatus =
    user?.businessVerificationStatus || "none";
  const isBusinessPending =
    isBusiness && businessVerificationStatus === "pending";
  const isBusinessVerified =
    isBusiness && businessVerificationStatus === "verified";
  const isBusinessRejected =
    isBusiness && businessVerificationStatus === "rejected";

  const [isReverting, setIsReverting] = useState(false);

  function handleEmailSummitScene() {
    Linking.openURL(
      "mailto:admin@summitscene.ca?subject=Summit%20Scene%20Business%20Verification"
    ).catch(() => {
      Alert.alert(
        "Could not open email",
        "Please email admin@summitscene.ca to verify your business profile."
      );
    });
  }

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

  async function handleLogout() {
    try {
      await logout();
    } catch (error) {
      Alert.alert("Logout failed", error.message || "Unable to log out.");
    }
  }

  async function handleRevertToLocal() {
    Alert.alert(
      "Switch back to community profile?",
      "This will remove business posting access and return this account to the normal user/community side. You can request a business profile again later.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Switch Back",
          style: "destructive",
          onPress: async () => {
            try {
              setIsReverting(true);
              await revertToLocalProfile();
              Alert.alert(
                "Profile switched",
                "This account is now back on the community side."
              );
            } catch (error) {
              Alert.alert(
                "Could not switch profile",
                error.message || "Please try again."
              );
            } finally {
              setIsReverting(false);
            }
          },
        },
      ]
    );
  }

  // Format joined date nicely
  let joinedText = "Unknown";
  if (user.createdAt) {
    const date = new Date(user.createdAt);
    joinedText = date.toLocaleDateString();
  }

  const roleLabel = isBusinessVerified
    ? "Verified business profile"
    : isBusinessPending
      ? "Business profile pending review"
      : isBusinessRejected
        ? "Business profile needs review"
        : "Community profile";

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

        <ProfileCard
          theme={theme}
          user={user}
          isBusiness={isBusiness}
          roleLabel={roleLabel}
          email={user.email}
          joinedText={joinedText}
          onEditProfile={() => navigation.navigate("EditProfile")}
        />


        {isBusinessPending && (
          <View
            style={[
              styles.statusCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.statusTitle, { color: theme.text }]}>
              Business review pending
            </Text>
            <Text style={[styles.statusText, { color: theme.textMuted }]}>
              Your profile is saved, but official event posting stays locked
              until Summit Scene verifies the business or organizer. Add your
              business type, website, and official social links in Edit Profile.
              If proof is unclear, email Summit Scene or DM from the official
              business account.
            </Text>
            <Pressable
              style={[styles.emailButton, { borderColor: theme.accent }]}
              onPress={handleEmailSummitScene}
            >
              <Text style={[styles.emailButtonText, { color: theme.accent }]}>
                Email admin@summitscene.ca
              </Text>
            </Pressable>
          </View>
        )}

        {isBusinessRejected && (
          <View
            style={[
              styles.statusCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.statusTitle, { color: theme.text }]}>
              Business review needed
            </Text>
            <Text style={[styles.statusText, { color: theme.textMuted }]}>
              Update your profile details and contact Summit Scene to review
              your business or organizer profile again.
            </Text>
          </View>
        )}

        {user.isAdmin ? (
          <>
            <AccountNavRow
              title="Moderation queue"
              subtitle="Review reports and mark them reviewed or dismissed."
              onPress={() => navigation.navigate("ModerationQueue")}
              theme={theme}
            />
            <AccountNavRow
              title="Business verification requests"
              subtitle="Approve or reject pending business profiles."
              onPress={() => navigation.navigate("BusinessVerification")}
              theme={theme}
            />
          </>
        ) : null}


        <AccountNavRow
          title="Saved events"
          subtitle="View saved events and upcoming reminders."
          onPress={() => navigation.navigate("SavedEvents")}
          theme={theme}
        />

        {isBusiness && (
          <Pressable
            style={[
              styles.accountButtonSecondary,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
              (isAuthLoading || isReverting) && styles.buttonDisabled,
            ]}
            onPress={handleRevertToLocal}
            disabled={isAuthLoading || isReverting}
          >
            <Text
              style={[styles.accountButtonSecondaryText, { color: theme.text }]}
            >
              Switch back to community profile
            </Text>
            <Text
              style={[
                styles.accountButtonSecondarySubtext,
                { color: theme.textMuted },
              ]}
            >
              Use this if the account was only made business while testing.
              Your profile will return to the normal user side.
            </Text>
          </Pressable>
        )}

        <AccountNavRow
          title="Blocked users"
          subtitle="Manage people hidden from posts, replies, and attendee lists."
          onPress={() => navigation.navigate("BlockedUsers")}
          theme={theme}
        />

        <AccountNavRow
          title={isBusiness ? "Business help" : "Help & FAQ"}
          subtitle={
            isBusiness
              ? "Learn verification, posting, event management, and support."
              : "Learn events, buddies, community posts, safety, and support."
          }
          onPress={() =>
            navigation.navigate(isBusiness ? "BusinessHelp" : "UserHelp")
          }
          theme={theme}
        />

        <AccountNavRow
          title="Report a bug"
          subtitle="Send Summit Scene a bug, wrong info report, safety concern, or idea."
          onPress={() => navigation.navigate("ReportBug")}
          theme={theme}
        />

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
          You can log back in anytime to keep using Summit Scene.
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
  accountButtonActionText: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 10,
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
  statusCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  statusText: {
    fontSize: 13,
    lineHeight: 18,
  },
  navRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  navRowCopy: {
    flex: 1,
  },
  navRowTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 3,
  },
  navRowSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  navRowAction: {
    fontSize: 13,
    fontWeight: "800",
  },
  verificationHint: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  emailButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  emailButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },
  blockedHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  blockedHeaderCopy: {
    flex: 1,
  },
  refreshLink: {
    fontSize: 13,
    fontWeight: "800",
  },
  blockedUserRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 10,
    gap: 10,
  },
  eventPreferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 10,
    gap: 10,
  },
  remindersBlock: {
    marginTop: 14,
  },
  reportRow: {
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 10,
    gap: 10,
  },
  reportActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  blockedUserCopy: {
    flex: 1,
  },
  blockedUserName: {
    fontSize: 14,
    fontWeight: "800",
  },
  blockedUserMeta: {
    fontSize: 12,
    marginTop: 2,
    textTransform: "capitalize",
  },
  unblockButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  unblockButtonText: {
    fontSize: 12,
    fontWeight: "800",
  },
});
