// screens/HubScreen.js
// Main Hub feed for SummitScene.
// - Fetches all events from the API
// - Applies town/caegory/date filters (shared with the Map tab)
// - Shows events in a FlatList with pull-to-refresh
// - Navigates to EventDetail when an event card is tapped.

import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import AppLogoHeader from "../../components/AppLogoHeader";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

import EventCard from "../../components/cards/EventCard";
import HubFilters from "../../components/hub/HubFilters";

import {
  fetchEvents as fetchEventsFromApi,
} from "../../services/eventsApi";
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
  "Food & Drink",
  "Networking",
  "Fundraiser",
  "Seasonal/Holiday Special",
  "Nightlife",
  "Sports/Watch Party",
  "Community Info Session",
  "Art",
  "Other",
];

// Date filter options (relative ranges)
const DATE_FILTERS = [
  "All",
  "Today",
  "Next 3 days",
  "Next 7 days",
  "Next 30 days",
];
const EVENTS_PAGE_SIZE = 20;

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);

  const loadEvents = useCallback(async ({ nextPage = 1, mode = "initial" } = {}) => {
    try {
      if (mode === "refresh") {
        setRefreshing(true);
      } else if (mode === "loadMore") {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const data = await fetchEventsFromApi({
        page: nextPage,
        limit: EVENTS_PAGE_SIZE,
        town: selectedTown,
        category: selectedCategory,
        dateFilter: selectedDateFilter,
      });

      const nextEvents = Array.isArray(data?.events) ? data.events : [];

      setEvents((current) =>
        mode === "loadMore" ? [...current, ...nextEvents] : nextEvents
      );
      setPage(data.page || nextPage);
      setHasMore(Boolean(data.hasMore));
      setTotalCount(Number.isFinite(data.totalCount) ? data.totalCount : 0);
    } catch (error) {
      setError(
        mode === "loadMore"
          ? "Could not load more events. Try again."
          : "Could not load events. Pull to refresh to try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [selectedTown, selectedCategory, selectedDateFilter]);

  // Reload on focus so newly posted events appear when the user returns to the Hub.
  useFocusEffect(
    useCallback(() => {
      loadEvents({ nextPage: 1, mode: "initial" });
    }, [loadEvents])
  );

  const handleRefresh = () => {
    loadEvents({ nextPage: 1, mode: "refresh" });
  };

  const handleLoadMore = useCallback(() => {
    if (loading || refreshing || loadingMore || !hasMore) {
      return;
    }

    loadEvents({ nextPage: page + 1, mode: "loadMore" });
  }, [loading, refreshing, loadingMore, hasMore, page, loadEvents]);

  const eventsToShow = events;

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
    const count = totalCount;

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
  }, [totalCount, selectedTown, selectedCategory, selectedDateFilter]);

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
          <Pressable
            style={[styles.retryButton, { borderColor: theme.accent }]}
            onPress={() => loadEvents(false)}
          >
            <Text style={[styles.retryText, { color: theme.accent }]}>
              Try again
            </Text>
          </Pressable>
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

  const renderFooter = () => {
    if (!loadingMore) return <View style={styles.footerSpacer} />;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.accent} />
        <Text style={[styles.footerLoaderText, { color: theme.textMuted }]}>
          Loading more events...
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <AppLogoHeader />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <FlatList
          data={eventsToShow}
          keyExtractor={(item) =>
            item._id?.toString() || `${item.title}-${item.date}-${item.time}`
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
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.6}
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
  footerSpacer: {
    height: 16,
  },
  footerLoader: {
    paddingTop: 8,
    paddingBottom: 20,
    alignItems: "center",
  },
  footerLoaderText: {
    marginTop: 8,
    fontSize: 13,
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
  retryButton: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
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
