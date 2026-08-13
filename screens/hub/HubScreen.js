// screens/HubScreen.js
// Main Hub feed for SummitScene.
// - Fetches all events from the API
// - Applies town/caegory/date filters (shared with the Map tab)
// - Shows events in a FlatList with pull-to-refresh
// - Navigates to EventDetail when an event card is tapped.

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import logo from "../../assets/logo-app-earth-transparent-alpha.png";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

import EventCard from "../../components/cards/EventCard";
import BuddyPostCard from "../../components/cards/BuddyPostCard";
import HubFilters from "../../components/hub/HubFilters";

import {
  fetchEvents as fetchEventsFromApi,
} from "../../services/eventsApi";
import { fetchBuddyPosts } from "../../services/buddyPostsApi";
import { requestCurrentLocation } from "../../services/locationService";
import { colors } from "../../theme/colors";
import {
  formatEventTimeLabel,
  formatDateShort,
  getNextOccurrenceDateString,
} from "../../utils/eventSchedule";
import { getEventImageUrl } from "../../utils/eventImages";
import {
  EVENT_CATEGORIES,
  getEventCategoryGroups,
} from "../../constants/eventCategories";

// Simple list of towns for the selector modal
const TOWNS = ["All", "Banff", "Canmore", "Lake Louise"];
const LISTING_TYPES = ["events", "tours", "restaurant_specials", "classes", "All"];

const CATEGORIES = EVENT_CATEGORIES;
const CATEGORY_GROUPS = getEventCategoryGroups({
  includeAll: true,
  allLabel: "All Categories",
  includeGroupAll: true,
});

// Date filter options (relative ranges)
const DATE_FILTERS = [
  "Today",
  "Tomorrow",
  "This weekend",
  "Next 7 days",
  "All Dates",
];
const EVENTS_PAGE_SIZE = 20;
const DASHBOARD_EVENTS_LIMIT = 80;
const NEAR_ME_RADIUS_KM = 15;
const DEFAULT_LISTING_TYPE = "All";
const DEFAULT_DATE_FILTER = "Today";
const EVENT_TIME_ZONE = "America/Edmonton";
const DISCOVERY_CATEGORIES = [
  "Live Music",
  "Food & Drink",
  "Outdoors & Sports",
  "Wellness",
  "Markets",
  "Family & Pets",
  "Arts & Creativity",
  "Learning",
].filter((category) => CATEGORIES.includes(category));

function getUserInterestCategories(user) {
  const interests = Array.isArray(user?.interests) ? user.interests : [];
  return interests.filter(
    (interest) => interest !== "All" && CATEGORIES.includes(interest)
  );
}

function getListingTypeNoun(listingType, count = 2) {
  const isPlural = count !== 1;
  if (listingType === "tours") return isPlural ? "tours" : "tour";
  if (listingType === "restaurant_specials") {
    return isPlural ? "restaurant specials" : "restaurant special";
  }
  if (listingType === "classes") return isPlural ? "classes" : "class";
  if (listingType === "All") return isPlural ? "listings" : "listing";
  return isPlural ? "events" : "event";
}

function getAlbertaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const read = (type) => parts.find((part) => part.type === type)?.value;
  return {
    year: Number(read("year")),
    month: Number(read("month")),
    day: Number(read("day")),
    hour: Number(read("hour")),
    minute: Number(read("minute")),
  };
}

function formatDateForApi(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatBrowseDateLabel(dateString) {
  if (!dateString) return "";
  const [year, month, day] = String(dateString).split("-").map(Number);
  if (!year || !month || !day) return dateString;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
}

function getDateFilterLabel(dateFilter, startDate, endDate) {
  if (dateFilter !== "Choose dates") return dateFilter;
  if (!startDate) return "Choose dates";
  if (!endDate || endDate === startDate) return formatBrowseDateLabel(startDate);
  return `${formatBrowseDateLabel(startDate)} to ${formatBrowseDateLabel(endDate)}`;
}

function getAlbertaTodayContext(now = new Date()) {
  const parts = getAlbertaDateParts(now);
  const date = new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0);
  return {
    date,
    dateString: formatDateForApi(date),
    minutesNow: parts.hour * 60 + parts.minute,
  };
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

function getWeekendRange(todayDate) {
  const day = todayDate.getDay();
  const saturdayOffset = day === 0 ? -1 : 6 - day;
  const saturday = addDays(todayDate, saturdayOffset);
  const sunday = addDays(saturday, 1);
  return {
    start: formatDateForApi(saturday),
    end: formatDateForApi(sunday),
  };
}

function parseTimeToMinutes(value, fallback = 23 * 60 + 59) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return fallback;

  let hours = Number(match[1]) % 12;
  const minutes = Number(match[2]);
  if (match[3].toUpperCase() === "PM") {
    hours += 12;
  }
  return hours * 60 + minutes;
}

function getEventCategoryList(event) {
  return Array.isArray(event?.categories) && event.categories.length
    ? event.categories
    : event?.category
      ? [event.category]
      : [];
}

function getFirstName(user) {
  const source = user?.name || "";
  return source.trim().split(/\s+/)[0] || "";
}

export default function HubScreen() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const userInterestCategories = useMemo(
    () => getUserInterestCategories(user),
    [user?.interests]
  );

  // Filter state (synced with Map tab filters)
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedListingType, setSelectedListingType] = useState(DEFAULT_LISTING_TYPE);
  const [selectedTown, setSelectedTown] = useState("All");
  const [selectedDateFilter, setSelectedDateFilter] = useState(DEFAULT_DATE_FILTER);
  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [selectedEndDate, setSelectedEndDate] = useState("");
  const [isNearMeEnabled, setIsNearMeEnabled] = useState(false);
  const [nearMeLocation, setNearMeLocation] = useState(null);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [nearMeMessage, setNearMeMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [isBrowseMode, setIsBrowseMode] = useState(false);

  // Events + loading state
  const [events, setEvents] = useState([]);
  const [buddySearchResults, setBuddySearchResults] = useState([]);
  const [dashboardEvents, setDashboardEvents] = useState([]);
  const [communityPreviewPosts, setCommunityPreviewPosts] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const loadRequestIdRef = useRef(0);
  const dashboardRequestIdRef = useRef(0);

  const loadDashboardData = useCallback(async () => {
    const requestId = dashboardRequestIdRef.current + 1;
    dashboardRequestIdRef.current = requestId;

    try {
      setDashboardLoading(true);
      setDashboardError("");

      const [todayData, eventData, posts] = await Promise.all([
        fetchEventsFromApi({
          listingType: "events",
          dateFilter: "Today",
        }),
        fetchEventsFromApi({
          page: 1,
          limit: DASHBOARD_EVENTS_LIMIT,
          listingType: "events",
          dateFilter: "Next 12 months",
        }),
        fetchBuddyPosts({ status: "open", limit: 3 }, token).catch(() => []),
      ]);

      if (dashboardRequestIdRef.current !== requestId) {
        return;
      }

      const todayEvents = Array.isArray(todayData) ? todayData : [];
      const upcomingEvents = Array.isArray(eventData?.events) ? eventData.events : [];
      const seen = new Set();
      const mergedEvents = [...todayEvents, ...upcomingEvents].filter((event) => {
        const key = event?._id || `${event?.title}-${event?.date}-${event?.time}`;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setDashboardEvents(mergedEvents);
      setCommunityPreviewPosts(Array.isArray(posts) ? posts.slice(0, 3) : []);
    } catch (error) {
      if (dashboardRequestIdRef.current !== requestId) {
        return;
      }

      setDashboardError(
        error.message || "Could not load today's Bow Valley snapshot."
      );
      setDashboardEvents([]);
      setCommunityPreviewPosts([]);
    } finally {
      if (dashboardRequestIdRef.current === requestId) {
        setDashboardLoading(false);
      }
    }
  }, [token]);

  const loadEvents = useCallback(async ({ nextPage = 1, mode = "initial" } = {}) => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    const isCurrentRequest = () => loadRequestIdRef.current === requestId;

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
        listingType: selectedListingType,
        category: selectedCategory,
        dateFilter: selectedDateFilter,
        startDate: selectedDateFilter === "Choose dates" ? selectedStartDate : undefined,
        endDate: selectedDateFilter === "Choose dates" ? selectedEndDate : undefined,
        nearLat: isNearMeEnabled ? nearMeLocation?.latitude : undefined,
        nearLng: isNearMeEnabled ? nearMeLocation?.longitude : undefined,
        radiusKm: isNearMeEnabled ? NEAR_ME_RADIUS_KM : undefined,
        search: activeSearch || undefined,
      });

      const nextEvents = Array.isArray(data?.events) ? data.events : [];
      let nextBuddyPosts = [];

      if (activeSearch && nextPage === 1) {
        nextBuddyPosts = await fetchBuddyPosts(
          { search: activeSearch, status: "open" },
          token
        );
      }

      if (!isCurrentRequest()) {
        return;
      }

      setEvents((current) =>
        mode === "loadMore" ? [...current, ...nextEvents] : nextEvents
      );
      if (mode !== "loadMore") {
        setBuddySearchResults(nextBuddyPosts);
      }
      setPage(data.page || nextPage);
      setHasMore(Boolean(data.hasMore));
      setTotalCount(Number.isFinite(data.totalCount) ? data.totalCount : 0);
    } catch (error) {
      if (!isCurrentRequest()) {
        return;
      }

      setError(
        mode === "loadMore"
          ? "Could not load more events. Try again."
          : "Could not load events yet. Pull to refresh or try again in a moment."
      );
    } finally {
      if (isCurrentRequest()) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, [selectedTown, selectedListingType, selectedCategory, selectedDateFilter, selectedStartDate, selectedEndDate, isNearMeEnabled, nearMeLocation, activeSearch, token]);

  // Reload when the Hub is focused and whenever filters/search change.
  useEffect(() => {
    if (!isFocused) return undefined;

    loadDashboardData();
    loadEvents({ nextPage: 1, mode: "initial" });

    return () => {
      loadRequestIdRef.current += 1;
      dashboardRequestIdRef.current += 1;
    };
  }, [isFocused, loadDashboardData, loadEvents]);

  const handleRefresh = useCallback(() => {
    loadDashboardData();
    loadEvents({ nextPage: 1, mode: "refresh" });
  }, [loadDashboardData, loadEvents]);

  const handleLoadMore = useCallback(() => {
    if (loading || refreshing || loadingMore || !hasMore) {
      return;
    }

    loadEvents({ nextPage: page + 1, mode: "loadMore" });
  }, [loading, refreshing, loadingMore, hasMore, page, loadEvents]);

  const prepareFilterRefresh = useCallback(() => {
    setEvents([]);
    setBuddySearchResults([]);
    setTotalCount(0);
    setHasMore(false);
    setPage(1);
    setLoading(true);
  }, []);

  const handleSelectTownFilter = useCallback(
    (town) => {
      if (town === selectedTown) return;
      prepareFilterRefresh();
      setSelectedTown(town);
    },
    [prepareFilterRefresh, selectedTown]
  );

  const handleSelectListingTypeFilter = useCallback(
    (listingType) => {
      if (listingType === selectedListingType) return;
      prepareFilterRefresh();
      setSelectedListingType(listingType);
    },
    [prepareFilterRefresh, selectedListingType]
  );

  const handleSelectCategoryFilter = useCallback(
    (category) => {
      if (category === selectedCategory) return;
      prepareFilterRefresh();
      setSelectedCategory(category);
    },
    [prepareFilterRefresh, selectedCategory]
  );

  const handleSelectDateFilter = useCallback(
    (dateFilter) => {
      if (dateFilter === selectedDateFilter && !selectedStartDate && !selectedEndDate) return;
      prepareFilterRefresh();
      setSelectedDateFilter(dateFilter);
      setSelectedStartDate("");
      setSelectedEndDate("");
    },
    [prepareFilterRefresh, selectedDateFilter, selectedStartDate, selectedEndDate]
  );

  const handleSelectDateRange = useCallback(
    ({ startDate, endDate }) => {
      if (!startDate) return;
      prepareFilterRefresh();
      setSelectedDateFilter("Choose dates");
      setSelectedStartDate(startDate);
      setSelectedEndDate(endDate || startDate);
    },
    [prepareFilterRefresh]
  );

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

  const handleApplySearch = useCallback(() => {
    const trimmedSearch = searchQuery.trim();
    if (!trimmedSearch) {
      setActiveSearch("");
      setBuddySearchResults([]);
      return;
    }

    setSelectedTown("All");
    setSelectedListingType("All");
    setSelectedCategory("All");
    setSelectedDateFilter("All Dates");
    setSelectedStartDate("");
    setSelectedEndDate("");
    setIsNearMeEnabled(false);
    setNearMeLocation(null);
    setNearMeMessage("");
    setActiveSearch(trimmedSearch);
  }, [searchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setActiveSearch("");
    setSelectedDateFilter(DEFAULT_DATE_FILTER);
    setSelectedStartDate("");
    setSelectedEndDate("");
    setBuddySearchResults([]);
  }, []);

  const showEventBrowser = useCallback(
    ({
      town = "All",
      category = "All",
      dateFilter = "All Dates",
      listingType = DEFAULT_LISTING_TYPE,
    } = {}) => {
      prepareFilterRefresh();
      setSelectedTown(town);
      setSelectedCategory(category);
      setSelectedDateFilter(dateFilter);
      setSelectedStartDate("");
      setSelectedEndDate("");
      setSelectedListingType(listingType);
      setIsNearMeEnabled(false);
      setNearMeLocation(null);
      setNearMeMessage("");
      setSearchQuery("");
      setActiveSearch("");
      setBuddySearchResults([]);
      setIsBrowseMode(true);
    },
    [prepareFilterRefresh]
  );

  const todayContext = useMemo(() => getAlbertaTodayContext(), []);
  const weekendRange = useMemo(
    () => getWeekendRange(todayContext.date),
    [todayContext.date]
  );
  const preferredTown =
    TOWNS.includes(user?.town) && user.town !== "All" ? user.town : "";

  const dashboardSections = useMemo(() => {
    const todayEvents = [];
    const upcomingEvents = [];
    const weekendEvents = [];
    const shownTodayIds = new Set();
    const townCounts = {
      Banff: 0,
      Canmore: 0,
      "Lake Louise": 0,
    };

    dashboardEvents.forEach((event) => {
      const nextDate = getNextOccurrenceDateString(event, todayContext.date);
      if (!nextDate) return;

      const isToday = nextDate === todayContext.dateString;
      const endMinutes = parseTimeToMinutes(
        event.endTime || event.time,
        24 * 60
      );
      const hasEndedToday = isToday && endMinutes < todayContext.minutesNow;

      if (isToday) {
        if (townCounts[event.town] !== undefined) {
          townCounts[event.town] += 1;
        }
        if (!hasEndedToday) {
          todayEvents.push(event);
        }
      } else {
        upcomingEvents.push(event);
      }

      if (
        nextDate >= weekendRange.start &&
        nextDate <= weekendRange.end &&
        !hasEndedToday
      ) {
        weekendEvents.push(event);
      }
    });

    const sortByTownThenTime = (left, right) => {
      if (preferredTown) {
        const leftPreferred = left.town === preferredTown ? 0 : 1;
        const rightPreferred = right.town === preferredTown ? 0 : 1;
        if (leftPreferred !== rightPreferred) return leftPreferred - rightPreferred;
      }

      const leftDate = getNextOccurrenceDateString(left, todayContext.date) || "";
      const rightDate = getNextOccurrenceDateString(right, todayContext.date) || "";
      if (leftDate !== rightDate) return leftDate.localeCompare(rightDate);

      return parseTimeToMinutes(left.time) - parseTimeToMinutes(right.time);
    };

    todayEvents.sort(sortByTownThenTime);
    const todayPreview = todayEvents.slice(0, 5);
    todayPreview.forEach((event) => shownTodayIds.add(event._id));

    return {
      todayEvents,
      todayPreview,
      upcomingPreview: upcomingEvents
        .filter((event) => !shownTodayIds.has(event._id))
        .sort(sortByTownThenTime)
        .slice(0, 4),
      weekendPreview: weekendEvents
        .filter((event) => !shownTodayIds.has(event._id))
        .sort(sortByTownThenTime)
        .slice(0, 4),
      townCounts,
    };
  }, [
    dashboardEvents,
    preferredTown,
    todayContext.date,
    todayContext.dateString,
    todayContext.minutesNow,
    weekendRange.end,
    weekendRange.start,
  ]);

  const isShowingInterestFirst =
    selectedCategory === "All" && userInterestCategories.length > 0;

  const eventsToShow = useMemo(() => {
    const eventItems = !isShowingInterestFirst
      ? events
      : (() => {
          const interestSet = new Set(userInterestCategories);
          const interestEvents = [];
          const otherEvents = [];

          events.forEach((event) => {
            if (
              getEventCategoryList(event).some((eventCategory) =>
                interestSet.has(eventCategory)
              )
            ) {
              interestEvents.push(event);
            } else {
              otherEvents.push(event);
            }
          });

          if (!interestEvents.length) {
            return events;
          }

          return [
            {
              _listType: "sectionHeader",
              id: "your-interests",
              title: "Your interests",
              subtitle: `${interestEvents.length} matching event${
                interestEvents.length === 1 ? "" : "s"
              } in this list.`,
            },
            ...interestEvents,
            ...(otherEvents.length
              ? [
                  {
                    _listType: "sectionHeader",
                    id: "more-events",
                    title: "More events",
                    subtitle: "Everything else happening nearby.",
                  },
                  ...otherEvents,
                ]
              : []),
          ];
        })();

    if (!activeSearch || !buddySearchResults.length) {
      return eventItems;
    }

    return [
      {
        _listType: "sectionHeader",
        id: "event-search-results",
        title: "Event results",
        subtitle: `${events.length} matching event${events.length === 1 ? "" : "s"}.`,
      },
      ...eventItems,
      {
        _listType: "sectionHeader",
        id: "buddy-search-results",
        title: "Community and buddy posts",
        subtitle: `${buddySearchResults.length} matching post${
          buddySearchResults.length === 1 ? "" : "s"
        }.`,
      },
      ...buddySearchResults.map((post) => ({
        ...post,
        _listType: "buddyPost",
        _searchKey: `buddy-${post._id}`,
      })),
    ];
  }, [events, isShowingInterestFirst, userInterestCategories, activeSearch, buddySearchResults]);

  const handleClearFilters = useCallback(() => {
    setSelectedTown("All");
    setSelectedListingType(DEFAULT_LISTING_TYPE);
    setSelectedCategory("All");
    setSelectedDateFilter(DEFAULT_DATE_FILTER);
    setSelectedStartDate("");
    setSelectedEndDate("");
    setIsNearMeEnabled(false);
    setNearMeLocation(null);
    setNearMeMessage("");
    setSearchQuery("");
    setActiveSearch("");
    setBuddySearchResults([]);
  }, []);

  const selectedDateLabel = useMemo(
    () => getDateFilterLabel(selectedDateFilter, selectedStartDate, selectedEndDate),
    [selectedDateFilter, selectedStartDate, selectedEndDate]
  );

  // Text for the "no events" state, depending on which filters are active.
  const emptyMessage = useMemo(() => {
    const listingPlural = getListingTypeNoun(selectedListingType);

    if (
      activeSearch &&
      events.length === 0 &&
      buddySearchResults.length === 0
    ) {
      return `No matches found for "${activeSearch}". Try a simpler word like music, book, club, yoga, concert, or ride share.`;
    }

    if (
      isNearMeEnabled &&
      selectedCategory === "All" &&
      selectedTown === "All" &&
      selectedDateFilter === "All Dates"
    ) {
      return "No nearby events found right now. Try turning off Near me, choosing a town, or checking Community for local plans and questions.";
    }

    if (
      selectedCategory === "All" &&
      selectedTown === "All" &&
      selectedDateFilter === "All Dates"
    ) {
      return "No events available yet. Check back soon, or open Community for local plans, questions, groups, jobs, and notices.";
    }

    if (selectedCategory === "All" && selectedTown !== "All") {
      return `No ${listingPlural} found in ${selectedTown}. Try another town, a wider date range, or Community.`;
    }

    if (selectedTown === "All" && selectedCategory !== "All") {
      return `No ${selectedCategory} ${listingPlural} found. Try another category, a wider date range, or Community.`;
    }

    if (selectedDateFilter !== "All Dates") {
      return `No ${listingPlural} match your filters for ${selectedDateLabel.toLowerCase()}. Try a wider date range or open Community.`;
    }

    return `No ${selectedCategory} ${listingPlural} found in ${selectedTown}.`;
  }, [selectedCategory, selectedListingType, selectedTown, selectedDateFilter, selectedDateLabel, isNearMeEnabled, activeSearch, events.length, buddySearchResults.length]);

  // Human-readable summary of the filtered results.
  const resultSummary = useMemo(() => {
    const count = totalCount;
    const listingSingular = getListingTypeNoun(selectedListingType, 1);
    const listingPlural = getListingTypeNoun(selectedListingType);

    const townLabel = selectedTown === "All" ? "all towns" : ` ${selectedTown}`;
    const categoryLabel =
      selectedCategory === "All"
        ? "all categories"
        : ` ${selectedCategory.toLowerCase()}`;

    const dateLabel =
      selectedDateFilter === "All Dates"
        ? ""
        : ` (${selectedDateLabel.toLowerCase()})`;

    if (count === 0) {
      if (activeSearch && buddySearchResults.length) {
        return `No events found for "${activeSearch}", but ${buddySearchResults.length} community post${
          buddySearchResults.length === 1 ? "" : "s"
        } matched.`;
      }

      return isNearMeEnabled
        ? `No ${listingPlural} found within ${NEAR_ME_RADIUS_KM} km of you.`
        : `No ${listingPlural} match your current filters.`;
    }

    if (activeSearch) {
      const buddyText = buddySearchResults.length
        ? ` and ${buddySearchResults.length} community post${
            buddySearchResults.length === 1 ? "" : "s"
          }`
        : "";
      return `Showing ${count} ${count === 1 ? listingSingular : listingPlural}${buddyText} for "${activeSearch}".`;
    }

    if (isShowingInterestFirst) {
      return `Showing ${count} listings with your interests first. Choose a category to focus the list.`;
    }

    if (count === 1) {
      return isNearMeEnabled
        ? `Showing 1 ${listingSingular} near you in ${townLabel} for ${categoryLabel}${dateLabel}.`
        : `Showing 1 ${listingSingular} in ${townLabel} for ${categoryLabel}${dateLabel}.`;
    }

    return isNearMeEnabled
      ? `Showing ${count} ${listingPlural} near you in ${townLabel} for ${categoryLabel}${dateLabel}.`
      : `Showing ${count} ${listingPlural} in ${townLabel} for ${categoryLabel}${dateLabel}.`;
  }, [totalCount, selectedTown, selectedListingType, selectedCategory, selectedDateFilter, selectedDateLabel, isNearMeEnabled, isShowingInterestFirst, activeSearch, buddySearchResults.length]);

  const searchStatus = useMemo(() => {
    if (!activeSearch) return "";

    const eventCount = totalCount;
    const buddyCount = buddySearchResults.length;
    const totalMatches = eventCount + buddyCount;

    if (loading && !refreshing) {
      return `Searching for "${activeSearch}"...`;
    }

    if (totalMatches === 0) {
      return `0 results found for "${activeSearch}". Try a broader word or clear filters.`;
    }

    return `${totalMatches} result${totalMatches === 1 ? "" : "s"} found: ${eventCount} event${
      eventCount === 1 ? "" : "s"
    }, ${buddyCount} community post${buddyCount === 1 ? "" : "s"}.`;
  }, [activeSearch, totalCount, buddySearchResults.length, loading, refreshing]);

  const hasActiveFilters =
    selectedTown !== "All" ||
    selectedListingType !== DEFAULT_LISTING_TYPE ||
    selectedCategory !== "All" ||
    selectedDateFilter !== DEFAULT_DATE_FILTER ||
    Boolean(selectedStartDate) ||
    isNearMeEnabled ||
    Boolean(activeSearch);

  const handleRetryLoad = useCallback(() => {
    loadEvents({ nextPage: 1, mode: "initial" });
  }, [loadEvents]);

  const handleOpenEvent = useCallback(
    (event) => {
      navigation.navigate("EventDetail", { event, eventId: event._id });
    },
    [navigation]
  );

  const keyExtractor = useCallback((item) => {
    if (item._listType) {
      return item.id || item._searchKey || item._id?.toString();
    }

    return item._id?.toString() || `${item.title}-${item.date}-${item.time}`;
  }, []);

  const renderEvent = useCallback(
    ({ item }) => {
      if (item?._listType === "sectionHeader") {
        return (
          <View
            style={[
              styles.feedSectionHeader,
              { borderColor: theme.border, backgroundColor: theme.background },
            ]}
          >
            <Text style={[styles.feedSectionTitle, { color: theme.text }]}>
              {item.title}
            </Text>
            {item.subtitle ? (
              <Text
                style={[styles.feedSectionSubtitle, { color: theme.textMuted }]}
              >
                {item.subtitle}
              </Text>
            ) : null}
          </View>
        );
      }

      if (item._listType === "buddyPost") {
        return (
          <BuddyPostCard
            post={item}
            theme={theme}
            currentUserId={user?._id || user?.id}
            onOpenEvent={handleOpenEvent}
          />
        );
      }

      return <EventCard event={item} onPress={() => handleOpenEvent(item)} />;
    },
    [handleOpenEvent, theme, user?._id, user?.id]
  );

  const renderFooter = useCallback(() => {
    if (!loadingMore) return <View style={styles.footerSpacer} />;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.accent} />
        <Text style={[styles.footerLoaderText, { color: theme.textMuted }]}>
          Loading more events...
        </Text>
      </View>
    );
  }, [loadingMore, theme.accent, theme.textMuted]);

  const greetingLabel = useMemo(() => {
    const hour = getAlbertaDateParts().hour;
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);
  const firstName = getFirstName(user);

  const renderDashboardEventCard = useCallback(
    (event, compact = false) => {
      const nextDate = getNextOccurrenceDateString(event, todayContext.date);
      const dateLabel =
        nextDate && nextDate !== todayContext.dateString
          ? formatDateShort(nextDate)
          : "";
      const eventImageUrl = getEventImageUrl(event);

      return (
        <Pressable
          key={event._id || `${event.title}-${event.date}`}
          onPress={() => handleOpenEvent(event)}
          style={[
            compact ? styles.compactEventCard : styles.dashboardEventCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          {eventImageUrl && !compact ? (
            <Image
              source={{ uri: eventImageUrl }}
              style={styles.dashboardEventImage}
              resizeMode="cover"
            />
          ) : null}
          <View style={styles.dashboardEventBody}>
            <Text
              style={[styles.dashboardEventTitle, { color: theme.text }]}
              numberOfLines={2}
            >
              {event.title || "Untitled event"}
            </Text>
            <Text style={[styles.dashboardEventMeta, { color: theme.textMuted }]}>
              {[dateLabel, event.town, formatEventTimeLabel(event)]
                .filter(Boolean)
                .join(" | ")}
            </Text>
            <Text
              style={[styles.dashboardEventMeta, { color: theme.textMuted }]}
              numberOfLines={1}
            >
              {event.locationName || event.location || event.address || "Location TBA"}
            </Text>
            <Text style={[styles.dashboardEventCategory, { color: theme.accent }]}>
              {getEventCategoryList(event).join(", ") || "Event"}
            </Text>
          </View>
        </Pressable>
      );
    },
    [handleOpenEvent, theme, todayContext.date, todayContext.dateString]
  );

  const dashboardHeader = useMemo(() => {
    const totalToday = dashboardSections.todayEvents.length;
    const townBreakdown = TOWNS.filter((town) => town !== "All")
      .map((town) =>
        `${town === "Lake Louise" ? "LL" : town} ${
          dashboardSections.townCounts[town] || 0
        }`
      )
      .join(" | ");

    return (
      <View>
        <View style={styles.logoHeader}>
          <Image source={logo} style={styles.dashboardLogo} resizeMode="contain" />
        </View>
        <View style={styles.dashboardHero}>
          <Text style={[styles.dashboardGreeting, { color: theme.text }]}>
            {firstName ? `${greetingLabel}, ${firstName}` : greetingLabel}
          </Text>
          <Text style={[styles.dashboardSubtitle, { color: theme.textMuted }]}>
            Here's what's happening in the Bow Valley today
          </Text>
        </View>

        <Pressable
          onPress={() =>
            showEventBrowser({ dateFilter: "Today", listingType: "events" })
          }
          style={[
            styles.todayCountCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          {dashboardLoading ? (
            <ActivityIndicator size="small" color={theme.accent} />
          ) : (
            <>
              <Text style={[styles.todayCountNumber, { color: theme.text }]}>
                {totalToday}
              </Text>
              <Text style={[styles.todayCountTitle, { color: theme.text }]}>
                {totalToday === 1
                  ? "event happening today"
                  : "events happening today"}
              </Text>
              <Text style={[styles.todayCountBreakdown, { color: theme.textMuted }]}>
                {townBreakdown}
              </Text>
            </>
          )}
        </Pressable>

        {dashboardError ? (
          <View
            style={[
              styles.dashboardNotice,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.dashboardNoticeText, { color: theme.textMuted }]}>
              {dashboardError}
            </Text>
            <Pressable onPress={loadDashboardData}>
              <Text style={[styles.sectionActionText, { color: theme.accent }]}>
                Retry
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.dashboardSection}>
          <View style={styles.dashboardSectionHeader}>
            <Text style={[styles.dashboardSectionTitle, { color: theme.text }]}>
              Happening Today
            </Text>
            <Pressable
              onPress={() =>
                showEventBrowser({ dateFilter: "Today", listingType: "events" })
              }
            >
              <Text style={[styles.sectionActionText, { color: theme.accent }]}>
                See all today
              </Text>
            </Pressable>
          </View>
          {dashboardSections.todayPreview.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalSection}
            >
              {dashboardSections.todayPreview.map((event) =>
                renderDashboardEventCard(event)
              )}
            </ScrollView>
          ) : (
            <View
              style={[
                styles.emptyDashboardCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.emptyDashboardText, { color: theme.textMuted }]}>
                Nothing listed for today yet - check what's coming up next.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.dashboardSection}>
          <Text style={[styles.dashboardSectionTitle, { color: theme.text }]}>
            Explore by town
          </Text>
          <View style={styles.quickChipRow}>
            {TOWNS.filter((town) => town !== "All").map((town) => (
              <Pressable
                key={town}
                onPress={() => showEventBrowser({ town, dateFilter: "All Dates" })}
                style={[
                  styles.quickChip,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.quickChipText, { color: theme.text }]}>
                  {town}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.dashboardSection}>
          <Text style={[styles.dashboardSectionTitle, { color: theme.text }]}>
            What are you feeling?
          </Text>
          <View style={styles.quickChipRow}>
            {DISCOVERY_CATEGORIES.map((category) => (
              <Pressable
                key={category}
                onPress={() =>
                  showEventBrowser({ category, dateFilter: "All Dates" })
                }
                style={[
                  styles.quickChip,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.quickChipText, { color: theme.text }]}>
                  {category}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.dashboardSection}>
          <View style={styles.dashboardSectionHeader}>
            <Text style={[styles.dashboardSectionTitle, { color: theme.text }]}>
              Coming Up
            </Text>
            <Pressable
              onPress={() =>
                showEventBrowser({ dateFilter: "All Dates", listingType: "events" })
              }
            >
              <Text style={[styles.sectionActionText, { color: theme.accent }]}>
                See all events
              </Text>
            </Pressable>
          </View>
          {dashboardSections.upcomingPreview.map((event) =>
            renderDashboardEventCard(event, true)
          )}
        </View>

        {dashboardSections.weekendPreview.length ? (
          <View style={styles.dashboardSection}>
            <View style={styles.dashboardSectionHeader}>
              <Text style={[styles.dashboardSectionTitle, { color: theme.text }]}>
                This Weekend
              </Text>
              <Pressable
                onPress={() =>
                  showEventBrowser({ dateFilter: "Next 7 days", listingType: "events" })
                }
              >
                <Text style={[styles.sectionActionText, { color: theme.accent }]}>
                  See all
                </Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalSection}
            >
              {dashboardSections.weekendPreview.map((event) =>
                renderDashboardEventCard(event)
              )}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.dashboardSection}>
          <View style={styles.dashboardSectionHeader}>
            <Text style={[styles.dashboardSectionTitle, { color: theme.text }]}>
              Around the Community
            </Text>
            <Pressable
              onPress={() =>
                navigation.navigate("Community", { resetToHomeAt: Date.now() })
              }
            >
              <Text style={[styles.sectionActionText, { color: theme.accent }]}>
                View Community
              </Text>
            </Pressable>
          </View>
          {communityPreviewPosts.length ? (
            communityPreviewPosts.map((post) => (
              <Pressable
                key={post._id}
                onPress={() =>
                  navigation.navigate("Community", { resetToHomeAt: Date.now() })
                }
                style={[
                  styles.communityPreviewCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Text
                  style={[styles.communityPreviewTitle, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {post.title || post.headline || "Community post"}
                </Text>
                <Text
                  style={[styles.communityPreviewMeta, { color: theme.textMuted }]}
                  numberOfLines={2}
                >
                  {[post.type, post.town, post.date].filter(Boolean).join(" | ")}
                </Text>
              </Pressable>
            ))
          ) : (
            <View
              style={[
                styles.emptyDashboardCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.emptyDashboardText, { color: theme.textMuted }]}>
                Community posts will appear here when locals are looking to connect.
              </Text>
            </View>
          )}
        </View>

        <Pressable
          onPress={() => showEventBrowser({ dateFilter: "All Dates" })}
          style={[styles.browseAllButton, { backgroundColor: theme.accent }]}
        >
          <Text style={[styles.browseAllButtonText, { color: theme.textOnAccent }]}>
            Browse all events
          </Text>
        </Pressable>
      </View>
    );
  }, [
    communityPreviewPosts,
    dashboardError,
    dashboardLoading,
    dashboardSections,
    firstName,
    greetingLabel,
    loadDashboardData,
    navigation,
    renderDashboardEventCard,
    showEventBrowser,
    theme,
  ]);

  const listHeader = useMemo(
    () => (
      <>
        <View style={styles.browseHeader}>
          <View style={styles.browseTitleRow}>
            <Image source={logo} style={styles.browseLogo} resizeMode="contain" />
            <View style={styles.browseTitleCopy}>
              <Text style={[styles.browseTitle, { color: theme.text }]}>
                Browse Events
              </Text>
              <Text style={[styles.browseHeaderHint, { color: theme.textMuted }]}>
                Search, pick a town, choose a category, or change the date range.
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => {
              handleClearFilters();
              setIsBrowseMode(false);
            }}
            style={({ pressed }) => [
              styles.backHomeButton,
              {
                backgroundColor: theme.accentSoft || theme.card,
                borderColor: theme.accent,
              },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={16}
              color={theme.accent}
              style={styles.backHomeIcon}
            />
            <Text style={[styles.backHomeText, { color: theme.accent }]}>
              Back to Today
            </Text>
          </Pressable>
        </View>
        <HubFilters
          selectedTown={selectedTown}
          selectedListingType={selectedListingType}
          selectedCategory={selectedCategory}
          selectedDateFilter={selectedDateLabel}
          selectedStartDate={selectedStartDate}
          selectedEndDate={selectedEndDate}
          resultSummary={resultSummary}
          error={error}
          towns={TOWNS}
          listingTypes={LISTING_TYPES}
          categories={CATEGORIES}
          categoryGroups={CATEGORY_GROUPS}
          dateFilters={DATE_FILTERS}
          onSelectTown={handleSelectTownFilter}
          onSelectListingType={handleSelectListingTypeFilter}
          onSelectCategory={handleSelectCategoryFilter}
          onSelectDateFilter={handleSelectDateFilter}
          onSelectDateRange={handleSelectDateRange}
          isNearMeEnabled={isNearMeEnabled}
          isNearMeLoading={nearMeLoading}
          nearMeMessage={nearMeMessage}
          onToggleNearMe={handleToggleNearMe}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={handleClearFilters}
          searchQuery={searchQuery}
          activeSearch={activeSearch}
          searchStatus={searchStatus}
          onChangeSearchQuery={setSearchQuery}
          onApplySearch={handleApplySearch}
          onClearSearch={handleClearSearch}
          onRetry={handleRetryLoad}
        />
      </>
    ),
    [
      activeSearch,
      error,
      handleApplySearch,
      handleClearFilters,
      handleClearSearch,
      handleRetryLoad,
      handleSelectCategoryFilter,
      handleSelectDateFilter,
      handleSelectDateRange,
      handleSelectListingTypeFilter,
      handleSelectTownFilter,
      handleToggleNearMe,
      hasActiveFilters,
      isNearMeEnabled,
      nearMeLoading,
      nearMeMessage,
      resultSummary,
      searchQuery,
      searchStatus,
      selectedCategory,
      selectedDateLabel,
      selectedEndDate,
      selectedStartDate,
      selectedListingType,
      selectedTown,
      setIsBrowseMode,
      theme,
    ]
  );

  const listData = isBrowseMode ? eventsToShow : [];
  const activeListHeader = isBrowseMode ? listHeader : dashboardHeader;

  // Initial loading state for the full browser only. The dashboard has its own
  // section-level loading card so the home screen never starts blank.
  if (isBrowseMode && loading && !refreshing && events.length === 0) {
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
  if (isBrowseMode && error && events.length === 0) {
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
            onPress={handleRetryLoad}
          >
            <Text style={[styles.retryText, { color: theme.accent }]}>
              Try again
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <FlatList
          data={listData}
          keyExtractor={keyExtractor}
          renderItem={renderEvent}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          updateCellsBatchingPeriod={80}
          windowSize={7}
          removeClippedSubviews
          contentContainerStyle={
            listData.length === 0
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
          ListHeaderComponent={activeListHeader}
          ListEmptyComponent={isBrowseMode ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {activeSearch ? "No search results" : "No events found"}
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
                  onPress={() =>
                    navigation.navigate("Community", {
                      resetToHomeAt: Date.now(),
                    })
                  }
                >
                  <Text style={styles.emptyActionText}>Open Community</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
          ListFooterComponent={isBrowseMode ? renderFooter : null}
          onEndReached={isBrowseMode ? handleLoadMore : undefined}
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
  logoHeader: {
    alignItems: "center",
    marginTop: 6,
    marginBottom: 8,
  },
  dashboardLogo: {
    width: 112,
    height: 104,
  },
  dashboardHero: {
    marginBottom: 14,
  },
  dashboardGreeting: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    marginBottom: 4,
  },
  dashboardSubtitle: {
    fontSize: 15,
    lineHeight: 21,
  },
  todayCountCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
  },
  todayCountNumber: {
    fontSize: 38,
    lineHeight: 42,
    fontWeight: "900",
  },
  todayCountTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
    marginTop: 2,
  },
  todayCountBreakdown: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  dashboardNotice: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  dashboardNoticeText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  dashboardSection: {
    marginBottom: 22,
  },
  dashboardSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  dashboardSectionTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "900",
    marginBottom: 10,
  },
  sectionActionText: {
    fontSize: 13,
    fontWeight: "900",
  },
  horizontalSection: {
    gap: 12,
    paddingRight: 8,
  },
  dashboardEventCard: {
    width: 238,
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  compactEventCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  dashboardEventImage: {
    width: "100%",
    height: 112,
  },
  dashboardEventBody: {
    padding: 12,
  },
  dashboardEventTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
    marginBottom: 6,
  },
  dashboardEventMeta: {
    fontSize: 12,
    lineHeight: 17,
  },
  dashboardEventCategory: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
    marginTop: 8,
  },
  emptyDashboardCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  emptyDashboardText: {
    fontSize: 14,
    lineHeight: 20,
  },
  quickChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  quickChip: {
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: "800",
  },
  communityPreviewCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 9,
  },
  communityPreviewTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "900",
    marginBottom: 3,
  },
  communityPreviewMeta: {
    fontSize: 12,
    lineHeight: 17,
  },
  browseAllButton: {
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  browseAllButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },
  browseHeader: {
    paddingTop: 6,
    marginBottom: 12,
  },
  browseTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 10,
  },
  browseLogo: {
    width: 42,
    height: 42,
    flexShrink: 0,
  },
  browseTitleCopy: {
    flex: 1,
    minWidth: 0,
  },
  browseTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "800",
  },
  browseHeaderHint: {
    fontSize: 15,
    lineHeight: 21,
  },
  backHomeButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 42,
  },
  backHomeIcon: {
    marginLeft: -3,
  },
  backHomeText: {
    fontSize: 14,
    fontWeight: "900",
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
  feedSectionHeader: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    marginTop: 4,
  },
  feedSectionTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  feedSectionSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
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
