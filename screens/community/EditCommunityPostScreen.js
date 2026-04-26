// screens/EditCommunityPostScreen.js
// Edit an existing community post: title, body, date

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { updateCommunityPost } from "../../services/communityApi";
import AppButton from "../../components/common/AppButton";
import PageHeader from "../../components/common/PageHeader";

export default function EditCommunityPostScreen({ route, navigation }) {
  const { post } = route.params; // post passed in from CommunityScreen
  const { token } = useAuth();
  const { theme } = useTheme();

  // Pre-fill the form with the existing post data
  const [title, setTitle] = useState(post.title || "");
  const [body, setBody] = useState(post.body || "");
  const [targetDate, setTargetDate] = useState(
    post.targetDate ? new Date(post.targetDate) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave() {
    if (!title.trim() || !body.trim()) {
      Alert.alert("Missing info", "Please fill in title and details.");
      return;
    }

    if (!targetDate) {
      Alert.alert("Missing info", "Please select a date for this post.");
      return;
    }

    if (!token) {
      Alert.alert("Not logged in", "Please log in before editing a post.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Only send fields that are allowed to change.
      // Board/type + town remain locked to keep the board structure clean.
      const payload = {
        title: title.trim(),
        body: body.trim(),
        // Store as ISO string so backend can safely parse dates
        targetDate: targetDate.toISOString(),
      };

      await updateCommunityPost(post._id, payload, token);

      Alert.alert("Post updated", "Your community post has been updated.");
      // CommunityScreen uses useFocusEffect to refetch,
      // so going back is enough to show the updated version.
      navigation.goBack(); // CommunityScreen will refetch on focus
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <PageHeader
          title="Edit Community Post"
          subtitle="Update the details of your post. Board and town stay the same."
        />

        {/* Readonly context: which board + town this post belongs t */}
        <View style={styles.readonlyRow}>
          <Text style={[styles.readonlyLabel, { color: theme.textMuted }]}>
            Board:
          </Text>
          <Text style={[styles.readonlyValue, { color: theme.text }]}>
            {post.type === "highwayconditions"
              ? "Highway Conditions"
              : post.type === "rideshare"
              ? "Ride Share"
              : "Event Buddy"}
          </Text>
        </View>

        <View style={styles.readonlyRow}>
          <Text style={[styles.readonlyLabel, { color: theme.textMuted }]}>
            Town:
          </Text>
          <Text style={[styles.readonlyValue, { color: theme.text }]}>
            {post.town}
          </Text>
        </View>

        {/* Date (target/meetup date) */}
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
            {targetDate.toLocaleDateString()}
          </Text>
        </Pressable>

        {showDatePicker && (
          <DateTimePicker
            value={targetDate}
            mode="date"
            display={Platform.OS === "android" ? "calendar" : "spinner"}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);

              // On Android, event.type === "dismissed" if the user cancels
              if (event?.type === "dismissed") return;
              if (selectedDate) setTargetDate(selectedDate);
            }}
          />
        )}

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

        {/* Body */}
        <Text style={[styles.label, { color: theme.textMuted }]}>Details</Text>
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
          placeholder="Update any info, conditions, times, meetup spot, etc."
          placeholderTextColor={theme.textMuted}
          value={body}
          onChangeText={setBody}
          multiline
          numberOfLines={4}
        />

        {error && (
          <Text style={[styles.errorText, { color: theme.error || "#ff4d4f" }]}>
            {error}
          </Text>
        )}

        <AppButton
          title={submitting ? "Saving..." : "Save Changes"}
          onPress={handleSave}
          loading={submitting}
          variant="primary"
          size="lg"
          style={styles.submitButton}
        />
      </ScrollView>
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

  /* ---- READONLY FIELDS ---- */
  readonlyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },

  readonlyLabel: {
    fontSize: 14,
    marginRight: 4,
  },

  readonlyValue: {
    fontSize: 14,
    fontWeight: "600",
  },

  /* ---- INPUT LABEL ---- */
  label: {
    fontSize: 14,
    marginBottom: 6,
    marginTop: 12,
  },

  /* ---- INPUTS ---- */
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },

  inputMultiline: {
    height: 100,
    textAlignVertical: "top",
  },

  /* ---- ERRORS ---- */
  errorText: {
    marginTop: 8,
    fontSize: 13,
  },

  /* ---- SUBMIT BUTTON ---- */
  submitButton: {
    marginTop: 20,
    marginBottom: 4,
  },
});
