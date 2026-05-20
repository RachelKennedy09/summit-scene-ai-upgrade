// screens/AccountScreen.js
// Account hub for logged-in users
// - Shows profile header
// - Links to Edit Profile (where avatar + details are edited)
// - Theme picker
// - Logout

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Linking,
  ActivityIndicator,
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
import { fetchBusinessRequests } from "../../services/adminApi";
import { fetchReports } from "../../services/reportsApi";

function AccountNavRow({ title, subtitle, onPress, theme, badge, actionLabel = "Open" }) {
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
      <View style={styles.navRowRight}>
        {badge ? (
          <View
            style={[
              styles.navBadge,
              { backgroundColor: theme.accentSoft || theme.background },
            ]}
          >
            <Text style={[styles.navBadgeText, { color: theme.accent }]}>
              {badge}
            </Text>
          </View>
        ) : null}
        <Text style={[styles.navRowAction, { color: theme.accent }]}>
          {actionLabel}
        </Text>
      </View>
    </Pressable>
  );
}

function AccountScreen() {
  const {
    user,
    token,
    logout,
    deleteAccount,
    isAuthLoading,
    revertToLocalProfile,
    resendVerificationEmail,
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
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [adminCounts, setAdminCounts] = useState({
    openReports: 0,
    pendingBusinesses: 0,
  });
  const [adminCountsLoading, setAdminCountsLoading] = useState(false);
  const [adminCountsError, setAdminCountsError] = useState("");

  const loadAdminCounts = useCallback(async () => {
    if (!user?.isAdmin || !token) return;

    try {
      setAdminCountsLoading(true);
      setAdminCountsError("");
      const [openReports, pendingBusinesses] = await Promise.all([
        fetchReports(token, "open"),
        fetchBusinessRequests(token, "pending"),
      ]);

      setAdminCounts({
        openReports: openReports.length,
        pendingBusinesses: pendingBusinesses.length,
      });
    } catch (error) {
      setAdminCountsError(
        error.message || "Could not load admin tool counts."
      );
    } finally {
      setAdminCountsLoading(false);
    }
  }, [token, user?.isAdmin]);

  useEffect(() => {
    loadAdminCounts();
  }, [loadAdminCounts]);

  function handleEmailSummitScene() {
    Linking.openURL(
      "mailto:summitscene@outlook.com?subject=Summit%20Scene%20Business%20Verification"
    ).catch(() => {
      Alert.alert(
        "Could not open email",
        "Please email summitscene@outlook.com to verify your business profile."
      );
    });
  }

  // Safeguard: AccountScreen should only show when user != null
  if (!user) {
    return (
      <SafeAreaView
        edges={["top", "left", "right"]}
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

  async function handleDeleteAccount() {
    Alert.alert(
      "Delete account?",
      "This permanently deletes your Summit Scene account. Your posts, replies, saved events, and hosted events will be removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeletingAccount(true);
              await deleteAccount();
            } catch (error) {
              Alert.alert(
                "Could not delete account",
                error.message || "Please try again."
              );
            } finally {
              setIsDeletingAccount(false);
            }
          },
        },
      ]
    );
  }

  async function handleResendVerificationEmail() {
    try {
      const data = await resendVerificationEmail();
      Alert.alert("Verification email sent", data.message);
      if (data.emailVerificationToken) {
        navigation.navigate("VerifyEmail", { token: data.emailVerificationToken });
      }
    } catch (error) {
      Alert.alert(
        "Could not send verification",
        error.message || "Please try again."
      );
    }
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
      edges={["top", "left", "right"]}
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

        <View
          style={[
            styles.statusCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.statusTitle, { color: theme.text }]}>
            Account security
          </Text>
          <Text style={[styles.statusText, { color: theme.textMuted }]}>
            Email: {user.email}{"\n"}
            Status: {user.emailVerified ? "Verified" : "Not verified"}
            {user.pendingEmail ? `\nPending email: ${user.pendingEmail}` : ""}
          </Text>
          {!user.emailVerified ? (
            <Pressable
              style={[styles.emailButton, { borderColor: theme.accent }]}
              onPress={handleResendVerificationEmail}
            >
              <Text style={[styles.emailButtonText, { color: theme.accent }]}>
                Resend verification email
              </Text>
            </Pressable>
          ) : null}
        </View>

        <AccountNavRow
          title="Change email"
          subtitle="Confirm a new email before changing your login."
          onPress={() => navigation.navigate("ChangeEmail")}
          theme={theme}
        />

        <AccountNavRow
          title="Change password"
          subtitle="Update your password and log in again."
          onPress={() => navigation.navigate("ChangePassword")}
          theme={theme}
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
                Email summitscene@outlook.com
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
          <View
            style={[
              styles.adminPanel,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={styles.adminHeaderRow}>
              <View style={styles.adminHeaderCopy}>
                <Text style={[styles.adminTitle, { color: theme.text }]}>
                  Admin tools
                </Text>
                <Text style={[styles.adminSubtitle, { color: theme.textMuted }]}>
                  Review safety reports, business approvals, and official event tools.
                </Text>
              </View>
              <Pressable onPress={loadAdminCounts} disabled={adminCountsLoading}>
                {adminCountsLoading ? (
                  <ActivityIndicator size="small" color={theme.accent} />
                ) : (
                  <Text style={[styles.refreshLink, { color: theme.accent }]}>
                    Refresh
                  </Text>
                )}
              </Pressable>
            </View>

            <View style={styles.adminStatsRow}>
              <View
                style={[
                  styles.adminStatCard,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.adminStatNumber, { color: theme.text }]}>
                  {adminCounts.openReports}
                </Text>
                <Text style={[styles.adminStatLabel, { color: theme.textMuted }]}>
                  Open reports
                </Text>
              </View>
              <View
                style={[
                  styles.adminStatCard,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.adminStatNumber, { color: theme.text }]}>
                  {adminCounts.pendingBusinesses}
                </Text>
                <Text style={[styles.adminStatLabel, { color: theme.textMuted }]}>
                  Business requests
                </Text>
              </View>
            </View>

            {adminCountsError ? (
              <Text style={[styles.adminError, { color: theme.textMuted }]}>
                {adminCountsError}
              </Text>
            ) : null}

            <AccountNavRow
              title="Moderation queue"
              subtitle="Review reports and mark them reviewed or dismissed."
              onPress={() => navigation.navigate("ModerationQueue")}
              theme={theme}
              badge={
                adminCounts.openReports
                  ? `${adminCounts.openReports} open`
                  : "Clear"
              }
            />
            <AccountNavRow
              title="Business verification requests"
              subtitle="Approve or reject pending business profiles."
              onPress={() => navigation.navigate("BusinessVerification")}
              theme={theme}
              badge={
                adminCounts.pendingBusinesses
                  ? `${adminCounts.pendingBusinesses} pending`
                  : "Clear"
              }
            />
            <AccountNavRow
              title="Official event tools"
              subtitle="Post events and manage Summit Scene business listings."
              onPress={() => navigation.navigate("MyEvents")}
              theme={theme}
            />
            <AccountNavRow
              title="Admin help"
              subtitle="Use business help as the admin checklist for verification and event support."
              onPress={() => navigation.navigate("BusinessHelp")}
              theme={theme}
            />
          </View>
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

        <AccountNavRow
          title="Privacy & Terms"
          subtitle="Review privacy, account deletion, community rules, and event permit responsibilities."
          onPress={() => navigation.navigate("Legal")}
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

        <Pressable
          style={[
            styles.deleteAccountButton,
            {
              backgroundColor: theme.card,
              borderColor: theme.danger || "#B42318",
            },
            (isAuthLoading || isDeletingAccount) && styles.buttonDisabled,
          ]}
          onPress={handleDeleteAccount}
          disabled={isAuthLoading || isDeletingAccount}
        >
          <Text
            style={[
              styles.deleteAccountButtonText,
              { color: theme.danger || "#B42318" },
            ]}
          >
            {isDeletingAccount ? "Deleting account..." : "Delete Account"}
          </Text>
          <Text
            style={[
              styles.deleteAccountButtonSubtext,
              { color: theme.textMuted },
            ]}
          >
            Permanently remove this profile and clear your session.
          </Text>
        </Pressable>
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
    marginBottom: 14,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  deleteAccountButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 4,
    marginBottom: 18,
  },
  deleteAccountButtonText: {
    fontWeight: "800",
    fontSize: 14,
    marginBottom: 4,
  },
  deleteAccountButtonSubtext: {
    fontSize: 12,
    lineHeight: 17,
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
  navRowRight: {
    alignItems: "flex-end",
    gap: 5,
  },
  navBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  navBadgeText: {
    fontSize: 11,
    fontWeight: "900",
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
  adminPanel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  adminHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  adminHeaderCopy: {
    flex: 1,
  },
  adminTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
  },
  adminSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  adminStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  adminStatCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  adminStatNumber: {
    fontSize: 22,
    fontWeight: "900",
  },
  adminStatLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  adminError: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
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
