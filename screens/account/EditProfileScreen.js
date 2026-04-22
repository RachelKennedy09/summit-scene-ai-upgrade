// screens/account/EditProfileScreen.js
// Lets logged-in users edit their profile fields (not email/password yet)

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import AvatarPicker from "../../components/AvatarPicker";

export default function EditProfileScreen({ navigation }) {
  const { user, updateProfile, isAuthLoading } = useAuth();
  const { theme } = useTheme();

  // Safeguard – if somehow no user
  if (!user) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.background }]}
      >
        <View style={styles.container}>
          <Text style={[styles.heading, { color: theme.text }]}>
            Edit profile
          </Text>
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            You need to be logged in to edit your profile.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isBusiness = user.role === "business";

  // Role-based heading + helper text
  const titleText = isBusiness ? "Event posting profile" : "Edit profile";
  const helperText = isBusiness
    ? "This is how your profile appears when you make an event."
    : "This info shows on your Account screen and on Community posts.";

  // Pre-fill fields from current user
  const [name, setName] = useState(user.name || "");
  const [town, setTown] = useState(user.town || "");
  const [bio, setBio] = useState(user.bio || "");
  const [lookingFor, setLookingFor] = useState(user.lookingFor || "");
  const [instagram, setInstagram] = useState(user.instagram || "");
  const [website, setWebsite] = useState(user.website || "");
  const [avatarKey, setAvatarKey] = useState(user?.avatarKey || null);

  async function handleSave() {
    try {
      const updates = {
        name,
        town,
        bio,
        lookingFor,
        instagram,
        avatarKey,
      };

      if (isBusiness) {
        updates.website = website;
      }

      await updateProfile(updates);

      Alert.alert("Profile updated", "Your changes have been saved.");
      navigation.goBack();
    } catch (error) {
      console.error("updateProfile error:", error);
      Alert.alert(
        "Update failed",
        error.message || "Could not save your profile."
      );
    }
  }

  function handleCancel() {
    navigation.goBack();
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Role-based heading + helper */}
          <Text style={[styles.heading, { color: theme.text }]}>
            {titleText}
          </Text>

          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            {helperText}
          </Text>

          {/* Name */}
          <Text style={[styles.label, { color: theme.text }]}>Name</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={theme.textMuted}
          />

          {/* Town */}
          <Text style={[styles.label, { color: theme.text }]}>
            {isBusiness
              ? "Where is your business located?"
              : "Where do you live?"}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            value={town}
            onChangeText={setTown}
            placeholder={
              isBusiness
                ? "Banff, Canmore, Lake Louise..."
                : "Banff, Canmore, Lake Louise... or visiting?"
            }
            placeholderTextColor={theme.textMuted}
          />

          {/* Looking for / business type */}
          <Text style={[styles.label, { color: theme.text }]}>
            {isBusiness ? "Business type" : "What are you looking for?"}
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.multiline,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            value={lookingFor}
            onChangeText={setLookingFor}
            multiline
            numberOfLines={3}
            placeholder={
              isBusiness
                ? "Cafe, yoga studio, music venue..."
                : "Markets, yoga buddies, music nights, hiking friends..."
            }
            placeholderTextColor={theme.textMuted}
          />

          {/* Bio */}
          <Text style={[styles.label, { color: theme.text }]}>Short bio</Text>
          <TextInput
            style={[
              styles.input,
              styles.multiline,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            placeholder={
              isBusiness
                ? "Tell people about your business, vibe, and what you host."
                : "Tell locals who you are and what you love..."
            }
            placeholderTextColor={theme.textMuted}
          />

          {/* Instagram */}
          <Text style={[styles.label, { color: theme.text }]}>
            Instagram (optional)
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            value={instagram}
            onChangeText={setInstagram}
            placeholder="@yourhandle"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
          />

          {/* Website – business only */}
          {isBusiness && (
            <>
              <Text style={[styles.label, { color: theme.text }]}>
                Website (optional)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={website}
                onChangeText={setWebsite}
                placeholder="https://your-business.com"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
              />
            </>
          )}

          {/* Avatar Picker */}
          <Text
            style={[
              styles.label,
              { marginTop: 16, fontWeight: "600", color: theme.text },
            ]}
          >
            Avatar
          </Text>
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            Choose the avatar that shows on your Community posts and event
            hosting card.
          </Text>

          <AvatarPicker value={avatarKey} onChange={setAvatarKey} />

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <Pressable
              style={[
                styles.secondaryButton,
                {
                  borderColor: theme.border,
                },
              ]}
              onPress={handleCancel}
              disabled={isAuthLoading}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.primaryButton,
                {
                  backgroundColor: theme.accent,
                },
                isAuthLoading && styles.buttonDisabled,
              ]}
              onPress={handleSave}
              disabled={isAuthLoading}
            >
              <Text
                style={[
                  styles.primaryButtonText,
                  {
                    color: theme.background,
                  },
                ]}
              >
                {isAuthLoading ? "Saving..." : "Save changes"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    marginBottom: 4,
    marginTop: 10,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  multiline: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButtonText: {
    fontWeight: "700",
    fontSize: 15,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
