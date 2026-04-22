// screens/MyEventsScreen.js
// Shows events created by the currently logged-in user
// Business users can manage(view / edit / delete) their own events in one place.
// Also splits events into "Upcoming" vs "Past" based on today's date.

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Alert,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Pressable,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { deleteEvent } from "../../services/eventsApi";
import { useTheme } from "../../context/ThemeContext";
// Use same base URL as the rest of app (Expo env var with fallback)
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://summit-scene-backend.onrender.com";

export default function MyEventsScreen({ navigation }) {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const isBusiness = user?.role === "business";

  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Fetch events owned by the current business user.
  // This is separate from the general Hub fetch because the endpoint is /events/mine.
  const fetchMyEvents = useCallback(async () => {
    try {
      setError(null);

      if (!token) {
        throw new Error("You are not logged in. Please log in again.");
      }

      if (!isBusiness) {
        throw new Error(
          "Only business accounts have 'My Events'. Switch to a business account to see your events."
        );
      }

      setIsLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/events/mine`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const text = await response.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: text };
      }

      if (!response.ok) {
        const message =
          data.error ||
          data.message ||
          `Failed to load your events. (Status ${response.status})`;
        console.log("My events error:", response.status, data);
        throw new Error(message);
      }

      // Sort events by date (earlier first) so the list feels chronological
      const sorted = (data || []).slice().sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA - dateB;
      });
      setEvents(sorted);
    } catch (err) {
      console.error("Error fetching my events:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token, isBusiness]);

  // Initial load (and re-run if token or business role changes).
  useEffect(() => {
    if (token) {
      fetchMyEvents();
    } else {
      setIsLoading(false);
    }
  }, [token, isBusiness, fetchMyEvents]);

  // Pull-to-refresh handler wraps fetchMyEvents and toggles a refreshing spinner.
  const onRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await fetchMyEvents();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchMyEvents]);

  // ---- Split into upcoming + past based on today's date ----
  // We compare string dates in "YYYY-MM-DD" format, which sort correctly lexicographically.
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;

  const upcomingEvents = events.filter(
    (event) => event.date && event.date >= todayStr
  );
  const pastEvents = events.filter(
    (event) => event.date && event.date < todayStr
  );

  // Build a user-friendly "date + time" label based on which fields are present
  function buildDateTimeLabel(item) {
    const hasDate = Boolean(item.date);
    const hasStartTime = Boolean(item.time);
    const hasEndTime = Boolean(item.endTime);

    let label = "Date & time TBA";

    if (hasDate && hasStartTime && hasEndTime) {
      label = `${item.date} • ${item.time} – ${item.endTime}`;
    } else if (hasDate && hasStartTime) {
      label = `${item.date} • ${item.time}`;
    } else if (hasDate) {
      label = item.date;
    } else if (hasStartTime && hasEndTime) {
      label = `${item.time} – ${item.endTime}`;
    } else if (hasStartTime) {
      label = item.time;
    }

    return label;
  }

  function handleEdit(event) {
    // Navigate to the shared EditEvent screen, passing the event to pre-fill the form.
    navigation.navigate("EditEvent", { event });
  }

  function handleDelete(event) {
    Alert.alert(
      "Delete Event",
      `Are you sure you want to delete "${event.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => confirmDelete(event),
        },
      ]
    );
  }

  // Call the deleteEvent API helper, then refresh the list.
  async function confirmDelete(event) {
    try {
      if (!token) {
        Alert.alert("Not logged in", "Please log in again.");
        return;
      }

      await deleteEvent(event._id, token);

      Alert.alert("Deleted", `"${event.title}" has been removed.`);

      onRefresh();
    } catch (error) {
      console.error("Error deleting event:", error);
      Alert.alert("Error", error.message || "Failed to delete event.");
    }
  }

  // Renders a single event row for My Events.
  function renderEventItem({ item }) {
    const dateTimeLabel = buildDateTimeLabel(item);

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        {/* Tap the main card to open EventDetail */}
        <Pressable
          onPress={() =>
            navigation.navigate("EventDetail", {
              event: item,
              onUpdated: fetchMyEvents,
            })
          }
        >
          <Text style={[styles.title, { color: theme.text }]}>
            {item.title}
          </Text>
          <Text style={[styles.meta, { color: theme.textMuted }]}>
            {item.town} • {item.category}
          </Text>
          <Text style={[styles.dateText, { color: theme.text }]}>
            {dateTimeLabel}
          </Text>
          {item.location ? (
            <Text style={[styles.location, { color: theme.textMuted }]}>
              {item.location}
            </Text>
          ) : null}
        </Pressable>

        {/* Action buttons: Edit and Delete */}
        <View style={styles.cardActions}>
          <Pressable
            style={[styles.actionButton, { backgroundColor: theme.accent }]}
            onPress={() => handleEdit(item)}
          >
            <Text
              style={[
                styles.actionButtonText,
                { color: theme.onAccent || theme.background },
              ]}
            >
              Edit
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.actionButton,
              { backgroundColor: theme.danger || "#ff4d4f" },
            ]}
            onPress={() => handleDelete(item)}
          >
            <Text
              style={[
                styles.actionButtonText,
                { color: theme.onDanger || theme.background },
              ]}
            >
              Delete
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ---- Screen States ----

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[styles.loadingText, { color: theme.text }]}>
          Loading your events...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text
          style={[
            styles.errorText,
            { color: theme.error || theme.danger || "#ff4d4f" },
          ]}
        >
          {error}
        </Text>
        {isBusiness && (
          <Pressable
            style={[styles.retryButton, { borderColor: theme.accent }]}
            onPress={fetchMyEvents}
          >
            <Text style={[styles.retryText, { color: theme.accent }]}>
              Try again
            </Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (!events.length) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>
          No events yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
          Events you create with your business account will show up here.
        </Text>
        {isBusiness && (
          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme.success }]}
            onPress={() => navigation.navigate("tabs", { screen: "Post" })}
          >
            <Text
              style={[
                styles.primaryButtonText,
                { color: theme.onSuccess || theme.background },
              ]}
            >
              Create your first event
            </Text>
          </Pressable>
        )}
      </View>
    );
  }

  // ---- Build single FlatList data with section headers ----
  const listData = [];

  if (upcomingEvents.length > 0) {
    listData.push({
      type: "heading",
      id: "heading-upcoming",
      title: "My Upcoming Events",
    });
    upcomingEvents.forEach((event) => {
      listData.push({
        type: "event",
        id: event._id,
        event,
      });
    });
  }

  if (pastEvents.length > 0) {
    listData.push({
      type: "heading",
      id: "heading-past",
      title: "My Past Events",
    });
    pastEvents.forEach((event) => {
      listData.push({
        type: "event",
        id: event._id,
        event,
      });
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.screenTitle, { color: theme.text }]}>My Events</Text>
      <Text style={[styles.screenSubtitle, { color: theme.textMuted }]}>
        Events created by {user?.name || user?.email}
      </Text>

      {isBusiness && (
        <Pressable
          style={[styles.primaryButton, { backgroundColor: theme.success }]}
          onPress={() => navigation.navigate("tabs", { screen: "Post" })}
        >
          <Text
            style={[
              styles.primaryButtonText,
              { color: theme.onSuccess || theme.background },
            ]}
          >
            Post a new event
          </Text>
        </Pressable>
      )}

      <FlatList
        data={listData}
        keyExtractor={(item) =>
          item.type === "heading" ? item.id : item.event._id
        }
        renderItem={({ item }) => {
          if (item.type === "heading") {
            return (
              <Text style={[styles.sectionHeading, { color: theme.text }]}>
                {item.title}
              </Text>
            );
          }

          // item.type === "event"
          return renderEventItem({ item: item.event });
        }}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.accent}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 8,
  },
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 13,
  },
  location: {
    fontSize: 12,
    marginTop: 4,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  retryText: {
    fontWeight: "600",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    marginBottom: 16,
    textAlign: "center",
  },
  primaryButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  primaryButtonText: {
    fontWeight: "700",
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
