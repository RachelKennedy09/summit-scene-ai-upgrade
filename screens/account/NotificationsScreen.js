import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import PageHeader from "../../components/common/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/notificationsApi";

function formatNotificationDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotificationsScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async ({ silent = false } = {}) => {
    if (!token) return;

    try {
      if (!silent) setLoading(true);
      setError("");
      const data = await fetchNotifications(token);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (loadError) {
      setError(loadError.message || "Could not load notifications.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await loadNotifications({ silent: true });
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead(token);
      await loadNotifications({ silent: true });
    } catch (markError) {
      Alert.alert("Could not update notifications", markError.message);
    }
  }

  async function openNotification(notification) {
    try {
      if (!notification.readAt) {
        await markNotificationRead(notification._id || notification.id, token);
      }
    } catch {
      // Opening the related content still matters more than marking read.
    }

    const buddyPostId =
      notification.buddyPost?._id ||
      notification.buddyPost ||
      notification.data?.buddyPostId;
    const communityPostId =
      notification.communityPost?._id ||
      notification.communityPost ||
      notification.data?.communityPostId;

    if (buddyPostId) {
      navigation.navigate("tabs", {
        screen: "Community",
        params: { openBuddyPostId: buddyPostId },
      });
      return;
    }

    if (communityPostId) {
      navigation.navigate("tabs", {
        screen: "Community",
        params: { openCommunityPostId: communityPostId },
      });
      return;
    }

    await loadNotifications({ silent: true });
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <PageHeader title="Notifications" />

        <View style={styles.headerRow}>
          <Text style={[styles.summaryText, { color: theme.textMuted }]}>
            {unreadCount
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
              : "You're all caught up."}
          </Text>
          {unreadCount ? (
            <Pressable onPress={handleMarkAllRead}>
              <Text style={[styles.markReadText, { color: theme.accent }]}>
                Mark all read
              </Text>
            </Pressable>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={theme.accent} />
            <Text style={[styles.stateText, { color: theme.textMuted }]}>
              Loading notifications...
            </Text>
          </View>
        ) : null}

        {!loading && error ? (
          <View
            style={[
              styles.stateCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.stateTitle, { color: theme.text }]}>
              Could not load notifications
            </Text>
            <Text style={[styles.stateText, { color: theme.textMuted }]}>
              {error}
            </Text>
            <Pressable
              style={[styles.retryButton, { borderColor: theme.accent }]}
              onPress={() => loadNotifications()}
            >
              <Text style={[styles.retryText, { color: theme.accent }]}>
                Retry
              </Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && !error && notifications.length === 0 ? (
          <View
            style={[
              styles.stateCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.stateTitle, { color: theme.text }]}>
              No notifications yet
            </Text>
            <Text style={[styles.stateText, { color: theme.textMuted }]}>
              Comments, replies, likes, and interest on your posts will appear here.
            </Text>
          </View>
        ) : null}

        {notifications.map((notification) => {
          const isUnread = !notification.readAt;
          return (
            <Pressable
              key={notification._id || notification.id}
              style={[
                styles.notificationCard,
                {
                  backgroundColor: isUnread
                    ? theme.accentSoft || theme.card
                    : theme.card,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => openNotification(notification)}
            >
              <View style={styles.notificationHeader}>
                <Text style={[styles.notificationTitle, { color: theme.text }]}>
                  {notification.title}
                </Text>
                {isUnread ? (
                  <View
                    style={[
                      styles.unreadDot,
                      { backgroundColor: theme.accent },
                    ]}
                  />
                ) : null}
              </View>
              <Text style={[styles.notificationMessage, { color: theme.textMuted }]}>
                {notification.message}
              </Text>
              <Text style={[styles.notificationDate, { color: theme.textMuted }]}>
                {formatNotificationDate(notification.createdAt)}
              </Text>
            </Pressable>
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
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  content: {
    paddingBottom: 28,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  summaryText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  markReadText: {
    fontSize: 13,
    fontWeight: "800",
  },
  centerState: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 10,
  },
  stateCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  stateTitle: {
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 5,
  },
  stateText: {
    fontSize: 13,
    lineHeight: 18,
  },
  retryButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "800",
  },
  notificationCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 13,
    marginBottom: 10,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 5,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },
  notificationMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  notificationDate: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
  },
});
