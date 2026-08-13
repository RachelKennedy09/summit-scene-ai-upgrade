import React, { useState } from "react";
import {
  Image,
  Linking,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AVATARS } from "../../assets/avatars/avatarConfig";
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
      return "Community Notice";
    case "update":
      return "Community Notice";
    case "local-plan":
    default:
      return "Plan";
  }
}

function getActivityLabel(post) {
  if (post.communityType === "new-in-town") return "";
  if (post.communityType === "jobs") return "Job or Volunteer Ad";
  if (post.communityType === "notice") return "Community Notice";
  if (post.communityType === "update") return "Community Notice";
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

function normalizeUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
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
  onEditPost,
  onDeletePost,
  onReport,
  onRequireAccount,
}) {
  const [replyText, setReplyText] = useState("");
  const [replyOpen, setReplyOpen] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
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
  const isJobPost = post.communityType === "jobs";
  const isNoticePost = post.communityType === "notice" || post.communityType === "update";
  const websiteUrl = normalizeUrl(post.websiteUrl);
  const townLabel = post.town || getProfileTownLabel(author);
  const skillLabel = hasSkill ? titleCase(post.skillLevel) : "";
  const groupSizeLabel = shouldShowGroupSize(post)
    ? getGroupSizeLabel(post.groupSizePreference)
    : "";
  const planText = splitActivityText(post.activityText);
  const linkedEvent =
    post.eventId && typeof post.eventId === "object" ? post.eventId : null;
  const jobMetaItems = isJobPost
    ? [
        post.businessName,
        post.locationName,
        post.applyByDate ? `Apply by ${formatDate(post.applyByDate)}` : "",
        post.expiresAt ? `Open until ${formatDate(post.expiresAt)}` : "",
      ]
    : [];
  const noticeMetaItems = isNoticePost
    ? [post.businessName, post.locationName]
    : [];
  const metaItems = [
    townLabel,
    ...jobMetaItems,
    ...noticeMetaItems,
    skillLabel,
    isJobPost ? "" : recurrenceText || dateText,
    activityLabel,
  ].filter(Boolean);
  const interestedUsers = Array.isArray(post.interestedUsers)
    ? post.interestedUsers
    : [];
  const replies = Array.isArray(post.replies) ? post.replies : [];
  const categoryTags = Array.isArray(post.categoryTags) ? post.categoryTags : [];
  const vibeTags = Array.isArray(post.vibeTags) ? post.vibeTags : [];
  const combinedTags = [...vibeTags, ...categoryTags];
  const { visible: visibleTags, hiddenCount } = getVisibleTags(combinedTags, 3);
  const displayTags = showAllTags ? combinedTags : visibleTags;
  const commentCount = getReplyThreadCount(replies);
  const commentsLabel =
    commentCount === 1 ? "1 comment" : `${commentCount} replies`;
  const isNewInTown = post.communityType === "new-in-town";
  const isCommunityUpdate = post.communityType === "update";
  const isOwner =
    Boolean(currentUserId) &&
    getId(post.createdBy).toString() === currentUserId?.toString();
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
  const canInteract = Boolean(currentUserId);

  function requireAccount(message) {
    if (canInteract) return false;
    if (onRequireAccount) {
      onRequireAccount(message);
    } else {
      Alert.alert("Account required", message);
    }
    return true;
  }

  function handleOpenProfile(profile) {
    if (requireAccount("Log in or create an account to view profiles.")) {
      return;
    }
    onOpenProfile?.(profile);
  }

  async function handleToggleInterested() {
    if (requireAccount("Log in or create an account to show interest.")) return;
    if (!onToggleInterested || updatingInterest) return;

    try {
      setUpdatingInterest(true);
      await onToggleInterested(post);
    } finally {
      setUpdatingInterest(false);
    }
  }

  function handleStartReply() {
    if (requireAccount("Log in or create an account to reply.")) {
      return;
    }
    setReplyOpen((current) => !current);
  }

  async function handleSubmitReply() {
    if (requireAccount("Log in or create an account to reply.")) return;
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

  function handleOpenWebsite() {
    if (!websiteUrl) return;
    Linking.openURL(websiteUrl).catch(() => {
      Alert.alert("Could not open link", "Please try again.");
    });
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
          onPress={() => handleOpenProfile(author)}
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
            {metaItems.join(" | ")}
          </Text>
        ) : null}
        {isJobPost && post.importedBySummitScene ? (
          <Text style={[styles.importedSourceText, { color: theme.textMuted }]}>
            Listed by Summit Scene
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

      {websiteUrl ? (
        <Pressable
          style={({ pressed }) => [
            styles.websiteButton,
            { borderColor: theme.accent, backgroundColor: theme.card },
            pressed && styles.pressed,
          ]}
          onPress={handleOpenWebsite}
        >
          <Text style={[styles.websiteButtonText, { color: theme.accent }]}>
            Open website or booking link
          </Text>
        </Pressable>
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
        {isOwner ? (
          <View style={styles.ownerActionsRow}>
            <Pressable
              style={({ pressed }) => [
                styles.ownerActionButton,
                { borderColor: theme.accent, backgroundColor: theme.card },
                pressed && styles.pressed,
              ]}
              onPress={() => onEditPost?.(post)}
            >
              <Text style={[styles.ownerActionText, { color: theme.accent }]}>
                Edit
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.ownerActionButton,
                { borderColor: theme.border, backgroundColor: theme.card },
                pressed && styles.pressed,
              ]}
              onPress={() => onDeletePost?.(post)}
            >
              <Text style={[styles.ownerActionText, { color: theme.textMuted }]}>
                Delete
              </Text>
            </Pressable>
          </View>
        ) : null}
        {!isCommunityUpdate ? (
          <Pressable
            style={({ pressed }) => [
              styles.replyButton,
              { borderColor: theme.accent, backgroundColor: theme.card },
              pressed && styles.pressed,
            ]}
            onPress={handleStartReply}
          >
            <Text style={[styles.replyButtonText, { color: theme.accent }]}>
              {replyOpen ? "Cancel reply" : "Reply"}
            </Text>
          </Pressable>
        ) : null}
        <View
          style={[
            styles.secondaryActionButton,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          <Text style={[styles.secondaryActionText, { color: theme.textMuted }]}>
            {commentsLabel}
          </Text>
        </View>
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
      </View>

      <Pressable
        style={({ pressed }) => [styles.reportLink, pressed && styles.pressed]}
        onPress={() => {
          if (requireAccount("Log in or create an account to submit a report.")) {
            return;
          }
          onReport?.({
            targetType: "buddyPost",
            targetId: post._id || post.id,
          });
        }}
      >
        <Text style={[styles.reportText, { color: theme.textMuted }]}>
          Report
        </Text>
      </Pressable>

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
    borderRadius: 8,
    padding: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  sectionPill: {
    maxWidth: 178,
    flexShrink: 0,
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
  planBlock: {
    marginBottom: 10,
  },
  planHeadline: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "900",
    marginBottom: 5,
  },
  planMeta: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  importedSourceText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    marginTop: 4,
  },
  postImage: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 8,
    marginBottom: 10,
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
  websiteButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
    marginTop: 10,
  },
  websiteButtonText: {
    fontSize: 14,
    fontWeight: "900",
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
    lineHeight: 18,
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
  ownerActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    width: "100%",
  },
  ownerActionButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minHeight: 42,
    justifyContent: "center",
  },
  ownerActionText: {
    fontSize: 14,
    fontWeight: "900",
  },
  interestButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 38,
    justifyContent: "center",
  },
  interestButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },
  replyButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  replyButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },
  secondaryActionButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: "800",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "700",
    marginLeft: "auto",
  },
  reportLink: {
    alignSelf: "flex-end",
    marginTop: 4,
    paddingVertical: 6,
  },
  textButtonHitArea: {
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  reportText: {
    fontSize: 13,
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
