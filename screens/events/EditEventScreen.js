// screens/EditEventScreen.js
// Edit an existing event
// Let business users update events they've already created

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../context/AuthContext.js";
import { updateEvent } from "../../services/eventsApi.js";
import { useTheme } from "../../context/ThemeContext";

// shared UI pieces
import DatePickerModal from "../../components/events/DatePickerModal.js";
import TimePickerModal from "../../components/events/TimePickerModal.js";
import SelectModal from "../../components/common/SelectModal.js";

const TOWNS = ["Banff", "Canmore", "Lake Louise"];
const CATEGORIES = [
  "All",
  "Market",
  "Wellness",
  "Music",
  "Workshop",
  "Family",
  "Retail",
  "Outdoors",
  "Food & Drink",
  "Art",
];

// All will not be in the categories dropdown menu
const FORM_CATEGORIES = CATEGORIES.filter((cat) => cat !== "All");

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

export default function EditEventScreen({ route, navigation }) {
  const { token } = useAuth();
  const { theme } = useTheme();
  const { event, onUpdated } = route.params; // event passed from EventDetail/MyEvents

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

  const [location, setLocation] = useState(event.location || "");
  const [loading, setLoading] = useState(false);

  // Picker visibility toggles
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showTownModal, setShowTownModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // ---- DATE HANDLING ----
  // I normalize dates to "YYYY-MM-DD" string
  // to match what the backend expects and what Hub/Map filters use.
  const applyDateFromDateObj = (jsDate) => {
    const year = jsDate.getFullYear();
    const month = String(jsDate.getMonth() + 1).padStart(2, "0");
    const day = String(jsDate.getDate()).padStart(2, "0");
    setDate(`${year}-${month}-${day}`);
  };

  const handleSubmit = async () => {
    if (!title || !date) {
      Alert.alert("Missing info", "Please add at least a title and a date.");
      return;
    }

    if (!token) {
      Alert.alert("Not logged in", "Please log in before editing an event.");
      return;
    }

    setLoading(true);

    try {
      // Only send editable fields.
      // The backend keeps the event owner and IDs the same.
      const payload = {
        title,
        description,
        town,
        category,
        date,
        time, // start time (optional)
        endTime, // end time (optional)
        location,
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
            navigation.navigate("MyEvents");
          },
        },
      ]);
    } catch (error) {
      console.error("Error updating event:", error);
      Alert.alert("Error", error.message || "Failed to update event");
    } finally {
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

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.heading, { color: theme.text }]}>Edit Event</Text>

        {/* Title */}
        <Text style={[styles.label, { color: theme.textMuted }]}>Title *</Text>
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
        <Text style={[styles.label, { color: theme.textMuted }]}>Town *</Text>
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
          Category *
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

        {/* Date */}
        <Text style={[styles.label, { color: theme.textMuted }]}>
          Date (YYYY-MM-DD) *
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

        {/* Start Time */}
        <Text style={[styles.label, { color: theme.textMuted }]}>
          Start time (optional)
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

        {/* End Time */}
        <Text style={[styles.label, { color: theme.textMuted }]}>
          End time (optional)
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

        {/* Location */}
        <Text style={[styles.label, { color: theme.textMuted }]}>Location</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.card,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          placeholder="Venue or address"
          placeholderTextColor={theme.textMuted}
          value={location}
          onChangeText={setLocation}
        />

        {/* Description */}
        <Text style={[styles.label, { color: theme.textMuted }]}>
          Description
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

        {/* Save button */}
        <Pressable
          style={submitButtonStyles}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={[styles.buttonText, { color: theme.background }]}>
            {loading ? "Saving..." : "Save Changes"}
          </Text>
        </Pressable>
      </ScrollView>

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
        selectedValue={category}
        onSelect={(value) => {
          setCategory(value);
          setShowCategoryModal(false);
        }}
        onClose={() => setShowCategoryModal(false)}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
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
  buttonText: {
    fontWeight: "700",
    fontSize: 16,
  },
});
