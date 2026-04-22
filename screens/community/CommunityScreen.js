// screens/community/CommunityScreen.js
// Community hub with 3 boards: Highway, Ride Share, and Event Buddy.
// Shows posts, likes, replies, and member profile modal.

import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";

import {
  fetchCommunityPosts,
  deleteCommunityPost,
  createCommunityReply,
  toggleCommunityLike,
} from "../../services/communityApi";

import MemberProfileModal from "../../components/account/MemberProfileModal";

import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppLogoHeader from "../../components/AppLogoHeader";
import { useAuth } from "../../context/AuthContext";
import { colors } from "../../theme/colors";
import { useTheme } from "../../context/ThemeContext";
import CommunityPostCard from "../../components/cards/CommunityPostCard";

// Board types are defined here once and reused
// so both frontend and backend stay in sync via these values.
const POST_TYPES = [
  { label: "Highway Conditions", value: "highwayconditions" },
  { label: "Ride Share", value: "rideshare" },
  { label: "Event Buddy", value: "eventbuddy" },
];

export default function CommunityScreen({ navigation }) {
  // Which board is currently active (default Event Buddy)
  const [selectedType, setSelectedType] = useState("eventbuddy");

  // Posts from API (all types, filtered client-side)
  const [posts, setPosts] = useState([]);

  // Error and loading states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reply states (only one reply composer open at a time)
  const [replyForPostId, setReplyForPostId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // Profile modal
  const [profileUser, setProfileUser] = useState(null);

  // Logged in user object + JWT for protected requests
  const { user, token } = useAuth();

  // Current theme object (light / dark / feminine / masculine / rainbow)
  const { theme } = useTheme();

  // useMemo prevents re-filtering on every render
  // when only unrelated state changes (e.g. typing a reply).
  const filteredPosts = useMemo(
    () => posts.filter((post) => post.type === selectedType),
    [posts, selectedType]
  );

  // Load posts for the currently selected board
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchCommunityPosts(selectedType, token);
      setPosts(data);
    } catch (error) {
      console.error("Error fetching community posts:", error);
      setError(error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [selectedType, token]);

  // useFocusEffect ensures posts are refreshed
  // whenever the user comes back to the Community tab.
  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [fetchPosts])
  );

  // Delete post handler
  const handleDeletePost = (postId) => {
    Alert.alert("Delete post?", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCommunityPost(postId, token);
            fetchPosts();
          } catch (error) {
            console.error("Error deleting community post:", error);
            Alert.alert("Error", error.message || "Failed to delete post.");
          }
        },
      },
    ]);
  };

  // Reply submit handler
  async function handleReplySubmit(postId) {
    if (!replyText.trim()) {
      Alert.alert("Reply required", "Please write something before sending.");
      return;
    }

    if (!token) {
      Alert.alert("Login required", "Please log in to reply to posts.");
      return;
    }

    try {
      setSubmittingReply(true);

      await createCommunityReply(postId, replyText, token);

      setReplyText("");
      setReplyForPostId(null);
      fetchPosts();
    } catch (error) {
      console.error("Error sending reply:", error);
      Alert.alert("Error", error.message || "Failed to send reply.");
    } finally {
      setSubmittingReply(false);
    }
  }

  // Like toggle handler
  async function handleToggleLike(postId) {
    if (!token) {
      Alert.alert("Login required", "Please log in to like posts.");
      return;
    }

    try {
      await toggleCommunityLike(postId, token);
      fetchPosts();
    } catch (error) {
      console.error("Error toggling like:", error);
      Alert.alert("Error", error.message || "Failed to update like.");
    }
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
       <AppLogoHeader />
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heading, { color: theme.textMain }]}>
            Community
          </Text>
          <Text style={[styles.subheading, { color: theme.textMuted }]}>
            A space for locals to share road conditions, rides, and event
            buddies.
          </Text>
        </View>
        <Pressable
          style={[styles.newPostButton, { backgroundColor: theme.accent }]}
          onPress={() => navigation.navigate("CommunityPost")}
        >
          <Text style={styles.newPostButtonText}>New Post</Text>
        </Pressable>
      </View>

      {/* Board selector pills */}
      <View style={styles.typeRow}>
        {POST_TYPES.map((type) => {
          const isActive = type.value === selectedType;
          return (
            <Pressable
              key={type.value}
              onPress={() => setSelectedType(type.value)}
              style={[
                styles.typePill,
                {
                  backgroundColor: theme.pill || theme.background,
                  borderColor: theme.border,
                },
                isActive && {
                  backgroundColor: theme.card,
                  borderColor: theme.accent,
                },
              ]}
            >
              <Text
                style={[
                  styles.typePillText,
                  { color: theme.textMuted },
                  isActive && {
                    color: theme.textMain,
                    fontWeight: "600",
                  },
                ]}
              >
                {type.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Result summary */}
      <Text style={[styles.summaryText, { color: theme.textMuted }]}>
        {loading
          ? "Loading posts..."
          : filteredPosts.length === 0
          ? "No posts here yet. Be the first to share something."
          : `Showing ${filteredPosts.length} post${
              filteredPosts.length > 1 ? "s" : ""
            } in this board.`}
      </Text>

      {/* Posts list */}
      <ScrollView
        contentContainerStyle={styles.sectionsContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.textMuted }]}>
              Loading posts...
            </Text>
          </View>
        )}

        {error && (
          <View
            style={[
              styles.emptyState,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: theme.textMain }]}>
              Error Loading Posts
            </Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              {error}
            </Text>
            <Pressable
              onPress={fetchPosts}
              style={[
                styles.typePill,
                {
                  padding: 10,
                  marginTop: 10,
                  backgroundColor: theme.accent,
                  borderColor: theme.accent,
                },
              ]}
            >
              <Text style={{ color: colors.textLight }}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {/* Main posts list */}
        {!loading &&
          !error &&
          filteredPosts.map((post) => {
            const postId = post._id ?? post.id;
            const isReplyOpen = replyForPostId === postId;

            return (
              <CommunityPostCard
                key={postId}
                post={post}
                user={user}
                theme={theme}
                isReplyOpen={isReplyOpen}
                replyText={replyText}
                submittingReply={submittingReply}
                onToggleReply={() => {
                  if (isReplyOpen) {
                    setReplyForPostId(null);
                    setReplyText("");
                  } else {
                    setReplyForPostId(postId);
                    setReplyText("");
                  }
                }}
                onChangeReplyText={setReplyText}
                onSubmitReply={() => handleReplySubmit(postId)}
                onDelete={() => handleDeletePost(postId)}
                onEdit={() =>
                  navigation.navigate("EditCommunityPost", { post })
                }
                onToggleLike={() => handleToggleLike(postId)}
                onOpenProfile={(profileData) => setProfileUser(profileData)}
              />
            );
          })}

        {/* Empty state per board */}
        {!loading && !error && filteredPosts.length === 0 && (
          <View
            style={[
              styles.emptyState,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: theme.textMain }]}>
              No posts yet
            </Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              Be the first to share something in this board.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Member profile modal (shared with Community + replies) */}
      <MemberProfileModal
        visible={!!profileUser}
        user={profileUser}
        theme={theme}
        onClose={() => setProfileUser(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textLight,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  newPostButton: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  newPostButtonText: {
    color: colors.textLight,
    fontSize: 12,
    fontWeight: "600",
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primary,
  },
  typePillText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  summaryText: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 8,
  },
  sectionsContainer: {
    paddingBottom: 32,
    gap: 16,
  },
  emptyState: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textLight,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  loadingText: {
    color: colors.textLight,
    fontSize: 13,
  },
});
