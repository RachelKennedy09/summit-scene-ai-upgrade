// screens/MyEventsScreen.js
// Shows events created by the currently logged-in user
// Business users can manage(view / edit / delete) their own events in one place.
// Also splits events into "Upcoming" vs "Past" based on today's date.

import React, { useMemo, useState, useCallback } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import AppLogoHeader from "../../components/AppLogoHeader";
import { useAuth } from "../../context/AuthContext";
import {
  deleteEvent,
  fetchMyEvents as fetchMyEventsFromApi,
  sortEventsByUpcomingDate,
} from "../../services/eventsApi";
import { useTheme } from "../../context/ThemeContext";
import { getListScheduleLabel, isEventUpcoming } from "../../utils/eventSchedule";

export default function MyEventsScreen({ navigation, route }) {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const isBusiness = user?.role === "business";
  const successMessage = route?.params?.successMessage || "";
  const postedEventId = route?.params?.postedEventId || "";
  const updatedEventId = route?.params?.updatedEventId || "";

  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const clearSuccessState = useCallback(() => {
    navigation.setParams({
      successMessage: undefined,
      postedEventId: undefined,
      updatedEventId: undefined,
    });
  }, [navigation]);

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
      const data = await fetchMyEventsFromApi(token);

      // Sort events by date (earlier first) so the list feels chronological
      setEvents(sortEventsByUpcomingDate(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token, isBusiness]);

  // Reload whenever this screen comes into focus so newly posted/edited events appear immediately.
  useFocusEffect(
    useCallback(() => {
      if (token && isBusiness) {
        fetchMyEvents();
      } else {
        setEvents([]);
        setError(null);
        setIsLoading(false);
      }
    }, [token, isBusiness, fetchMyEvents])
  );

  // Pull-to-refresh handler wraps fetchMyEvents and toggles a refreshing spinner.
  const onRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await fetchMyEvents();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchMyEvents]);

  const upcomingEvents = events.filter((event) => isEventUpcoming(event));
  const pastEvents = events.filter((event) => !isEventUpcoming(event));
  const highlightedEventId = postedEventId || updatedEventId;
  const highlightedEvent = useMemo(
    () => events.find((event) => event._id === highlightedEventId) || null,
    [events, highlightedEventId]
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
      console.warn("Delete event issue:", error.message);
      Alert.alert("Error", error.message || "Failed to delete event.");
    }
  }

  // Renders a single event row for My Events.
  function renderEventItem({ item }) {
    const dateTimeLabel = getListScheduleLabel(item);
    const locationLabel = item.locationName || item.location || item.address;
    const isHighlighted = item._id === highlightedEventId;

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: isHighlighted
              ? theme.accentSoft || theme.card
              : theme.card,
            borderColor: isHighlighted ? theme.accent : theme.border,
          },
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
          {locationLabel ? (
            <Text style={[styles.location, { color: theme.textMuted }]}>
              {locationLabel}
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
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.background }]}
      >
        <AppLogoHeader />
        <View style={[styles.center, styles.screenShell]}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Loading your events...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.background }]}
      >
        <AppLogoHeader />
        <View style={[styles.center, styles.screenShell]}>
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
      </SafeAreaView>
    );
  }

  if (!events.length) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.background }]}
      >
        <AppLogoHeader />
        <View style={[styles.center, styles.screenShell]}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            No events yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
            Events you create with your business account will show up here.
          </Text>
          {isBusiness && (
            <Pressable
              style={[styles.primaryButton, { backgroundColor: theme.success }]}
              onPress={() => navigation.navigate("Post")}
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
      </SafeAreaView>
    );
  }

  // ---- Build single FlatList data with section headers ----
  const listData = [];

  listData.push({
    type: "heading",
    id: "heading-upcoming",
    title: "Upcoming Events",
  });

  if (upcomingEvents.length > 0) {
    upcomingEvents.forEach((event) => {
      listData.push({
        type: "event",
        id: event._id,
        event,
      });
    });
  } else {
    listData.push({
      type: "empty-state",
      id: "empty-upcoming",
      title: "No upcoming events",
      subtitle: "Your next published event will appear here.",
    });
  }

  listData.push({
    type: "heading",
    id: "heading-past",
    title: "Past Events",
  });

  if (pastEvents.length > 0) {
    pastEvents.forEach((event) => {
      listData.push({
        type: "event",
        id: event._id,
        event,
      });
    });
  } else {
    listData.push({
      type: "empty-state",
      id: "empty-past",
      title: "No past events",
      subtitle: "Completed events will move here once their schedule has passed.",
    });
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <AppLogoHeader />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          style={styles.list}
          ListHeaderComponent={
            <>
              <Text style={[styles.screenTitle, { color: theme.text }]}>
                {user?.name ? `${user.name}'s Events` : "Events by Business"}
              </Text>
              <Text style={[styles.screenSubtitle, { color: theme.textMuted }]}>
                Manage your upcoming and past event listings
              </Text>

              {successMessage ? (
                <View
                  style={[
                    styles.successBanner,
                    {
                      backgroundColor: theme.accentSoft || theme.card,
                      borderColor: theme.accent,
                    },
                  ]}
                >
                  <Text style={[styles.successTitle, { color: theme.text }]}>
                    {postedEventId ? "Your event is live" : "Changes saved"}
                  </Text>
                  <Text style={[styles.successText, { color: theme.textMuted }]}>
                    {successMessage}
                  </Text>
                  <View style={styles.successActions}>
                    {highlightedEvent ? (
                      <Pressable
                        style={[styles.inlineAction, { borderColor: theme.accent }]}
                        onPress={() =>
                          navigation.navigate("EventDetail", {
                            event: highlightedEvent,
                            eventId: highlightedEvent._id,
                          })
                        }
                      >
                        <Text
                          style={[styles.inlineActionText, { color: theme.accent }]}
                        >
                          View event
                        </Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      style={[styles.inlineAction, { borderColor: theme.accent }]}
                      onPress={() => navigation.navigate("Post")}
                    >
                      <Text
                        style={[styles.inlineActionText, { color: theme.accent }]}
                      >
                        Post another
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.inlineAction, { borderColor: theme.accent }]}
                      onPress={() => navigation.navigate("Hub")}
                    >
                      <Text
                        style={[styles.inlineActionText, { color: theme.accent }]}
                      >
                        Go to Hub
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.inlineAction, { borderColor: theme.border }]}
                      onPress={clearSuccessState}
                    >
                      <Text
                        style={[styles.inlineActionText, { color: theme.textMuted }]}
                      >
                        Dismiss
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {isBusiness && (
                <Pressable
                  style={[styles.primaryButton, { backgroundColor: theme.success }]}
                  onPress={() => navigation.navigate("Post")}
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
            </>
          }
          renderItem={({ item }) => {
            if (item.type === "heading") {
              return (
                <Text style={[styles.sectionHeading, { color: theme.text }]}>
                  {item.title}
                </Text>
              );
            }

            if (item.type === "empty-state") {
              return (
                <View
                  style={[
                    styles.inlineEmptyCard,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.inlineEmptyTitle, { color: theme.text }]}>
                    {item.title}
                  </Text>
                  <Text
                    style={[
                      styles.inlineEmptySubtitle,
                      { color: theme.textMuted },
                    ]}
                  >
                    {item.subtitle}
                  </Text>
                </View>
              );
            }

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screenShell: {
    paddingHorizontal: 16,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 13,
    marginBottom: 2,
  },
  successBanner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  successText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  successActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  inlineAction: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inlineActionText: {
    fontSize: 12,
    fontWeight: "700",
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 8,
  },
  inlineEmptyCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  inlineEmptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  inlineEmptySubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  listContent: {
    paddingBottom: 8,
    paddingRight: 10,
  },
  list: {
    paddingRight: 4,
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
    marginTop: 0,
    marginBottom: 2,
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
