// screens/AccountScreen.js
// Account hub for logged-in users
// - Shows profile header
// - Links to Edit Profile (where avatar + details are edited)
// - Theme picker
// - Logout

import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Linking,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { colors } from "../../theme/colors";
import { useTheme } from "../../context/ThemeContext";
import ProfileCard from "../../components/account/ProfileCard";
import AppButton from "../../components/common/AppButton";
import PageHeader from "../../components/common/PageHeader";
import SocialSignInButtons from "../../components/auth/SocialSignInButtons";
import { fetchAdminDashboardStats } from "../../services/adminApi";
import {
  fetchNotificationPreferences,
  fetchNotifications,
} from "../../services/notificationsApi";

const ANDROID_PACKAGE_NAME = "com.rachellauren.summitscene";
const IOS_APP_STORE_ID = "";
const EMPTY_ADMIN_STATS = {
  totalUsers: 0,
  totalDatabaseUsers: 0,
  generatedTestUsers: 0,
  newUsersThisWeek: 0,
  activeUsersThisWeek: 0,
  totalBusinesses: 0,
  newBusinessesThisMonth: 0,
  totalEventsPosted: 0,
  eventsPostedThisWeek: 0,
  totalCommunityPosts: 0,
  replies: 0,
  likes: 0,
  locations: {
    banffUsers: 0,
    canmoreUsers: 0,
    lakeLouiseUsers: 0,
  },
  openReports: 0,
  pendingBusinesses: 0,
};
const ADMIN_DASHBOARD_GROUPS = [
  {
    title: "Users",
    metrics: [
      { key: "totalUsers", label: "Real Users" },
      { key: "newUsersThisWeek", label: "New Real Users This Week" },
      { key: "activeUsersThisWeek", label: "Active Real Users This Week" },
    ],
  },
  {
    title: "Count Audit",
    metrics: [
      { key: "totalDatabaseUsers", label: "Database Users" },
      { key: "generatedTestUsers", label: "Test/Review Accounts" },
    ],
  },
  {
    title: "Businesses",
    metrics: [
      { key: "totalBusinesses", label: "Total Businesses" },
      { key: "newBusinessesThisMonth", label: "New Businesses This Month" },
    ],
  },
  {
    title: "Events",
    metrics: [
      { key: "totalEventsPosted", label: "Total Events Posted" },
      { key: "eventsPostedThisWeek", label: "Events Posted This Week" },
    ],
  },
  {
    title: "Community",
    metrics: [
      { key: "totalCommunityPosts", label: "Total Community Posts" },
      { key: "replies", label: "Replies" },
      { key: "likes", label: "Likes" },
    ],
  },
  {
    title: "Locations",
    metrics: [
      { key: "locations.banffUsers", label: "Banff Users" },
      { key: "locations.canmoreUsers", label: "Canmore Users" },
      { key: "locations.lakeLouiseUsers", label: "Lake Louise Users" },
    ],
  },
];

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

function getMetricValue(stats, key) {
  return key
    .split(".")
    .reduce((value, segment) => value?.[segment], stats) ?? 0;
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
  const isEmailVerified = Boolean(user?.emailVerified);

  const [isReverting, setIsReverting] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [adminCounts, setAdminCounts] = useState(EMPTY_ADMIN_STATS);
  const [adminCountsLoading, setAdminCountsLoading] = useState(false);
  const [adminCountsError, setAdminCountsError] = useState("");
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [dailyEventsPreference, setDailyEventsPreference] = useState(
    user?.notificationPreferences || {}
  );

  const loadAdminCounts = useCallback(async () => {
    if (!user?.isAdmin || !token) return;

    try {
      setAdminCountsLoading(true);
      setAdminCountsError("");
      const stats = await fetchAdminDashboardStats(token);

      setAdminCounts({
        ...EMPTY_ADMIN_STATS,
        ...stats,
        locations: {
          ...EMPTY_ADMIN_STATS.locations,
          ...(stats.locations || {}),
        },
      });
    } catch (error) {
      setAdminCountsError(
        error.message || "Dashboard stats are temporarily unavailable."
      );
    } finally {
      setAdminCountsLoading(false);
    }
  }, [token, user?.isAdmin]);

  const loadNotificationCount = useCallback(async () => {
    if (!token) return;

    try {
      const data = await fetchNotifications(token);
      setUnreadNotifications(data.unreadCount || 0);
    } catch {
      setUnreadNotifications(0);
    }
  }, [token]);

  const loadDailyEventsPreference = useCallback(async () => {
    if (!token) return;

    try {
      const data = await fetchNotificationPreferences(token);
      setDailyEventsPreference(data || {});
    } catch {
      setDailyEventsPreference(user?.notificationPreferences || {});
    }
  }, [token, user?.notificationPreferences]);

  useFocusEffect(
    useCallback(() => {
      loadAdminCounts();
      loadNotificationCount();
      loadDailyEventsPreference();
    }, [loadAdminCounts, loadNotificationCount, loadDailyEventsPreference])
  );

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

  function handleEmailSupport() {
    Linking.openURL(
      "mailto:hello@summitscene.ca?subject=Summit%20Scene%20Support"
    ).catch(() => {
      Alert.alert(
        "Could not open email",
        "Please email hello@summitscene.ca for Summit Scene support."
      );
    });
  }

  async function handleRateSummitScene() {
    const androidMarketUrl = `market://details?id=${ANDROID_PACKAGE_NAME}`;
    const androidWebUrl = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_NAME}`;
    const iosReviewUrl = IOS_APP_STORE_ID
      ? `itms-apps://itunes.apple.com/app/id${IOS_APP_STORE_ID}?action=write-review`
      : "https://apps.apple.com/search?term=Summit%20Scene";
    const fallbackUrl =
      Platform.OS === "android"
        ? androidWebUrl
        : "https://apps.apple.com/search?term=Summit%20Scene";

    try {
      await Linking.openURL(
        Platform.OS === "android" ? androidMarketUrl : iosReviewUrl
      );
    } catch (error) {
      try {
        await Linking.openURL(fallbackUrl);
      } catch (fallbackError) {
        Alert.alert(
          "Could not open store",
          "Please search for Summit Scene in the app store to leave a rating."
        );
      }
    }
  }

  // Safeguard: AccountScreen should only show when user != null
  if (!user) {
    return (
      <SafeAreaView
        edges={["top", "left", "right"]}
        style={[styles.safeArea, { backgroundColor: theme.background }]}
      >
        <View style={styles.container}>
          <Text style={[styles.title, { color: theme.text }]}>Hello User!</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            You can browse events, tours, specials, jobs, businesses, and
            community posts without an account. Log in or create an account to
            post, comment, like, save events, receive notifications, report,
            block, or manage a profile.
          </Text>
          <SocialSignInButtons disabled={isAuthLoading} />
          <View style={styles.signedOutDividerRow}>
            <View
              style={[
                styles.signedOutDividerLine,
                { backgroundColor: theme.border },
              ]}
            />
            <Text style={[styles.signedOutDividerText, { color: theme.textMuted }]}>
              or
            </Text>
            <View
              style={[
                styles.signedOutDividerLine,
                { backgroundColor: theme.border },
              ]}
            />
          </View>
          <AppButton
            title="Log In"
            onPress={() => navigation.navigate("Login")}
            size="lg"
            style={{ marginTop: 16 }}
          />
          <AppButton
            title="Create Account"
            onPress={() => navigation.navigate("Register")}
            variant="outline"
            size="lg"
            style={{ marginTop: 10 }}
          />
          <Pressable onPress={() => navigation.navigate("Legal")}>
            <Text style={[styles.legalLinkText, { color: theme.textMuted }]}>
              Privacy, Terms, and Community Guidelines
            </Text>
          </Pressable>
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

  async function handleResendVerificationEmail() {
    try {
      setIsSendingVerification(true);
      await resendVerificationEmail();
      Alert.alert(
        "Verification email sent",
        "Check your inbox and junk folder for the latest Summit Scene verification link."
      );
    } catch (error) {
      Alert.alert(
        "Could not send verification email",
        error.message || "Please try again."
      );
    } finally {
      setIsSendingVerification(false);
    }
  }

  async function handleDeleteAccount() {
    Alert.alert(
      "Delete account?",
      "This permanently deletes your Summit Scene account. Your posts, replies, saved events, hosted events, and scheduled event reminders on this device will be removed.",
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

  // Format joined date nicely
  let joinedText = "Unknown";
  if (user.createdAt) {
    const date = new Date(user.createdAt);
    joinedText = date.toLocaleDateString();
  }

  const roleLabel = isBusinessVerified
    ? "Verified Business"
    : isBusinessPending
      ? "New Organizer"
      : isBusinessRejected
        ? "Community Organizer needs review"
        : "Community profile";

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
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
          subtitle="Manage your login email and password."
          theme={theme}
        >
          {!isEmailVerified ? (
            <View
              style={[
                styles.statusCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.statusTitle, { color: theme.text }]}>
                Verify your email
              </Text>
              <Text style={[styles.statusText, { color: theme.textMuted }]}>
                Your email is not verified yet. Send a new verification link to
                {user.email ? ` ${user.email}` : " your login email"}. Open it on
                your phone or in a browser to verify.
              </Text>
              <Pressable
                style={[
                  styles.emailButton,
                  { borderColor: theme.accent },
                  isSendingVerification && styles.buttonDisabled,
                ]}
                onPress={handleResendVerificationEmail}
                disabled={isSendingVerification}
              >
                <Text style={[styles.emailButtonText, { color: theme.accent }]}>
                  {isSendingVerification ? "Sending..." : "Resend verification link"}
                </Text>
              </Pressable>
            </View>
          ) : null}

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
                New Organizer
              </Text>
              <Text style={[styles.statusText, { color: theme.textMuted }]}>
                Your profile is saved, but official event posting stays locked
                until Summit Scene verifies the business or organizer. Add your
                business category, short description, and one proof link in Edit Profile.
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

            {ADMIN_DASHBOARD_GROUPS.map((group) => (
              <View key={group.title} style={styles.adminMetricGroup}>
                <Text style={[styles.adminMetricGroupTitle, { color: theme.text }]}>
                  {group.title}
                </Text>
                <View style={styles.adminStatsRow}>
                  {group.metrics.map((metric) => (
                    <View
                      key={metric.key}
                      style={[
                        styles.adminStatCard,
                        {
                          backgroundColor: theme.background,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.adminStatNumber, { color: theme.text }]}
                      >
                        {getMetricValue(adminCounts, metric.key)}
                      </Text>
                      <Text
                        style={[
                          styles.adminStatLabel,
                          { color: theme.textMuted },
                        ]}
                      >
                        {metric.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}

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
              title="Admin accounts"
              subtitle="Grant or remove admin access for existing app accounts."
              onPress={() => navigation.navigate("AdminAccounts")}
              theme={theme}
            />
            <AccountNavRow
              title="Event import review"
              subtitle="Review discovered events before publishing."
              onPress={() => navigation.navigate("EventImportReview")}
              theme={theme}
            />
            <AccountNavRow
              title="Official event tools"
              subtitle="Post events and manage Summit Scene business listings."
              onPress={() => navigation.navigate("MyEvents")}
              theme={theme}
            />
            <AccountNavRow
              title="Import real event"
              subtitle='Post a real business event with the "Imported by Summit Scene" label.'
              onPress={() =>
                navigation.navigate("Post", {
                  importedBySummitScene: true,
                })
              }
              theme={theme}
              actionLabel="Create"
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
          <AccountNavRow
            title="Daily What's Happening"
            subtitle="Get a daily notification with what's happening near you."
            onPress={() => navigation.navigate("DailyEventsNotification")}
            theme={theme}
            badge={dailyEventsPreference?.dailyEventsEnabled ? "On" : "Off"}
            actionLabel="Settings"
          />
        </AccountSection>

        <AccountSection
          title="Community & Support"
          subtitle="Safety tools, help, and ways to contact Summit Scene."
          theme={theme}
        >
          <AccountNavRow
            title="Notifications"
            subtitle="See comments, replies, likes, and interest on your posts."
            onPress={() => navigation.navigate("Notifications")}
            theme={theme}
            badge={
              unreadNotifications
                ? `${unreadNotifications} unread`
                : undefined
            }
          />

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
            title="Email support"
            subtitle="Contact hello@summitscene.ca for account, app, or business help."
            onPress={handleEmailSupport}
            theme={theme}
          />

          <AccountNavRow
            title="Rate Summit Scene"
            subtitle="Leave a rating or review in the app store."
            onPress={handleRateSummitScene}
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
  signedOutDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
    marginBottom: 6,
  },
  signedOutDividerLine: {
    flex: 1,
    height: 1,
  },
  signedOutDividerText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    textTransform: "uppercase",
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
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 6,
  },
  adminMetricGroup: {
    marginBottom: 12,
  },
  adminMetricGroupTitle: {
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 8,
  },
  adminStatCard: {
    flexGrow: 1,
    flexBasis: "47%",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    minHeight: 74,
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
  legalLinkText: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 12,
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
