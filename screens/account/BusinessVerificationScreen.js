import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MemberProfileModal from "../../components/account/MemberProfileModal";
import PageHeader from "../../components/common/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  fetchBusinessRequests,
  updateBusinessRequest,
} from "../../services/adminApi";

export default function BusinessVerificationScreen() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const [businessRequests, setBusinessRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profileUser, setProfileUser] = useState(null);

  async function loadBusinessRequests() {
    if (!user?.isAdmin || !token) return;

    try {
      setLoading(true);
      setError("");
      const requests = await fetchBusinessRequests(token, "pending");
      setBusinessRequests(requests);
    } catch (loadError) {
      setError(loadError.message || "Could not load business requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBusinessRequests();
  }, [user?._id, user?.id, user?.isAdmin, token]);

  function handleBusinessReview(businessUser, status) {
    const businessUserId = businessUser?._id || businessUser?.id;
    if (!businessUserId) return;

    const actionLabel = status === "verified" ? "Approve" : "Reject";
    Alert.alert(
      `${actionLabel} business profile?`,
      `${businessUser.name || businessUser.email} will ${
        status === "verified"
          ? "be able to post official events."
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
          subtitle="Approve real businesses and organizers before official event posting unlocks."
        />
        <Text style={[styles.hint, { color: theme.textMuted }]}>
          Only approve when the website, social profile, email, or a direct
          email/DM clearly proves they represent the business.
        </Text>

        <Pressable onPress={loadBusinessRequests} style={styles.refreshButton}>
          <Text style={[styles.refreshText, { color: theme.accent }]}>Refresh</Text>
        </Pressable>

        {loading ? (
          <Text style={[styles.statusText, { color: theme.textMuted }]}>
            Loading business requests...
          </Text>
        ) : null}

        {error ? (
          <Text style={[styles.statusText, { color: theme.textMuted }]}>
            {error}
          </Text>
        ) : null}

        {!loading && !error && !businessRequests.length ? (
          <Text style={[styles.statusText, { color: theme.textMuted }]}>
            No pending business requests.
          </Text>
        ) : null}

        {businessRequests.map((businessUser) => {
          const businessUserId = businessUser._id || businessUser.id;
          const proof = [
            businessUser.lookingFor,
            businessUser.website,
            businessUser.instagram,
          ]
            .filter(Boolean)
            .join(" | ");
          const meta = [businessUser.email, businessUser.town]
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
              {meta ? (
                <Text style={[styles.meta, { color: theme.textMuted }]}>
                  {meta}
                </Text>
              ) : null}
              {proof ? (
                <Text style={[styles.details, { color: theme.text }]}>
                  {proof}
                </Text>
              ) : null}
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
  meta: {
    fontSize: 12,
    marginTop: 3,
  },
  details: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
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
