// screens/HubScreen.js
// Main Hub feed for SummitScene.
// - Fetches all events from the API
// - Applies town/caegory/date filters (shared with the Map tab)
// - Shows events in a FlatList with pull-to-refresh
// - Navigates to EventDetail when an event card is tapped.

import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import AppLogoHeader from "../../components/AppLogoHeader";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

import EventCard from "../../components/cards/EventCard";
import HubFilters from "../../components/hub/HubFilters";

import { fetchEvents as fetchEventsFromApi } from "../../services/eventsApi";
import { colors } from "../../theme/colors";

// Simple list of towns for the selector modal
const TOWNS = ["All", "Banff", "Canmore", "Lake Louise"];

// List of categories for selector modal
const CATEGORIES = [
  "All",
  "Market",
  "Wellness",
  "Music",
  "Workshop",
  "Family",
  "Retail",
  "Outdoors",
  "Food",
  "Art",
];

// Date filter options (relative ranges)
const DATE_FILTERS = [
  "All",
  "Today",
  "Next 3 days",
  "Next 7 days",
  "Next 30 days",
];

export default function HubScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();

  // Friendly greeting in the Hub header
  const displayName = user?.name || user?.email || "there";

  // Filter state (synced with Map tab filters)
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedTown, setSelectedTown] = useState("All");
  const [selectedDateFilter, setSelectedDateFilter] = useState("All");

  // Events + loading state
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Fetch events from the API.
  // Reused pattern with MapScreen: sort by date ascending for a consistent feed.
  const loadEvents = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError(null);

      const data = await fetchEventsFromApi();

      const sorted = (Array.isArray(data) ? data : []).slice().sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA - dateB;
      });

      setEvents(sorted);
    } catch (error) {
      console.error("Error fetching events:", error.message);
      setError("Could not load events. Pull to refresh to try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    loadEvents(false);
  }, [loadEvents]);

  const handleRefresh = () => {
    loadEvents(true);
  };

  // Apply town/category/date filters to the events list.
  // Logic mirrors the MapScreen so both tabs stay consistent.
  const eventsToShow = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    let rangeStart = null;
    let rangeEnd = null;

    if (selectedDateFilter === "Today") {
      rangeStart = todayStart;
      rangeEnd = new Date(todayStart);
      rangeEnd.setDate(rangeEnd.getDate() + 1);
    } else if (selectedDateFilter === "Next 3 days") {
      rangeStart = todayStart;
      rangeEnd = new Date(todayStart);
      rangeEnd.setDate(rangeEnd.getDate() + 3);
    } else if (selectedDateFilter === "Next 7 days") {
      rangeStart = todayStart;
      rangeEnd = new Date(todayStart);
      rangeEnd.setDate(rangeEnd.getDate() + 7);
    } else if (selectedDateFilter === "Next 30 days") {
      rangeStart = todayStart;
      rangeEnd = new Date(todayStart);
      rangeEnd.setDate(rangeEnd.getDate() + 30);
    }

    return events.filter((event) => {
      const categoryMatch =
        selectedCategory === "All" || event.category === selectedCategory;

      const townMatch = selectedTown === "All" || event.town === selectedTown;

      let dateMatch = true;

      if (selectedDateFilter !== "All") {
        if (!event.date || typeof event.date !== "string") {
          dateMatch = false;
        } else {
          const [y, m, d] = event.date.split("-").map(Number);
          if (!y || !m || !d) {
            dateMatch = false;
          } else {
            const eventDay = new Date(y, m - 1, d);
            if (rangeStart && rangeEnd) {
              dateMatch = eventDay >= rangeStart && eventDay < rangeEnd;
            }
          }
        }
      }

      return categoryMatch && townMatch && dateMatch;
    });
  }, [events, selectedCategory, selectedTown, selectedDateFilter]);

  // Text for the "no events" state, depending on which filters are active.
  const emptyMessage = useMemo(() => {
    if (
      selectedCategory === "All" &&
      selectedTown === "All" &&
      selectedDateFilter === "All"
    ) {
      return "No events available yet. Check back soon!";
    }

    if (selectedCategory === "All" && selectedTown !== "All") {
      return `No events found in ${selectedTown}. Try another town or check back later.`;
    }

    if (selectedTown === "All" && selectedCategory !== "All") {
      return `No ${selectedCategory} events found. Try another category or town.`;
    }

    if (selectedDateFilter !== "All") {
      return `No events match your filters for ${selectedDateFilter.toLowerCase()}.`;
    }

    return `No ${selectedCategory} events found in ${selectedTown}.`;
  }, [selectedCategory, selectedTown, selectedDateFilter]);

  // Human-readable summary of the filtered results.
  const resultSummary = useMemo(() => {
    const count = eventsToShow.length;

    const townLabel = selectedTown === "All" ? "all towns" : ` ${selectedTown}`;
    const categoryLabel =
      selectedCategory === "All"
        ? "all categories"
        : ` ${selectedCategory.toLowerCase()}`;

    const dateLabel =
      selectedDateFilter === "All"
        ? ""
        : ` (${selectedDateFilter.toLowerCase()})`;

    if (count === 0) {
      return "No events match your current filters.";
    }

    if (count === 1) {
      return `Showing 1 event in ${townLabel} for ${categoryLabel}${dateLabel}.`;
    }

    return `Showing ${count} events in ${townLabel} for ${categoryLabel}${dateLabel}.`;
  }, [eventsToShow.length, selectedTown, selectedCategory, selectedDateFilter]);

  // Inital loading state (before there are any events)
  if (loading && !refreshing && events.length === 0) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.background }]}
      >
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>
            Loading events...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Full-screen error state if first load fails.
  if (error && events.length === 0) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.background }]}
      >
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>
            Pull down to try again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Renders each event as a tappable card taht leads to EventDetail.
  const renderEvent = ({ item }) => (
    <EventCard
      event={item}
      onPress={() =>
        navigation.navigate("EventDetail", { event: item, eventId: item._id })
      }
    />
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <AppLogoHeader />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <FlatList
          data={eventsToShow}
          keyExtractor={(item) =>
            item._id?.toString() || Math.random().toString()
          }
          renderItem={renderEvent}
          contentContainerStyle={
            eventsToShow.length === 0
              ? styles.emptyContainer
              : styles.listContent
          }
          // Pull-to-refresh ties into loadEvents, with a custom overlay spinner below.
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="transparent"
              titleColor="transparent"
              colors={["transparent"]}
              progressBackgroundColor="transparent"
            />
          }
          // HubFilters renders the filter chips + greeting + result summary at the top of the list.
          ListHeaderComponent={
            <HubFilters
              displayName={displayName}
              selectedTown={selectedTown}
              selectedCategory={selectedCategory}
              selectedDateFilter={selectedDateFilter}
              resultSummary={resultSummary}
              error={error}
              towns={TOWNS}
              categories={CATEGORIES}
              dateFilters={DATE_FILTERS}
              onSelectTown={setSelectedTown}
              onSelectCategory={setSelectedCategory}
              onSelectDateFilter={setSelectedDateFilter}
            />
          }
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              {emptyMessage}
            </Text>
          }
          showsVerticalScrollIndicator={false}
        />

        {refreshing && (
          <View style={styles.refreshOverlay}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  errorText: {
    color: colors.error,
    marginBottom: 8,
    fontSize: 13,
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 32,
  },
  emptyContainer: {
    paddingTop: 8,
    paddingBottom: 32,
  },
  emptyText: {
    marginTop: 24,
    textAlign: "center",
    fontSize: 14,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  // Semi-transparent overlay used while refreshing, so the user sees a spinner
  // on top of the existing events instead of a blank screen.
  refreshOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0b1522cc",
  },
});
