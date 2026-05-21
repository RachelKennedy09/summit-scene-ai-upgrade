// screens/EventDetailScreen.js
// Show full details for a single event.
// - Displays title, category, town, date/time, location, and description
// - Shows business "host" info (EventHostSection) when available
// - Gives the event owner edit/delete actions (EventOwnerSection)
// - Includes "Open in Maps" deep link for the event location

import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
  Share,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { useAuth } from "../../context/AuthContext";
import {
  deleteEvent,
  fetchEventById,
  toggleEventAttendance as toggleEventAttendanceApi,
} from "../../services/eventsApi";
import {
  createBuddyPostReply,
  deleteBuddyPostReply,
  fetchBuddyPosts,
  toggleBuddyPostInterest,
  updateBuddyPostReply,
} from "../../services/buddyPostsApi";
import { submitReport } from "../../services/reportsApi";
import {
  fetchEventPreference,
  updateEventPreference,
} from "../../services/eventPreferencesApi";
import { useTheme } from "../../context/ThemeContext";
import {
  getDetailScheduleLabels,
  isEventUpcoming,
} from "../../utils/eventSchedule";
import { openReportReasonPicker } from "../../utils/reporting";

import EventHostSection from "../../components/events/EventHostSection";
import EventOwnerSection from "../../components/events/EventOwnerSection";
import BuddyPostCard from "../../components/cards/BuddyPostCard";
import MemberProfileModal from "../../components/account/MemberProfileModal";
import { AVATARS } from "../../assets/avatars/avatarConfig";

const REMINDER_OPTIONS = [
  { label: "Off", value: "none" },
  { label: "1 hour", value: "1h" },
  { label: "1 day", value: "1d" },
  { label: "1 month", value: "1mo" },
];

// Helper: derive business host info from event.createdBy (or fallback to event.user)
  // Block is only showed when the host is a business account.
function getEventHost(event) {
  if (!event) return null;

  const userObj =
    typeof event.createdBy === "object" && event.createdBy !== null
      ? event.createdBy
      : typeof event.user === "object" && event.user !== null
      ? event.user
      : null;

  if (!userObj) return null;
  if (userObj.role !== "business") return null; // only show for business hosts

  const name = userObj.name || "Event host";
  const town = userObj.town || event.town || "Rockies local";
  const avatarKey = userObj.avatarKey || null;
  const profileImageUrl = userObj.profileImageUrl || "";
  const website = userObj.website || "";
  const instagram = userObj.instagram || "";
  const socialAccounts = userObj.socialAccounts || [];
  const bio = userObj.bio || "";
  const businessType = userObj.lookingFor || "";
  const businessVerificationStatus =
    userObj.businessVerificationStatus || "none";

  return {
    name,
    town,
    avatarKey,
    profileImageUrl,
    website,
    instagram,
    socialAccounts,
    bio,
    businessType,
    businessVerificationStatus,
    role: userObj.role,
  };
}

// Helper: safely check if the logged-in user owns this event
// This is used to decide whether to show the Edit/Delete owner block.
function isEventOwner(event, user) {
  if (!event || !user) return false;

  const createdBy = event.createdBy;
  const eventOwnerId =
    typeof createdBy === "string" ? createdBy : createdBy?._id || createdBy?.id;

  const userId = user._id || user.id;

  if (!eventOwnerId || !userId) return false;

  return eventOwnerId.toString() === userId.toString();
}

function getUserId(value) {
  if (!value) return "";
  return typeof value === "string" ? value : value._id || value.id || "";
}

function getAttendeeProfile(value) {
  if (!value || typeof value !== "object") return null;

  return {
    _id: value._id || value.id || "",
    id: value._id || value.id || "",
    name: value.name || "Summit Scene member",
    role: value.role || "local",
    avatarKey: value.avatarKey,
    profileImageUrl: value.profileImageUrl || "",
    town: value.town,
    userType: value.userType,
    originallyFrom: value.originallyFrom || "",
    interests: value.interests || [],
    languages: value.languages || [],
    skillLevel: value.skillLevel || {},
    socialAccounts: value.socialAccounts || [],
    bio: value.bio || "",
    instagram: value.instagram || "",
    website: value.website || "",
    businessVerificationStatus: value.businessVerificationStatus || "none",
  };
}

export default function EventDetailScreen({ route }) {
  const navigation = useNavigation();
  const { user, token, blockUser } = useAuth();
  const { theme } = useTheme();

  const { event: initialEvent } = route.params || {};
  const [event, setEvent] = useState(initialEvent || null);
  const [heroImageFailed, setHeroImageFailed] = useState(false);
  const [buddyPosts, setBuddyPosts] = useState([]);
  const [loadingBuddyPosts, setLoadingBuddyPosts] = useState(false);
  const [buddyPostsError, setBuddyPostsError] = useState("");
  const [profileUser, setProfileUser] = useState(null);
  const [updatingAttendance, setUpdatingAttendance] = useState(false);
  const [attendeesModalOpen, setAttendeesModalOpen] = useState(false);
  const [eventPreference, setEventPreference] = useState(null);
  const [updatingPreference, setUpdatingPreference] = useState(false);

  const host = getEventHost(event);
  const isOwner = isEventOwner(event, user);
  const eventId = event?._id || event?.id || route.params?.eventId;
  const currentUserId = user?._id || user?.id || "";
  const attendees = Array.isArray(event?.attendees) ? event.attendees : [];
  const attendeeProfiles = attendees.map(getAttendeeProfile).filter(Boolean);
  const isGoing = attendees.some((attendee) => {
    const attendeeId = getUserId(attendee);
    return attendeeId?.toString() === currentUserId?.toString();
  });
  const attendeesCount = attendeeProfiles.length;
  const attendeePreview = attendeeProfiles.slice(0, 6);
  const hiddenAttendeeCount = Math.max(attendeeProfiles.length - attendeePreview.length, 0);
  const eventIsUpcoming = event ? isEventUpcoming(event) : false;
  const isSaved = Boolean(eventPreference?.saved);
  const activeReminderTime = eventPreference?.reminderTime || "1h";
  const savedReminderEnabled = Boolean(eventPreference?.savedReminderEnabled);
  const goingReminderEnabled = Boolean(eventPreference?.goingReminderEnabled);

  const handleEdit = () => {
    // navigate to shared EditEvent form, passing the current event
    navigation.navigate("EditEvent", { event });
  };

  // Delete flow: confirm, call API, then refresh parent list via onUpdated callback if provided
  const handleDelete = () => {
    Alert.alert("Delete this event?", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            if (!token) {
              Alert.alert("Not logged in", "Please log in again.");
              return;
            }

            await deleteEvent(event._id, token);

            if (route.params?.onUpdated) {
              route.params.onUpdated();
            }
            navigation.goBack();
          } catch (error) {
            console.warn("Delete event issue:", error.message);
            Alert.alert("Error", error.message || "Failed to delete event.");
          }
        },
      },
    ]);
  };

  const title = event?.title || "Untitled event";
  const category = event?.category || "Event";
  const town = event?.town || "";
  const locationName = event?.locationName || event?.location || "";
  const address = event?.address || "";
  const description = event?.description || "No detailed description added yet.";

  const { dateLabel, timeLabel } = getDetailScheduleLabels(event || {});

  const loadEventBuddyPosts = useCallback(async () => {
    if (!eventId || !token || !eventIsUpcoming) {
      setBuddyPosts([]);
      setBuddyPostsError("");
      return;
    }

    try {
      setLoadingBuddyPosts(true);
      setBuddyPostsError("");
      const posts = await fetchBuddyPosts({ eventId, status: "open" }, token);
      setBuddyPosts(posts);
    } catch (error) {
      setBuddyPostsError(error.message || "Could not load event buddy posts.");
    } finally {
      setLoadingBuddyPosts(false);
    }
  }, [eventId, eventIsUpcoming, token]);

  const loadEventDetails = useCallback(async () => {
    if (!eventId) return;

    try {
      const freshEvent = await fetchEventById(eventId, token);
      setEvent(freshEvent);
    } catch (error) {
      console.warn("Event detail refresh issue:", error.message);
    }
  }, [eventId, token]);

  const loadEventPreference = useCallback(async () => {
    if (!eventId || !token) {
      setEventPreference(null);
      return;
    }

    try {
      const preference = await fetchEventPreference(eventId, token);
      setEventPreference(preference);
    } catch (error) {
      console.warn("Event preference load issue:", error.message);
    }
  }, [eventId, token]);

  useFocusEffect(
    useCallback(() => {
      loadEventDetails();
      loadEventBuddyPosts();
      loadEventPreference();
    }, [loadEventDetails, loadEventBuddyPosts, loadEventPreference])
  );

  const handleFindEventBuddies = () => {
    if (!eventIsUpcoming) {
      Alert.alert(
        "Event has passed",
        "Buddy posts are closed once an event has passed."
      );
      return;
    }

    if (!token) {
      Alert.alert("Login required", "Please log in before creating a buddy post.");
      return;
    }

    navigation.navigate("CreateBuddyPost", {
      eventBuddy: {
        type: "event",
        category,
        communityType: "local-plan",
        activityText: `Anyone going to ${title}?`,
        date: event?.date,
        time: event?.time,
        town: event?.town,
        eventId,
        eventTitle: title,
      },
    });
  };

  const handleToggleEventAttendance = async () => {
    if (!eventIsUpcoming) {
      Alert.alert(
        "Event has passed",
        "Going is closed once an event has passed."
      );
      return;
    }

    if (!token) {
      Alert.alert("Login required", "Please log in to mark that you're going.");
      return;
    }

    if (!eventId || updatingAttendance) return;

    try {
      setUpdatingAttendance(true);
      const result = await toggleEventAttendanceApi(eventId, token);
      if (result.event) {
        setEvent(result.event);
      }
    } catch (error) {
      Alert.alert("Could not update", error.message || "Please try again.");
    } finally {
      setUpdatingAttendance(false);
    }
  };

  const handleToggleSavedEvent = async () => {
    if (!eventIsUpcoming) {
      Alert.alert(
        "Event has passed",
        "Past events cannot be saved or reminded."
      );
      return;
    }

    if (!token) {
      Alert.alert("Login required", "Please log in to save events.");
      return;
    }

    if (!eventId || updatingPreference) return;

    try {
      setUpdatingPreference(true);
      const preference = await updateEventPreference(
        eventId,
        { saved: !isSaved },
        token
      );
      setEventPreference(preference);
    } catch (error) {
      Alert.alert("Could not update saved event", error.message || "Please try again.");
    } finally {
      setUpdatingPreference(false);
    }
  };

  const handleReminderChange = async (source, reminderTime) => {
    if (!eventIsUpcoming) {
      Alert.alert(
        "Event has passed",
        "Reminders are only available for upcoming events."
      );
      return;
    }

    if (!token) {
      Alert.alert("Login required", "Please log in to set reminders.");
      return;
    }

    if (!eventId || updatingPreference) return;

    const enabled = reminderTime !== "none";
    const updates = {
      reminderTime: enabled ? reminderTime : activeReminderTime,
      ...(source === "saved"
        ? { savedReminderEnabled: enabled, saved: true }
        : { goingReminderEnabled: enabled }),
    };

    try {
      setUpdatingPreference(true);
      const preference = await updateEventPreference(eventId, updates, token);
      setEventPreference(preference);
    } catch (error) {
      Alert.alert("Could not update reminder", error.message || "Please try again.");
    } finally {
      setUpdatingPreference(false);
    }
  };

  const handleToggleInterested = async (post) => {
    if (!token) {
      Alert.alert("Login required", "Please log in to show interest.");
      return;
    }

    try {
      await toggleBuddyPostInterest(post._id || post.id, token);
      await loadEventBuddyPosts();
    } catch (error) {
      Alert.alert("Could not update interest", error.message || "Please try again.");
    }
  };

  const handleSubmitBuddyReply = async (post, text) => {
    if (!token) {
      Alert.alert("Login required", "Please log in to reply.");
      return;
    }

    try {
      await createBuddyPostReply(post._id || post.id, text, token);
      await loadEventBuddyPosts();
    } catch (error) {
      Alert.alert("Could not add reply", error.message || "Please try again.");
    }
  };

  const handleUpdateBuddyReply = async (post, reply, text) => {
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
      await loadEventBuddyPosts();
    } catch (error) {
      Alert.alert("Could not update reply", error.message || "Please try again.");
    }
  };

  const handleDeleteBuddyReply = (post, reply) => {
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
            await loadEventBuddyPosts();
          } catch (error) {
            Alert.alert("Could not delete reply", error.message || "Please try again.");
          }
        },
      },
    ]);
  };

  const handleReport = (target) => {
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
  };

  const handleBlockProfile = (targetUser) => {
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
              await loadEventBuddyPosts();
              Alert.alert("User blocked", "Their posts and replies are now hidden.");
            } catch (error) {
              Alert.alert("Could not block user", error.message || "Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleInviteFriends = async () => {
    const details = [
      title,
      dateLabel ? `Date: ${dateLabel}` : "",
      timeLabel ? `Time: ${timeLabel}` : "",
      locationName ? `Location: ${locationName}` : "",
      address ? `Address: ${address}` : "",
      town ? `Town: ${town}` : "",
      "",
      "Found on Summit Scene.",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await Share.share({
        title: `Invite to ${title}`,
        message: `Want to go to this event?\n\n${details}`,
      });
    } catch (error) {
      console.warn("Share event issue:", error?.message);
      Alert.alert("Could not share", "Please try inviting friends again.");
    }
  };

  // Open native maps app (Apple Maps / Android geo / web) using location/town/title as a query
  const handleOpenMaps = () => {
    const hasExactCoords =
      Number.isFinite(event.latitude) && Number.isFinite(event.longitude);
    const query = encodeURIComponent(address || locationName || town || title);
    if (!hasExactCoords && !query) return;

    const url = hasExactCoords
      ? Platform.select({
          ios: `http://maps.apple.com/?ll=${event.latitude},${event.longitude}&q=${query}`,
          android: `geo:${event.latitude},${event.longitude}?q=${event.latitude},${event.longitude}(${query})`,
          default: `https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`,
        })
      : Platform.select({
          ios: `http://maps.apple.com/?q=${query}`,
          android: `geo:0,0?q=${query}`,
          default: `https://www.google.com/maps/search/?api=1&query=${query}`,
        });

    if (!url) return;

    Linking.openURL(url).catch((err) =>
      console.warn("Open maps issue:", err?.message || "Failed to open maps.")
    );
  };

  const handleOpenSummitSceneMap = () => {
    if (!eventId) return;

    navigation.navigate("tabs", {
      screen: "Map",
      params: {
        focusEventId: eventId,
        event,
        focusRequestedAt: Date.now(),
      },
      merge: true,
    });
  };

  // Defensive fallback if the screen is opened without an event.
  // Keep this below hooks so React hook order stays consistent.
  if (!event) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.background }]}
      >
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: theme.text }]}>
            Event details not available.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.scrollContent}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          {/* Hero image (optional)*/}
          {event.imageUrl && !heroImageFailed ? (
            <Image
              source={{ uri: event.imageUrl }}
              style={styles.heroImage}
              onError={() => setHeroImageFailed(true)}
            />
          ) : (
            <View
              style={[
                styles.heroFallback,
                { backgroundColor: theme.accentSoft || theme.card },
              ]}
            >
              <Text style={[styles.heroFallbackTitle, { color: theme.text }]}>
                {title}
              </Text>
              <Text
                style={[styles.heroFallbackSubtitle, { color: theme.textMuted }]}
              >
                {heroImageFailed
                  ? "Event image could not be loaded."
                  : "No event image provided."}
              </Text>
            </View>
          )}

          <View style={styles.content}>
            {/* Category + town row */}
            <View style={styles.topRow}>
              <View
                style={[
                  styles.categoryPill,
                  { backgroundColor: theme.accentSoft || theme.accent },
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    { color: theme.onAccent || theme.background },
                  ]}
                >
                  {category}
                </Text>
              </View>
              {town ? (
                <Text style={[styles.townText, { color: theme.textMuted }]}>
                  {town}
                </Text>
              ) : null}
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>

            {/* Date + time row */}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, { color: theme.textMuted }]}>
                  Date
                </Text>
                <Text style={[styles.metaValue, { color: theme.text }]}>
                  {dateLabel}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, { color: theme.textMuted }]}>
                  Time
                </Text>
                <Text style={[styles.metaValue, { color: theme.text }]}>
                  {timeLabel}
                </Text>
              </View>
            </View>

            {!eventIsUpcoming ? (
              <View
                style={[
                  styles.pastEventBanner,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.pastEventTitle, { color: theme.text }]}>
                  This event has passed
                </Text>
                <Text style={[styles.pastEventText, { color: theme.textMuted }]}>
                  Saved events, reminders, going status, and buddy posts are closed
                  for past events.
                </Text>
              </View>
            ) : null}

            <View
              style={[
                styles.actionPanel,
                { backgroundColor: theme.background, borderColor: theme.border },
              ]}
            >
              {eventIsUpcoming ? (
                <Pressable
                  style={[
                    styles.primaryActionButton,
                    {
                      backgroundColor: isGoing
                        ? theme.accentSoft || theme.card
                        : theme.accent,
                      borderColor: theme.accent,
                    },
                  ]}
                  onPress={handleToggleEventAttendance}
                  disabled={updatingAttendance}
                >
                  <Text
                    style={[
                      styles.primaryActionText,
                      {
                        color: isGoing
                          ? theme.accent
                          : theme.onAccent || theme.textOnAccent,
                      },
                    ]}
                  >
                    {updatingAttendance
                      ? "Updating..."
                      : isGoing
                        ? "Going"
                        : "I'm Going"}
                  </Text>
                </Pressable>
              ) : (
                <View
                  style={[
                    styles.primaryActionButton,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.primaryActionText, { color: theme.textMuted }]}>
                    Past Event
                  </Text>
                </View>
              )}

              <View style={styles.secondaryActionRow}>
                {eventIsUpcoming ? (
                  <Pressable
                    style={[
                      styles.secondaryActionButton,
                      {
                        backgroundColor: isSaved
                          ? theme.accentSoft || theme.card
                          : theme.card,
                        borderColor: isSaved ? theme.accent : theme.border,
                      },
                    ]}
                    onPress={handleToggleSavedEvent}
                    disabled={updatingPreference}
                  >
                    <Text
                      style={[
                        styles.secondaryActionText,
                        { color: isSaved ? theme.accent : theme.text },
                      ]}
                    >
                      {updatingPreference ? "Updating..." : isSaved ? "Saved" : "Save"}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={[
                    styles.secondaryActionButton,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                  onPress={handleInviteFriends}
                >
                  <Text style={[styles.secondaryActionText, { color: theme.text }]}>
                    Share
                  </Text>
                </Pressable>
              </View>

              <Text style={[styles.actionPanelHint, { color: theme.textMuted }]}>
                {!eventIsUpcoming
                  ? attendeesCount
                    ? `${attendeesCount} ${attendeesCount === 1 ? "person went" : "people went"}`
                    : "Past event"
                  : attendeesCount
                  ? `${attendeesCount} ${attendeesCount === 1 ? "person is" : "people are"} going`
                  : "Be the first to mark that you're going"}
              </Text>
            </View>

            {/* Location + map link */}
            {locationName || address ? (
              <View style={styles.locationBlock}>
                <Text style={[styles.metaLabel, { color: theme.textMuted }]}>
                  Location
                </Text>
                {locationName ? (
                  <Text style={[styles.locationText, { color: theme.text }]}>
                    {locationName}
                  </Text>
                ) : null}
                {address ? (
                  <Text
                    style={[styles.addressText, { color: theme.textMuted }]}
                  >
                    {address}
                  </Text>
                ) : null}

                <View style={styles.mapButtonRow}>
                  <Pressable
                    style={[
                      styles.mapButton,
                      {
                        borderColor: theme.accent,
                      },
                    ]}
                    onPress={handleOpenSummitSceneMap}
                  >
                    <Text style={[styles.mapButtonText, { color: theme.accent }]}>
                      Open in Summit Scene Map
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.mapButton,
                      {
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={handleOpenMaps}
                  >
                    <Text style={[styles.mapButtonText, { color: theme.text }]}>
                      Open in Maps
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {/* Description */}
            <View style={styles.section}>
              <Text style={[styles.sectionHeading, { color: theme.text }]}>
                About this event
              </Text>
              <Text style={[styles.description, { color: theme.textMuted }]}>
                {description}
              </Text>
            </View>

            <View
              style={[
                styles.buddySection,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.eventSocialHeader}>
                <View style={styles.buddySectionCopy}>
                  <Text style={[styles.sectionHeading, { color: theme.text }]}>
                    People and plans
                  </Text>
                  <Text style={[styles.buddyIntro, { color: theme.textMuted }]}>
                    {eventIsUpcoming
                      ? "See who is going, or make a buddy post for this event."
                      : "This event is read-only now that it has passed."}
                  </Text>
                </View>
                {eventIsUpcoming ? (
                  <Pressable
                    style={[styles.buddyButton, { backgroundColor: theme.accent }]}
                    onPress={handleFindEventBuddies}
                  >
                    <Text
                      style={[
                        styles.buddyButtonText,
                        { color: theme.onAccent || theme.textOnAccent },
                      ]}
                    >
                      Find Buddies
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {attendeeProfiles.length ? (
                <View style={styles.attendeesBlock}>
                  <Text style={[styles.buddyListTitle, { color: theme.text }]}>
                    {eventIsUpcoming ? "People going" : "People who went"}
                  </Text>
                  <View style={styles.attendeeList}>
                    {attendeePreview.map((attendee) => {
                      const avatarSource =
                        attendee.avatarKey && AVATARS[attendee.avatarKey]
                          ? AVATARS[attendee.avatarKey]
                          : attendee.profileImageUrl
                            ? { uri: attendee.profileImageUrl }
                            : null;
                      const initial =
                        attendee.name?.charAt(0).toUpperCase() || "?";

                      return (
                        <Pressable
                          key={attendee._id || attendee.id}
                          style={[
                            styles.attendeePill,
                            {
                              backgroundColor: theme.card,
                              borderColor: theme.border,
                            },
                          ]}
                          onPress={() => setProfileUser(attendee)}
                        >
                          <View
                            style={[
                              styles.attendeeAvatar,
                              {
                                backgroundColor:
                                  theme.pill || "rgba(0,0,0,0.06)",
                              },
                            ]}
                          >
                            {avatarSource ? (
                              <Image
                                source={avatarSource}
                                style={styles.attendeeAvatarImage}
                              />
                            ) : (
                              <Text
                                style={[
                                  styles.attendeeInitial,
                                  { color: theme.text },
                                ]}
                              >
                                {initial}
                              </Text>
                            )}
                          </View>
                          <Text
                            style={[
                              styles.attendeeName,
                              { color: theme.text },
                            ]}
                            numberOfLines={1}
                          >
                            {attendee.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {hiddenAttendeeCount ? (
                    <Pressable
                      style={styles.viewAllAttendeesButton}
                      onPress={() => setAttendeesModalOpen(true)}
                    >
                      <Text
                        style={[
                          styles.viewAllAttendeesText,
                          { color: theme.accent },
                        ]}
                      >
                        +{hiddenAttendeeCount} more going · View all
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <View
                  style={[
                    styles.emptyPeopleCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.buddyIntro, { color: theme.textMuted }]}>
                    {eventIsUpcoming
                      ? "No one has marked going yet."
                      : "No attendees were saved for this event."}
                  </Text>
                </View>
              )}

              {eventIsUpcoming && (isSaved || isGoing) ? (
                <View
                  style={[
                    styles.reminderPanel,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.reminderTitle, { color: theme.text }]}>
                    Reminders
                  </Text>
                  {isSaved ? (
                    <>
                      <Text style={[styles.reminderLabel, { color: theme.textMuted }]}>
                        Saved event reminder
                      </Text>
                      <View style={styles.reminderOptions}>
                        {REMINDER_OPTIONS.map((option) => {
                          const active =
                            option.value === "none"
                              ? !savedReminderEnabled
                              : savedReminderEnabled &&
                                activeReminderTime === option.value;
                          return (
                            <Pressable
                              key={`saved-${option.value}`}
                              style={[
                                styles.reminderPill,
                                {
                                  backgroundColor: active
                                    ? theme.accentSoft || theme.card
                                    : theme.background,
                                  borderColor: active ? theme.accent : theme.border,
                                },
                              ]}
                              onPress={() =>
                                handleReminderChange("saved", option.value)
                              }
                              disabled={updatingPreference}
                            >
                              <Text
                                style={[
                                  styles.reminderPillText,
                                  { color: active ? theme.accent : theme.textMuted },
                                ]}
                              >
                                {option.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </>
                  ) : null}

                  {isGoing ? (
                    <>
                      <Text style={[styles.reminderLabel, { color: theme.textMuted }]}>
                        Going reminder
                      </Text>
                      <View style={styles.reminderOptions}>
                        {REMINDER_OPTIONS.map((option) => {
                          const active =
                            option.value === "none"
                              ? !goingReminderEnabled
                              : goingReminderEnabled &&
                                activeReminderTime === option.value;
                          return (
                            <Pressable
                              key={`going-${option.value}`}
                              style={[
                                styles.reminderPill,
                                {
                                  backgroundColor: active
                                    ? theme.accentSoft || theme.card
                                    : theme.background,
                                  borderColor: active ? theme.accent : theme.border,
                                },
                              ]}
                              onPress={() =>
                                handleReminderChange("going", option.value)
                              }
                              disabled={updatingPreference}
                            >
                              <Text
                                style={[
                                  styles.reminderPillText,
                                  { color: active ? theme.accent : theme.textMuted },
                                ]}
                              >
                                {option.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </>
                  ) : null}
                </View>
              ) : null}

              {eventIsUpcoming ? (
                <Text style={[styles.buddyListTitle, { color: theme.text }]}>
                  People looking for event buddies
                </Text>
              ) : null}

              {eventIsUpcoming && loadingBuddyPosts ? (
                <View style={styles.buddyLoadingRow}>
                  <ActivityIndicator color={theme.accent} />
                  <Text style={[styles.buddyIntro, { color: theme.textMuted }]}>
                    Loading buddy posts...
                  </Text>
                </View>
              ) : null}

              {eventIsUpcoming && buddyPostsError ? (
                <View
                  style={[
                    styles.buddyErrorCard,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.buddyErrorTitle,
                      { color: theme.text },
                    ]}
                  >
                    Could not load buddy posts
                  </Text>
                  <Text
                    style={[
                      styles.buddyError,
                      { color: theme.textMuted },
                    ]}
                  >
                    {buddyPostsError}
                  </Text>
                  <Pressable
                    style={[
                      styles.buddyRetryButton,
                      { borderColor: theme.accent },
                    ]}
                    onPress={loadEventBuddyPosts}
                  >
                    <Text
                      style={[
                        styles.buddyRetryText,
                        { color: theme.accent },
                      ]}
                    >
                      Try again
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {eventIsUpcoming && !loadingBuddyPosts && !buddyPostsError && buddyPosts.length === 0 ? (
                <Text style={[styles.buddyIntro, { color: theme.textMuted }]}>
                  No one has posted for this event yet. Start the plan.
                </Text>
              ) : null}

              {eventIsUpcoming && !buddyPostsError && buddyPosts.length ? (
                <View style={styles.buddyList}>
                  {buddyPosts.map((post) => (
                    <BuddyPostCard
                      key={post._id || post.id}
                      post={post}
                      theme={theme}
                      currentUserId={currentUserId}
                      showLinkedEvent={false}
                      onOpenProfile={setProfileUser}
                      onToggleInterested={handleToggleInterested}
                      onSubmitReply={handleSubmitBuddyReply}
                      onUpdateReply={handleUpdateBuddyReply}
                      onDeleteReply={handleDeleteBuddyReply}
                      onReport={handleReport}
                    />
                  ))}
                </View>
              ) : null}
            </View>

            {/* Hosted by (business) block + modal */}
            <EventHostSection host={host} />

            <View style={styles.eventSafetyRow}>
              <Text style={[styles.eventSafetyText, { color: theme.textMuted }]}>
                Event details look off?
              </Text>
              <Pressable
                onPress={() =>
                  handleReport({
                    targetType: "event",
                    targetId: eventId,
                  })
                }
              >
                <Text style={[styles.eventSafetyLink, { color: theme.textMuted }]}>
                  Report Event
                </Text>
              </Pressable>
            </View>

            {/* Owner-only actions (edit/delete) */}
            {isOwner && (
              <EventOwnerSection onEdit={handleEdit} onDelete={handleDelete} />
            )}
          </View>
        </View>
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
      <Modal
        visible={attendeesModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setAttendeesModalOpen(false)}
      >
        <View style={styles.attendeesModalOverlay}>
          <View
            style={[
              styles.attendeesModalCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={styles.attendeesModalHeader}>
              <View>
                <Text style={[styles.attendeesModalTitle, { color: theme.text }]}>
                  Going to this event
                </Text>
                <Text
                  style={[
                    styles.attendeesModalSubtitle,
                    { color: theme.textMuted },
                  ]}
                >
                  {attendeeProfiles.length} people marked going
                </Text>
              </View>
              <Pressable onPress={() => setAttendeesModalOpen(false)}>
                <Text style={[styles.attendeesCloseText, { color: theme.accent }]}>
                  Close
                </Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {attendeeProfiles.map((attendee) => {
                const avatarSource =
                  attendee.avatarKey && AVATARS[attendee.avatarKey]
                    ? AVATARS[attendee.avatarKey]
                    : attendee.profileImageUrl
                      ? { uri: attendee.profileImageUrl }
                      : null;
                const initial = attendee.name?.charAt(0).toUpperCase() || "?";
                const meta = [attendee.town, attendee.userType]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <View
                    key={attendee._id || attendee.id}
                    style={[
                      styles.attendeeListRow,
                      { borderColor: theme.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.attendeeListAvatar,
                        { backgroundColor: theme.pill || "rgba(0,0,0,0.06)" },
                      ]}
                    >
                      {avatarSource ? (
                        <Image
                          source={avatarSource}
                          style={styles.attendeeListAvatarImage}
                        />
                      ) : (
                        <Text
                          style={[
                            styles.attendeeInitial,
                            { color: theme.text },
                          ]}
                        >
                          {initial}
                        </Text>
                      )}
                    </View>
                    <View style={styles.attendeeListCopy}>
                      <Text
                        style={[styles.attendeeListName, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {attendee.name}
                      </Text>
                      {meta ? (
                        <Text
                          style={[
                            styles.attendeeListMeta,
                            { color: theme.textMuted },
                          ]}
                          numberOfLines={1}
                        >
                          {meta}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      style={[
                        styles.attendeeProfileButton,
                        { borderColor: theme.accent },
                      ]}
                      onPress={() => {
                        setAttendeesModalOpen(false);
                        setProfileUser(attendee);
                      }}
                    >
                      <Text
                        style={[
                          styles.attendeeProfileButtonText,
                          { color: theme.accent },
                        ]}
                      >
                        View Profile
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  card: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  heroImage: {
    width: "100%",
    height: 220,
  },
  heroFallback: {
    width: "100%",
    height: 220,
    paddingHorizontal: 16,
    paddingVertical: 18,
    justifyContent: "flex-end",
  },
  heroFallbackTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
  },
  heroFallbackSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  content: {
    padding: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  townText: {
    fontSize: 13,
    fontWeight: "500",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 13,
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  locationBlock: {
    marginBottom: 16,
  },
  locationText: {
    fontSize: 14,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  mapButtonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  mapButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  mapButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  actionPanel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  pastEventBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  pastEventTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 4,
  },
  pastEventText: {
    fontSize: 13,
    lineHeight: 18,
  },
  primaryActionButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: "900",
  },
  secondaryActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryActionButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: "800",
  },
  actionPanelHint: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  section: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  buddySection: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  eventSocialHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  attendeesBlock: {
    marginBottom: 14,
  },
  emptyPeopleCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  reminderPanel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 8,
  },
  reminderLabel: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6,
    marginBottom: 7,
  },
  reminderOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reminderPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  reminderPillText: {
    fontSize: 12,
    fontWeight: "800",
  },
  attendeeList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  attendeePill: {
    maxWidth: "48%",
    minWidth: 132,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  attendeeAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
    overflow: "hidden",
  },
  attendeeAvatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  attendeeInitial: {
    fontSize: 12,
    fontWeight: "800",
  },
  attendeeName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  viewAllAttendeesButton: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  viewAllAttendeesText: {
    fontSize: 13,
    fontWeight: "800",
  },
  attendeesModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  attendeesModalCard: {
    maxHeight: "82%",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  attendeesModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  attendeesModalTitle: {
    fontSize: 17,
    fontWeight: "900",
  },
  attendeesModalSubtitle: {
    fontSize: 13,
    marginTop: 3,
  },
  attendeesCloseText: {
    fontSize: 14,
    fontWeight: "800",
  },
  attendeeListRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingVertical: 10,
    gap: 10,
  },
  attendeeListAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  attendeeListAvatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  attendeeListCopy: {
    flex: 1,
  },
  attendeeListName: {
    fontSize: 14,
    fontWeight: "800",
  },
  attendeeListMeta: {
    fontSize: 12,
    marginTop: 2,
    textTransform: "capitalize",
  },
  attendeeProfileButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  attendeeProfileButtonText: {
    fontSize: 12,
    fontWeight: "800",
  },
  eventSafetyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    marginBottom: 14,
  },
  eventSafetyText: {
    fontSize: 12,
  },
  eventSafetyLink: {
    fontSize: 12,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  buddySectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  buddySectionCopy: {
    flex: 1,
  },
  buddyIntro: {
    fontSize: 13,
    lineHeight: 19,
  },
  buddyButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buddyButtonText: {
    fontSize: 12,
    fontWeight: "800",
  },
  buddyListTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },
  buddyLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buddyErrorCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  buddyErrorTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  buddyError: {
    fontSize: 13,
    lineHeight: 19,
  },
  buddyRetryButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  buddyRetryText: {
    fontSize: 13,
    fontWeight: "800",
  },
  buddyList: {
    gap: 10,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  errorText: {
    fontSize: 14,
  },
});
