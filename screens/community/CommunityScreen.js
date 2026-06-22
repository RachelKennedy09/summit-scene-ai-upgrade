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
import AppButton from "../../components/common/AppButton";
import GroupedCategoryModal from "../../components/common/GroupedCategoryModal";
import SelectModal from "../../components/common/SelectModal";
import PageHeader from "../../components/common/PageHeader";
import DatePickerModal from "../../components/events/DatePickerModal";
import {
  COMMUNITY_NOTICE_CATEGORIES,
  getCommunityCategoryGroups,
} from "../../constants/eventCategories";
import { LANGUAGE_OPTIONS } from "../../constants/languages";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  createBuddyPostReply,
  createBuddyPostReplyResponse,
  deleteBuddyPostReply,
  fetchBuddyPosts,
  toggleBuddyPostInterest,
  toggleBuddyPostReplyLike,
  updateBuddyPostReply,
} from "../../services/buddyPostsApi";
import { submitReport } from "../../services/reportsApi";
import { colors } from "../../theme/colors";
import { recordConnectEngagementForReviewPrompt } from "../../utils/appReviewPrompt";
import { openReportReasonPicker } from "../../utils/reporting";

const CATEGORY_GROUPS = getCommunityCategoryGroups({
  includeAll: true,
  allLabel: "All Categories",
});
const NOTICE_CATEGORY_GROUPS = [
  { title: "Local Notices", options: ["All Notice Types", ...COMMUNITY_NOTICE_CATEGORIES] },
];
const COMMUNITY_SECTIONS = [
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
    label: "Jobs and Volunteer",
    value: "jobs",
    title: "Jobs and Volunteer",
    subtitle: "Browse or share local job ads, seasonal roles, hiring notices, and volunteer opportunities.",
    cta: "Post Job or Volunteer Ad",
    emptyTitle: "No jobs or volunteer ads yet",
    emptyText:
      "Share a local job ad, seasonal role, hiring notice, or volunteer opportunity.",
    supportsCategory: false,
    supportsDate: true,
  },
  {
    label: "Town Notices",
    value: "notice",
    title: "Town Notices",
    subtitle: "Share garage sales, gear swaps, ride shares, road blocks, free stuff, lost and found, or practical town notices.",
    cta: "Share Notice",
    emptyTitle: "No town notices yet",
    emptyText:
      "Share a garage sale, gear swap, ride share, lost and found item, free stuff, or practical local notice.",
    categoryLabel: "Notice type",
    categoryAllLabel: "All Notice Types",
    categoryGroups: NOTICE_CATEGORY_GROUPS,
    supportsCategory: true,
    supportsDate: true,
  },
];
const TOWN_FILTERS = ["All", "Banff", "Canmore", "Lake Louise"];
const SECTION_FILTER_OPTIONS = COMMUNITY_SECTIONS.map((section) => section.label);

function getSection(value) {
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

export default function CommunityScreen({ navigation }) {
  const { token, user, blockUser } = useAuth();
  const { theme } = useTheme();

  const [posts, setPosts] = useState([]);
  const [communityType, setCommunityType] = useState(COMMUNITY_SECTIONS[0].value);
  const [category, setCategory] = useState("All");
  const [town, setTown] = useState("All");
  const [language, setLanguage] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [sectionPickerVisible, setSectionPickerVisible] = useState(false);
  const [townPickerVisible, setTownPickerVisible] = useState(false);
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [profileUser, setProfileUser] = useState(null);

  const activeSection = getSection(communityType);
  const categoryAllLabel = activeSection.categoryAllLabel || "All Categories";
  const sectionSupportsCategory = Boolean(activeSection.supportsCategory);
  const sectionSupportsDate = Boolean(activeSection.supportsDate);
  const categoryGroups = activeSection.categoryGroups || CATEGORY_GROUPS;
  const activeTownFilter = town === "All" ? "" : town;
  const activeCategoryFilter =
    sectionSupportsCategory && category !== "All" && category !== categoryAllLabel
      ? category
      : "";
  const activeDateFilter =
    sectionSupportsDate && selectedDate ? formatDateForApi(selectedDate) : "";

  const filters = useMemo(
    () => ({
      category: activeCategoryFilter,
      communityType: activeSearch ? "" : communityType,
      town: activeTownFilter,
      language,
      date: activeDateFilter,
      search: activeSearch,
      status: "open",
    }),
    [
      activeCategoryFilter,
      communityType,
      activeTownFilter,
      language,
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

  const handleRefresh = useCallback(() => {
    loadBuddyPosts({ mode: "refresh" });
  }, [loadBuddyPosts]);

  useFocusEffect(
    useCallback(() => {
      loadBuddyPosts();
    }, [loadBuddyPosts])
  );

  const categorySelectLabel = category === "All" ? categoryAllLabel : category;
  const activeFilterLabel =
    category === "All"
      ? activeSection.title.toLowerCase()
      : category;
  const currentUserId = user?._id || user?.id || "";
  const createPostParams = {
    eventBuddy: communityType ? { communityType } : undefined,
  };
  const totalMatches = posts.length;
  const searchStatus = activeSearch
    ? loading
      ? `Searching for "${activeSearch}"...`
      : totalMatches === 0
        ? `0 results found for "${activeSearch}". Try a broader word or clear search.`
        : `${totalMatches} Connect post${totalMatches === 1 ? "" : "s"} found for "${activeSearch}".`
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
    setLanguage("");
    setActiveSearch(trimmedSearch);
  }

  function handleClearSearch() {
    setSearchQuery("");
    setActiveSearch("");
  }

  async function handleToggleInterested(post) {
    if (!token) {
      Alert.alert("Login required", "Please log in to show interest.");
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
      Alert.alert("Login required", "Please log in to reply.");
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
      Alert.alert("Login required", "Please log in to reply.");
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
      Alert.alert("Login required", "Please log in to like comments.");
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
      Alert.alert("Login required", "Please log in to edit your reply.");
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
      Alert.alert("Login required", "Please log in to delete your reply.");
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

  function handleReport(target) {
    if (!token) {
      Alert.alert("Login required", "Please log in to submit a report.");
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
        <PageHeader
          title="Connect with the community"
          subtitle="Make plans, meet people, join groups, browse jobs and volunteer, or check town notices."
        />

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
              placeholder="Search Connect posts"
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

            <Pressable
              style={({ pressed }) => [
                styles.selectorChip,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
                pressed && styles.pressed,
              ]}
              onPress={() => setLanguagePickerVisible(true)}
            >
              <View style={styles.selectorContent}>
                <Text
                  style={[
                    styles.selectorChipText,
                    { color: language ? theme.text : theme.textMuted },
                  ]}
                >
                  {language || "Language"}
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

        {category !== "All" || town !== "All" || language || selectedDate || activeSearch ? (
          <Pressable
            style={({ pressed }) => [
              styles.clearFiltersButton,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              setCategory("All");
              setTown("All");
              setSelectedDate(null);
              setLanguage("");
              setSearchQuery("");
              setActiveSearch("");
            }}
          >
            <Text style={[styles.clearFiltersText, { color: theme.accent }]}>
              Clear filters
            </Text>
          </Pressable>
        ) : null}

        <AppButton
          title={activeSection.cta}
          onPress={() => navigation.navigate("CreateBuddyPost", createPostParams)}
          variant="primary"
          size="md"
          style={styles.compactCtaButton}
        />

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryText, { color: theme.textMuted }]}>
            {loading
              ? "Loading community posts..."
              : activeSearch && posts.length === 0
              ? `No Connect posts match "${activeSearch}" yet.`
              : activeSearch
              ? `${posts.length} matching Connect post${posts.length === 1 ? "" : "s"}`
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
            onPress={() => loadBuddyPosts()}
          >
            <Text style={[styles.refreshText, { color: theme.accent }]}>
              Refresh
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.accent} />
              <Text style={[styles.loadingText, { color: theme.textMuted }]}>
              Loading community posts...
            </Text>
          </View>
        ) : null}

        {error ? (
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

        {!loading && !error && posts.length === 0 ? (
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
                ? `No Connect posts match "${activeSearch}". Try a broader word or clear search.`
                : activeSection.emptyText}
            </Text>
            <AppButton
              title={activeSection.cta}
              onPress={() => navigation.navigate("CreateBuddyPost", createPostParams)}
              variant="primary"
              size="sm"
              style={styles.emptyButton}
            />
          </View>
        ) : null}

        {!error && posts.length ? (
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
                onBlockProfile={handleBlockProfile}
                onReport={handleReport}
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
          const nextSection = COMMUNITY_SECTIONS.find(
            (section) => section.label === nextLabel
          );
          if (nextSection) {
            setCommunityType(nextSection.value);
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

      <SelectModal
        visible={languagePickerVisible}
        title="Filter by language"
        options={LANGUAGE_OPTIONS}
        selectedValue={language || "Any language"}
        onSelect={(nextLanguage) => {
          setLanguage(nextLanguage === "Any language" ? "" : nextLanguage);
          setLanguagePickerVisible(false);
        }}
        onClose={() => setLanguagePickerVisible(false)}
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
  compactCtaButton: {
    borderRadius: 8,
    marginBottom: 12,
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
    flexShrink: 1,
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
    gap: 8,
  },
  selectorChipText: {
    flexShrink: 1,
    fontSize: 14,
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
  feed: {
    gap: 12,
  },
});
