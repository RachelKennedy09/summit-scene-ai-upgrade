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

function AccountSection({ title, subtitle, children, theme }) {
  return (
    <View style={styles.accountSection}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
          {subtitle}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

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
      "mailto:hello@summitscene.ca?subject=Summit%20Scene%20Business%20Verification"
    ).catch(() => {
      Alert.alert(
        "Could not open email",
        "Please email hello@summitscene.ca to verify your business profile."
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
      Alert.alert(
        "Verification email sent",
        `${data.message}\n\nPlease check your junk or spam folder if you do not see it in your inbox.`
      );
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

        <AccountSection
          title="Login & Security"
          subtitle="Manage your email verification and password."
          theme={theme}
        >
          <View
            style={[
              styles.statusCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={styles.statusHeaderRow}>
              <View style={styles.statusHeaderCopy}>
                <Text style={[styles.statusTitle, { color: theme.text }]}>
                  Email verification
                </Text>
                <Text style={[styles.statusText, { color: theme.textMuted }]}>
                  {user.email}
                  {user.pendingEmail ? `\nPending email: ${user.pendingEmail}` : ""}
                </Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: user.emailVerified
                      ? theme.accentSoft || theme.background
                      : theme.background,
                    borderColor: user.emailVerified ? theme.accent : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    { color: user.emailVerified ? theme.accent : theme.textMuted },
                  ]}
                >
                  {user.emailVerified ? "Verified" : "Not verified"}
                </Text>
              </View>
            </View>
            {!user.emailVerified ? (
              <View style={styles.emailActionRow}>
                <Pressable
                  style={[styles.emailButton, { borderColor: theme.accent }]}
                  onPress={() => navigation.navigate("VerifyEmail")}
                >
                  <Text style={[styles.emailButtonText, { color: theme.accent }]}>
                    Enter verification token
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.emailButton, { borderColor: theme.accent }]}
                  onPress={handleResendVerificationEmail}
                >
                  <Text style={[styles.emailButtonText, { color: theme.accent }]}>
                    Resend verification email
                  </Text>
                </Pressable>
              </View>
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
        </AccountSection>

        {isBusinessPending && (
          <AccountSection title="Business Profile" theme={theme}>
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
                  Email hello@summitscene.ca
                </Text>
              </Pressable>
            </View>
          </AccountSection>
        )}

        {isBusinessRejected && (
          <AccountSection title="Business Profile" theme={theme}>
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
          </AccountSection>
        )}

        {user.isAdmin ? (
          <AccountSection
            title="Admin Tools"
            subtitle="Review safety reports, business approvals, and official event tools."
            theme={theme}
          >
            <View style={styles.adminHeaderRow}>
              <Pressable onPress={loadAdminCounts} disabled={adminCountsLoading}>
                {adminCountsLoading ? (
                  <ActivityIndicator size="small" color={theme.accent} />
                ) : (
                  <Text style={[styles.refreshLink, { color: theme.accent }]}>
                    Refresh counts
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
          </AccountSection>
        ) : null}

        <AccountSection
          title="Events"
          subtitle="Your saved event activity and reminders."
          theme={theme}
        >
          <AccountNavRow
            title="Saved events"
            subtitle="View saved events and upcoming reminders."
            onPress={() => navigation.navigate("SavedEvents")}
            theme={theme}
          />
        </AccountSection>

        <AccountSection
          title="Community & Support"
          subtitle="Safety tools, help, and ways to contact Summit Scene."
          theme={theme}
        >
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
        </AccountSection>

        <AccountSection
          title="Legal"
          subtitle="Privacy, terms, community rules, and event responsibilities."
          theme={theme}
        >
          <AccountNavRow
            title="Privacy & Terms"
            subtitle="Review privacy, account deletion, community rules, and event permit responsibilities."
            onPress={() => navigation.navigate("Legal")}
            theme={theme}
          />
        </AccountSection>

        <AccountSection title="Account Actions" theme={theme}>
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
                Use this if you no longer need business tools. Your profile
                will return to the normal user side.
              </Text>
            </Pressable>
          )}

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
        </AccountSection>
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
  accountSection: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
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
  statusHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  statusHeaderCopy: {
    flex: 1,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "900",
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
  emailActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
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
