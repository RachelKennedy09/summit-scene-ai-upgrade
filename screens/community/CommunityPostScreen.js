// screens/community/CommunityPostScreen.js
// Create a new community post (Highway, Ride Share, or Event Buddy).
// This screen uses the logged-in account as the author.

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import DatePickerModal from "../../components/events/DatePickerModal";
import AppLogoHeader from "../../components/AppLogoHeader";
// Board + town options are defined as config arrays,
// so it’s easy to add more types/towns later without changing the JSX.
const POST_TYPES = [
  { label: "Highway Conditions", value: "highwayconditions" },
  { label: "Ride Share", value: "rideshare" },
  { label: "Event Buddy", value: "eventbuddy" },
];

const TOWNS = [
  { label: "Banff", value: "Banff" },
  { label: "Canmore", value: "Canmore" },
  { label: "Lake Louise", value: "Lake Louise" },
];

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://summit-scene-backend.onrender.com";

export default function CommunityPostScreen({ navigation }) {
  const { token } = useAuth();
  const { theme } = useTheme();

  const [type, setType] = useState("highwayconditions");
  const [town, setTown] = useState("Banff");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetDate, setTargetDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // useMemo changes the helper text based on the board type
  // without recalculating on every keystroke in the form.
  const detailsPlaceholder = useMemo(() => {
    if (type === "highwayconditions") {
      return "Road, pass, or parking lot conditions. Add time, direction, and any hazards.";
    }
    if (type === "rideshare") {
      return "Where you're leaving from, time, number of seats, gear space, and cost split if any.";
    }
    if (type === "eventbuddy") {
      return "Which event, date, meetup spot, vibe you're looking for (chill night, dancing, etc.).";
    }
    return "Add helpful info (conditions, times, meetup spot, etc.)";
  }, [type]);

  async function handleSubmit() {
    // Basic validation
    if (!title.trim() || !body.trim()) {
      Alert.alert("Missing info", "Please add a title and some details.");
      return;
    }

    if (!targetDate) {
      Alert.alert("Missing info", "Please select a date for this post.");
      return;
    }

    // I guard posting behind a valid JWT.
    // The backend also checks auth, but this gives faster feedback in the UI.
    if (!token) {
      Alert.alert(
        "Login required",
        "Please log in before creating a community post."
      );
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        type,
        town,
        title: title.trim(),
        body: body.trim(),
        targetDate: targetDate.toISOString(),
      };

      const res = await fetch(`${API_BASE_URL}/api/community`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create post");
      }

      await res.json();

      Alert.alert(
        "Post shared!",
        "Your community post has been created. It will show under your account name, and other members can reply."
      );

      // Reset local form state and go back to the Community board
      setTitle("");
      setBody("");
      setTargetDate(new Date());
      navigation.goBack();
    } catch (error) {
      console.error("Error creating community post:", error);
      setError(error.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/*  KeyboardAvoidingView keeps fields visible when
          the soft keyboard opens on smaller devices. */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <AppLogoHeader />
          <Text style={[styles.heading, { color: theme.text }]}>
            New Community Post
          </Text>
          <Text style={[styles.subheading, { color: theme.textMuted }]}>
            Share highway conditions, rides, or find an event buddy. Your
            account name will appear on this post and its replies.
          </Text>

          {/* Board selector */}
          <Text style={[styles.label, { color: theme.textMuted }]}>Board</Text>
          <View style={styles.row}>
            {POST_TYPES.map((option) => {
              const isActive = option.value === type;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setType(option.value)}
                  style={[
                    styles.pill,
                    {
                      borderColor: isActive ? theme.accent : theme.border,
                      backgroundColor: isActive
                        ? theme.accentSoft || theme.card
                        : theme.card,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      {
                        color: isActive ? theme.text : theme.textMuted,
                        fontWeight: isActive ? "600" : "400",
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Town selector */}
          <Text style={[styles.label, { color: theme.textMuted }]}>Town</Text>
          <View style={styles.row}>
            {TOWNS.map((option) => {
              const isActive = option.value === town;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setTown(option.value)}
                  style={[
                    styles.pill,
                    {
                      borderColor: isActive ? theme.accent : theme.border,
                      backgroundColor: isActive
                        ? theme.accentSoft || theme.card
                        : theme.card,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      {
                        color: isActive ? theme.text : theme.textMuted,
                        fontWeight: isActive ? "600" : "400",
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Date */}
          <Text style={[styles.label, { color: theme.textMuted }]}>Date</Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={[
              styles.input,
              {
                borderColor: theme.border,
                backgroundColor: theme.card,
              },
            ]}
          >
            <Text style={{ color: theme.text }}>
              {targetDate ? targetDate.toLocaleDateString() : "Select a date"}
            </Text>
          </Pressable>

          {/* Quick "Today" shortcut */}
          <Pressable
            onPress={() => setTargetDate(new Date())}
            style={{ marginTop: 4 }}
          >
            <Text style={{ fontSize: 12, color: theme.accent }}>Use today</Text>
          </Pressable>

          {/* Reuse the same modal as Event posting */}
          <DatePickerModal
            visible={showDatePicker}
            initialDate={targetDate}
            title="Select date"
            onCancel={() => setShowDatePicker(false)}
            onConfirm={(selected) => {
              setShowDatePicker(false);
              if (selected) {
                setTargetDate(selected);
              }
            }}
          />

          {/* Title */}
          <Text style={[styles.label, { color: theme.textMuted }]}>Title</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.border,
                backgroundColor: theme.card,
                color: theme.text,
              },
            ]}
            placeholder="Short summary..."
            placeholderTextColor={theme.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          {/* Details */}
          <Text style={[styles.label, { color: theme.textMuted }]}>
            Details
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.inputMultiline,
              {
                borderColor: theme.border,
                backgroundColor: theme.card,
                color: theme.text,
              },
            ]}
            placeholder={detailsPlaceholder}
            placeholderTextColor={theme.textMuted}
            value={body}
            onChangeText={setBody}
            multiline
            numberOfLines={4}
          />
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            Replies are public. Avoid sharing phone numbers or emails unless
            you’re comfortable doing so.
          </Text>

          {error && (
            <Text
              style={[styles.errorText, { color: theme.error || "#ff4d4f" }]}
            >
              {error}
            </Text>
          )}

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={[
              styles.submitButton,
              {
                backgroundColor: theme.accent,
              },
              submitting && { opacity: 0.6 },
            ]}
          >
            <Text
              style={[
                styles.submitButtonText,
                {
                  color: theme.background,
                },
              ]}
            >
              {submitting ? "Posting..." : "Share Post"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    marginTop: 12,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputMultiline: {
    height: 100,
    textAlignVertical: "top",
  },
  errorText: {
    marginTop: 8,
    fontSize: 13,
  },
  submitButton: {
    marginTop: 20,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
