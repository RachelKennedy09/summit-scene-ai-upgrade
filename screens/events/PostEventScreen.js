// screens/PostEventScreen.js
// Create a new event (Business only)
// - Uses shared date/time pickers and SelectModal
// - Validates required fields an sends a POST request via createEvent()
// - Only business accounts (role=business) are allowed to publish events.

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import AppLogoHeader from "../../components/AppLogoHeader";

import { useAuth } from "../../context/AuthContext.js";
import { createEvent } from "../../services/eventsApi.js";
import { useTheme } from "../../context/ThemeContext";

// Shared components (reused across screens for a consistent UX)
import DatePickerModal from "../../components/events/DatePickerModal.js";
import TimePickerModal from "../../components/events/TimePickerModal.js";
import SelectModal from "../../components/common/SelectModal";

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

// "All" is not used in the create form dropdown
const FORM_CATEGORIES = CATEGORIES.filter((cat) => cat !== "All");

export default function PostEventScreen() {
  const navigation = useNavigation();
  const { token, logout } = useAuth();
  const { theme } = useTheme();

  // Basic event fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [town, setTown] = useState(TOWNS[0]); // default to Banff
  const [category, setCategory] = useState(FORM_CATEGORIES[0]); // default to first category

  // Date + Time state
  const [dateObj, setDateObj] = useState(new Date()); // Date object for picker
  const [date, setDate] = useState(""); // formatted "YYYY-MM-DD"

  const [timeObj, setTimeObj] = useState(new Date());
  const [time, setTime] = useState(""); // formatted "7:00 PM"

  const [endTimeObj, setEndTimeObj] = useState(new Date());
  const [endTime, setEndTime] = useState(""); // formatted "9:00 PM"

  const [location, setLocation] = useState("");

  // Hero image URL (optional). Used on EventDetailScreen hero image.
  const [imageUrl, setImageUrl] = useState("");

  const [loading, setLoading] = useState(false);

  // Picker visibility toggles
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showTownModal, setShowTownModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

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

  // Handle form submission and call the backend createEvent API.
  // Includes explicit handling for:
  // - 401 -> expired/invalid token -> force logout
  // - 403 -> non-business users trying to post
  const handleSubmit = async () => {
    if (!title || !date) {
      Alert.alert("Missing info", "Please add at least a title and a date.");
      return;
    }

    if (!token) {
      Alert.alert("Not logged in", "Please log in before posting an event.");
      return;
    }

    setLoading(true);

    try {
      const { ok, status, data } = await createEvent(
        {
          title,
          description,
          town,
          category,
          date,
          time,
          endTime,
          location,
          imageUrl: imageUrl || undefined,
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
          "Not allowed",
          data?.message || "You must be a business account to post events."
        );
        return;
      }

      // Other errors from the server
      if (!ok) {
        Alert.alert("Error", data?.message || "Failed to create event.");
        return;
      }

      // Success: clear the form and send the user to "MyEvents"
      Alert.alert("Success", "Your event has been posted!", [
        {
          text: "OK",
          onPress: () => {
            // clear form fields
            setTitle("");
            setDescription("");
            setLocation("");
            setDate("");
            setTime("");
            setEndTime("");
            setTown(TOWNS[0]);
            setCategory(FORM_CATEGORIES[0]);
            setDateObj(new Date());
            setTimeObj(new Date());
            setEndTimeObj(new Date());
            setImageUrl("");

            navigation.navigate("MyEvents");
          },
        },
      ]);
    } catch (error) {
      console.error("Error posting event:", error);
      Alert.alert("Error", error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <AppLogoHeader />
      {/* KeyboardAvoidingView keeps the inputs visible when the keyboard is open on iOS. */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={[styles.heading, { color: theme.text }]}>
            Post a New Event
          </Text>

          {/* Title */}
          <Text style={[styles.label, { color: theme.textMuted }]}>
            Title *
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
          <Text style={[styles.label, { color: theme.textMuted }]}>Town *</Text>
          <Pressable
            style={[
              styles.selectButton,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                borderWidth: 1,
              },
            ]}
            onPress={() => setShowTownModal(true)}
          >
            <Text style={{ color: theme.text }}>{town}</Text>
          </Pressable>

          {/* Category */}
          <Text style={[styles.label, { color: theme.textMuted }]}>
            Category *
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
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={{ color: theme.text }}>{category}</Text>
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

          {/* Start Time (Optional)*/}
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

          {/* End Time (optional) */}
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

          {/* Location */}
          <Text style={[styles.label, { color: theme.textMuted }]}>
            Location
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
            placeholder="Venue or address"
            placeholderTextColor={theme.textMuted}
            value={location}
            onChangeText={setLocation}
          />

          {/* Image URL */}
          <Text style={[styles.label, { color: theme.textMuted }]}>
            Image URL (optional)
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
            onChangeText={setImageUrl}
            autoCapitalize="none"
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
                borderWidth: 1,
              },
            ]}
            placeholder="Tell people what to expect"
            placeholderTextColor={theme.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          {/* Submit button */}
          <Pressable
            style={[
              styles.button,
              {
                backgroundColor: theme.accent,
                opacity: loading ? 0.6 : 1,
              },
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text
              style={[
                styles.buttonText,
                { color: theme.onAccent || theme.background },
              ]}
            >
              {loading ? "Posting..." : "Post Event"}
            </Text>
          </Pressable>
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
          selectedValue={category}
          onSelect={(value) => {
            setCategory(value);
            setShowCategoryModal(false);
          }}
          onClose={() => setShowCategoryModal(false)}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
    marginTop: 4,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    marginTop: 8,
    marginBottom: 40,
  },
  buttonText: {
    fontWeight: "700",
    fontSize: 16,
  },
});
