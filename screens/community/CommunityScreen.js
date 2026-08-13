// screens/community/CommunityScreen.js
// Social community hub centered on finding activity buddies and local connection.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import MemberProfileModal from "../../components/account/MemberProfileModal";
import BuddyPostCard from "../../components/cards/BuddyPostCard";
import EventCard from "../../components/cards/EventCard";
import AppButton from "../../components/common/AppButton";
import GroupedCategoryModal from "../../components/common/GroupedCategoryModal";
import SelectModal from "../../components/common/SelectModal";
import DatePickerModal from "../../components/events/DatePickerModal";
import {
  COMMUNITY_NOTICE_CATEGORIES,
  getCommunityCategoryGroups,
} from "../../constants/eventCategories";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  createBuddyPostReply,
  createBuddyPostReplyResponse,
  deleteBuddyPost,
  deleteBuddyPostReply,
  fetchBuddyPostById,
  fetchBuddyPosts,
  toggleBuddyPostInterest,
  toggleBuddyPostReplyLike,
  updateBuddyPostReply,
} from "../../services/buddyPostsApi";
import { fetchEvents as fetchEventsFromApi } from "../../services/eventsApi";
import { submitReport } from "../../services/reportsApi";
import { colors } from "../../theme/colors";
import { recordConnectEngagementForReviewPrompt } from "../../utils/appReviewPrompt";
import { openReportReasonPicker } from "../../utils/reporting";

const CATEGORY_GROUPS = getCommunityCategoryGroups({
  includeAll: true,
  allLabel: "All Categories",
});
const NOTICE_CATEGORY_GROUPS = [
  { title: "Community Notices & Info", options: ["All Info Types", ...COMMUNITY_NOTICE_CATEGORIES] },
];
const COMMUNITY_SECTIONS = [
  {
    label: "Community Events",
    value: "community-events",
    title: "Community Events",
    subtitle:
      "Local support, free community meals, resident and worker focused events, and programs where visitors are still welcome.",
    emptyTitle: "No community-focused events yet",
    emptyText: "Community-focused events will show here when they are listed.",
    supportsCategory: false,
    supportsDate: true,
    isEventSection: true,
  },
  {
    label: "Make a Plan",
    value: "local-plan",
    title: "Make a Plan",
    subtitle: "Find someone for a hike, coffee, ski day, event, walk, or casual meetup.",
    cta: "Post a Plan",
    emptyTitle: "Start the local plan",
    emptyText:
      "Share a walk, ski day, coffee before a show, trivia table, or event plan.",
    supportsCategory: true,
    supportsDate: true,
  },
  {
    label: "New in Town",
    value: "new-in-town",
    title: "New in Town",
    subtitle: "Meet newcomers, visitors, seasonal workers, and locals open to saying hello.",
    cta: "Post Intro",
    emptyTitle: "Welcome someone in",
    emptyText:
      "Say hello, share where you are based, and mention what kinds of people or plans you are open to.",
    supportsCategory: false,
    supportsDate: false,
  },
  {
    label: "Groups",
    value: "group",
    title: "Groups & Clubs",
    subtitle: "Start or join recurring groups like book club, hiking crews, trivia teams, or art nights.",
    cta: "Start a Group",
    emptyTitle: "Start the first group",
    emptyText:
      "Create a recurring book club, hiking crew, trivia team, art night, or walking group.",
    categoryLabel: "Group focus",
    supportsCategory: true,
    supportsDate: true,
  },
  {
    label: "Jobs and Volunteer Work",
    value: "jobs",
    title: "Jobs and Volunteer Work",
    subtitle: "Browse or share local job ads, seasonal roles, hiring notices, and volunteer opportunities.",
    cta: "Post Job or Volunteer Ad",
    emptyTitle: "No jobs or volunteer ads yet",
    emptyText:
      "Share a local job ad, seasonal role, hiring notice, or volunteer opportunity.",
    supportsCategory: false,
    supportsDate: true,
  },
  {
    label: "Community Notices & Info",
    value: "notice",
    title: "Community Notices & Info",
    subtitle: "Share local programs, courses, organization links, booking info, practical notices, gear swaps, ride shares, lost and found, and helpful community updates.",
    cta: "Share Notice or Info",
    emptyTitle: "No community notices or info yet",
    emptyText:
      "Share a program, course, organization link, booking info, garage sale, gear swap, ride share, lost and found item, free stuff, or practical local notice.",
    categoryLabel: "Notice type",
    categoryAllLabel: "All Info Types",
    categoryGroups: NOTICE_CATEGORY_GROUPS,
    supportsCategory: true,
    supportsDate: true,
  },
];
const TOWN_FILTERS = ["All", "Banff", "Canmore", "Lake Louise"];
const ALL_POSTS_VALUE = "all-posts";
const ALL_POSTS_LABEL = "All postings";
const SECTION_FILTER_OPTIONS = [
  ALL_POSTS_LABEL,
  ...COMMUNITY_SECTIONS.map((section) => section.label),
];
const QUICK_BOARD_FILTERS = [
  { label: "Meet People", communityType: "local-plan" },
  { label: "Lost & Found", communityType: "notice", category: "Lost & Found" },
  { label: "Buy & Sell", communityType: "notice", category: "Gear Sale / Swap" },
  { label: "Local Questions", communityType: "notice", category: "Community Notice" },
  { label: "Clubs & Groups", communityType: "group" },
  { label: "Rides", communityType: "notice", category: "Ride Share" },
];

function getSection(value) {
  if (value === ALL_POSTS_VALUE) {
    return {
      label: ALL_POSTS_LABEL,
      value: ALL_POSTS_VALUE,
      title: "All community postings",
      subtitle:
        "Browse all community posts, or use the filters below to narrow what to browse.",
      emptyTitle: "The community board is quiet right now.",
      emptyText:
        "Find hiking buddies, ask a local question, sell some gear, post something you lost, start a group, or share a useful local notice.",
      supportsCategory: false,
      supportsDate: true,
    };
  }

  return (
    COMMUNITY_SECTIONS.find((section) => section.value === value) ||
    COMMUNITY_SECTIONS[0]
  );
}

function formatDateForApi(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getId(value) {
  if (!value) return "";
  return typeof value === "string" ? value : value._id || value.id || "";
}

export default function CommunityScreen({ navigation, route }) {
  const { token, user, blockUser } = useAuth();
  const { theme } = useTheme();

  const [posts, setPosts] = useState([]);
  const [communityType, setCommunityType] = useState(ALL_POSTS_VALUE);
  const [category, setCategory] = useState("All");
  const [town, setTown] = useState("All");
  const [selectedDate, setSelectedDate] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [sectionPickerVisible, setSectionPickerVisible] = useState(false);
  const [townPickerVisible, setTownPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [communityEvents, setCommunityEvents] = useState([]);
  const [loadingCommunityEvents, setLoadingCommunityEvents] = useState(false);
  const [communityEventsError, setCommunityEventsError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [profileUser, setProfileUser] = useState(null);

  const isCommunityHome = communityType === "home";
  const isAllPosts = communityType === ALL_POSTS_VALUE;
  const activeSection = isCommunityHome ? getSection(ALL_POSTS_VALUE) : getSection(communityType);
  const categoryAllLabel = activeSection.categoryAllLabel || "All Categories";
  const sectionSupportsCategory = Boolean(activeSection.supportsCategory);
  const sectionSupportsDate = Boolean(activeSection.supportsDate);
  const isCommunityEventsSection = Boolean(activeSection.isEventSection);
  const categoryGroups = activeSection.categoryGroups || CATEGORY_GROUPS;
  const activeTownFilter = town === "All" ? "" : town;
  const activeCategoryFilter =
    sectionSupportsCategory && category !== "All" && category !== categoryAllLabel
      ? category
      : "";
  const activeDateFilter =
    sectionSupportsDate && selectedDate ? formatDateForApi(selectedDate) : "";

  useEffect(() => {
    if (!route?.params?.resetToHomeAt) {
      return;
    }

    setCommunityType(ALL_POSTS_VALUE);
    setCategory("All");
    setTown("All");
    setSelectedDate(null);
    setSearchQuery("");
    setActiveSearch("");
    setCommunityEventsError("");
    setError("");
  }, [route?.params?.resetToHomeAt]);

  useEffect(() => {
    const initialSection = route?.params?.initialSection;
    if (!initialSection) {
      return;
    }

    setCommunityType(initialSection);
    setCategory("All");
    setTown("All");
    setSelectedDate(null);
    setSearchQuery("");
    setActiveSearch("");
    setCommunityEventsError("");
    setError("");
  }, [route?.params?.initialSection, route?.params?.openedAt]);

  useEffect(() => {
    const buddyPostId = route?.params?.openBuddyPostId;
    if (!buddyPostId) {
      return;
    }

    let isMounted = true;
    async function loadLinkedPost() {
      try {
        setLoading(true);
        setError("");
        const post = await fetchBuddyPostById(buddyPostId, token);
        if (!isMounted) return;

        setCommunityType(post.communityType || "local-plan");
        setCategory("All");
        setTown("All");
        setSelectedDate(null);
        setSearchQuery("");
        setActiveSearch("");
        setPosts([post]);
        navigation.setParams({ openBuddyPostId: undefined });
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError.message || "Could not load that community post.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadLinkedPost();

    return () => {
      isMounted = false;
    };
  }, [navigation, route?.params?.openBuddyPostId, token]);

  const filters = useMemo(
    () => ({
      category: activeCategoryFilter,
      communityType:
        activeSearch || isAllPosts || isCommunityHome ? "" : communityType,
      town: activeTownFilter,
      date: activeDateFilter,
      search: activeSearch,
      status: "open",
    }),
    [
      activeCategoryFilter,
      communityType,
      isAllPosts,
      isCommunityHome,
      activeTownFilter,
      activeDateFilter,
      activeSearch,
    ]
  );

  useEffect(() => {
    const nextSection = getSection(communityType);

    if (!nextSection.supportsDate && selectedDate) {
      setSelectedDate(null);
    }

    if (!nextSection.supportsCategory && category !== "All") {
      setCategory("All");
      return;
    }

  }, [category, communityType, selectedDate]);

  const loadBuddyPosts = useCallback(async ({ mode = "initial" } = {}) => {
    try {
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");
      const data = await fetchBuddyPosts(filters, token);
      setPosts(data);
    } catch (loadError) {
      setError(loadError.message || "Could not load buddy posts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, token]);

  const loadCommunityEvents = useCallback(async () => {
    try {
      setLoadingCommunityEvents(true);
      setCommunityEventsError("");
      const data = await fetchEventsFromApi({
        communityOnly: true,
        town: activeTownFilter,
        search: activeSearch,
        dateFilter: activeDateFilter,
        limit: 5,
      });
      const events = Array.isArray(data?.events)
        ? data.events
        : Array.isArray(data)
          ? data
          : [];
      setCommunityEvents(events.slice(0, 5));
    } catch (error) {
      setCommunityEventsError(
        error.message || "Could not load community events."
      );
    } finally {
      setLoadingCommunityEvents(false);
    }
  }, [activeDateFilter, activeSearch, activeTownFilter]);

  const handleRefresh = useCallback(() => {
    if (isCommunityHome) {
      return;
    }
    if (isCommunityEventsSection) {
      loadCommunityEvents();
      return;
    }
    loadBuddyPosts({ mode: "refresh" });
  }, [isCommunityEventsSection, isCommunityHome, loadBuddyPosts, loadCommunityEvents]);

  useFocusEffect(
    useCallback(() => {
      if (isCommunityHome) {
        return;
      }
      if (isCommunityEventsSection) {
        loadCommunityEvents();
        return;
      }
      loadBuddyPosts();
    }, [isCommunityEventsSection, isCommunityHome, loadBuddyPosts, loadCommunityEvents])
  );

  const categorySelectLabel = category === "All" ? categoryAllLabel : category;
  const activeFilterLabel =
    category === "All"
      ? activeSection.title.toLowerCase()
      : category;
  const currentUserId = user?._id || user?.id || "";
  const createPostParams = {
    eventBuddy:
      !isAllPosts && !isCommunityHome && communityType
        ? { communityType }
        : undefined,
  };
  const totalMatches = isCommunityEventsSection
    ? communityEvents.length
    : posts.length;
  const searchStatus = activeSearch
    ? loading || loadingCommunityEvents
      ? `Searching for "${activeSearch}"...`
      : totalMatches === 0
        ? `0 results found for "${activeSearch}". Try a broader word or clear search.`
        : `${totalMatches} ${
            isCommunityEventsSection ? "community event" : "community post"
          }${totalMatches === 1 ? "" : "s"} found for "${activeSearch}".`
    : "";

  function handleApplySearch() {
    const trimmedSearch = searchQuery.trim();
    if (!trimmedSearch) {
      setActiveSearch("");
      return;
    }

    setCategory("All");
    setTown("All");
    setSelectedDate(null);
    setActiveSearch(trimmedSearch);
  }

  function handleClearSearch() {
    setSearchQuery("");
    setActiveSearch("");
  }

  function handleChooseSection(nextValue) {
    setCommunityType(nextValue === "home" ? ALL_POSTS_VALUE : nextValue);
    setCategory("All");
    setTown("All");
    setSelectedDate(null);
    setSearchQuery("");
    setActiveSearch("");
    setError("");
    setCommunityEventsError("");
  }

  function handleChooseShortcut(shortcut) {
    setCommunityType(shortcut.communityType || ALL_POSTS_VALUE);
    setCategory(shortcut.category || "All");
    setTown("All");
    setSelectedDate(null);
    setSearchQuery("");
    setActiveSearch("");
    setError("");
    setCommunityEventsError("");
  }

  function promptLogin(message) {
    Alert.alert("Account required", message, [
      { text: "Not now", style: "cancel" },
      { text: "Log In", onPress: () => navigation.navigate("Login") },
      { text: "Create Account", onPress: () => navigation.navigate("Register") },
    ]);
  }

  function handleCreatePost() {
    if (!token) {
      promptLogin(
        "Log in or create an account to post in the community."
      );
      return;
    }

    navigation.navigate("CreateBuddyPost", createPostParams);
  }

  async function handleToggleInterested(post) {
    if (!token) {
      promptLogin("Log in or create an account to show interest.");
      return;
    }

    try {
      await toggleBuddyPostInterest(post._id || post.id, token);
      recordConnectEngagementForReviewPrompt();
      await loadBuddyPosts();
    } catch (error) {
      Alert.alert("Could not update interest", error.message || "Please try again.");
    }
  }

  async function handleSubmitReply(post, text) {
    if (!token) {
      promptLogin("Log in or create an account to reply.");
      return;
    }

    try {
      await createBuddyPostReply(post._id || post.id, text, token);
      recordConnectEngagementForReviewPrompt();
      await loadBuddyPosts();
    } catch (error) {
      Alert.alert("Could not add reply", error.message || "Please try again.");
    }
  }

  async function handleSubmitReplyResponse(post, reply, text) {
    if (!token) {
      promptLogin("Log in or create an account to reply.");
      return;
    }

    try {
      await createBuddyPostReplyResponse(
        post._id || post.id,
        reply._id || reply.id,
        text,
        token
      );
      recordConnectEngagementForReviewPrompt();
      await loadBuddyPosts();
    } catch (error) {
      Alert.alert("Could not add reply", error.message || "Please try again.");
    }
  }

  async function handleToggleReplyLike(post, reply) {
    if (!token) {
      promptLogin("Log in or create an account to like comments.");
      return;
    }

    try {
      await toggleBuddyPostReplyLike(
        post._id || post.id,
        reply._id || reply.id,
        token
      );
      recordConnectEngagementForReviewPrompt();
      await loadBuddyPosts();
    } catch (error) {
      Alert.alert("Could not update like", error.message || "Please try again.");
    }
  }

  async function handleUpdateReply(post, reply, text) {
    if (!token) {
      promptLogin("Log in or create an account to edit replies.");
      return;
    }

    try {
      await updateBuddyPostReply(
        post._id || post.id,
        reply._id || reply.id,
        text,
        token
      );
      await loadBuddyPosts();
    } catch (error) {
      Alert.alert("Could not update reply", error.message || "Please try again.");
    }
  }

  function handleDeleteReply(post, reply) {
    if (!token) {
      promptLogin("Log in or create an account to manage replies.");
      return;
    }

    Alert.alert("Delete reply?", "This will remove your reply from the post.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteBuddyPostReply(
              post._id || post.id,
              reply._id || reply.id,
              token
            );
            await loadBuddyPosts();
          } catch (error) {
            Alert.alert("Could not delete reply", error.message || "Please try again.");
          }
        },
      },
    ]);
  }

  function handleEditBuddyPost(post) {
    if (!token) {
      promptLogin("Log in or create an account to edit your community posts.");
      return;
    }

    navigation.navigate("CreateBuddyPost", {
      eventBuddy: post,
    });
  }

  function handleDeleteBuddyPost(post) {
    if (!token) {
      promptLogin("Log in or create an account to delete your post.");
      return;
    }

    Alert.alert(
      "Delete community post?",
      "This will remove the post and its replies from Community.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteBuddyPost(post._id || post.id, token);
              await loadBuddyPosts();
            } catch (error) {
              Alert.alert(
                "Could not delete post",
                error.message || "Please try again."
              );
            }
          },
        },
      ]
    );
  }

  function handleReport(target) {
    if (!token) {
      promptLogin("Log in or create an account to submit a report.");
      return;
    }

    openReportReasonPicker({
      targetType: target?.targetType,
      onSelect: async (reason) => {
        try {
          await submitReport({ ...target, reason }, token);
          Alert.alert("Report submitted", "Thanks. We will review it.");
        } catch (error) {
          Alert.alert("Could not submit report", error.message || "Please try again.");
        }
      },
    });
  }

  function handleBlockProfile(targetUser) {
    if (!token) {
      promptLogin("Log in or create an account to block users.");
      return;
    }

    const targetUserId = targetUser?._id || targetUser?.id || "";
    if (!targetUserId) return;

    Alert.alert(
      "Block this user?",
      "You will stop seeing their posts and replies. They will not be notified.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              await blockUser(targetUserId);
              setProfileUser(null);
              await loadBuddyPosts();
              Alert.alert("User blocked", "Their posts and replies are now hidden.");
            } catch (error) {
              Alert.alert("Could not block user", error.message || "Please try again.");
            }
          },
        },
      ]
    );
  }

  function handleOpenLinkedEvent(event) {
    const eventId = getId(event);
    if (!eventId) return;

    navigation.navigate("EventDetail", {
      event,
      eventId,
    });
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.accent}
            colors={[theme.accent]}
          />
        }
      >
        <View
          style={[
            styles.boardHeader,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.boardEyebrow, { color: theme.accent }]}>
            Community
          </Text>
          <Text style={[styles.boardTitle, { color: theme.text }]}>
            Bow Valley Community
          </Text>
          <Text style={[styles.boardSubtitle, { color: theme.textMuted }]}>
            Ask. Share. Find. Connect.
          </Text>
          <AppButton
            title="+ Post to the Community"
            onPress={handleCreatePost}
            variant="primary"
            size="md"
            style={styles.boardCtaButton}
          />
        </View>

        <View
          style={[
            styles.promptCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.promptTitle, { color: theme.text }]}>
            What are you looking for?
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.shortcutContent}
          >
            {QUICK_BOARD_FILTERS.map((shortcut) => {
              const selected =
                communityType === shortcut.communityType &&
                (shortcut.category ? category === shortcut.category : category === "All");
              return (
                <Pressable
                  key={shortcut.label}
                  style={({ pressed }) => [
                    styles.quickChip,
                    {
                      backgroundColor: selected
                        ? theme.accentSoft || theme.card
                        : theme.background,
                      borderColor: selected ? theme.accent : theme.border,
                    },
                    pressed && styles.pressed,
                  ]}
                  onPress={() => handleChooseShortcut(shortcut)}
                >
                  <Text
                    style={[
                      styles.quickChipText,
                      { color: selected ? theme.accent : theme.text },
                    ]}
                  >
                    {shortcut.label}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              style={({ pressed }) => [
                styles.quickChip,
                { backgroundColor: theme.background, borderColor: theme.border },
                pressed && styles.pressed,
              ]}
              onPress={() => setSectionPickerVisible(true)}
            >
              <Text style={[styles.quickChipText, { color: theme.text }]}>
                More
              </Text>
            </Pressable>
          </ScrollView>
          <View style={styles.townQuickRow}>
            {TOWN_FILTERS.map((townOption) => {
              const selected = town === townOption;
              return (
                <Pressable
                  key={townOption}
                  style={({ pressed }) => [
                    styles.townQuickChip,
                    {
                      backgroundColor: selected
                        ? theme.accentSoft || theme.card
                        : theme.background,
                      borderColor: selected ? theme.accent : theme.border,
                    },
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setTown(townOption)}
                >
                  <Text
                    style={[
                      styles.townQuickText,
                      { color: selected ? theme.accent : theme.textMuted },
                    ]}
                  >
                    {townOption}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View
          style={[
            styles.searchPanel,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.searchRow}>
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={
                isCommunityEventsSection
                  ? "Search community events"
                  : "Search community posts"
              }
              placeholderTextColor={theme.textMuted}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleApplySearch}
            />
            <Pressable
              style={({ pressed }) => [
                styles.searchButton,
                { backgroundColor: theme.accent },
                pressed && styles.pressed,
              ]}
              onPress={handleApplySearch}
            >
              <Text style={styles.searchButtonText}>Search</Text>
            </Pressable>
          </View>
          {activeSearch ? (
            <View style={styles.activeSearchRow}>
              <Text style={[styles.activeSearchText, { color: theme.textMuted }]}>
                Searching for "{activeSearch}"
              </Text>
              <Pressable onPress={handleClearSearch}>
                <Text style={[styles.clearSearchText, { color: theme.accent }]}>
                  Clear
                </Text>
              </Pressable>
            </View>
          ) : null}
          {searchStatus ? (
            <Text style={[styles.searchStatusText, { color: theme.textMuted }]}>
              {searchStatus}
            </Text>
          ) : null}
        </View>

        <View style={styles.filterChipGroup}>
          <View style={styles.filterChipRow}>
            <Pressable
              style={({ pressed }) => [
                styles.selectorChip,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
                pressed && styles.pressed,
              ]}
              onPress={() => setSectionPickerVisible(true)}
            >
              <View style={styles.selectorContent}>
                <Text style={[styles.selectorChipText, { color: theme.text }]}>
                  {activeSection.label}
                </Text>
                <Text style={[styles.selectorIndicator, { color: theme.accent }]}>
                  +
                </Text>
              </View>
            </Pressable>

            {sectionSupportsCategory ? (
              <Pressable
                style={({ pressed }) => [
                  styles.selectorChip,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                  pressed && styles.pressed,
                ]}
                onPress={() => setCategoryPickerVisible(true)}
              >
                <View style={styles.selectorContent}>
                  <Text style={[styles.selectorChipText, { color: theme.text }]}>
                    {categorySelectLabel}
                  </Text>
                  <Text style={[styles.selectorIndicator, { color: theme.accent }]}>
                    +
                  </Text>
                </View>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.filterChipRow}>
            <Pressable
              style={({ pressed }) => [
                styles.selectorChip,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
                pressed && styles.pressed,
              ]}
              onPress={() => setTownPickerVisible(true)}
            >
              <View style={styles.selectorContent}>
                <Text
                  style={[
                    styles.selectorChipText,
                    { color: town === "All" ? theme.textMuted : theme.text },
                  ]}
                >
                  {town === "All" ? "Town" : town}
                </Text>
                <Text style={[styles.selectorIndicator, { color: theme.accent }]}>
                  +
                </Text>
              </View>
            </Pressable>

            {sectionSupportsDate ? (
              <Pressable
                style={({ pressed }) => [
                  styles.selectorChip,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                  pressed && styles.pressed,
                ]}
                onPress={() => setDatePickerVisible(true)}
              >
                <View style={styles.selectorContent}>
                  <Text
                    style={[
                      styles.selectorChipText,
                      { color: selectedDate ? theme.text : theme.textMuted },
                    ]}
                  >
                    {selectedDate ? formatDisplayDate(selectedDate) : "Date"}
                  </Text>
                  <Text style={[styles.selectorIndicator, { color: theme.accent }]}>
                    +
                  </Text>
                </View>
              </Pressable>
            ) : null}
          </View>
        </View>

        {category !== "All" || town !== "All" || selectedDate || activeSearch ? (
          <Pressable
            style={({ pressed }) => [
              styles.clearFiltersButton,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              setCategory("All");
              setTown("All");
              setSelectedDate(null);
              setSearchQuery("");
              setActiveSearch("");
            }}
          >
            <Text style={[styles.clearFiltersText, { color: theme.accent }]}>
              Clear filters
            </Text>
          </Pressable>
        ) : null}

        {!isCommunityEventsSection && !isAllPosts ? (
          <AppButton
            title={activeSection.cta}
            onPress={handleCreatePost}
            variant="primary"
            size="md"
            style={styles.compactCtaButton}
          />
        ) : null}

        <View style={styles.feedHeaderRow}>
          <Text style={[styles.feedTitle, { color: theme.text }]}>
            {isCommunityEventsSection ? "Community Events" : "Latest Around the Valley"}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryText, { color: theme.textMuted }]}>
            {isCommunityEventsSection
              ? loadingCommunityEvents
                ? "Loading community events..."
                : activeSearch && communityEvents.length === 0
                ? `No community events match "${activeSearch}" yet.`
                : communityEvents.length === 0
                ? "No community-focused events yet."
                : `${communityEvents.length} community-focused event${
                    communityEvents.length === 1 ? "" : "s"
                  }`
              : loading
              ? "Loading community posts..."
              : activeSearch && posts.length === 0
              ? `No community posts match "${activeSearch}" yet.`
              : activeSearch
              ? `${posts.length} matching community post${posts.length === 1 ? "" : "s"}`
              : isAllPosts
              ? posts.length === 0
                ? "No open community posts yet."
                : `${posts.length} open community post${posts.length === 1 ? "" : "s"}`
              : posts.length === 0
              ? `No open ${activeFilterLabel.toLowerCase()} posts yet.`
              : `${posts.length} open ${activeFilterLabel.toLowerCase()} post${
                  posts.length === 1 ? "" : "s"
                }`}
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.refreshButton,
              pressed && styles.pressed,
            ]}
            onPress={() =>
              isCommunityEventsSection ? loadCommunityEvents() : loadBuddyPosts()
            }
          >
            <Text style={[styles.refreshText, { color: theme.accent }]}>
              Refresh
            </Text>
          </Pressable>
        </View>

        {loading || loadingCommunityEvents ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.accent} />
              <Text style={[styles.loadingText, { color: theme.textMuted }]}>
              {isCommunityEventsSection
                ? "Loading community events..."
                : "Loading community posts..."}
            </Text>
          </View>
        ) : null}

        {isCommunityEventsSection && communityEventsError ? (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              Could not load community events
            </Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              {communityEventsError}
            </Text>
            <AppButton
              title="Try Again"
              onPress={loadCommunityEvents}
              variant="outline"
              size="sm"
              style={styles.emptyButton}
            />
          </View>
        ) : null}

        {!isCommunityEventsSection && error ? (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              Could not load community
            </Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              {error}
            </Text>
            <AppButton
              title="Try Again"
              onPress={() => loadBuddyPosts()}
              variant="outline"
              size="sm"
              style={styles.emptyButton}
            />
          </View>
        ) : null}

        {isCommunityEventsSection &&
        !loadingCommunityEvents &&
        !communityEventsError &&
        communityEvents.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {activeSection.emptyTitle}
            </Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              {activeSection.emptyText}
            </Text>
          </View>
        ) : null}

        {!isCommunityEventsSection && !loading && !error && posts.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {activeSearch ? "No search results" : activeSection.emptyTitle}
            </Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              {activeSearch
                ? `No community posts match "${activeSearch}". Try a broader word or clear search.`
                : activeSection.emptyText}
            </Text>
            <AppButton
              title={isAllPosts ? "Create a Post" : activeSection.cta}
              onPress={handleCreatePost}
              variant="primary"
              size="sm"
              style={styles.emptyButton}
            />
          </View>
        ) : null}

        {!isCommunityEventsSection &&
        !loading &&
        !error &&
        !activeSearch &&
        posts.length > 0 &&
        posts.length <= 5 ? (
          <View
            style={[
              styles.lowContentCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.lowContentTitle, { color: theme.text }]}>
              Anything local belongs here.
            </Text>
            <Text style={[styles.lowContentText, { color: theme.textMuted }]}>
              Find people, ask questions, post lost and found, buy or sell gear,
              organize rides, start groups, or share community notices.
            </Text>
          </View>
        ) : null}

        {isCommunityEventsSection &&
        !communityEventsError &&
        communityEvents.length ? (
          <View style={styles.feed}>
            {communityEvents.map((event) => (
              <EventCard
                key={event._id || event.id}
                event={event}
                onPress={() =>
                  navigation.navigate("EventDetail", {
                    event,
                    eventId: event._id || event.id,
                  })
                }
              />
            ))}
          </View>
        ) : null}

        {!isCommunityEventsSection && !error && posts.length ? (
          <View style={styles.feed}>
            {posts.map((post) => (
              <BuddyPostCard
                key={post._id || post.id}
                post={post}
                theme={theme}
                currentUserId={currentUserId}
                onOpenProfile={setProfileUser}
                onOpenEvent={handleOpenLinkedEvent}
                onToggleInterested={handleToggleInterested}
                onSubmitReply={handleSubmitReply}
                onSubmitReplyResponse={handleSubmitReplyResponse}
                onToggleReplyLike={handleToggleReplyLike}
                onUpdateReply={handleUpdateReply}
                onDeleteReply={handleDeleteReply}
                onEditPost={handleEditBuddyPost}
                onDeletePost={handleDeleteBuddyPost}
                onBlockProfile={handleBlockProfile}
                onReport={handleReport}
                onRequireAccount={promptLogin}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <MemberProfileModal
        visible={!!profileUser}
        user={profileUser}
        theme={theme}
        onClose={() => setProfileUser(null)}
        onReport={handleReport}
        onBlock={handleBlockProfile}
        currentUserId={currentUserId}
        blockedUserIds={user?.blockedUsers || []}
      />

      <DatePickerModal
        visible={datePickerVisible}
        initialDate={selectedDate || new Date()}
        title="Filter by date"
        onCancel={() => setDatePickerVisible(false)}
        onConfirm={(date) => {
          setSelectedDate(date);
          setDatePickerVisible(false);
        }}
      />

      <GroupedCategoryModal
        visible={categoryPickerVisible}
        title={`Filter by ${activeSection.categoryLabel || "category"}`}
        groups={categoryGroups}
        selectedValue={category}
        onSelect={(nextCategory) => {
          setCategory(nextCategory === categoryAllLabel ? "All" : nextCategory);
          setCategoryPickerVisible(false);
        }}
        onClose={() => setCategoryPickerVisible(false)}
      />

      <SelectModal
        visible={sectionPickerVisible}
        title="Choose what to browse"
        options={SECTION_FILTER_OPTIONS}
        selectedValue={activeSection.label}
        onSelect={(nextLabel) => {
          if (nextLabel === ALL_POSTS_LABEL) {
            handleChooseSection(ALL_POSTS_VALUE);
            setSectionPickerVisible(false);
            return;
          }
          const nextSection = COMMUNITY_SECTIONS.find(
            (section) => section.label === nextLabel
          );
          if (nextSection) {
            handleChooseSection(nextSection.value);
          }
          setSectionPickerVisible(false);
        }}
        onClose={() => setSectionPickerVisible(false)}
      />

      <SelectModal
        visible={townPickerVisible}
        title="Filter by town"
        options={TOWN_FILTERS}
        selectedValue={town}
        onSelect={(nextTown) => {
          setTown(nextTown);
          setTownPickerVisible(false);
        }}
        onClose={() => setTownPickerVisible(false)}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  boardHeader: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
  },
  boardEyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 5,
  },
  boardTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
  },
  boardSubtitle: {
    fontSize: 16,
    lineHeight: 22,
    marginTop: 4,
  },
  boardCtaButton: {
    borderRadius: 8,
    marginTop: 14,
  },
  promptCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  promptTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900",
    marginBottom: 10,
  },
  shortcutContent: {
    gap: 8,
    paddingRight: 8,
  },
  quickChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
    minHeight: 40,
    justifyContent: "center",
  },
  quickChipText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900",
  },
  townQuickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  townQuickChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 38,
    justifyContent: "center",
  },
  townQuickText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "800",
  },
  compactCtaButton: {
    borderRadius: 8,
    marginBottom: 12,
  },
  allOptionsButton: {
    alignSelf: "flex-start",
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  allOptionsText: {
    fontSize: 14,
    fontWeight: "900",
  },
  searchPanel: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 44,
  },
  searchButton: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  activeSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 10,
  },
  activeSearchText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  clearSearchText: {
    fontSize: 14,
    fontWeight: "900",
  },
  searchStatusText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  filterChipGroup: {
    gap: 8,
    marginBottom: 8,
  },
  filterChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectorChip: {
    flex: 1,
    minWidth: "46%",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
    maxWidth: "100%",
  },
  selectorContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  selectorChipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
  },
  selectorIndicator: {
    fontSize: 18,
    lineHeight: 18,
    fontWeight: "900",
  },
  clearFiltersButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 8,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: "800",
  },
  feedHeaderRow: {
    marginTop: 6,
    marginBottom: 4,
  },
  feedTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  summaryText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    marginRight: 12,
  },
  refreshText: {
    fontSize: 14,
    fontWeight: "800",
  },
  refreshButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }, { translateY: 1 }],
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 14,
    borderRadius: 8,
  },
  lowContentCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  lowContentTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900",
    marginBottom: 5,
  },
  lowContentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  feed: {
    gap: 12,
  },
});
