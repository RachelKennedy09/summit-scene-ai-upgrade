// screens/community/CommunityScreen.js
// Social community hub centered on finding activity buddies and local connection.

import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppLogoHeader from "../../components/AppLogoHeader";
import MemberProfileModal from "../../components/account/MemberProfileModal";
import BuddyPostCard from "../../components/cards/BuddyPostCard";
import AppButton from "../../components/common/AppButton";
import GroupedCategoryModal from "../../components/common/GroupedCategoryModal";
import PageHeader from "../../components/common/PageHeader";
import DatePickerModal from "../../components/events/DatePickerModal";
import { getEventCategoryGroups } from "../../constants/eventCategories";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  createBuddyPostReply,
  deleteBuddyPostReply,
  fetchBuddyPosts,
  toggleBuddyPostInterest,
  updateBuddyPostReply,
} from "../../services/buddyPostsApi";
import { submitReport } from "../../services/reportsApi";
import { colors } from "../../theme/colors";
import { openReportReasonPicker } from "../../utils/reporting";

const CATEGORY_GROUPS = getEventCategoryGroups({
  includeAll: true,
  allLabel: "All categories",
});
const COMMUNITY_SECTIONS = [
  {
    label: "All",
    value: "",
    title: "All Community",
    subtitle: "Browse local plans, newcomer intros, groups, and useful updates together.",
    cta: "Create Post",
    emptyTitle: "No community posts yet",
    emptyText:
      "Start with a local plan, intro, group, or practical community update.",
  },
  {
    label: "Local Plans",
    value: "local-plan",
    title: "Local Plans",
    subtitle: "Anyone going to this event? Coffee before open mic? Sunday walk?",
    cta: "Create Local Plan",
    emptyTitle: "Start the local plan",
    emptyText:
      "Share a walk, ski day, coffee before a show, trivia table, or event plan.",
  },
  {
    label: "New in Town",
    value: "new-in-town",
    title: "New in Town",
    subtitle: "Seasonal workers, visitors, newcomers, and locals open to meeting people.",
    cta: "Introduce Yourself",
    emptyTitle: "Welcome someone in",
    emptyText:
      "Post where you are based, what you like doing, and who you would like to meet.",
  },
  {
    label: "Groups",
    value: "group",
    title: "Groups",
    subtitle: "Repeatable interest groups like book club, hiking, trivia, and art nights.",
    cta: "Start a Group",
    emptyTitle: "Start the first group",
    emptyText:
      "Create a recurring book club, hiking crew, trivia team, art night, or walking group.",
  },
  {
    label: "Updates",
    value: "update",
    title: "Community Updates",
    subtitle: "Useful local notices, volunteer callouts, safety notes, and town updates.",
    cta: "Share Update",
    emptyTitle: "No updates yet",
    emptyText:
      "Keep updates practical: volunteer needs, local notices, safety notes, or helpful heads-up posts.",
  },
];
const TOWN_FILTERS = ["All", "Banff", "Canmore", "Lake Louise"];

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

function FilterPill({ label, active, onPress, theme }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterPill,
        {
          backgroundColor: active ? theme.accentSoft || colors.accentSoft : theme.card,
          borderColor: active ? theme.accent : theme.border,
        },
      ]}
    >
      <Text
        style={[
          styles.filterText,
          {
            color: active ? theme.text : theme.textMuted,
            fontWeight: active ? "800" : "600",
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function getId(value) {
  if (!value) return "";
  return typeof value === "string" ? value : value._id || value.id || "";
}

export default function CommunityScreen({ navigation }) {
  const { token, user, blockUser } = useAuth();
  const { theme } = useTheme();

  const [posts, setPosts] = useState([]);
  const [communityType, setCommunityType] = useState("");
  const [category, setCategory] = useState("All");
  const [town, setTown] = useState("All");
  const [language, setLanguage] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profileUser, setProfileUser] = useState(null);

  const activeTownFilter = town === "All" ? "" : town;
  const activeCategoryFilter = category === "All" ? "" : category;

  const filters = useMemo(
    () => ({
      category: activeCategoryFilter,
      communityType,
      town: activeTownFilter,
      language: language.trim(),
      date: selectedDate ? formatDateForApi(selectedDate) : "",
      status: "open",
    }),
    [activeCategoryFilter, communityType, activeTownFilter, language, selectedDate]
  );

  const loadBuddyPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchBuddyPosts(filters, token);
      setPosts(data);
    } catch (loadError) {
      setError(loadError.message || "Could not load buddy posts.");
    } finally {
      setLoading(false);
    }
  }, [filters, token]);

  useFocusEffect(
    useCallback(() => {
      loadBuddyPosts();
    }, [loadBuddyPosts])
  );

  const categorySelectLabel = category === "All" ? "All categories" : category;
  const activeSection =
    COMMUNITY_SECTIONS.find((section) => section.value === communityType) ||
    COMMUNITY_SECTIONS[0];
  const activeFilterLabel =
    category === "All"
      ? communityType
        ? activeSection.title.toLowerCase()
        : "community"
      : category;
  const currentUserId = user?._id || user?.id || "";
  const createPostParams = {
    eventBuddy: communityType ? { communityType } : undefined,
  };

  async function handleToggleInterested(post) {
    if (!token) {
      Alert.alert("Login required", "Please log in to show interest.");
      return;
    }

    try {
      await toggleBuddyPostInterest(post._id || post.id, token);
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
      await loadBuddyPosts();
    } catch (error) {
      Alert.alert("Could not add reply", error.message || "Please try again.");
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
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <AppLogoHeader />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader
          title="Find People"
          subtitle="Meet people for events, hikes, groups, and local plans."
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sectionTabs}
        >
          {COMMUNITY_SECTIONS.map((section) => (
            <FilterPill
              key={section.value}
              label={section.label}
              active={communityType === section.value}
              onPress={() => setCommunityType(section.value)}
              theme={theme}
            />
          ))}
        </ScrollView>

        <View
          style={[
            styles.ctaPanel,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.ctaTitle, { color: theme.text }]}>
            {communityType ? activeSection.title : "Find someone to go with"}
          </Text>
          <Text style={[styles.ctaText, { color: theme.textMuted }]}>
            {communityType
              ? activeSection.subtitle
              : "Browse local plans, newcomer intros, groups, and useful updates."}
          </Text>
          <AppButton
            title={activeSection.cta}
            onPress={() => navigation.navigate("CreateBuddyPost", createPostParams)}
            variant="primary"
            size="md"
            style={styles.ctaButton}
          />
        </View>

        <View
          style={[
            styles.safetyTip,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.safetyTipText, { color: theme.textMuted }]}>
            Safety tip: meet new people thoughtfully. Choose public places,
            check profiles, and use report or block if needed.
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { color: theme.text }]}>
          Filter by category
        </Text>
        <Pressable
          style={[
            styles.categorySelect,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
          onPress={() => setCategoryPickerVisible(true)}
        >
          <Text style={[styles.categorySelectText, { color: theme.text }]}>
            {categorySelectLabel}
          </Text>
        </Pressable>

        <Text style={[styles.sectionLabel, { color: theme.text }]}>
          Town
        </Text>
        <View style={styles.townFilters}>
          {TOWN_FILTERS.map((option) => (
            <FilterPill
              key={option}
              label={option}
              active={town === option}
              onPress={() => setTown(option)}
              theme={theme}
            />
          ))}
        </View>

        <View
          style={[
            styles.advancedFilters,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.sectionLabel, { color: theme.text }]}>
            More filters
          </Text>

          <Text style={[styles.inlineLabel, { color: theme.textMuted }]}>
            Language
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder="English, French, Spanish..."
            placeholderTextColor={theme.textMuted}
            value={language}
            onChangeText={setLanguage}
            autoCapitalize="words"
          />

          <Text style={[styles.inlineLabel, { color: theme.textMuted }]}>
            Date
          </Text>
          <View style={styles.dateFilterRow}>
            <Pressable
              style={[
                styles.dateButton,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => setDatePickerVisible(true)}
            >
              <Text style={[styles.dateButtonText, { color: theme.text }]}>
                {selectedDate ? formatDisplayDate(selectedDate) : "Any date"}
              </Text>
            </Pressable>
            {selectedDate || language.trim() ? (
              <Pressable
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSelectedDate(null);
                  setLanguage("");
                }}
              >
                <Text style={[styles.clearFiltersText, { color: theme.accent }]}>
                  Clear
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryText, { color: theme.textMuted }]}>
            {loading
              ? "Loading community posts..."
              : posts.length === 0
              ? `No open ${activeFilterLabel.toLowerCase()} posts yet.`
              : `${posts.length} open ${activeFilterLabel.toLowerCase()} post${
                  posts.length === 1 ? "" : "s"
                }`}
          </Text>
          <Pressable onPress={loadBuddyPosts}>
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
              onPress={loadBuddyPosts}
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
              {activeSection.emptyTitle}
            </Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              {activeSection.emptyText}
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
                onUpdateReply={handleUpdateReply}
                onDeleteReply={handleDeleteReply}
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
        title="Filter by category"
        groups={CATEGORY_GROUPS}
        selectedValue={category}
        onSelect={(nextCategory) => {
          setCategory(nextCategory);
          setCategoryPickerVisible(false);
        }}
        onClose={() => setCategoryPickerVisible(false)}
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
  ctaPanel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  ctaText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  ctaButton: {
    borderRadius: 8,
  },
  safetyTip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  safetyTipText: {
    fontSize: 12,
    lineHeight: 17,
  },
  sectionTabs: {
    gap: 8,
    paddingRight: 16,
    paddingBottom: 14,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 8,
  },
  categorySelect: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 14,
  },
  categorySelectText: {
    fontSize: 15,
    fontWeight: "700",
  },
  townFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  advancedFilters: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  inlineLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  dateFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  clearFiltersButton: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  clearFiltersText: {
    fontSize: 13,
    fontWeight: "800",
  },
  filterPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterText: {
    fontSize: 13,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  summaryText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    marginRight: 12,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: "800",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 13,
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
