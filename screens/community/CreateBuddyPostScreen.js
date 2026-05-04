// screens/community/CreateBuddyPostScreen.js
// Create a structured buddy post for events, hiking, skiing/snowboarding, and more.

import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppLogoHeader from "../../components/AppLogoHeader";
import AppButton from "../../components/common/AppButton";
import GroupedCategoryModal from "../../components/common/GroupedCategoryModal";
import PageHeader from "../../components/common/PageHeader";
import DatePickerModal from "../../components/events/DatePickerModal";
import TimePickerModal from "../../components/events/TimePickerModal";
import {
  COMMUNITY_FORM_CATEGORIES,
  getCommunityCategoryGroups,
} from "../../constants/eventCategories";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { fetchEventById, fetchEvents } from "../../services/eventsApi";
import { createBuddyPost } from "../../services/buddyPostsApi";
import { getBuddyTypeForEventCategory } from "../../utils/buddyPostPrefill";

const BUDDY_TYPES = [
  { label: "Event", value: "event" },
  { label: "Hiking", value: "hiking" },
  { label: "Skiing", value: "skiing" },
  { label: "Snowboarding", value: "snowboarding" },
  { label: "Disc golf", value: "discgolf" },
  { label: "Walking", value: "walking" },
  { label: "Book club", value: "bookclub" },
  { label: "Art", value: "art" },
  { label: "Bingo", value: "bingo" },
  { label: "Trivia", value: "trivia" },
  { label: "Shopping", value: "shopping" },
  { label: "Notice", value: "notice" },
  { label: "General", value: "general" },
  { label: "Other", value: "other" },
];

const TOWNS = ["Banff", "Canmore", "Lake Louise", "All"];
const CATEGORY_GROUPS = getCommunityCategoryGroups();
const COMMUNITY_TYPES = [
  {
    label: "Local Plan",
    value: "local-plan",
    helper: "A specific plan, event, walk, coffee, ski day, or meetup.",
  },
  {
    label: "New in Town",
    value: "new-in-town",
    helper: "Seasonal workers, visitors, newcomers, and locals open to meeting people.",
  },
  {
    label: "Group",
    value: "group",
    helper: "Repeatable interest groups like book club, hiking, trivia, or art nights.",
  },
  {
    label: "Local Notice",
    value: "notice",
    helper: "Garage sales, gear swaps, lost and found, free stuff, or practical town notices.",
  },
  {
    label: "Community Update",
    value: "update",
    helper: "Useful local updates, volunteer callouts, notices, and safety notes.",
  },
];
const SKILL_LEVELS = [
  { label: "Beginner", value: "beginner" },
  { label: "Casual", value: "casual" },
  { label: "Experienced", value: "experienced" },
];
const GROUP_SIZES = [
  { label: "Small group", value: "small-group" },
  { label: "Large group", value: "large-group" },
  { label: "Any", value: "any" },
];
const SCHEDULE_TYPES = [
  { label: "One-time", value: "single" },
  { label: "Recurring", value: "recurring" },
];
const RECURRENCE_FREQUENCIES = [
  { label: "Weekly", value: "weekly" },
  { label: "Biweekly", value: "biweekly" },
  { label: "Monthly", value: "monthly" },
];
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const SKILL_TYPES = new Set(["hiking", "skiing", "snowboarding", "discgolf"]);
const SKILL_CATEGORIES = new Set(["Outdoors", "Ski Hill Events", "Disc Golf"]);

const COMMUNITY_FORM_COPY = {
  "local-plan": {
    title: "Create Local Plan",
    subtitle: "Share a plan people can join, like coffee before open mic, a walk, or an event buddy post.",
    categoryLabel: "Category",
    categoryRequired: true,
    detailsLabel: "Plan",
    detailsPlaceholder: "What is the plan? Add enough detail for someone to say yes.",
    townLabel: "Where",
    dateLabel: "Date",
    timeLabel: "Time",
    showDateTime: true,
    showSchedule: true,
    showGroupSize: true,
    submitLabel: "Share Local Plan",
    defaultCategory: "",
    defaultType: "event",
  },
  "new-in-town": {
    title: "New in Town",
    subtitle: "Introduce yourself and make it easy for people nearby to say hello.",
    categoryLabel: "Main interest",
    categoryRequired: false,
    detailsLabel: "Intro",
    detailsPlaceholder: "New here? Share where you are based, what you like doing, and who you would like to meet.",
    townLabel: "Where are you based?",
    dateLabel: "",
    timeLabel: "",
    showDateTime: false,
    showSchedule: false,
    showGroupSize: false,
    submitLabel: "Share Intro",
    defaultCategory: "Other",
    defaultType: "general",
  },
  group: {
    title: "Start a Group",
    subtitle: "Create a repeatable interest group like book club, trivia team, hiking crew, or art night.",
    categoryLabel: "Group category",
    categoryRequired: true,
    detailsLabel: "Group idea",
    detailsPlaceholder: "What is the group, who is it for, and how often do you want to meet?",
    townLabel: "Home base",
    dateLabel: "First meetup date",
    timeLabel: "Usual time",
    showDateTime: true,
    showSchedule: true,
    showGroupSize: true,
    submitLabel: "Share Group",
    defaultCategory: "",
    defaultType: "general",
  },
  notice: {
    title: "Share Local Notice",
    subtitle: "Post a useful notice like a garage sale, gear swap, lost and found, or free stuff.",
    categoryLabel: "Notice type",
    categoryRequired: true,
    detailsLabel: "Notice",
    detailsPlaceholder: "What are you sharing? Add the location area, timing, and what people should know.",
    townLabel: "Applies to",
    dateLabel: "Date",
    timeLabel: "Time",
    showDateTime: true,
    showSchedule: false,
    showGroupSize: false,
    submitLabel: "Share Notice",
    defaultCategory: "",
    defaultType: "notice",
  },
  update: {
    title: "Share Community Update",
    subtitle: "Post a volunteer callout, safety note, or practical heads-up.",
    categoryLabel: "Topic",
    categoryRequired: false,
    detailsLabel: "Update",
    detailsPlaceholder: "What should locals know? Keep it useful and specific.",
    townLabel: "Applies to",
    dateLabel: "Relevant date",
    timeLabel: "Time",
    showDateTime: true,
    showSchedule: false,
    showGroupSize: false,
    submitLabel: "Share Update",
    defaultCategory: "Community Info Session",
    defaultType: "general",
  },
};

function formatDateForApi(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(date) {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = ((hours + 11) % 12) + 1;
  return `${displayHours}:${minutes} ${suffix}`;
}

function ChipGroup({ options, selectedValue, onSelect, theme }) {
  return (
    <View style={styles.chipRow}>
      {options.map((option) => {
        const value = option.value ?? option;
        const label = option.label ?? option;
        const selected = value === selectedValue;

        return (
          <Pressable
            key={value}
            onPress={() => onSelect(value)}
            style={[
              styles.chip,
              {
                backgroundColor: selected
                  ? theme.accentSoft || theme.card
                  : theme.card,
                borderColor: selected ? theme.accent : theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: selected ? theme.text : theme.textMuted,
                  fontWeight: selected ? "700" : "500",
                },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function parseDateString(value) {
  if (!value) return new Date();
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

function normalizeCategory(value) {
  if (typeof value !== "string") return "";

  const trimmed = value.trim();
  if (!trimmed || trimmed === "Event") return "";

  const aliases = {
    "Food and Drink": "Food Trucks",
    "Food + Drink": "Food Trucks",
    "Food/Drink": "Food Trucks",
    "Food & Drink": "Food Trucks",
    Market: "Markets",
    "Sports Watch Party": "Sports/Watch Party",
    "Seasonal Holiday Special": "Seasonal/Holiday Special",
    "Gear Sale": "Gear Sale / Swap",
    "Gear Swap": "Gear Sale / Swap",
    "Lost and Found": "Lost & Found",
  };

  if (aliases[trimmed]) return aliases[trimmed];

  return (
    COMMUNITY_FORM_CATEGORIES.find(
      (category) => category.toLowerCase() === trimmed.toLowerCase()
    ) || ""
  );
}

function getEventId(event) {
  if (!event) return "";
  return event._id || event.id || "";
}

function getEventSearchText(event) {
  return [
    event?.title,
    event?.town,
    event?.category,
    event?.date,
    event?.time,
    event?.locationName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function CreateBuddyPostScreen({ navigation, route }) {
  const { token } = useAuth();
  const { theme } = useTheme();
  const eventBuddy = route?.params?.eventBuddy || {};
  const initialCategory = normalizeCategory(eventBuddy.category);
  const initialCommunityType =
    COMMUNITY_TYPES.some((option) => option.value === eventBuddy.communityType)
      ? eventBuddy.communityType
      : "local-plan";

  const [communityType, setCommunityType] = useState(initialCommunityType);
  const [category, setCategory] = useState(initialCategory);
  const [type, setType] = useState(
    initialCategory
      ? getBuddyTypeForEventCategory(initialCategory)
      : eventBuddy.type || ""
  );
  const [activityText, setActivityText] = useState(eventBuddy.activityText || "");
  const [town, setTown] = useState(eventBuddy.town || "");
  const [dateObj, setDateObj] = useState(parseDateString(eventBuddy.date));
  const [timeObj, setTimeObj] = useState(new Date());
  const [time, setTime] = useState(eventBuddy.time || "");
  const [scheduleType, setScheduleType] = useState("single");
  const [recurrenceFrequency, setRecurrenceFrequency] = useState("weekly");
  const [recurrenceWeekday, setRecurrenceWeekday] = useState("");
  const [recurrenceUntilDateObj, setRecurrenceUntilDateObj] = useState(new Date());
  const [recurrenceUntilDate, setRecurrenceUntilDate] = useState("");
  const [skillLevel, setSkillLevel] = useState("");
  const [groupSizePreference, setGroupSizePreference] = useState("any");
  const [linkedEvent, setLinkedEvent] = useState(
    eventBuddy.eventId
      ? {
          _id: eventBuddy.eventId,
          id: eventBuddy.eventId,
          title: eventBuddy.eventTitle || "Linked event",
          category: initialCategory,
          town: eventBuddy.town,
          date: eventBuddy.date,
          time: eventBuddy.time,
        }
      : null
  );
  const [eventPickerOpen, setEventPickerOpen] = useState(false);
  const [eventSearch, setEventSearch] = useState("");
  const [eventOptions, setEventOptions] = useState([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showUntilDatePicker, setShowUntilDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const formCopy =
    COMMUNITY_FORM_COPY[communityType] || COMMUNITY_FORM_COPY["local-plan"];
  const effectiveCategory = category || formCopy.defaultCategory;
  const effectiveType =
    (category ? getBuddyTypeForEventCategory(category) : type) ||
    formCopy.defaultType;
  const hasLinkedEvent = Boolean(getEventId(linkedEvent));
  const canLinkEvent = communityType === "local-plan";
  const canShowSchedule = formCopy.showSchedule && !hasLinkedEvent;
  const showSkillLevel =
    formCopy.showGroupSize &&
    (SKILL_TYPES.has(effectiveType) || SKILL_CATEGORIES.has(effectiveCategory));
  const selectedActivityLabel = useMemo(
    () =>
      category ||
      BUDDY_TYPES.find((option) => option.value === type)?.label ||
      "",
    [category, type]
  );
  const filteredEventOptions = useMemo(() => {
    const query = eventSearch.trim().toLowerCase();
    const events = Array.isArray(eventOptions) ? eventOptions : [];
    if (!query) return events.slice(0, 30);

    return events
      .filter((event) => getEventSearchText(event).includes(query))
      .slice(0, 30);
  }, [eventOptions, eventSearch]);

  async function loadEventOptions() {
    try {
      setLoadingEvents(true);
      setEventsError("");
      const events = await fetchEvents({ limit: 50 });
      setEventOptions(events.events || events || []);
      setEventsLoaded(true);
    } catch (error) {
      setEventsError(error.message || "Could not load events.");
      setEventsLoaded(true);
    } finally {
      setLoadingEvents(false);
    }
  }

  useEffect(() => {
    if (!canLinkEvent && linkedEvent) {
      setLinkedEvent(null);
    }

    if (!category && formCopy.defaultCategory) {
      setType(formCopy.defaultType);
    }

    if (!canShowSchedule && scheduleType !== "single") {
      setScheduleType("single");
      setRecurrenceWeekday("");
      setRecurrenceUntilDate("");
    }

    if (!formCopy.showGroupSize && groupSizePreference !== "any") {
      setGroupSizePreference("any");
    }
  }, [
    category,
    formCopy.defaultCategory,
    formCopy.defaultType,
    formCopy.showGroupSize,
    canLinkEvent,
    canShowSchedule,
    groupSizePreference,
    linkedEvent,
    scheduleType,
  ]);

  function handleSelectCategory(nextCategory) {
    setCategory(nextCategory);
    const nextType = getBuddyTypeForEventCategory(nextCategory);
    setType(nextType);
    if (!SKILL_TYPES.has(nextType) && !SKILL_CATEGORIES.has(nextCategory)) {
      setSkillLevel("");
    }
    setShowCategoryPicker(false);
  }

  function applyLinkedEvent(nextEvent) {
    if (!nextEvent) return;

    const linkedCategory = normalizeCategory(nextEvent.category);
    setLinkedEvent(nextEvent);

    if (linkedCategory) {
      const linkedType = getBuddyTypeForEventCategory(linkedCategory);
      setCategory(linkedCategory);
      setType(linkedType);
      if (!SKILL_TYPES.has(linkedType) && !SKILL_CATEGORIES.has(linkedCategory)) {
        setSkillLevel("");
      }
    }

    if (nextEvent.town) {
      setTown(nextEvent.town);
    }
    if (nextEvent.date) {
      setDateObj(parseDateString(nextEvent.date));
    }
    if (nextEvent.time) {
      setTime(nextEvent.time);
    }
    if (!activityText.trim() && nextEvent.title) {
      setActivityText(`Anyone going to ${nextEvent.title}?`);
    }

    setCommunityType("local-plan");
    setScheduleType("single");
    setRecurrenceWeekday("");
    setRecurrenceUntilDate("");
    setEventPickerOpen(false);
  }

  useEffect(() => {
    if (!eventBuddy.eventId || category) return undefined;

    let cancelled = false;

    async function fillCategoryFromLinkedEvent() {
      try {
        const linkedEvent = await fetchEventById(eventBuddy.eventId);
        if (cancelled) return;
        setLinkedEvent(linkedEvent);

        const linkedCategory = normalizeCategory(linkedEvent?.category);
        if (linkedCategory) {
          const linkedType = getBuddyTypeForEventCategory(linkedCategory);
          setCategory(linkedCategory);
          setType(linkedType);
          if (!SKILL_TYPES.has(linkedType) && !SKILL_CATEGORIES.has(linkedCategory)) {
            setSkillLevel("");
          }
        }

        if (!town && linkedEvent?.town) {
          setTown(linkedEvent.town);
        }
        if (!eventBuddy.date && linkedEvent?.date) {
          setDateObj(parseDateString(linkedEvent.date));
        }
        if (!time && linkedEvent?.time) {
          setTime(linkedEvent.time);
        }
      } catch (error) {
        console.warn("Could not prefill linked event category:", error?.message);
      }
    }

    fillCategoryFromLinkedEvent();

    return () => {
      cancelled = true;
    };
  }, [category, eventBuddy.date, eventBuddy.eventId, time, town]);

  useEffect(() => {
    if (eventPickerOpen && !eventsLoaded && !loadingEvents) {
      loadEventOptions();
    }
  }, [eventPickerOpen, eventsLoaded, loadingEvents]);

  async function handleSubmit() {
    const trimmedActivityText = activityText.trim();

    if (formCopy.categoryRequired && !category) {
      Alert.alert("Missing category", "Please choose a category.");
      return;
    }

    if (!trimmedActivityText) {
      Alert.alert("Missing activity", "Please describe what you want to do.");
      return;
    }

    if (!town) {
      Alert.alert("Missing town", "Please choose a town.");
      return;
    }

    if (showSkillLevel && !skillLevel) {
      Alert.alert("Missing skill level", "Please choose a skill level for this activity.");
      return;
    }

    if (formCopy.showGroupSize && !groupSizePreference) {
      Alert.alert("Missing group size", "Please choose a group size preference.");
      return;
    }

    if (canShowSchedule && scheduleType === "recurring" && !recurrenceWeekday) {
      Alert.alert("Missing weekday", "Please choose which day this repeats.");
      return;
    }

    if (!token) {
      Alert.alert("Login required", "Please log in before creating a buddy post.");
      return;
    }

    try {
      setSubmitting(true);

      await createBuddyPost(
        {
          type: effectiveType,
          category: effectiveCategory || undefined,
          communityType,
          activityText: trimmedActivityText,
          date: formatDateForApi(dateObj),
          time: formCopy.showDateTime ? time || undefined : undefined,
          town,
          skillLevel: showSkillLevel ? skillLevel : undefined,
          groupSizePreference: formCopy.showGroupSize
            ? groupSizePreference
            : "any",
          scheduleType: canShowSchedule ? scheduleType : "single",
          recurrence:
            canShowSchedule && scheduleType === "recurring"
              ? {
                  frequency: recurrenceFrequency,
                  weekday: recurrenceWeekday,
                  untilDate: recurrenceUntilDate || undefined,
                }
              : undefined,
          eventId: getEventId(linkedEvent) || undefined,
        },
        token
      );

      Alert.alert("Buddy post shared", "Your buddy post is now live.", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert("Could not share post", error.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <AppLogoHeader />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <PageHeader
            title={formCopy.title}
            subtitle={
              eventBuddy.eventTitle
                ? `Find someone going to ${eventBuddy.eventTitle}.`
                : formCopy.subtitle
            }
          />

          <View
            style={[
              styles.boundaryNote,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.boundaryNoteTitle, { color: theme.text }]}>
              Community post
            </Text>
            <Text style={[styles.boundaryNoteText, { color: theme.textMuted }]}>
              This appears in Find People for plans, groups, intros, and buddy
              posts. Official hosted events are posted separately by business or
              organizer profiles.
            </Text>
          </View>

          {canLinkEvent ? (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Link an event
              </Text>
              <View
                style={[
                  styles.linkedEventBox,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                {linkedEvent ? (
                  <>
                    <Text style={[styles.linkedEventTitle, { color: theme.text }]}>
                      {linkedEvent.title || "Linked event"}
                    </Text>
                    <Text style={[styles.linkedEventMeta, { color: theme.textMuted }]}>
                      {[linkedEvent.town, linkedEvent.category, linkedEvent.date]
                        .filter(Boolean)
                        .join(" | ")}
                    </Text>
                    <Text style={[styles.linkedEventHint, { color: theme.textMuted }]}>
                      This buddy post follows the linked event, so recurring schedule
                      options are hidden.
                    </Text>
                    <View style={styles.linkedEventActions}>
                      <Pressable
                        style={[
                          styles.smallOutlineButton,
                          { borderColor: theme.accent },
                        ]}
                        onPress={() => setEventPickerOpen(true)}
                      >
                        <Text
                          style={[
                            styles.smallOutlineButtonText,
                            { color: theme.accent },
                          ]}
                        >
                          Change Event
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.smallOutlineButton,
                          { borderColor: theme.border },
                        ]}
                        onPress={() => setLinkedEvent(null)}
                      >
                        <Text
                          style={[
                            styles.smallOutlineButtonText,
                            { color: theme.textMuted },
                          ]}
                        >
                          Remove
                        </Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={[styles.linkedEventTitle, { color: theme.text }]}>
                      Optional
                    </Text>
                    <Text style={[styles.linkedEventMeta, { color: theme.textMuted }]}>
                      Tag an event if this post is about meeting up before, during,
                      or after something already listed.
                    </Text>
                    <Pressable
                      style={[
                        styles.smallOutlineButton,
                        { borderColor: theme.accent },
                      ]}
                      onPress={() => setEventPickerOpen(true)}
                    >
                      <Text
                        style={[
                          styles.smallOutlineButtonText,
                          { color: theme.accent },
                        ]}
                      >
                        Link an Event
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            </>
          ) : null}

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Activity
          </Text>

          <Text style={[styles.label, { color: theme.textMuted }]}>
            Community section
          </Text>
          <ChipGroup
            options={COMMUNITY_TYPES}
            selectedValue={communityType}
            onSelect={setCommunityType}
            theme={theme}
          />
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            {
              COMMUNITY_TYPES.find((option) => option.value === communityType)
                ?.helper
            }
          </Text>

          <Text style={[styles.label, { color: theme.textMuted }]}>
            {formCopy.categoryLabel}
            {formCopy.categoryRequired ? " (Required)" : " (Optional)"}
          </Text>
          <Pressable
            style={[
              styles.selectButton,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setShowCategoryPicker(true)}
          >
            <Text
              style={[
                styles.selectText,
                { color: category ? theme.text : theme.textMuted },
              ]}
            >
              {category ||
                (formCopy.categoryRequired
                  ? "Choose a category"
                  : "Choose a category if helpful")}
            </Text>
          </Pressable>

          <Text style={[styles.label, { color: theme.textMuted }]}>
            {formCopy.detailsLabel} (Required)
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder={
              formCopy.detailsPlaceholder ||
              (selectedActivityLabel
                ? `What kind of ${selectedActivityLabel.toLowerCase()} plan do you have?`
                : "What do you want to do?")
            }
            placeholderTextColor={theme.textMuted}
            value={activityText}
            onChangeText={setActivityText}
            multiline
            textAlignVertical="top"
          />

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {formCopy.showDateTime ? "When and where" : "Where"}
          </Text>

          <Text style={[styles.label, { color: theme.textMuted }]}>
            {formCopy.townLabel} (Required)
          </Text>
          <ChipGroup
            options={TOWNS}
            selectedValue={town}
            onSelect={setTown}
            theme={theme}
          />

          {formCopy.showDateTime ? (
            <>
              <Text style={[styles.label, { color: theme.textMuted }]}>
                {scheduleType === "recurring"
                  ? "First meetup date (Required)"
                  : `${formCopy.dateLabel} (Required)`}
              </Text>
              <Pressable
                style={[
                  styles.selectButton,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[styles.selectText, { color: theme.text }]}>
                  {formatDisplayDate(dateObj)}
                </Text>
              </Pressable>

              <Text style={[styles.label, { color: theme.textMuted }]}>
                {formCopy.timeLabel} (Optional)
              </Text>
              <View style={styles.timeRow}>
                <Pressable
                  style={[
                    styles.selectButton,
                    styles.timeSelect,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={[styles.selectText, { color: theme.text }]}>
                    {time || "Select time"}
                  </Text>
                </Pressable>
                {time ? (
                  <Pressable
                    style={styles.clearTimeButton}
                    onPress={() => setTime("")}
                  >
                    <Text style={[styles.clearTimeText, { color: theme.accent }]}>
                      Clear
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </>
          ) : null}

          {canShowSchedule ? (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Schedule
              </Text>
              <Text style={[styles.label, { color: theme.textMuted }]}>
                Schedule type
              </Text>
              <ChipGroup
                options={SCHEDULE_TYPES}
                selectedValue={scheduleType}
                onSelect={(value) => {
                  setScheduleType(value);
                  if (value === "single") {
                    setRecurrenceWeekday("");
                    setRecurrenceUntilDate("");
                  }
                }}
                theme={theme}
              />

              {scheduleType === "recurring" ? (
                <>
                  <Text style={[styles.label, { color: theme.textMuted }]}>
                    Repeats
                  </Text>
                  <ChipGroup
                    options={RECURRENCE_FREQUENCIES}
                    selectedValue={recurrenceFrequency}
                    onSelect={setRecurrenceFrequency}
                    theme={theme}
                  />

                  <Text style={[styles.label, { color: theme.textMuted }]}>
                    Day
                  </Text>
                  <ChipGroup
                    options={WEEKDAYS}
                    selectedValue={recurrenceWeekday}
                    onSelect={setRecurrenceWeekday}
                    theme={theme}
                  />

                  <Text style={[styles.label, { color: theme.textMuted }]}>
                    End date (Optional)
                  </Text>
                  <View style={styles.timeRow}>
                    <Pressable
                      style={[
                        styles.selectButton,
                        styles.timeSelect,
                        {
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                        },
                      ]}
                      onPress={() => setShowUntilDatePicker(true)}
                    >
                      <Text style={[styles.selectText, { color: theme.text }]}>
                        {recurrenceUntilDate || "No end date"}
                      </Text>
                    </Pressable>
                    {recurrenceUntilDate ? (
                      <Pressable
                        style={styles.clearTimeButton}
                        onPress={() => setRecurrenceUntilDate("")}
                      >
                        <Text style={[styles.clearTimeText, { color: theme.accent }]}>
                          Clear
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </>
              ) : null}
            </>
          ) : null}

          {showSkillLevel || formCopy.showGroupSize ? (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Preferences
              </Text>

              {showSkillLevel ? (
                <>
                  <Text style={[styles.label, { color: theme.textMuted }]}>
                    Skill level (Required)
                  </Text>
                  <ChipGroup
                    options={SKILL_LEVELS}
                    selectedValue={skillLevel}
                    onSelect={setSkillLevel}
                    theme={theme}
                  />
                </>
              ) : null}

              {formCopy.showGroupSize ? (
                <>
                  <Text style={[styles.label, { color: theme.textMuted }]}>
                    Group size (Required)
                  </Text>
                  <ChipGroup
                    options={GROUP_SIZES}
                    selectedValue={groupSizePreference}
                    onSelect={setGroupSizePreference}
                    theme={theme}
                  />
                </>
              ) : null}
            </>
          ) : null}

          <AppButton
            title={submitting ? "Sharing..." : formCopy.submitLabel}
            onPress={handleSubmit}
            loading={submitting}
            variant="primary"
            size="lg"
            style={styles.submitButton}
          />
        </ScrollView>

        <DatePickerModal
          visible={showDatePicker}
          initialDate={dateObj}
          title="Select date"
          onCancel={() => setShowDatePicker(false)}
          onConfirm={(pickedDate) => {
            setDateObj(pickedDate);
            setShowDatePicker(false);
          }}
        />

        <TimePickerModal
          visible={showTimePicker}
          initialTime={timeObj}
          title="Select time"
          onCancel={() => setShowTimePicker(false)}
          onConfirm={(pickedDate) => {
            setTimeObj(pickedDate);
            setTime(formatTime(pickedDate));
            setShowTimePicker(false);
          }}
        />

        <DatePickerModal
          visible={showUntilDatePicker}
          initialDate={recurrenceUntilDateObj}
          title="Select end date"
          onCancel={() => setShowUntilDatePicker(false)}
          onConfirm={(pickedDate) => {
            setRecurrenceUntilDateObj(pickedDate);
            setRecurrenceUntilDate(formatDateForApi(pickedDate));
            setShowUntilDatePicker(false);
          }}
        />

        <GroupedCategoryModal
          visible={showCategoryPicker}
          title="Choose category"
          groups={CATEGORY_GROUPS}
          selectedValue={category}
          onSelect={handleSelectCategory}
          onClose={() => setShowCategoryPicker(false)}
        />

        <Modal
          visible={eventPickerOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setEventPickerOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.eventPickerCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <View style={styles.eventPickerHeader}>
                <View style={styles.eventPickerHeaderCopy}>
                  <Text style={[styles.eventPickerTitle, { color: theme.text }]}>
                    Link an event
                  </Text>
                  <Text
                    style={[
                      styles.eventPickerSubtitle,
                      { color: theme.textMuted },
                    ]}
                  >
                    Search by name, town, category, or date.
                  </Text>
                </View>
                <Pressable onPress={() => setEventPickerOpen(false)}>
                  <Text style={[styles.closeText, { color: theme.accent }]}>
                    Close
                  </Text>
                </Pressable>
              </View>

              <TextInput
                style={[
                  styles.eventSearchInput,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="Search events..."
                placeholderTextColor={theme.textMuted}
                value={eventSearch}
                onChangeText={setEventSearch}
                autoCapitalize="none"
              />

              {loadingEvents ? (
                <View style={styles.eventPickerLoading}>
                  <ActivityIndicator color={theme.accent} />
                  <Text style={[styles.helperText, { color: theme.textMuted }]}>
                    Loading events...
                  </Text>
                </View>
              ) : null}

              {eventsError ? (
                <View style={styles.eventPickerEmpty}>
                  <Text style={[styles.helperText, { color: theme.textMuted }]}>
                    {eventsError}
                  </Text>
                  <Pressable
                    style={[
                      styles.smallOutlineButton,
                      { borderColor: theme.accent },
                    ]}
                    onPress={loadEventOptions}
                  >
                    <Text
                      style={[
                        styles.smallOutlineButtonText,
                        { color: theme.accent },
                      ]}
                    >
                      Try Again
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {!loadingEvents && !eventsError ? (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {filteredEventOptions.length ? (
                    filteredEventOptions.map((event) => (
                      <Pressable
                        key={getEventId(event)}
                        style={[
                          styles.eventOption,
                          { borderColor: theme.border },
                        ]}
                        onPress={() => applyLinkedEvent(event)}
                      >
                        <Text
                          style={[styles.eventOptionTitle, { color: theme.text }]}
                          numberOfLines={1}
                        >
                          {event.title || "Untitled event"}
                        </Text>
                        <Text
                          style={[
                            styles.eventOptionMeta,
                            { color: theme.textMuted },
                          ]}
                          numberOfLines={2}
                        >
                          {[event.town, event.category, event.date, event.time]
                            .filter(Boolean)
                            .join(" | ")}
                        </Text>
                      </Pressable>
                    ))
                  ) : (
                    <View style={styles.eventPickerEmpty}>
                      <Text style={[styles.helperText, { color: theme.textMuted }]}>
                        No matching events found.
                      </Text>
                    </View>
                  )}
                </ScrollView>
              ) : null}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  boundaryNote: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  boundaryNoteTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  boundaryNoteText: {
    fontSize: 12,
    lineHeight: 17,
  },
  linkedEventBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
  },
  linkedEventTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  linkedEventMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
  linkedEventHint: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  linkedEventActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  smallOutlineButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 10,
  },
  smallOutlineButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chipText: {
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  textArea: {
    minHeight: 112,
  },
  selectButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 14,
  },
  selectText: {
    fontSize: 15,
    fontWeight: "600",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 2,
  },
  timeSelect: {
    flex: 1,
  },
  clearTimeButton: {
    paddingHorizontal: 4,
    paddingVertical: 8,
    marginBottom: 14,
  },
  clearTimeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  submitButton: {
    marginTop: 12,
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  eventPickerCard: {
    maxHeight: "82%",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  eventPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  eventPickerHeaderCopy: {
    flex: 1,
  },
  eventPickerTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  eventPickerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  closeText: {
    fontSize: 14,
    fontWeight: "800",
  },
  eventSearchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  eventPickerLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
  },
  eventPickerEmpty: {
    paddingVertical: 14,
  },
  eventOption: {
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  eventOptionTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  eventOptionMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
});
