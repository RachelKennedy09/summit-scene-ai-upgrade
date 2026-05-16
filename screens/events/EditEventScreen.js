// screens/EditEventScreen.js
// Edit an existing event
// Let business users update events they've already created

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../context/AuthContext.js";
import { searchAddressSuggestions } from "../../services/placesApi.js";
import { updateEvent } from "../../services/eventsApi.js";
import { useTheme } from "../../context/ThemeContext";

// shared UI pieces
import DatePickerModal from "../../components/events/DatePickerModal.js";
import TimePickerModal from "../../components/events/TimePickerModal.js";
import SelectModal from "../../components/common/SelectModal.js";
import AppButton from "../../components/common/AppButton.js";
import PageHeader from "../../components/common/PageHeader";
import {
  EVENT_FORM_CATEGORIES,
  getEventCategoryGroups,
} from "../../constants/eventCategories";

const TOWNS = ["Banff", "Canmore", "Lake Louise"];
const FORM_CATEGORIES = EVENT_FORM_CATEGORIES;
const FORM_CATEGORY_GROUPS = getEventCategoryGroups();
const EVENT_IMAGE_MAX_BASE64_LENGTH = 2200000;
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

// ---- helpers for time parsing/formatting ----
// Professor note: the backend stores times as strings like "7:00 PM".
// These helpers convert between that string format and JS Date objects
// so we can reuse the same TimePickerModal component here.

function parseTimeStringToDate(timeStr) {
  if (!timeStr) return new Date();
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return new Date();

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();

  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function formatTime(selectedTime) {
  let hours = selectedTime.getHours();
  const minutes = String(selectedTime.getMinutes()).padStart(2, "0");
  const isPM = hours >= 12;
  const displayHours = ((hours + 11) % 12) + 1; // 0–23 -> 1–12
  const suffix = isPM ? "PM" : "AM";

  return `${displayHours}:${minutes} ${suffix}`;
}

function isValidDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
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

function withTimeSlotMeta(slot) {
  return {
    ...createEmptyTimeSlot(),
    startTime: slot?.startTime || "",
    endTime: slot?.endTime || "",
    startObj: parseTimeStringToDate(slot?.startTime || ""),
    endObj: parseTimeStringToDate(slot?.endTime || ""),
  };
}

export default function EditEventScreen({ route, navigation }) {
  const { token } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { event, onUpdated } = route.params; // event passed from EventDetail/MyEvents
  const submitLockRef = useRef(false);

  // ----- INITIAL STATE FROM EXISTING EVENT -----
  const [title, setTitle] = useState(event.title || "");
  const [description, setDescription] = useState(event.description || "");
  const [town, setTown] = useState(
    event.town && TOWNS.includes(event.town) ? event.town : TOWNS[0]
  );
  const [category, setCategory] = useState(
    FORM_CATEGORIES.includes(event.category)
      ? event.category
      : FORM_CATEGORIES[0]
  );

  // Date state
  const initialDateObj = event.date ? new Date(event.date) : new Date();
  const [dateObj, setDateObj] = useState(initialDateObj);
  const [date, setDate] = useState(event.date || ""); // "YYYY-MM-DD"

  // Start time state
  const initialTimeStr = event.time || "";
  const [timeObj, setTimeObj] = useState(parseTimeStringToDate(initialTimeStr));
  const [time, setTime] = useState(initialTimeStr);

  // End time state
  const initialEndTimeStr = event.endTime || "";
  const [endTimeObj, setEndTimeObj] = useState(
    parseTimeStringToDate(initialEndTimeStr)
  );
  const [endTime, setEndTime] = useState(initialEndTimeStr);
  const initialExtraSlots =
    Array.isArray(event.timeSlots) && event.timeSlots.length > 1
      ? event.timeSlots.slice(1).map((slot) => withTimeSlotMeta(slot))
      : [];
  const [extraTimeSlots, setExtraTimeSlots] = useState(initialExtraSlots);
  const [activeExtraTimePicker, setActiveExtraTimePicker] = useState(null);
  const [scheduleType, setScheduleType] = useState(
    event.scheduleType || "single"
  );
  const [isAllDay, setIsAllDay] = useState(Boolean(event.isAllDay));
  const [recurrenceFrequency, setRecurrenceFrequency] = useState(
    event.recurrence?.frequency || "daily"
  );
  const [selectedWeekdays, setSelectedWeekdays] = useState(
    Array.isArray(event.recurrence?.weekdays) ? event.recurrence.weekdays : []
  );
  const [recurrenceUntilDateObj, setRecurrenceUntilDateObj] = useState(
    event.recurrence?.untilDate ? new Date(event.recurrence.untilDate) : new Date()
  );
  const [recurrenceUntilDate, setRecurrenceUntilDate] = useState(
    event.recurrence?.untilDate || ""
  );

  const [locationName, setLocationName] = useState(
    event.locationName || event.location || ""
  );
  const [address, setAddress] = useState(event.address || "");
  const [selectedCoords, setSelectedCoords] = useState(
    Number.isFinite(event.latitude) && Number.isFinite(event.longitude)
      ? { latitude: event.latitude, longitude: event.longitude }
      : null
  );
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isLoadingAddressSuggestions, setIsLoadingAddressSuggestions] =
    useState(false);
  const [addressSuggestionsError, setAddressSuggestionsError] = useState("");
  const [shouldShowAddressSuggestions, setShouldShowAddressSuggestions] =
    useState(false);
  const [imageUrl, setImageUrl] = useState(event.imageUrl || "");
  const [loading, setLoading] = useState(false);

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

  // ---- DATE HANDLING ----
  // I normalize dates to "YYYY-MM-DD" string
  // to match what the backend expects and what Hub/Map filters use.
  const applyDateFromDateObj = (jsDate) => {
    const year = jsDate.getFullYear();
    const month = String(jsDate.getMonth() + 1).padStart(2, "0");
    const day = String(jsDate.getDate()).padStart(2, "0");
    setDate(`${year}-${month}-${day}`);
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

    if (!token) {
      Alert.alert("Not logged in", "Please log in before editing an event.");
      return;
    }

    submitLockRef.current = true;
    setLoading(true);

    try {
      // Only send editable fields.
      // The backend keeps the event owner and IDs the same.
      const payload = {
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
      };

      const updatedEvent = await updateEvent(event._id, payload, token);
      console.info("Event updated:", updatedEvent);

      if (typeof onUpdated === "function") {
        onUpdated();
      }

      Alert.alert("Updated", "Your event has been updated.", [
        {
          text: "OK",
          onPress: () => {
            navigation.navigate("tabs", {
              screen: "MyEvents",
              params: {
                updatedEventId: updatedEvent?._id || event._id,
                successMessage: "Your event has been updated.",
              },
            });
          },
        },
      ]);
    } catch (error) {
      console.warn("Update event issue:", error.message);
      Alert.alert("Error", error.message || "Failed to update event");
    } finally {
      submitLockRef.current = false;
      setLoading(false);
    }
  };

  // Build button styles separately to avoid any conditional-style quirks
  const submitButtonStyles = [
    styles.button,
    { backgroundColor: theme.accent },
  ];
  if (loading) {
    submitButtonStyles.push(styles.buttonDisabled);
  }

  async function handleChooseEventImage() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Photo access needed",
          "Allow photo library access to choose an event photo from your camera roll."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.5,
        base64: true,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.base64) {
        Alert.alert(
          "Photo not selected",
          "We could not read that photo. Please try another image."
        );
        return;
      }

      if (asset.base64.length > EVENT_IMAGE_MAX_BASE64_LENGTH) {
        Alert.alert(
          "Photo too large",
          "Please choose a smaller photo or crop it tighter before saving."
        );
        return;
      }

      const mimeType = asset.mimeType || "image/jpeg";
      setImageUrl(`data:${mimeType};base64,${asset.base64}`);
    } catch (error) {
      Alert.alert(
        "Could not choose photo",
        error.message || "Please try again."
      );
    }
  }

  function handleClearEventImage() {
    setImageUrl("");
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardShell}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <ScrollView
          style={[styles.scrollView, { backgroundColor: theme.background }]}
          contentContainerStyle={[
            styles.container,
            { paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        >
          <PageHeader
            title="Edit Event"
            subtitle='Fields marked "Required" must be completed before saving.'
          />

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Basics
        </Text>
        <Text style={[styles.sectionDescription, { color: theme.textMuted }]}>
          Start with the core details people need to find your event.
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
        <Pressable
          style={[
            styles.selectButton,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
          onPress={() => setShowTownModal(true)}
        >
          <Text style={[styles.selectButtonText, { color: theme.text }]}>
            {town}
          </Text>
        </Pressable>

        {/* Category */}
        <Text style={[styles.label, { color: theme.textMuted }]}>
          Category (Required)
        </Text>
        <Pressable
          style={[
            styles.selectButton,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
          onPress={() => setShowCategoryModal(true)}
        >
          <Text style={[styles.selectButtonText, { color: theme.text }]}>
            {category}
          </Text>
        </Pressable>

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
                      : theme.card,
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

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Schedule
        </Text>
        <Text style={[styles.sectionDescription, { color: theme.textMuted }]}>
          Choose whether this is one-time, all day, or recurring.
        </Text>

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
                      : theme.card,
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
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={() => setShowRecurrenceModal(true)}
            >
              <Text style={[styles.selectButtonText, { color: theme.text }]}>
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
                            borderColor: selected ? theme.accent : theme.border,
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
                styles.selectButton,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={addExtraTimeSlot}
            >
              <Text style={[styles.selectButtonText, { color: theme.text }]}>
                Add another time slot
              </Text>
            </Pressable>
          </>
        ) : (
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            This event will display as all day. Time slots are hidden.
          </Text>
        )}

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
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.card,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          placeholder="Banff Brewing Co."
          placeholderTextColor={theme.textMuted}
          value={locationName}
          onChangeText={setLocationName}
        />

        {/* Address */}
        <Text style={[styles.label, { color: theme.textMuted }]}>
          Full street address (Required)
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.card,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          placeholder="110 Banff Ave, Banff, AB"
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

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Optional Details
        </Text>
        <Text style={[styles.sectionDescription, { color: theme.textMuted }]}>
          Add a description and photo if you want the listing to feel more complete.
        </Text>

        {/* Description */}
        <Text style={[styles.label, { color: theme.textMuted }]}>
          Description (Optional)
        </Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            {
              backgroundColor: theme.card,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          placeholder="Tell people what to expect"
          placeholderTextColor={theme.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        {/* Event photo */}
        <Text style={[styles.label, { color: theme.textMuted }]}>
          Event Photo (Optional)
        </Text>
        <Pressable
          style={[
            styles.photoPickerButton,
            { backgroundColor: theme.card, borderColor: theme.accent },
          ]}
          onPress={handleChooseEventImage}
        >
          <Text style={[styles.photoPickerText, { color: theme.accent }]}>
            Choose from camera roll
          </Text>
        </Pressable>
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
            <Image
              source={{ uri: imageUrl.trim() }}
              style={styles.previewImage}
              resizeMode="cover"
            />
            <View style={styles.photoPreviewFooter}>
              <Text style={[styles.previewHint, { color: theme.textMuted }]}>
                Event photo selected
              </Text>
              <Pressable
                style={[styles.smallOutlineButton, { borderColor: theme.border }]}
                onPress={handleClearEventImage}
              >
                <Text style={[styles.smallOutlineText, { color: theme.textMuted }]}>
                  Remove
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            Choose a photo from your phone to show as the event hero image.
          </Text>
        )}

        {/* Save button */}
        <AppButton
          title={loading ? "Saving..." : "Save Changes"}
          onPress={handleSubmit}
          loading={loading}
          variant="primary"
          size="lg"
          style={submitButtonStyles}
        />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Town Select */}
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

      {/* Category Select */}
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

      {/* Date Picker */}
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

      {/* Start Time Picker */}
      <TimePickerModal
        visible={showTimePicker}
        initialTime={timeObj}
        onConfirm={(pickedTime) => {
          setTimeObj(pickedTime);
          setTime(formatTime(pickedTime));
          setShowTimePicker(false);
        }}
        onCancel={() => setShowTimePicker(false)}
        title="Select start time"
      />

      {/* End Time Picker */}
      <TimePickerModal
        visible={showEndTimePicker}
        initialTime={endTimeObj}
        onConfirm={(pickedTime) => {
          setEndTimeObj(pickedTime);
          setEndTime(formatTime(pickedTime));
          setShowEndTimePicker(false);
        }}
        onCancel={() => setShowEndTimePicker(false)}
        title="Select end time"
      />

      <TimePickerModal
        visible={Boolean(activeExtraTimePicker)}
        initialTime={
          activeExtraTimePicker
            ? extraTimeSlots.find((slot) => slot.id === activeExtraTimePicker.slotId)
                ?.[
                  activeExtraTimePicker.field === "start"
                    ? "startObj"
                    : "endObj"
                ] || new Date()
            : new Date()
        }
        onConfirm={(pickedTime) => {
          if (!activeExtraTimePicker) return;

          updateExtraTimeSlot(activeExtraTimePicker.slotId, {
            [activeExtraTimePicker.field === "start" ? "startObj" : "endObj"]:
              pickedTime,
            [activeExtraTimePicker.field === "start"
              ? "startTime"
              : "endTime"]: formatTime(pickedTime),
          });
          setActiveExtraTimePicker(null);
        }}
        onCancel={() => setActiveExtraTimePicker(null)}
        title={
          activeExtraTimePicker?.field === "start"
            ? "Select start time"
            : "Select end time"
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardShell: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    padding: 16,
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
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
    borderWidth: 1,
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
    fontSize: 13,
    fontWeight: "600",
  },
  helperText: {
    fontSize: 13,
    marginTop: -4,
    marginBottom: 12,
    lineHeight: 19,
  },
  photoPickerButton: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 12,
  },
  photoPickerText: {
    fontSize: 13,
    fontWeight: "800",
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
    fontSize: 12,
  },
  photoPreviewFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  smallOutlineButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  smallOutlineText: {
    fontSize: 12,
    fontWeight: "800",
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
    borderWidth: 1,
  },
  selectButtonText: {
    fontSize: 14,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 40,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
