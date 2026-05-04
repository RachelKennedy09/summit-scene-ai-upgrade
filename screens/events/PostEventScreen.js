// screens/PostEventScreen.js
// Create a new event (Business only)
// - Uses shared date/time pickers and SelectModal
// - Validates required fields an sends a POST request via createEvent()
// - Only business accounts (role=business) are allowed to publish events.

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  Keyboard,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { useAuth } from "../../context/AuthContext.js";
import { createEvent } from "../../services/eventsApi.js";
import { searchAddressSuggestions } from "../../services/placesApi.js";
import { useTheme } from "../../context/ThemeContext";

// Shared components (reused across screens for a consistent UX)
import DatePickerModal from "../../components/events/DatePickerModal.js";
import TimePickerModal from "../../components/events/TimePickerModal.js";
import SelectModal from "../../components/common/SelectModal";
import AppButton from "../../components/common/AppButton";
import AppLogoHeader from "../../components/AppLogoHeader";
import PageHeader from "../../components/common/PageHeader";
import {
  EVENT_FORM_CATEGORIES,
  getEventCategoryGroups,
} from "../../constants/eventCategories";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://summit-scene-backend.onrender.com";
const AI_REQUEST_TIMEOUT_MS = 15000;
const TOWNS = ["Banff", "Canmore", "Lake Louise"];
const FORM_CATEGORIES = EVENT_FORM_CATEGORIES;
const FORM_CATEGORY_GROUPS = getEventCategoryGroups();
const SCHEDULE_TYPES = [
  { value: "single", label: "One-time event" },
  { value: "recurring", label: "Recurring event" },
];
const RECURRENCE_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "selected_weekdays", label: "Selected weekdays" },
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

async function fetchWithTimeout(url, options = {}, timeoutMs = AI_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function readJsonSafely(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function isValidDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidImageUrl(value) {
  if (!value) return true;
  return /^https?:\/\/\S+$/i.test(value);
}

function normalizeGeneratedDescription(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function createEmptyTimeSlot() {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    startTime: "",
    endTime: "",
    startObj: new Date(),
    endObj: new Date(),
  };
}

export default function PostEventScreen() {
  const navigation = useNavigation();
  const { token, logout } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Basic event fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [town, setTown] = useState("");
  const [category, setCategory] = useState("");

  // Date + Time state
  const [dateObj, setDateObj] = useState(new Date()); // Date object for picker
  const [date, setDate] = useState(""); // formatted "YYYY-MM-DD"

  const [timeObj, setTimeObj] = useState(new Date());
  const [time, setTime] = useState(""); // formatted "7:00 PM"

  const [endTimeObj, setEndTimeObj] = useState(new Date());
  const [endTime, setEndTime] = useState(""); // formatted "9:00 PM"
  const [extraTimeSlots, setExtraTimeSlots] = useState([]);
  const [activeExtraTimePicker, setActiveExtraTimePicker] = useState(null);
  const [scheduleType, setScheduleType] = useState("single");
  const [isAllDay, setIsAllDay] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState("daily");
  const [selectedWeekdays, setSelectedWeekdays] = useState([]);
  const [recurrenceUntilDateObj, setRecurrenceUntilDateObj] = useState(
    new Date()
  );
  const [recurrenceUntilDate, setRecurrenceUntilDate] = useState("");

  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isLoadingAddressSuggestions, setIsLoadingAddressSuggestions] =
    useState(false);
  const [addressSuggestionsError, setAddressSuggestionsError] = useState("");
  const [shouldShowAddressSuggestions, setShouldShowAddressSuggestions] =
    useState(false);

  // Hero image URL (optional). Used on EventDetailScreen hero image.
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreviewFailed, setImagePreviewFailed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [hasGeneratedDescription, setHasGeneratedDescription] = useState(false);
  const submitLockRef = useRef(false);

  // Picker visibility toggles
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showRecurrenceUntilPicker, setShowRecurrenceUntilPicker] =
    useState(false);
  const [showTownModal, setShowTownModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);

  useEffect(() => {
    const trimmedAddress = address.trim();

    if (!shouldShowAddressSuggestions || trimmedAddress.length < 3) {
      setAddressSuggestions([]);
      setIsLoadingAddressSuggestions(false);
      setAddressSuggestionsError("");
      return undefined;
    }

    let isCancelled = false;
    const timeoutId = setTimeout(async () => {
      try {
        setIsLoadingAddressSuggestions(true);
        setAddressSuggestionsError("");
        const suggestions = await searchAddressSuggestions(trimmedAddress, town);

        if (!isCancelled) {
          setAddressSuggestions(suggestions);
        }
      } catch (error) {
        if (!isCancelled) {
          setAddressSuggestions([]);
          setAddressSuggestionsError(
            error.message || "Could not load address suggestions."
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingAddressSuggestions(false);
        }
      }
    }, 350);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [address, town, shouldShowAddressSuggestions]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates?.height || 0);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // --- Helpers for formatting dates/times ---

  // Convert a JS Date object into a "YYYY-MM-DD" string for the API + filters.
  const applyDateFromDateObj = (jsDate) => {
    const year = jsDate.getFullYear();
    const month = String(jsDate.getMonth() + 1).padStart(2, "0");
    const day = String(jsDate.getDate()).padStart(2, "0");
    setDate(`${year}-${month}-${day}`);
  };

  // Format a JS Date as a user-friendly "h:mm AM/PM" string.
  const formatTime = (selectedTime) => {
    let hours = selectedTime.getHours();
    const minutes = String(selectedTime.getMinutes()).padStart(2, "0");
    const isPM = hours >= 12;
    const displayHours = ((hours + 11) % 12) + 1; // 0–23 -> 1–12
    const suffix = isPM ? "PM" : "AM";

    return `${displayHours}:${minutes} ${suffix}`;
  };

  const getNormalizedTimeSlots = () => {
    if (isAllDay) {
      return [];
    }

    const primarySlot =
      time || endTime
        ? [
            {
              startTime: time,
              endTime,
            },
          ]
        : [];

    const additionalSlots = extraTimeSlots
      .map((slot) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
      }))
      .filter((slot) => slot.startTime || slot.endTime);

    return [...primarySlot, ...additionalSlots];
  };

  const toggleWeekday = (weekday) => {
    setSelectedWeekdays((current) =>
      current.includes(weekday)
        ? current.filter((day) => day !== weekday)
        : [...current, weekday]
    );
  };

  const addExtraTimeSlot = () => {
    setExtraTimeSlots((current) => [...current, createEmptyTimeSlot()]);
  };

  const updateExtraTimeSlot = (slotId, patch) => {
    setExtraTimeSlots((current) =>
      current.map((slot) =>
        slot.id === slotId
          ? {
              ...slot,
              ...patch,
            }
          : slot
      )
    );
  };

  const removeExtraTimeSlot = (slotId) => {
    setExtraTimeSlots((current) => current.filter((slot) => slot.id !== slotId));
  };


  const handleGenerateDescription = async () => {
    if (!title.trim()) {
      Alert.alert("Missing title", "Please enter a title first.");
      return;
    }

    setGeneratingDescription(true);

    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/ai/generate-description`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: title.trim(),
            town,
            category,
            date,
            scheduleType,
            isAllDay,
            recurrence:
              scheduleType === "recurring"
                ? {
                    frequency: recurrenceFrequency,
                    weekdays: selectedWeekdays,
                    untilDate: recurrenceUntilDate || undefined,
                  }
                : undefined,
            timeSlots: getNormalizedTimeSlots(),
            locationName: locationName.trim(),
            address: address.trim(),
            notes: description.trim(),
          }),
        }
      );

      const data = await readJsonSafely(response);

      if (!response.ok) {
        Alert.alert(
          "Error",
          data.message || "Failed to generate description."
        );
        return;
      }

      setDescription(normalizeGeneratedDescription(data.description));
      setHasGeneratedDescription(true);
    } catch (error) {
      const message =
        error?.name === "AbortError"
          ? "Description generation timed out. Please try again."
          : error.message || "Something went wrong.";
      console.warn("Generate description issue:", message);
      Alert.alert("Error", message);
    } finally {
      setGeneratingDescription(false);
    }
  };

  // Handle form submission and call the backend createEvent API.
  // Includes explicit handling for:
  // - 401 -> expired/invalid token -> force logout
  // - 403 -> non-business users trying to post
  const handleSubmit = async () => {
    if (submitLockRef.current || loading) {
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedLocationName = locationName.trim();
    const trimmedAddress = address.trim();
    const trimmedImageUrl = imageUrl.trim();
    const normalizedTimeSlots = getNormalizedTimeSlots();

    if (!trimmedTitle) {
      Alert.alert("Missing title", "Please add an event title.");
      return;
    }

    if (!town) {
      Alert.alert("Missing town", "Please choose a town.");
      return;
    }

    if (!category) {
      Alert.alert("Missing category", "Please choose a category.");
      return;
    }

    if (!date || !isValidDateString(date)) {
      Alert.alert("Missing date", "Please choose a valid event date.");
      return;
    }

    if (!trimmedAddress) {
      Alert.alert(
        "Missing address",
        "Please add the full street address so the map pin lands in the right place."
      );
      return;
    }

    const slotMissingStart = normalizedTimeSlots.some(
      (slot) => slot.endTime && !slot.startTime
    );
    if (slotMissingStart) {
      Alert.alert(
        "Missing start time",
        "Each time slot needs a start time before you add an end time."
      );
      return;
    }

    if (
      scheduleType === "recurring" &&
      recurrenceFrequency === "selected_weekdays" &&
      selectedWeekdays.length === 0
    ) {
      Alert.alert(
        "Missing weekdays",
        "Choose at least one weekday for this recurring event."
      );
      return;
    }

    if (!isValidImageUrl(trimmedImageUrl)) {
      Alert.alert(
        "Invalid image URL",
        "Please enter a valid http or https image URL."
      );
      return;
    }

    if (!token) {
      Alert.alert("Not logged in", "Please log in before posting an event.");
      return;
    }

    submitLockRef.current = true;
    setLoading(true);

    try {
      const { ok, status, data } = await createEvent(
        {
          title: trimmedTitle,
          description: trimmedDescription,
          town,
          category,
          date,
          time: normalizedTimeSlots[0]?.startTime || undefined,
          endTime: normalizedTimeSlots[0]?.endTime || undefined,
          scheduleType,
          isAllDay,
          recurrence:
            scheduleType === "recurring"
              ? {
                  frequency: recurrenceFrequency,
                  weekdays: selectedWeekdays,
                  untilDate: recurrenceUntilDate || undefined,
                }
              : undefined,
          timeSlots: normalizedTimeSlots,
          latitude: selectedCoords?.latitude,
          longitude: selectedCoords?.longitude,
          locationName: trimmedLocationName,
          address: trimmedAddress,
          imageUrl: trimmedImageUrl || undefined,
        },
        token
      );

      // 401 — invalid or deleted token
      if (status === 401) {
        Alert.alert(
          "Session expired",
          "Your account no longer exists or your login expired. Please log in again.",
          [
            {
              text: "OK",
              onPress: () => logout(),
            },
          ]
        );
        return;
      }

      // 403 — not a business
      if (status === 403) {
        Alert.alert(
          "Business profile required",
          data?.message ||
            "Official event listings are for business or organizer profiles. Community members can create local plans and buddy posts from Find People."
        );
        return;
      }

      // Other errors from the server
      if (!ok) {
        Alert.alert("Error", data?.message || "Failed to create event.");
        return;
      }

      // Success: clear the form and send the user to the My Events tab
      Alert.alert("Success", "Your event is live and now appears in My Events.", [
        {
          text: "OK",
          onPress: () => {
            // clear form fields
            setTitle("");
            setDescription("");
            setHasGeneratedDescription(false);
            setLocationName("");
            setAddress("");
            setDate("");
            setTime("");
            setEndTime("");
            setTown("");
            setCategory("");
            setDateObj(new Date());
            setTimeObj(new Date());
            setEndTimeObj(new Date());
            setExtraTimeSlots([]);
            setScheduleType("single");
            setIsAllDay(false);
            setRecurrenceFrequency("daily");
            setSelectedWeekdays([]);
            setRecurrenceUntilDate("");
            setRecurrenceUntilDateObj(new Date());
            setSelectedCoords(null);
            setAddressSuggestions([]);
            setAddressSuggestionsError("");
            setShouldShowAddressSuggestions(false);
            setImageUrl("");
            setImagePreviewFailed(false);

            navigation.navigate("MyEvents", {
              postedEventId: data?._id,
              successMessage: "Your event is live and now appears in My Events.",
            });
          },
        },
      ]);
    } catch (error) {
      console.warn("Post event issue:", error.message);
      Alert.alert("Error", error.message || "Something went wrong.");
    } finally {
      submitLockRef.current = false;
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <AppLogoHeader />
      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.background }]}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: insets.bottom + keyboardHeight + 40 },
        ]}
        scrollIndicatorInsets={{ bottom: keyboardHeight }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
        <PageHeader
          title="Post Official Event"
          subtitle='For hosted events from businesses, venues, and organizers. Fields marked "Required" must be completed before posting.'
        />

        <View
          style={[
            styles.formSection,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.sectionEyebrow, { color: theme.accent }]}>
            Step 1
          </Text>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Event Basics
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.textMuted }]}>
            Add the details people use first when deciding what to click.
          </Text>

          {/* Title */}
          <Text style={[styles.label, { color: theme.textMuted }]}>
            Title (Required)
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.card,
                color: theme.text,
                borderColor: theme.border,
                borderWidth: 1,
              },
            ]}
            placeholder="Event title"
            placeholderTextColor={theme.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          {/* Town */}
          <Text style={[styles.label, { color: theme.textMuted }]}>
            Town (Required)
          </Text>
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            Choose Banff, Canmore, or Lake Louise.
          </Text>
          <Pressable
            style={[
              styles.selectButton,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                borderWidth: 1,
              },
            ]}
            onPress={() => setShowTownModal(true)}
          >
            <Text style={{ color: town ? theme.text : theme.textMuted }}>
              {town || "Choose a town"}
            </Text>
          </Pressable>

          {/* Category */}
          <Text style={[styles.label, { color: theme.textMuted }]}>
            Category (Required)
          </Text>
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            Choose the most appropriate category for this event.
          </Text>
          <Pressable
            style={[
              styles.selectButton,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                borderWidth: 1,
              },
            ]}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={{ color: category ? theme.text : theme.textMuted }}>
              {category || "Choose a category"}
            </Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.formSection,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.sectionEyebrow, { color: theme.accent }]}>
            Step 2
          </Text>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Schedule
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.textMuted }]}>
            Choose whether this is one-time, all day, or recurring.
          </Text>

          <Text style={[styles.label, { color: theme.textMuted }]}>
            Schedule type (Required)
          </Text>
          <View style={styles.optionRow}>
            {SCHEDULE_TYPES.map((option) => {
              const selected = scheduleType === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: selected
                        ? theme.accentSoft || theme.card
                        : theme.background,
                      borderColor: selected ? theme.accent : theme.border,
                    },
                  ]}
                  onPress={() => setScheduleType(option.value)}
                >
                  <Text
                    style={{
                      color: selected ? theme.accent : theme.text,
                      fontWeight: selected ? "700" : "500",
                    }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Date */}
          <Text style={[styles.label, { color: theme.textMuted }]}>
            {scheduleType === "recurring"
              ? "Start date (Required)"
              : "Date (Required)"}
          </Text>
          <Pressable onPress={() => setShowDatePicker(true)}>
            <View pointerEvents="none">
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                    borderWidth: 1,
                  },
                ]}
                placeholder="Select a date"
                placeholderTextColor={theme.textMuted}
                value={date}
                editable={false}
              />
            </View>
          </Pressable>

          <Text style={[styles.label, { color: theme.textMuted }]}>
            All day? (Optional)
          </Text>
          <View style={styles.optionRow}>
            {[true, false].map((value) => {
              const selected = isAllDay === value;
              return (
                <Pressable
                  key={value ? "all-day-yes" : "all-day-no"}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: selected
                        ? theme.accentSoft || theme.card
                        : theme.background,
                      borderColor: selected ? theme.accent : theme.border,
                    },
                  ]}
                  onPress={() => setIsAllDay(value)}
                >
                  <Text
                    style={{
                      color: selected ? theme.accent : theme.text,
                      fontWeight: selected ? "700" : "500",
                    }}
                  >
                    {value ? "Yes" : "No"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {scheduleType === "recurring" ? (
            <>
              <Text style={[styles.label, { color: theme.textMuted }]}>
                Recurs (Required)
              </Text>
              <Pressable
                style={[
                  styles.selectButton,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    borderWidth: 1,
                  },
                ]}
                onPress={() => setShowRecurrenceModal(true)}
              >
                <Text style={{ color: theme.text }}>
                  {RECURRENCE_OPTIONS.find(
                    (option) => option.value === recurrenceFrequency
                  )?.label || "Daily"}
                </Text>
              </Pressable>

              {recurrenceFrequency === "selected_weekdays" ? (
                <>
                  <Text style={[styles.label, { color: theme.textMuted }]}>
                    Weekdays (Required)
                  </Text>
                  <View style={styles.weekdayGrid}>
                    {WEEKDAYS.map((weekday) => {
                      const selected = selectedWeekdays.includes(weekday);
                      return (
                        <Pressable
                          key={weekday}
                          style={[
                            styles.weekdayChip,
                            {
                              backgroundColor: selected
                                ? theme.accentSoft || theme.card
                                : theme.card,
                              borderColor: selected
                                ? theme.accent
                                : theme.border,
                            },
                          ]}
                          onPress={() => toggleWeekday(weekday)}
                        >
                          <Text
                            style={{
                              color: selected ? theme.accent : theme.text,
                              fontWeight: selected ? "700" : "500",
                            }}
                          >
                            {weekday.slice(0, 3)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}

              <Text style={[styles.label, { color: theme.textMuted }]}>
                Recurrence end date (Optional)
              </Text>
              <Pressable onPress={() => setShowRecurrenceUntilPicker(true)}>
                <View pointerEvents="none">
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.card,
                        color: theme.text,
                        borderColor: theme.border,
                        borderWidth: 1,
                      },
                    ]}
                    placeholder="Leave blank for ongoing recurrence"
                    placeholderTextColor={theme.textMuted}
                    value={recurrenceUntilDate}
                    editable={false}
                  />
                </View>
              </Pressable>
              {recurrenceUntilDate ? (
                <Pressable
                  style={styles.clearInlineButton}
                  onPress={() => {
                    setRecurrenceUntilDate("");
                    setRecurrenceUntilDateObj(new Date());
                  }}
                >
                  <Text style={[styles.clearInlineText, { color: theme.accent }]}>
                    Clear recurrence end date
                  </Text>
                </Pressable>
              ) : null}
            </>
          ) : null}

          {!isAllDay ? (
            <>
              <Text style={[styles.label, { color: theme.textMuted }]}>
                Primary time slot (Optional)
              </Text>
              <Pressable onPress={() => setShowTimePicker(true)}>
                <View pointerEvents="none">
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.card,
                        color: theme.text,
                        borderColor: theme.border,
                        borderWidth: 1,
                      },
                    ]}
                    placeholder="Select start time"
                    placeholderTextColor={theme.textMuted}
                    value={time}
                    editable={false}
                  />
                </View>
              </Pressable>

              <Text style={[styles.label, { color: theme.textMuted }]}>
                Primary end time (Optional)
              </Text>
              <Pressable onPress={() => setShowEndTimePicker(true)}>
                <View pointerEvents="none">
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.card,
                        color: theme.text,
                        borderColor: theme.border,
                        borderWidth: 1,
                      },
                    ]}
                    placeholder="Select end time"
                    placeholderTextColor={theme.textMuted}
                    value={endTime}
                    editable={false}
                  />
                </View>
              </Pressable>

              {extraTimeSlots.map((slot, index) => (
                <View
                  key={slot.id}
                  style={[
                    styles.extraSlotCard,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.slotTitle, { color: theme.text }]}>
                    Extra time slot {index + 1}
                  </Text>
                  <Pressable
                    onPress={() =>
                      setActiveExtraTimePicker({
                        slotId: slot.id,
                        field: "start",
                      })
                    }
                  >
                    <View pointerEvents="none">
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: theme.background,
                            color: theme.text,
                            borderColor: theme.border,
                            borderWidth: 1,
                          },
                        ]}
                        placeholder="Select start time"
                        placeholderTextColor={theme.textMuted}
                        value={slot.startTime}
                        editable={false}
                      />
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      setActiveExtraTimePicker({
                        slotId: slot.id,
                        field: "end",
                      })
                    }
                  >
                    <View pointerEvents="none">
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: theme.background,
                            color: theme.text,
                            borderColor: theme.border,
                            borderWidth: 1,
                          },
                        ]}
                        placeholder="Select end time"
                        placeholderTextColor={theme.textMuted}
                        value={slot.endTime}
                        editable={false}
                      />
                    </View>
                  </Pressable>
                  <Pressable
                    style={styles.clearInlineButton}
                    onPress={() => removeExtraTimeSlot(slot.id)}
                  >
                    <Text
                      style={[
                        styles.clearInlineText,
                        { color: theme.danger || "#ff4d4f" },
                      ]}
                    >
                      Remove this time slot
                    </Text>
                  </Pressable>
                </View>
              ))}

              <Pressable
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    borderWidth: 1,
                  },
                ]}
                onPress={addExtraTimeSlot}
              >
                <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
                  Add another time slot
                </Text>
              </Pressable>
            </>
          ) : (
            <Text style={[styles.helperText, { color: theme.textMuted }]}>
              This event will display as all day. Time slots are hidden.
            </Text>
          )}
        </View>

        <View
          style={[
            styles.formSection,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.sectionEyebrow, { color: theme.accent }]}>
            Step 3
          </Text>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Location
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.textMuted }]}>
            Add the venue and exact address so the map pin lands in the right spot.
          </Text>

          {/* Venue */}
          <Text style={[styles.label, { color: theme.textMuted }]}>
            Venue name (Optional)
          </Text>
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            Add the business or venue name if you want it shown on the listing.
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.card,
                color: theme.text,
                borderColor: theme.border,
                borderWidth: 1,
              },
            ]}
            placeholder="Enter the venue or business name"
            placeholderTextColor={theme.textMuted}
            value={locationName}
            onChangeText={setLocationName}
          />

          {/* Address */}
          <Text style={[styles.label, { color: theme.textMuted }]}>
            Full street address (Required)
          </Text>
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            Enter the full street address so the event appears in the right place on the map.
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.card,
                color: theme.text,
                borderColor: theme.border,
                borderWidth: 1,
              },
            ]}
            placeholder="Start typing the full street address"
            placeholderTextColor={theme.textMuted}
            value={address}
            onChangeText={(value) => {
              setAddress(value);
              setSelectedCoords(null);
              setShouldShowAddressSuggestions(true);
            }}
            autoCorrect={false}
          />
          {isLoadingAddressSuggestions ? (
            <Text style={[styles.helperText, { color: theme.textMuted }]}>
              Loading address suggestions...
            </Text>
          ) : null}
          {addressSuggestionsError ? (
            <Text style={[styles.errorHelperText, { color: theme.danger || "#ff4d4f" }]}>
              {addressSuggestionsError}
            </Text>
          ) : null}
          {shouldShowAddressSuggestions && addressSuggestions.length > 0 ? (
            <View
              style={[
                styles.suggestionsCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              {addressSuggestions.map((suggestion) => (
                <Pressable
                  key={suggestion.id}
                  style={[
                    styles.suggestionRow,
                    { borderBottomColor: theme.border },
                  ]}
                  onPress={() => {
                    setAddress(suggestion.address);
                    setSelectedCoords({
                      latitude: suggestion.latitude,
                      longitude: suggestion.longitude,
                    });
                    if (!locationName.trim() && suggestion.name) {
                      setLocationName(suggestion.name);
                    }
                    setShouldShowAddressSuggestions(false);
                    setAddressSuggestions([]);
                    setAddressSuggestionsError("");
                  }}
                >
                  <Text style={[styles.suggestionTitle, { color: theme.text }]}>
                    {suggestion.name || "Suggested address"}
                  </Text>
                  <Text
                    style={[styles.suggestionSubtitle, { color: theme.textMuted }]}
                  >
                    {suggestion.address}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {selectedCoords ? (
            <Text style={[styles.helperText, { color: theme.textMuted }]}>
              Selected address will use an exact map pin.
            </Text>
          ) : null}
        </View>

        <View
          style={[
            styles.formSection,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.sectionEyebrow, { color: theme.accent }]}>
            Step 4
          </Text>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Details
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.textMuted }]}>
            Add a description and photo if you want the listing to feel complete.
          </Text>

          {/* Description */}
          <Text style={[styles.label, { color: theme.textMuted }]}>
            Description (Optional)
          </Text>
          <View style={styles.aiHelperRow}>
            <Text style={[styles.aiHelperText, { color: theme.textMuted }]}>
              Let AI draft a polished starting point from your event details.
            </Text>
            <Pressable
              style={[
                styles.aiButton,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  opacity: generatingDescription ? 0.6 : 1,
                },
              ]}
              onPress={handleGenerateDescription}
              disabled={generatingDescription}
            >
              <Text style={[styles.aiButtonText, { color: theme.text }]}>
                {generatingDescription
                  ? "Writing description..."
                  : hasGeneratedDescription || description.trim()
                    ? "Generate again"
                    : "Generate with AI"}
              </Text>
            </Pressable>
          </View>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: theme.card,
                color: theme.text,
                borderColor: theme.border,
                borderWidth: 1,
              },
            ]}
            placeholder="Tell people what to expect"
            placeholderTextColor={theme.textMuted}
            value={description}
            onChangeText={(value) => {
              setDescription(value);
              if (hasGeneratedDescription) {
                setHasGeneratedDescription(false);
              }
            }}
            multiline
          />
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            You can edit the generated text before posting.
          </Text>
          {hasGeneratedDescription ? (
            <Text style={[styles.generatedStatus, { color: theme.accent }]}>
              AI draft added to the description field.
            </Text>
          ) : null}

          {/* Image URL */}
          <Text style={[styles.label, { color: theme.textMuted }]}>
            Image URL (Optional)
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.card,
                color: theme.text,
                borderColor: theme.border,
                borderWidth: 1,
              },
            ]}
            placeholder="https://example.com/your-image.jpg"
            placeholderTextColor={theme.textMuted}
            value={imageUrl}
            onChangeText={(value) => {
              setImageUrl(value);
              setImagePreviewFailed(false);
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {imageUrl.trim() ? (
            <View
              style={[
                styles.previewCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              {imagePreviewFailed || !isValidImageUrl(imageUrl.trim()) ? (
                <Text style={[styles.previewError, { color: theme.danger || "#ff4d4f" }]}>
                  {!isValidImageUrl(imageUrl.trim())
                    ? "Enter a valid http or https image URL."
                    : "Image preview failed. Check the URL or use a different image."}
                </Text>
              ) : (
                <>
                  <Image
                    source={{ uri: imageUrl.trim() }}
                    style={styles.previewImage}
                    resizeMode="cover"
                    onError={() => setImagePreviewFailed(true)}
                  />
                  <Text style={[styles.previewHint, { color: theme.textMuted }]}>
                    Image preview
                  </Text>
                </>
              )}
            </View>
          ) : (
            <Text style={[styles.helperText, { color: theme.textMuted }]}>
              Use a direct image link. If it fails to load, the event will show without a hero image.
            </Text>
          )}
        </View>

        <View
          style={[
            styles.previewSummaryCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.sectionEyebrow, { color: theme.accent }]}>
            Preview
          </Text>
          <Text style={[styles.previewSummaryTitle, { color: theme.text }]}>
            {title.trim() || "Your event title"}
          </Text>
          <Text style={[styles.previewSummaryMeta, { color: theme.textMuted }]}>
            {[town || "Town", category || "Category"].join(" • ")}
          </Text>
          <Text style={[styles.previewSummaryMeta, { color: theme.textMuted }]}>
            {date || "Date"}{isAllDay ? " • All day" : time ? ` • ${time}` : ""}
          </Text>
          {locationName.trim() || address.trim() ? (
            <Text style={[styles.previewSummaryMeta, { color: theme.textMuted }]}>
              {locationName.trim() || address.trim()}
            </Text>
          ) : null}
        </View>

          {/* Submit button */}
          <AppButton
            title={loading ? "Posting..." : "Post Event"}
            onPress={handleSubmit}
            loading={loading}
            variant="primary"
            size="lg"
            style={styles.button}
          />
      </ScrollView>

      {/* Town Select Modal (shared) */}
      <SelectModal
        visible={showTownModal}
        title="Select Town"
        options={TOWNS}
        selectedValue={town}
        onSelect={(value) => {
          setTown(value);
          setShowTownModal(false);
        }}
        onClose={() => setShowTownModal(false)}
      />

      {/* Category Select Modal (shared) */}
      <SelectModal
        visible={showCategoryModal}
        title="Select Category"
        options={FORM_CATEGORIES}
        optionGroups={FORM_CATEGORY_GROUPS}
        selectedValue={category}
        onSelect={(value) => {
          setCategory(value);
          setShowCategoryModal(false);
        }}
        onClose={() => setShowCategoryModal(false)}
      />

      <SelectModal
        visible={showRecurrenceModal}
        title="Recurring pattern"
        options={RECURRENCE_OPTIONS.map((option) => option.label)}
        selectedValue={
          RECURRENCE_OPTIONS.find((option) => option.value === recurrenceFrequency)
            ?.label
        }
        onSelect={(label) => {
          const selectedOption = RECURRENCE_OPTIONS.find(
            (option) => option.label === label
          );
          setRecurrenceFrequency(selectedOption?.value || "daily");
          setShowRecurrenceModal(false);
        }}
        onClose={() => setShowRecurrenceModal(false)}
      />

      {/* Date Picker (shared) */}
      <DatePickerModal
        visible={showDatePicker}
        initialDate={dateObj}
        onConfirm={(pickedDate) => {
          setDateObj(pickedDate);
          applyDateFromDateObj(pickedDate);
          setShowDatePicker(false);
        }}
        onCancel={() => setShowDatePicker(false)}
      />

      <DatePickerModal
        visible={showRecurrenceUntilPicker}
        initialDate={recurrenceUntilDateObj}
        onConfirm={(pickedDate) => {
          setRecurrenceUntilDateObj(pickedDate);
          const year = pickedDate.getFullYear();
          const month = String(pickedDate.getMonth() + 1).padStart(2, "0");
          const day = String(pickedDate.getDate()).padStart(2, "0");
          setRecurrenceUntilDate(`${year}-${month}-${day}`);
          setShowRecurrenceUntilPicker(false);
        }}
        onCancel={() => setShowRecurrenceUntilPicker(false)}
      />

      {/* Start Time Picker (shared) */}
      <TimePickerModal
        visible={showTimePicker}
        initialTime={timeObj}
        title="Select start time"
        onCancel={() => setShowTimePicker(false)}
        onConfirm={(pickedDate) => {
          setTimeObj(pickedDate);
          setTime(formatTime(pickedDate));
          setShowTimePicker(false);
        }}
      />

      {/* End Time Picker (shared) */}
      <TimePickerModal
        visible={showEndTimePicker}
        initialTime={endTimeObj}
        title="Select end time"
        onCancel={() => setShowEndTimePicker(false)}
        onConfirm={(pickedDate) => {
          setEndTimeObj(pickedDate);
          setEndTime(formatTime(pickedDate));
          setShowEndTimePicker(false);
        }}
      />

      <TimePickerModal
        visible={Boolean(activeExtraTimePicker)}
        initialTime={
          activeExtraTimePicker
            ? extraTimeSlots.find(
                (slot) => slot.id === activeExtraTimePicker.slotId
              )?.[
                activeExtraTimePicker.field === "start"
                  ? "startObj"
                  : "endObj"
              ] || new Date()
            : new Date()
        }
        title={
          activeExtraTimePicker?.field === "start"
            ? "Select start time"
            : "Select end time"
        }
        onCancel={() => setActiveExtraTimePicker(null)}
        onConfirm={(pickedDate) => {
          if (!activeExtraTimePicker) return;

          updateExtraTimeSlot(activeExtraTimePicker.slotId, {
            [activeExtraTimePicker.field === "start"
              ? "startObj"
              : "endObj"]: pickedDate,
            [activeExtraTimePicker.field === "start"
              ? "startTime"
              : "endTime"]: formatTime(pickedDate),
          });
          setActiveExtraTimePicker(null);
        }}
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
  container: {
    padding: 16,
    paddingTop: 0,
    flexGrow: 1,
  },
  formSection: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 0,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
    marginTop: 4,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  optionChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  weekdayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  weekdayChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  helperText: {
    fontSize: 13,
    marginTop: -4,
    marginBottom: 12,
    lineHeight: 19,
  },
  errorHelperText: {
    fontSize: 13,
    marginTop: -4,
    marginBottom: 12,
    lineHeight: 19,
  },
  suggestionsCard: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: -4,
    marginBottom: 12,
  },
  suggestionRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  suggestionSubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: -4,
    marginBottom: 12,
  },
  previewImage: {
    width: "100%",
    height: 160,
    borderRadius: 10,
    marginBottom: 8,
  },
  previewHint: {
    fontSize: 13,
  },
  previewError: {
    fontSize: 13,
    lineHeight: 19,
  },
  extraSlotCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  slotTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  clearInlineButton: {
    marginTop: -4,
    marginBottom: 12,
  },
  clearInlineText: {
    fontSize: 12,
    fontWeight: "600",
  },
  aiHelperRow: {
    marginBottom: 10,
  },
  aiHelperText: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 8,
  },
  aiButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  aiButtonText: {
    fontWeight: "700",
    fontSize: 14,
  },
  generatedStatus: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: -4,
    marginBottom: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  selectButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 2,
    marginBottom: 40,
  },
  secondaryButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: -2,
    marginBottom: 12,
  },
  secondaryButtonText: {
    fontWeight: "700",
    fontSize: 15,
  },
  previewSummaryCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  previewSummaryTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  previewSummaryMeta: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
});
