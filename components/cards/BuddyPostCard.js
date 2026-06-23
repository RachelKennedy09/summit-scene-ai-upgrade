import React, { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AVATARS } from "../../assets/avatars/avatarConfig";
import TrustBadgeRow from "../common/TrustBadges";
import { colors } from "../../theme/colors";
import { getVisibleTags } from "../../utils/categoryVisuals";

const PROFILE_TOWN_OPTIONS = ["Banff", "Canmore", "Lake Louise"];

function titleCase(value) {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getProfileTownLabel(profile) {
  const towns = Array.isArray(profile?.towns) ? profile.towns : [];
  if (towns.length) return towns.join(", ");
  if (profile?.town === "All") return PROFILE_TOWN_OPTIONS.join(", ");
  return profile?.town || "";
}

function getAuthor(post) {
  const user = post?.createdBy && typeof post.createdBy === "object"
    ? post.createdBy
    : {};

  return {
    _id: user._id || user.id || "",
    id: user._id || user.id || "",
    name: user.name || "Summit Scene member",
    role: user.role || "local",
    avatarKey: user.avatarKey,
    profileImageUrl: user.profileImageUrl || "",
    town: user.town,
    towns: user.towns || [],
    userType: user.userType,
    originallyFrom: user.originallyFrom || "",
    interests: user.interests || [],
    businessVibeTags: user.businessVibeTags || [],
    skillLevel: user.skillLevel || {},
    socialAccounts: user.socialAccounts || [],
    bio: user.bio || "",
    instagram: user.instagram || "",
    facebook: user.facebook || "",
    website: user.website || "",
    googleBusinessUrl: user.googleBusinessUrl || "",
    phone: user.phone || "",
  };
}

function getUserProfile(user, fallbackName = "Member") {
  if (!user || typeof user !== "object") {
    return {
      name: fallbackName,
      role: "local",
      interests: [],
      businessVibeTags: [],
      skillLevel: {},
      socialAccounts: [],
    };
  }

  return {
    _id: user._id || user.id || "",
    id: user._id || user.id || "",
    name: user.name || fallbackName,
    role: user.role || "local",
    avatarKey: user.avatarKey,
    profileImageUrl: user.profileImageUrl || "",
    town: user.town,
    towns: user.towns || [],
    userType: user.userType,
    originallyFrom: user.originallyFrom || "",
    interests: user.interests || [],
    businessVibeTags: user.businessVibeTags || [],
    skillLevel: user.skillLevel || {},
    socialAccounts: user.socialAccounts || [],
    bio: user.bio || "",
    instagram: user.instagram || "",
    facebook: user.facebook || "",
    website: user.website || "",
    googleBusinessUrl: user.googleBusinessUrl || "",
    phone: user.phone || "",
  };
}

function formatDate(value) {
  if (!value) return "";
  const [year, month, day] = String(value).split("-").map(Number);
  const date = year && month && day ? new Date(year, month - 1, day) : new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getLocalDate(value) {
  if (!value) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  const date = year && month && day ? new Date(year, month - 1, day) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatSmartDateTime(dateValue, timeValue) {
  const date = getLocalDate(dateValue);
  const time = timeValue ? ` at ${timeValue}` : "";

  if (!date) return timeValue || "";

  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diffDays = Math.round((target - today) / 86400000);

  let label = "";
  if (diffDays === 0) {
    label = timeValue ? "Tonight" : "Today";
  } else if (diffDays === 1) {
    label = "Tomorrow";
  } else if (diffDays > 1 && diffDays < 7) {
    label = date.toLocaleDateString(undefined, { weekday: "long" });
  } else {
    label = formatDate(dateValue);
  }

  return `${label}${time}`;
}

function formatShortDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatPostedAgo(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "Posted just now";
  if (diffMinutes < 60) return `Posted ${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Posted ${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Posted ${diffDays}d ago`;

  return `Posted ${formatShortDateTime(value)}`;
}

function getId(value) {
  if (!value) return "";
  return typeof value === "string" ? value : value._id || value.id || "";
}

function getReplyThreadCount(replies) {
  if (!Array.isArray(replies)) return 0;
  return replies.reduce(
    (count, reply) => count + 1 + (Array.isArray(reply.replies) ? reply.replies.length : 0),
    0
  );
}

function isLikedByUser(likes, userId) {
  if (!Array.isArray(likes) || !userId) return false;
  return likes.some((like) => getId(like).toString() === userId.toString());
}

function getRecurrenceLabel(post) {
  if (post.scheduleType !== "recurring" || !post.recurrence) return "";

  const frequency = titleCase(post.recurrence.frequency);
  const weekday = post.recurrence.weekday;
  const untilDate = post.recurrence.untilDate
    ? ` until ${formatDate(post.recurrence.untilDate)}`
    : "";
  const time = post.time ? ` at ${post.time}` : "";

  return `${frequency} on ${weekday}${time}${untilDate}`;
}

function getCommunityTypeLabel(value) {
  switch (value) {
    case "new-in-town":
      return "New in Town";
    case "group":
      return "Group";
    case "jobs":
      return "Jobs and Volunteer";
    case "notice":
      return "Town Notice";
    case "update":
      return "Town Notice";
    case "local-plan":
    default:
      return "Plan";
  }
}

function getActivityLabel(post) {
  if (post.communityType === "new-in-town") return "";
  if (post.communityType === "jobs") return "Job or Volunteer Ad";
  if (post.communityType === "notice") return "Town Notice";
  if (post.communityType === "update") return "Town Notice";
  const categories =
    Array.isArray(post.categories) && post.categories.length
      ? post.categories
      : post.category
        ? [post.category]
        : [];
  if (post.communityType === "group" && !categories.length) return "Group";

  const type = titleCase(post.type);
  const category = categories.join(", ");

  if (!category) return type;
  if (!type || type === "Event" || type === "General") return category;
  return `${category} / ${type}`;
}

function getGroupSizeLabel(value) {
  switch (value) {
    case "one-on-one":
      return "Small group";
    case "small-group":
      return "Small group";
    case "large-group":
      return "Large group";
    case "any":
      return "Any group size";
    default:
      return "";
  }
}

function shouldShowGroupSize(post) {
  return post.communityType === "local-plan" || post.communityType === "group";
}

function splitActivityText(value) {
  const text = String(value || "").trim();
  if (!text) {
    return {
      headline: "Local plan",
      details: "",
    };
  }

  const [firstLine, ...remainingLines] = text.split(/\r?\n/);
  if (remainingLines.length) {
    return {
      headline: firstLine.trim(),
      details: remainingLines.join(" ").trim(),
    };
  }

  const sentenceMatch = text.match(/^(.{24,}?[.!?])\s+(.+)$/);
  if (sentenceMatch) {
    return {
      headline: sentenceMatch[1].trim(),
      details: sentenceMatch[2].trim(),
    };
  }

  return {
    headline: text,
    details: "",
  };
}

function Chip({ children, theme, strong = false }) {
  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: strong ? theme.accentSoft || colors.accentSoft : theme.card,
          borderColor: strong ? theme.accent : theme.border,
        },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          {
            color: strong ? theme.text || colors.textPrimary : theme.textMuted,
            fontWeight: strong ? "700" : "600",
          },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

export default function BuddyPostCard({
  post,
  theme,
  currentUserId,
  showLinkedEvent = true,
  onOpenProfile,
  onOpenEvent,
  onToggleInterested,
  onSubmitReply,
  onSubmitReplyResponse,
  onToggleReplyLike,
  onUpdateReply,
  onDeleteReply,
  onBlockProfile,
  onReport,
}) {
  const [replyText, setReplyText] = useState("");
  const [replyOpen, setReplyOpen] = useState(false);
  const [showAllInterested, setShowAllInterested] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState("");
  const [editingReplyText, setEditingReplyText] = useState("");
  const [submittingReplyEdit, setSubmittingReplyEdit] = useState(false);
  const [replyingToId, setReplyingToId] = useState("");
  const [replyResponseText, setReplyResponseText] = useState("");
  const [submittingReplyResponse, setSubmittingReplyResponse] = useState(false);
  const [updatingInterest, setUpdatingInterest] = useState(false);
  const author = getAuthor(post);
  const avatarSource =
    author.avatarKey && AVATARS[author.avatarKey]
      ? AVATARS[author.avatarKey]
      : author.profileImageUrl
        ? { uri: author.profileImageUrl }
      : null;
  const initial = author.name.charAt(0).toUpperCase();
  const hasSkill = Boolean(post.skillLevel);
  const dateText = formatSmartDateTime(post.date, post.time);
  const postedAgoText = formatPostedAgo(post.createdAt);
  const recurrenceText = getRecurrenceLabel(post);
  const activityLabel = getActivityLabel(post);
  const townLabel = post.town || getProfileTownLabel(author);
  const skillLabel = hasSkill ? titleCase(post.skillLevel) : "";
  const groupSizeLabel = shouldShowGroupSize(post)
    ? getGroupSizeLabel(post.groupSizePreference)
    : "";
  const planText = splitActivityText(post.activityText);
  const linkedEvent =
    post.eventId && typeof post.eventId === "object" ? post.eventId : null;
  const metaItems = [
    townLabel,
    skillLabel,
    recurrenceText || dateText,
    activityLabel,
  ].filter(Boolean);
  const interestedUsers = Array.isArray(post.interestedUsers)
    ? post.interestedUsers
    : [];
  const interestedProfiles = interestedUsers
    .map((user) => getUserProfile(user, "Member"))
    .filter((profile) => profile._id || profile.id);
  const replies = Array.isArray(post.replies) ? post.replies : [];
  const categoryTags = Array.isArray(post.categoryTags) ? post.categoryTags : [];
  const vibeTags = Array.isArray(post.vibeTags) ? post.vibeTags : [];
  const combinedTags = [...vibeTags, ...categoryTags];
  const { visible: visibleTags, hiddenCount } = getVisibleTags(combinedTags, 3);
  const displayTags = showAllTags ? combinedTags : visibleTags;
  const commentCount = getReplyThreadCount(replies);
  const commentsLabel = `${commentCount} comment${commentCount === 1 ? "" : "s"}`;
  const isNewInTown = post.communityType === "new-in-town";
  const isCommunityUpdate = post.communityType === "update";
  const isInterested = interestedUsers.some(
    (user) => getId(user).toString() === currentUserId?.toString()
  );
  const actionLabel = isNewInTown
    ? isInterested
      ? "Welcomed"
      : "Say Welcome"
    : isInterested
      ? "Interested"
      : "I'm interested";
  const countLabel = isNewInTown
    ? `${interestedUsers.length} welcome${
        interestedUsers.length === 1 ? "" : "s"
      }`
    : `${interestedUsers.length} interested`;
  const interestedPreview = showAllInterested
    ? interestedProfiles
    : interestedProfiles.slice(0, 4);
  const hiddenInterestedCount = Math.max(
    0,
    interestedProfiles.length - interestedPreview.length
  );

  async function handleToggleInterested() {
    if (!onToggleInterested || updatingInterest) return;

    try {
      setUpdatingInterest(true);
      await onToggleInterested(post);
    } finally {
      setUpdatingInterest(false);
    }
  }

  async function handleSubmitReply() {
    const trimmedReply = replyText.trim();
    if (!trimmedReply || !onSubmitReply || submittingReply) return;

    try {
      setSubmittingReply(true);
      await onSubmitReply(post, trimmedReply);
      setReplyText("");
      setReplyOpen(false);
    } finally {
      setSubmittingReply(false);
    }
  }

  async function handleSaveReplyEdit(reply) {
    const replyId = reply._id || reply.id;
    const trimmedReply = editingReplyText.trim();
    if (!replyId || !trimmedReply || !onUpdateReply || submittingReplyEdit) {
      return;
    }

    try {
      setSubmittingReplyEdit(true);
      await onUpdateReply(post, reply, trimmedReply);
      setEditingReplyId("");
      setEditingReplyText("");
    } finally {
      setSubmittingReplyEdit(false);
    }
  }

  async function handleSubmitReplyResponse(reply) {
    const replyId = reply._id || reply.id;
    const trimmedReply = replyResponseText.trim();
    if (
      !replyId ||
      !trimmedReply ||
      !onSubmitReplyResponse ||
      submittingReplyResponse
    ) {
      return;
    }

    try {
      setSubmittingReplyResponse(true);
      await onSubmitReplyResponse(post, reply, trimmedReply);
      setReplyingToId("");
      setReplyResponseText("");
    } finally {
      setSubmittingReplyResponse(false);
    }
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.topRow}>
        <Pressable
          style={({ pressed }) => [
            styles.authorRow,
            pressed && styles.pressed,
          ]}
          onPress={() => onOpenProfile?.(author)}
        >
          <View
            style={[
              styles.avatar,
              { backgroundColor: theme.pill || colors.surfaceMuted },
            ]}
          >
            {avatarSource ? (
              <Image source={avatarSource} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarInitial, { color: theme.text }]}>
                {initial}
              </Text>
            )}
          </View>
          <View style={styles.authorCopy}>
            <Text style={[styles.authorName, { color: theme.text }]}>
              {author.name}
            </Text>
            <Text style={[styles.authorMeta, { color: theme.textMuted }]}>
              {[getProfileTownLabel(author), titleCase(author.userType)].filter(Boolean).join(" | ") ||
                "Community member"}
            </Text>
            {postedAgoText ? (
              <Text style={[styles.authorMeta, { color: theme.textMuted }]}>
                {postedAgoText}
              </Text>
            ) : null}
            <View style={styles.authorBadgeRow}>
              <TrustBadgeRow
                profile={author}
                communityType={post.communityType}
                theme={theme}
                compact
              />
            </View>
            {author.originallyFrom ? (
              <Text style={[styles.authorMeta, { color: theme.textMuted }]}>
                Originally from {author.originallyFrom}
              </Text>
            ) : null}
          </View>
        </Pressable>

        <View style={styles.sectionPill}>
          <Chip theme={theme} strong>
            {getCommunityTypeLabel(post.communityType)}
          </Chip>
        </View>
      </View>

      <View style={styles.planBlock}>
        <Text style={[styles.planHeadline, { color: theme.text }]}>
          {planText.headline}
        </Text>
        {metaItems.length ? (
          <Text style={[styles.planMeta, { color: theme.textMuted }]}>
            {metaItems.join(" • ")}
          </Text>
        ) : null}
      </View>

      {post.imageUrl ? (
        <Image
          source={{ uri: post.imageUrl }}
          style={styles.postImage}
          resizeMode="cover"
        />
      ) : null}

      {planText.details ? (
        <View style={styles.descriptionBlock}>
          <Text
            style={[styles.activityText, { color: theme.text }]}
            numberOfLines={3}
          >
            {planText.details}
          </Text>
        </View>
      ) : null}

      {groupSizeLabel ? (
        <View style={styles.preferenceRow}>
          <View
            style={[
              styles.preferencePill,
              {
                backgroundColor: theme.pill || colors.surfaceMuted,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.preferenceLabel, { color: theme.textMuted }]}>
              Group size
            </Text>
            <Text style={[styles.preferenceValue, { color: theme.text }]}>
              {groupSizeLabel}
            </Text>
          </View>
        </View>
      ) : null}

      {displayTags.length ? (
        <View style={styles.vibeRow}>
          {displayTags.map((tag) => (
            <Chip key={tag} theme={theme}>
              {tag}
            </Chip>
          ))}
          {hiddenCount ? (
            <Pressable
              style={({ pressed }) => [
                styles.moreTagsButton,
                { borderColor: theme.accent, backgroundColor: theme.card },
                pressed && styles.pressed,
              ]}
              onPress={() => setShowAllTags((current) => !current)}
            >
              <Text style={[styles.moreTagsText, { color: theme.accent }]}>
                {showAllTags ? "Show less" : `+${hiddenCount} more`}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {showLinkedEvent && linkedEvent ? (
        <View
          style={[
            styles.linkedEventBlock,
            {
              backgroundColor: theme.pill || colors.surfaceMuted,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.linkedEventCopy}>
            <Text style={[styles.linkedEventLabel, { color: theme.textMuted }]}>
              Linked event
            </Text>
            <Text
              style={[styles.linkedEventTitle, { color: theme.text }]}
              numberOfLines={1}
            >
              {linkedEvent.title || "Event"}
            </Text>
            <Text
              style={[styles.linkedEventMeta, { color: theme.textMuted }]}
              numberOfLines={1}
            >
              {[linkedEvent.town, linkedEvent.category, linkedEvent.date]
                .filter(Boolean)
                .join(" | ")}
            </Text>
          </View>
          {onOpenEvent ? (
            <Pressable
              style={({ pressed }) => [
                styles.linkedEventButton,
                { borderColor: theme.accent },
                pressed && styles.pressed,
              ]}
              onPress={() => onOpenEvent(linkedEvent)}
            >
              <Text
                style={[
                  styles.linkedEventButtonText,
                  { color: theme.accent },
                ]}
              >
                View Event
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.footerRow}>
        {!isCommunityUpdate ? (
          <Pressable
            style={({ pressed }) => [
              styles.interestButton,
              {
                backgroundColor: isInterested
                  ? theme.accentSoft || colors.accentSoft
                  : theme.card,
                borderColor: isInterested ? theme.accent : theme.border,
              },
              pressed && styles.pressed,
            ]}
            onPress={handleToggleInterested}
            disabled={updatingInterest}
          >
            <Text
              style={[
                styles.interestButtonText,
                { color: isInterested ? theme.text : theme.textMuted },
              ]}
            >
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          style={({ pressed }) => [
            styles.profileButton,
            { borderColor: theme.accent },
            pressed && styles.pressed,
          ]}
          onPress={() => onOpenProfile?.(author)}
        >
          <Text style={[styles.profileButtonText, { color: theme.accent }]}>
            View Profile
          </Text>
        </Pressable>
        {!isCommunityUpdate ? (
          <Text style={[styles.statusText, { color: theme.textMuted }]}>
            {countLabel} | {commentsLabel}
          </Text>
        ) : null}
      </View>

      <Pressable
        style={({ pressed }) => [styles.reportLink, pressed && styles.pressed]}
        onPress={() =>
          onReport?.({
            targetType: "buddyPost",
            targetId: post._id || post.id,
          })
        }
      >
        <Text style={[styles.reportText, { color: theme.textMuted }]}>
          Report
        </Text>
      </Pressable>

      {!isCommunityUpdate && interestedProfiles.length ? (
        <View style={styles.interestedBlock}>
          <View style={styles.interestedHeaderRow}>
            <Text style={[styles.interestedTitle, { color: theme.text }]}>
              {isNewInTown ? "Welcomed by" : "People interested"}
            </Text>
            {interestedProfiles.length > 4 ? (
              <Pressable
                style={({ pressed }) => [
                  styles.textButtonHitArea,
                  pressed && styles.pressed,
                ]}
                onPress={() => setShowAllInterested((current) => !current)}
              >
                <Text style={[styles.interestedToggle, { color: theme.accent }]}>
                  {showAllInterested ? "Show less" : "View all"}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.interestedList}>
            {interestedPreview.map((profile) => {
              const avatarSource =
                profile.avatarKey && AVATARS[profile.avatarKey]
                  ? AVATARS[profile.avatarKey]
                  : profile.profileImageUrl
                    ? { uri: profile.profileImageUrl }
                  : null;
              const initial = profile.name?.charAt(0).toUpperCase() || "?";

              return (
                <Pressable
                  key={profile._id || profile.id}
                  style={({ pressed }) => [
                    styles.interestedPill,
                    {
                      backgroundColor: theme.pill || colors.surfaceMuted,
                      borderColor: theme.border,
                    },
                    pressed && styles.pressed,
                  ]}
                  onPress={() => onOpenProfile?.(profile)}
                >
                  <View
                    style={[
                      styles.interestedAvatar,
                      { backgroundColor: theme.card },
                    ]}
                  >
                    {avatarSource ? (
                      <Image
                        source={avatarSource}
                        style={styles.interestedAvatarImage}
                      />
                    ) : (
                      <Text
                        style={[
                          styles.interestedInitial,
                          { color: theme.text },
                        ]}
                      >
                        {initial}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[styles.interestedName, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {profile.name}
                  </Text>
                </Pressable>
              );
            })}
            {!showAllInterested && hiddenInterestedCount ? (
              <Text style={[styles.moreInterestedText, { color: theme.textMuted }]}>
                +{hiddenInterestedCount} more
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.replyHeaderRow}>
        <Text style={[styles.replyHeader, { color: theme.text }]}>
          Replies {replies.length ? `(${replies.length})` : ""}
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.textButtonHitArea,
            pressed && styles.pressed,
          ]}
          onPress={() => setReplyOpen((current) => !current)}
        >
          <Text style={[styles.replyToggle, { color: theme.accent }]}>
            {replyOpen ? "Cancel" : "Reply"}
          </Text>
        </Pressable>
      </View>

      {replies.length ? (
        <View style={styles.repliesList}>
          {replies.slice(-3).map((reply) => {
            const replyAuthor =
              reply.createdBy && typeof reply.createdBy === "object"
                ? reply.createdBy
                : {};
            const replyName = replyAuthor.name || "Member";
            const replyProfile = getUserProfile(replyAuthor, replyName);
            const replyId = reply._id || reply.id || `${replyName}-${reply.createdAt}`;
            const isOwnReply =
              Boolean(currentUserId) &&
              getId(replyAuthor).toString() === currentUserId?.toString();
            const isEditingReply = editingReplyId === replyId.toString();
            const replyLikes = Array.isArray(reply.likes) ? reply.likes : [];
            const hasLikedReply = isLikedByUser(replyLikes, currentUserId);
            const childReplies = Array.isArray(reply.replies) ? reply.replies : [];
            const isReplyingToThis = replyingToId === replyId.toString();

            return (
              <View
                key={replyId}
                style={[
                  styles.replyBubble,
                  {
                    backgroundColor: theme.pill || colors.surfaceMuted,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={[styles.replyMeta, { color: theme.textMuted }]}>
                  {replyName}
                  {reply.createdAt ? ` | ${formatShortDateTime(reply.createdAt)}` : ""}
                </Text>
                {isEditingReply ? (
                  <View style={styles.replyEditBlock}>
                    <TextInput
                      style={[
                        styles.replyEditInput,
                        {
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                          color: theme.text,
                        },
                      ]}
                      placeholder="Update your reply..."
                      placeholderTextColor={theme.textMuted}
                      value={editingReplyText}
                      onChangeText={setEditingReplyText}
                      multiline
                    />
                  </View>
                ) : (
                  <Text style={[styles.replyText, { color: theme.text }]}>
                    {reply.text}
                  </Text>
                )}
                <View style={styles.replyActionsRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.replyMiniButton,
                      {
                        borderColor: hasLikedReply ? theme.accent : theme.border,
                        backgroundColor: hasLikedReply
                          ? theme.accentSoft || colors.tealTint
                          : "transparent",
                      },
                      pressed && styles.pressed,
                    ]}
                    onPress={() => onToggleReplyLike?.(post, reply)}
                  >
                    <Text
                      style={[
                        styles.replyMiniButtonText,
                        { color: hasLikedReply ? theme.accent : theme.textMuted },
                      ]}
                    >
                      {hasLikedReply ? "Liked" : "Like"}
                      {replyLikes.length ? ` (${replyLikes.length})` : ""}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.replyMiniButton,
                      { borderColor: theme.border },
                      pressed && styles.pressed,
                    ]}
                    onPress={() => {
                      setReplyingToId(isReplyingToThis ? "" : replyId.toString());
                      setReplyResponseText("");
                    }}
                  >
                    <Text style={[styles.replyMiniButtonText, { color: theme.accent }]}>
                      {isReplyingToThis ? "Cancel" : "Reply"}
                    </Text>
                  </Pressable>
                  {isOwnReply ? (
                    isEditingReply ? (
                      <>
                        <Pressable
                          style={({ pressed }) => [
                            styles.replyMiniButton,
                            { borderColor: theme.accent },
                            pressed && styles.pressed,
                          ]}
                          onPress={() => handleSaveReplyEdit(reply)}
                          disabled={!editingReplyText.trim() || submittingReplyEdit}
                        >
                          <Text
                            style={[
                              styles.replyMiniButtonText,
                              { color: theme.accent },
                            ]}
                          >
                            {submittingReplyEdit ? "Saving..." : "Save"}
                          </Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [
                            styles.replyMiniButton,
                            { borderColor: theme.border },
                            pressed && styles.pressed,
                          ]}
                          onPress={() => {
                            setEditingReplyId("");
                            setEditingReplyText("");
                          }}
                        >
                          <Text style={[styles.reportText, { color: theme.textMuted }]}>
                            Cancel
                          </Text>
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <Pressable
                          style={({ pressed }) => [
                            styles.replyMiniButton,
                            { borderColor: theme.accent },
                            pressed && styles.pressed,
                          ]}
                          onPress={() => {
                            setEditingReplyId(replyId.toString());
                            setEditingReplyText(reply.text || "");
                          }}
                        >
                          <Text
                            style={[
                              styles.replyMiniButtonText,
                              { color: theme.accent },
                            ]}
                          >
                            Edit
                          </Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [
                            styles.replyMiniButton,
                            { borderColor: theme.border },
                            pressed && styles.pressed,
                          ]}
                          onPress={() => onDeleteReply?.(post, reply)}
                        >
                          <Text style={[styles.reportText, { color: theme.textMuted }]}>
                            Delete
                          </Text>
                        </Pressable>
                      </>
                    )
                  ) : (
                    <>
                      <Pressable
                        style={({ pressed }) => [
                          styles.replyMiniButton,
                          { borderColor: theme.accent },
                          pressed && styles.pressed,
                        ]}
                        onPress={() => onOpenProfile?.(replyProfile)}
                      >
                        <Text
                          style={[
                            styles.replyMiniButtonText,
                            { color: theme.accent },
                          ]}
                        >
                          View Profile
                        </Text>
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [
                          styles.replyMiniButton,
                          { borderColor: theme.border },
                          pressed && styles.pressed,
                        ]}
                        onPress={() => onBlockProfile?.(replyProfile)}
                      >
                        <Text style={[styles.reportText, { color: theme.textMuted }]}>
                          Block user
                        </Text>
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [
                          styles.replyMiniButton,
                          { borderColor: theme.border },
                          pressed && styles.pressed,
                        ]}
                        onPress={() =>
                          onReport?.({
                            targetType: "buddyReply",
                            targetId: reply._id || reply.id,
                            parentType: "buddyPost",
                            parentId: post._id || post.id,
                          })
                        }
                      >
                        <Text style={[styles.reportText, { color: theme.textMuted }]}>
                          Report reply
                        </Text>
                      </Pressable>
                    </>
                  )}
                </View>
                {childReplies.length ? (
                  <View
                    style={[
                      styles.replyResponsesList,
                      { borderLeftColor: theme.accent },
                    ]}
                  >
                    {childReplies.map((childReply) => {
                      const childAuthor =
                        childReply.createdBy && typeof childReply.createdBy === "object"
                          ? childReply.createdBy
                          : {};
                      const childName = childAuthor.name || "Member";
                      const childId =
                        childReply._id ||
                        childReply.id ||
                        `${childName}-${childReply.createdAt}`;

                      return (
                        <View
                          key={childId}
                          style={[
                            styles.replyResponseBubble,
                            {
                              backgroundColor: theme.card,
                              borderColor: theme.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.replyResponseContext,
                              { color: theme.textMuted },
                            ]}
                          >
                            Replying to {replyName}
                          </Text>
                          <Text style={[styles.replyMeta, { color: theme.textMuted }]}>
                            {childName}
                            {childReply.createdAt
                              ? ` | ${formatShortDateTime(childReply.createdAt)}`
                              : ""}
                          </Text>
                          <Text style={[styles.replyText, { color: theme.text }]}>
                            {childReply.text}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
                {isReplyingToThis ? (
                  <View
                    style={[
                      styles.replyResponseComposer,
                      { borderLeftColor: theme.accent },
                    ]}
                  >
                    <Text
                      style={[
                        styles.replyResponseContext,
                        { color: theme.textMuted },
                      ]}
                    >
                      Replying to {replyName}
                    </Text>
                    <TextInput
                      style={[
                        styles.replyEditInput,
                        {
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                          color: theme.text,
                        },
                      ]}
                      placeholder={`Reply to ${replyName}...`}
                      placeholderTextColor={theme.textMuted}
                      value={replyResponseText}
                      onChangeText={setReplyResponseText}
                      multiline
                    />
                    <Pressable
                      style={({ pressed }) => [
                        styles.replySubmit,
                        {
                          backgroundColor: replyResponseText.trim()
                            ? theme.accent
                            : theme.pill || colors.surfaceMuted,
                        },
                        pressed && styles.pressed,
                      ]}
                      onPress={() => handleSubmitReplyResponse(reply)}
                      disabled={!replyResponseText.trim() || submittingReplyResponse}
                    >
                      <Text style={styles.replySubmitText}>
                        {submittingReplyResponse ? "Sending..." : "Send"}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}

      {replyOpen ? (
        <View style={styles.replyComposer}>
          <TextInput
            style={[
              styles.replyInput,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder="Write a public reply..."
            placeholderTextColor={theme.textMuted}
            value={replyText}
            onChangeText={setReplyText}
            multiline
          />
          <Pressable
            style={({ pressed }) => [
              styles.replySubmit,
              {
                backgroundColor: replyText.trim()
                  ? theme.accent
                  : theme.pill || colors.surfaceMuted,
              },
              pressed && styles.pressed,
            ]}
            onPress={handleSubmitReply}
            disabled={!replyText.trim() || submittingReply}
          >
            <Text style={styles.replySubmitText}>
              {submittingReply ? "Sending..." : "Send"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  sectionPill: {
    maxWidth: 140,
    alignItems: "flex-end",
  },
  authorRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    overflow: "hidden",
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  avatarInitial: {
    fontSize: 17,
    fontWeight: "800",
  },
  authorCopy: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: "800",
  },
  authorMeta: {
    fontSize: 14,
    marginTop: 2,
  },
  authorBadgeRow: {
    marginTop: 6,
  },
  planBlock: {
    marginBottom: 12,
  },
  planHeadline: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "900",
    marginBottom: 6,
  },
  planMeta: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  postImage: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: colors.surfaceMuted,
  },
  descriptionBlock: {
    marginTop: 0,
    marginBottom: 2,
  },
  activityText: {
    fontSize: 16,
    lineHeight: 23,
  },
  preferenceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  vibeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  preferencePill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  preferenceLabel: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  preferenceValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  linkedEventBlock: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  linkedEventCopy: {
    flex: 1,
  },
  linkedEventLabel: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  linkedEventTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  linkedEventMeta: {
    fontSize: 14,
    marginTop: 2,
  },
  linkedEventButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  linkedEventButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: 14,
  },
  moreTagsButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  moreTagsText: {
    fontSize: 14,
    fontWeight: "800",
  },
  footerRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  interestButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  interestButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },
  profileButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  profileButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "700",
    marginLeft: "auto",
  },
  reportLink: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingVertical: 8,
  },
  textButtonHitArea: {
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  reportText: {
    fontSize: 14,
    fontWeight: "700",
  },
  interestedBlock: {
    marginTop: 6,
    marginBottom: 2,
  },
  interestedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  interestedTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  interestedToggle: {
    fontSize: 14,
    fontWeight: "800",
  },
  interestedList: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  interestedPill: {
    maxWidth: "48%",
    minWidth: 118,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 6,
  },
  interestedAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
    overflow: "hidden",
  },
  interestedAvatarImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  interestedInitial: {
    fontSize: 11,
    fontWeight: "800",
  },
  interestedName: {
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
  },
  moreInterestedText: {
    fontSize: 12,
    fontWeight: "800",
  },
  replyHeaderRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  replyHeader: {
    fontSize: 13,
    fontWeight: "800",
  },
  replyToggle: {
    fontSize: 13,
    fontWeight: "800",
  },
  repliesList: {
    marginTop: 10,
    gap: 8,
  },
  replyBubble: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  replyMeta: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 3,
  },
  replyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  replyEditBlock: {
    marginTop: 2,
  },
  replyEditInput: {
    minHeight: 62,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 8,
    fontSize: 13,
    lineHeight: 18,
    textAlignVertical: "top",
  },
  replyActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  replyResponsesList: {
    gap: 6,
    marginTop: 8,
    marginLeft: 10,
    paddingLeft: 12,
    borderLeftWidth: 2,
  },
  replyResponseBubble: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  replyResponseContext: {
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 4,
  },
  replyResponseComposer: {
    gap: 8,
    marginTop: 8,
    marginLeft: 10,
    paddingLeft: 12,
    borderLeftWidth: 2,
  },
  replyMiniButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  replyMiniButtonText: {
    fontSize: 12,
    fontWeight: "800",
  },
  replyComposer: {
    marginTop: 10,
    gap: 8,
  },
  replyInput: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
    textAlignVertical: "top",
  },
  replySubmit: {
    alignSelf: "flex-end",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  replySubmitText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }, { translateY: 1 }],
  },
});
