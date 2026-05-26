import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MemberProfileModal from "../../components/account/MemberProfileModal";
import PageHeader from "../../components/common/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  fetchBusinessRequests,
  updateBusinessRequest,
} from "../../services/adminApi";

const STATUS_OPTIONS = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "verified" },
  { label: "Rejected", value: "rejected" },
];

function getUserId(user) {
  return user?._id || user?.id;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getVerifiedSocials(user) {
  return (user?.socialAccounts || []).filter(
    (account) => account?.provider && (account?.handle || account?.url)
  );
}

export default function BusinessVerificationScreen() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const [businessRequests, setBusinessRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [statusCounts, setStatusCounts] = useState({
    pending: 0,
    verified: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profileUser, setProfileUser] = useState(null);

  const activeStatusLabel = useMemo(
    () =>
      STATUS_OPTIONS.find((option) => option.value === statusFilter)?.label ||
      "Pending",
    [statusFilter]
  );

  async function loadBusinessRequests() {
    if (!user?.isAdmin || !token) return;

    try {
      setLoading(true);
      setError("");
      const [requests, pending, verified, rejected] = await Promise.all([
        fetchBusinessRequests(token, statusFilter),
        fetchBusinessRequests(token, "pending"),
        fetchBusinessRequests(token, "verified"),
        fetchBusinessRequests(token, "rejected"),
      ]);
      setBusinessRequests(requests);
      setStatusCounts({
        pending: pending.length,
        verified: verified.length,
        rejected: rejected.length,
      });
    } catch (loadError) {
      setError(loadError.message || "Could not load business requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBusinessRequests();
  }, [user?._id, user?.id, user?.isAdmin, token, statusFilter]);

  function handleEmailBusiness(businessUser) {
    const email = businessUser?.email;
    if (!email) {
      Alert.alert("No email", "This business profile does not have an email.");
      return;
    }

    const subject = encodeURIComponent("Summit Scene business verification");
    const body = encodeURIComponent(
      `Hi ${businessUser.name || "there"},\n\nThanks for creating a Summit Scene business profile. To verify the account, please reply with a quick note confirming you represent this business.\n\nPlease send one public proof link if it is not already on your profile: website, Instagram page, Facebook page, or Google Business listing.\n\nThanks,\nSummit Scene`
    );
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`).catch(() => {
      Alert.alert("Could not open email", `Please email ${email} manually.`);
    });
  }

  function handleBusinessReview(businessUser, status) {
    const businessUserId = getUserId(businessUser);
    if (!businessUserId) return;

    const actionLabel =
      status === "verified"
        ? "Approve"
        : status === "pending"
        ? "Move to pending"
        : "Reject";
    Alert.alert(
      `${actionLabel} business profile?`,
      `${businessUser.name || businessUser.email} will ${
        status === "verified"
          ? "receive the Verified Local badge and be able to post official events."
          : status === "pending"
          ? "go back into the review queue."
          : "stay blocked from official event posting."
      }`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: actionLabel,
          style: status === "rejected" ? "destructive" : "default",
          onPress: async () => {
            try {
              await updateBusinessRequest(businessUserId, status, token);
              await loadBusinessRequests();
            } catch (updateError) {
              Alert.alert(
                "Could not update business profile",
                updateError.message || "Please try again."
              );
            }
          },
        },
      ]
    );
  }

  function renderReviewActions(businessUser) {
    const status = businessUser.businessVerificationStatus || statusFilter;

    if (status === "verified") {
      return (
        <>
          <Pressable
            style={[styles.outlineButton, { borderColor: theme.border }]}
            onPress={() => handleBusinessReview(businessUser, "pending")}
          >
            <Text style={[styles.outlineButtonText, { color: theme.textMuted }]}>
              Move to Pending
            </Text>
          </Pressable>
          <Pressable
            style={[styles.outlineButton, { borderColor: theme.border }]}
            onPress={() => handleBusinessReview(businessUser, "rejected")}
          >
            <Text style={[styles.outlineButtonText, { color: theme.textMuted }]}>
              Reject
            </Text>
          </Pressable>
        </>
      );
    }

    if (status === "rejected") {
      return (
        <>
          <Pressable
            style={[styles.outlineButton, { borderColor: theme.accent }]}
            onPress={() => handleBusinessReview(businessUser, "verified")}
          >
            <Text style={[styles.outlineButtonText, { color: theme.accent }]}>
              Approve
            </Text>
          </Pressable>
          <Pressable
            style={[styles.outlineButton, { borderColor: theme.border }]}
            onPress={() => handleBusinessReview(businessUser, "pending")}
          >
            <Text style={[styles.outlineButtonText, { color: theme.textMuted }]}>
              Move to Pending
            </Text>
          </Pressable>
        </>
      );
    }

    return (
      <>
        <Pressable
          style={[styles.outlineButton, { borderColor: theme.accent }]}
          onPress={() => handleBusinessReview(businessUser, "verified")}
        >
          <Text style={[styles.outlineButtonText, { color: theme.accent }]}>
            Approve
          </Text>
        </Pressable>
        <Pressable
          style={[styles.outlineButton, { borderColor: theme.border }]}
          onPress={() => handleBusinessReview(businessUser, "rejected")}
        >
          <Text style={[styles.outlineButtonText, { color: theme.textMuted }]}>
            Reject
          </Text>
        </Pressable>
      </>
    );
  }

  if (!user?.isAdmin) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.content}>
          <PageHeader
            title="Business Verification"
            subtitle="Admin access required."
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader
          title="Business Verification"
          subtitle="Manually approve real local businesses and organizers before official event posting unlocks."
        />
        <Text style={[styles.hint, { color: theme.textMuted }]}>
          To post official business events, profiles need business name,
          contact email, town, category, short description, and one proof link.
          Tour guides and tour companies are okay when their website, social
          pages, or Google listing are clearly real/local, the tour types make
          sense, and branding matches.
        </Text>

        <View style={styles.statusTabs}>
          {STATUS_OPTIONS.map((option) => {
            const isActive = option.value === statusFilter;
            return (
              <Pressable
                key={option.value}
                onPress={() => setStatusFilter(option.value)}
                style={[
                  styles.statusTab,
                  {
                    backgroundColor: isActive
                      ? theme.accentSoft || theme.card
                      : theme.card,
                    borderColor: isActive ? theme.accent : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusTabText,
                    { color: isActive ? theme.text : theme.textMuted },
                  ]}
                >
                  {option.label} ({statusCounts[option.value] || 0})
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={loadBusinessRequests} style={styles.refreshButton}>
          <Text style={[styles.refreshText, { color: theme.accent }]}>Refresh</Text>
        </Pressable>

        {loading ? (
          <Text style={[styles.statusText, { color: theme.textMuted }]}>
            Loading business requests...
          </Text>
        ) : null}

        {error ? (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.name, { color: theme.text }]}>
              Could not load requests
            </Text>
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              {error}
            </Text>
            <Pressable
              style={[styles.outlineButton, { borderColor: theme.accent, marginTop: 10 }]}
              onPress={loadBusinessRequests}
            >
              <Text style={[styles.outlineButtonText, { color: theme.accent }]}>
                Try again
              </Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && !error && !businessRequests.length ? (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.name, { color: theme.text }]}>
              No {activeStatusLabel.toLowerCase()} business requests
            </Text>
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              {statusFilter === "pending"
                ? "New business and organizer accounts will appear here after signup until you approve or reject them."
                : "Switch tabs above to review a different verification status."}
            </Text>
          </View>
        ) : null}

        {businessRequests.map((businessUser) => {
          const businessUserId = getUserId(businessUser);
          const requestedAt = formatDate(
            businessUser.businessVerificationRequestedAt ||
              businessUser.createdAt
          );
          const verifiedAt = formatDate(businessUser.businessVerifiedAt);
          const socials = getVerifiedSocials(businessUser);
          const proof = [
            businessUser.website,
            businessUser.instagram,
            businessUser.facebook,
            businessUser.googleBusinessUrl,
            ...socials.map((account) => account.url || account.handle),
          ]
            .filter(Boolean)
            .join(" | ");
          const meta = [businessUser.email, businessUser.town, businessUser.role]
            .filter(Boolean)
            .join(" | ");

          return (
            <View
              key={businessUserId}
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.name, { color: theme.text }]}>
                {businessUser.name || "Business profile"}
              </Text>
              <View style={styles.cardTopRow}>
                <Text style={[styles.statusChip, { color: theme.textMuted }]}>
                  {(businessUser.businessVerificationStatus || statusFilter).toUpperCase()}
                </Text>
                {requestedAt ? (
                  <Text style={[styles.meta, { color: theme.textMuted }]}>
                    Requested {requestedAt}
                  </Text>
                ) : null}
              </View>
              {meta ? (
                <Text style={[styles.meta, { color: theme.textMuted }]}>
                  {meta}
                </Text>
              ) : null}
              {verifiedAt ? (
                <Text style={[styles.meta, { color: theme.textMuted }]}>
                  Approved {verifiedAt}
                </Text>
              ) : null}
              {businessUser.bio ? (
                <Text style={[styles.details, { color: theme.text }]}>
                  {businessUser.bio}
                </Text>
              ) : null}
              {proof ? (
                <View
                  style={[
                    styles.proofBox,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.proofLabel, { color: theme.textMuted }]}>
                    Proof to check
                  </Text>
                  <Text style={[styles.details, { color: theme.text }]}>
                    {proof}
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.proofBox,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.proofLabel, { color: theme.textMuted }]}>
                    Proof to check
                  </Text>
                  <Text style={[styles.details, { color: theme.textMuted }]}>
                    No website, Instagram, Facebook, or Google Business listing added yet. Use Email Business to ask for proof.
                  </Text>
                </View>
              )}
              <Text style={[styles.checklist, { color: theme.textMuted }]}>
                Check: social pages/listing are real and local, events make sense, branding matches, and this is not a duplicate account. Approved profiles get the Verified Local badge.
              </Text>
              <View style={styles.actions}>
                <Pressable
                  style={[styles.outlineButton, { borderColor: theme.accent }]}
                  onPress={() => setProfileUser(businessUser)}
                >
                  <Text style={[styles.outlineButtonText, { color: theme.accent }]}>
                    View Profile
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.outlineButton, { borderColor: theme.accent }]}
                  onPress={() => handleEmailBusiness(businessUser)}
                >
                  <Text style={[styles.outlineButtonText, { color: theme.accent }]}>
                    Email Business
                  </Text>
                </Pressable>
                {renderReviewActions(businessUser)}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <MemberProfileModal
        visible={!!profileUser}
        user={profileUser}
        theme={theme}
        onClose={() => setProfileUser(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  statusTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  statusTab: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusTabText: {
    fontSize: 12,
    fontWeight: "800",
  },
  refreshButton: {
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: "800",
  },
  statusText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: "800",
  },
  cardTopRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  statusChip: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
  },
  meta: {
    fontSize: 12,
    marginTop: 3,
  },
  details: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  proofBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  proofLabel: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  checklist: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  outlineButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  outlineButtonText: {
    fontSize: 12,
    fontWeight: "800",
  },
});
