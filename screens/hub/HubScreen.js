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
import PageHeader from "../../components/common/PageHeader";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

import EventCard from "../../components/cards/EventCard";
import HubFilters from "../../components/hub/HubFilters";

import {
  fetchEvents as fetchEventsFromApi,
} from "../../services/eventsApi";
import { requestCurrentLocation } from "../../services/locationService";
import { colors } from "../../theme/colors";
import {
  EVENT_CATEGORIES,
  getEventCategoryGroups,
} from "../../constants/eventCategories";
import { buildBuddyPostFromEventSearch } from "../../utils/buddyPostPrefill";

// Simple list of towns for the selector modal
const TOWNS = ["All", "Banff", "Canmore", "Lake Louise"];

const CATEGORIES = EVENT_CATEGORIES;
const CATEGORY_GROUPS = getEventCategoryGroups({
  includeAll: true,
  allLabel: "All categories",
});

// Date filter options (relative ranges)
const DATE_FILTERS = [
  "All",
  "Today",
  "Next 3 days",
  "Next 7 days",
  "Next 30 days",
];
const EVENTS_PAGE_SIZE = 20;
const NEAR_ME_RADIUS_KM = 15;

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
  const [isNearMeEnabled, setIsNearMeEnabled] = useState(false);
  const [nearMeLocation, setNearMeLocation] = useState(null);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [nearMeMessage, setNearMeMessage] = useState("");

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
        nearLat: isNearMeEnabled ? nearMeLocation?.latitude : undefined,
        nearLng: isNearMeEnabled ? nearMeLocation?.longitude : undefined,
        radiusKm: isNearMeEnabled ? NEAR_ME_RADIUS_KM : undefined,
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
  }, [selectedTown, selectedCategory, selectedDateFilter, isNearMeEnabled, nearMeLocation]);

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

  const handleToggleNearMe = useCallback(async () => {
    if (nearMeLoading) return;

    if (isNearMeEnabled) {
      setIsNearMeEnabled(false);
      setNearMeLocation(null);
      setNearMeMessage("");
      return;
    }

    try {
      setNearMeLoading(true);
      setNearMeMessage("");
      const location = await requestCurrentLocation();
      setNearMeLocation(location);
      setIsNearMeEnabled(true);
      setNearMeMessage(`Showing events within ${NEAR_ME_RADIUS_KM} km of you.`);
    } catch (error) {
      setNearMeLocation(null);
      setIsNearMeEnabled(false);
      setNearMeMessage(error.message || "Could not get your location.");
    } finally {
      setNearMeLoading(false);
    }
  }, [isNearMeEnabled, nearMeLoading]);

  const eventsToShow = events;

  const handleCreateBuddyPostFromSearch = useCallback(() => {
    navigation.navigate("CreateBuddyPost", {
      eventBuddy: buildBuddyPostFromEventSearch({
        category: selectedCategory,
        town: selectedTown,
        userTown: user?.town,
      }),
    });
  }, [navigation, selectedCategory, selectedTown, user?.town]);

  const handleClearFilters = useCallback(() => {
    setSelectedTown("All");
    setSelectedCategory("All");
    setSelectedDateFilter("All");
    setIsNearMeEnabled(false);
    setNearMeLocation(null);
    setNearMeMessage("");
  }, []);

  // Text for the "no events" state, depending on which filters are active.
  const emptyMessage = useMemo(() => {
    if (
      isNearMeEnabled &&
      selectedCategory === "All" &&
      selectedTown === "All" &&
      selectedDateFilter === "All"
    ) {
      return "No nearby events found right now. Try turning off Near me or choosing a town.";
    }

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
  }, [selectedCategory, selectedTown, selectedDateFilter, isNearMeEnabled]);

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
      return isNearMeEnabled
        ? `No events found within ${NEAR_ME_RADIUS_KM} km of you.`
        : "No events match your current filters.";
    }

    if (count === 1) {
      return isNearMeEnabled
        ? `Showing 1 event near you in ${townLabel} for ${categoryLabel}${dateLabel}.`
        : `Showing 1 event in ${townLabel} for ${categoryLabel}${dateLabel}.`;
    }

    return isNearMeEnabled
      ? `Showing ${count} events near you in ${townLabel} for ${categoryLabel}${dateLabel}.`
      : `Showing ${count} events in ${townLabel} for ${categoryLabel}${dateLabel}.`;
  }, [totalCount, selectedTown, selectedCategory, selectedDateFilter, isNearMeEnabled]);

  const hasActiveFilters =
    selectedTown !== "All" ||
    selectedCategory !== "All" ||
    selectedDateFilter !== "All" ||
    isNearMeEnabled;

  // Inital loading state (before there are any events)
  if (loading && !refreshing && events.length === 0) {
    return (
      <SafeAreaView
        edges={["top", "left", "right"]}
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
        edges={["top", "left", "right"]}
        style={[styles.safeArea, { backgroundColor: theme.background }]}
      >
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
          <Pressable
            style={[styles.retryButton, { borderColor: theme.accent }]}
            onPress={() => loadEvents({ nextPage: 1, mode: "initial" })}
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
      edges={["top", "left", "right"]}
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
            <>
              <PageHeader
                title={`Hello ${displayName}!`}
                subtitle={
                  "Welcome to your Summit Scene Hub\nChoose a town and category to start exploring events near you."
                }
              />
              <HubFilters
                selectedTown={selectedTown}
                selectedCategory={selectedCategory}
                selectedDateFilter={selectedDateFilter}
                resultSummary={resultSummary}
                error={error}
                towns={TOWNS}
                categories={CATEGORIES}
                categoryGroups={CATEGORY_GROUPS}
                dateFilters={DATE_FILTERS}
                onSelectTown={setSelectedTown}
                onSelectCategory={setSelectedCategory}
                onSelectDateFilter={setSelectedDateFilter}
                isNearMeEnabled={isNearMeEnabled}
                isNearMeLoading={nearMeLoading}
                nearMeMessage={nearMeMessage}
                onToggleNearMe={handleToggleNearMe}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={handleClearFilters}
                onRetry={() => loadEvents({ nextPage: 1, mode: "initial" })}
              />
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No events found
              </Text>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                {emptyMessage}
              </Text>
              <View style={styles.emptyActions}>
                <Pressable
                  style={[
                    styles.emptyAction,
                    { backgroundColor: theme.accent },
                  ]}
                  onPress={handleCreateBuddyPostFromSearch}
                >
                  <Text style={styles.emptyActionText}>Create Buddy Post</Text>
                </Pressable>
              </View>
            </View>
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
    paddingTop: 0,
  },
  errorText: {
    color: colors.error,
    marginBottom: 8,
    fontSize: 13,
  },
  listContent: {
    paddingTop: 0,
    paddingBottom: 32,
  },
  emptyContainer: {
    paddingTop: 0,
    paddingBottom: 32,
  },
  emptyText: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 24,
  },
  emptyTitle: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
  },
  emptyActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginTop: 14,
  },
  emptyAction: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  emptyActionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
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
