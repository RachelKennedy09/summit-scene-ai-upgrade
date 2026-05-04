import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import PageHeader from "../../components/common/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

export default function BlockedUsersScreen() {
  const { user, fetchBlockedUsers, unblockUser } = useAuth();
  const { theme } = useTheme();
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadBlockedUsers() {
    if (!user) return;

    try {
      setLoading(true);
      setError("");
      const users = await fetchBlockedUsers();
      setBlockedUsers(users);
    } catch (loadError) {
      setError(loadError.message || "Could not load blocked users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBlockedUsers();
  }, [user?._id, user?.id, user?.blockedUsers?.length]);

  function handleUnblock(targetUser) {
    const targetUserId = targetUser?._id || targetUser?.id || "";
    if (!targetUserId) return;

    Alert.alert(
      "Unblock this user?",
      "You may start seeing their posts, replies, and event attendance again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unblock",
          onPress: async () => {
            try {
              await unblockUser(targetUserId);
              await loadBlockedUsers();
            } catch (unblockError) {
              Alert.alert(
                "Could not unblock user",
                unblockError.message || "Please try again."
              );
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader
          title="Blocked Users"
          subtitle="Manage people hidden from posts, replies, and attendee lists."
        />

        <Pressable onPress={loadBlockedUsers} style={styles.refreshButton}>
          <Text style={[styles.refreshText, { color: theme.accent }]}>Refresh</Text>
        </Pressable>

        {loading ? (
          <Text style={[styles.statusText, { color: theme.textMuted }]}>
            Loading blocked users...
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
              Could not load blocked users
            </Text>
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              {error}
            </Text>
            <Pressable
              style={[styles.outlineButton, { borderColor: theme.accent, marginTop: 10 }]}
              onPress={loadBlockedUsers}
            >
              <Text style={[styles.outlineButtonText, { color: theme.accent }]}>
                Try again
              </Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && !error && !blockedUsers.length ? (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.name, { color: theme.text }]}>
              No blocked users
            </Text>
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              If you block someone from a profile or post, they will appear here
              so you can manage it later.
            </Text>
          </View>
        ) : null}

        {blockedUsers.map((blockedUser) => {
          const blockedUserId = blockedUser._id || blockedUser.id;
          const meta = [blockedUser.town, blockedUser.userType]
            .filter(Boolean)
            .join(" | ");

          return (
            <View
              key={blockedUserId}
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <View style={styles.row}>
                <View style={styles.copy}>
                  <Text style={[styles.name, { color: theme.text }]}>
                    {blockedUser.name || "Summit Scene member"}
                  </Text>
                  {meta ? (
                    <Text style={[styles.meta, { color: theme.textMuted }]}>
                      {meta}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  style={[styles.outlineButton, { borderColor: theme.accent }]}
                  onPress={() => handleUnblock(blockedUser)}
                >
                  <Text style={[styles.outlineButtonText, { color: theme.accent }]}>
                    Unblock
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  copy: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: "800",
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
    textTransform: "capitalize",
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
