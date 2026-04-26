// screens/account/EditProfileScreen.js
// Lets logged-in users edit their profile fields (not email/password yet)

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import AvatarPicker from "../../components/AvatarPicker";
import AppButton from "../../components/common/AppButton";
import PageHeader from "../../components/common/PageHeader";

const SOCIAL_PROVIDERS = [
  { provider: "instagram", label: "Instagram", placeholder: "@yourhandle" },
  { provider: "tiktok", label: "TikTok", placeholder: "@yourhandle" },
  { provider: "facebook", label: "Facebook", placeholder: "Profile link" },
  { provider: "linkedin", label: "LinkedIn", placeholder: "Profile link" },
  { provider: "website", label: "Website", placeholder: "https://..." },
];
const TOWN_OPTIONS = ["Banff", "Canmore", "Lake Louise", "All"];
const USER_TYPE_OPTIONS = [
  { value: "local", label: "Local" },
  { value: "seasonal", label: "Seasonal" },
  { value: "visitor", label: "Visitor" },
];
const INTEREST_OPTIONS = [
  "Hiking",
  "Skiing",
  "Snowboarding",
  "Climbing",
  "Live music",
  "Markets",
  "Wellness",
  "Food & drink",
  "Nightlife",
  "Coffee",
  "Book club",
  "Art",
  "Walking",
  "Bingo",
  "Trivia",
  "Shopping",
];
const SKILL_OPTIONS = [
  { value: "beginner", label: "Beginner" },
  { value: "casual", label: "Casual" },
  { value: "experienced", label: "Experienced" },
];

function ChipGroup({ options, value, values, onChange, onToggle, theme }) {
  return (
    <View style={styles.chipRow}>
      {options.map((option) => {
        const optionValue = typeof option === "string" ? option : option.value;
        const optionLabel = typeof option === "string" ? option : option.label;
        const isSelected = values
          ? values.includes(optionValue)
          : value === optionValue;

        return (
          <Pressable
            key={optionValue}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected
                  ? theme.accentSoft || theme.card
                  : theme.card,
                borderColor: isSelected ? theme.accent : theme.border,
              },
            ]}
            onPress={() =>
              onToggle ? onToggle(optionValue) : onChange(optionValue)
            }
          >
            <Text
              style={[
                styles.chipText,
                { color: isSelected ? theme.accent : theme.textMuted },
              ]}
            >
              {optionLabel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function getSocialValue(accounts, provider) {
  const account = accounts.find((item) => item.provider === provider);
  return account?.handle || account?.url || "";
}

function buildSocialAccounts(values) {
  return SOCIAL_PROVIDERS.map(({ provider }) => {
    const value = values[provider]?.trim();
    if (!value) return null;

    const isHandle = value.startsWith("@") || !value.includes(".");
    return {
      provider,
      handle: isHandle ? value : undefined,
      url: isHandle ? undefined : value,
      verified: false,
    };
  }).filter(Boolean);
}

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
          <PageHeader
            title="Edit profile"
            subtitle="You need to be logged in to edit your profile."
          />
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
  const [userType, setUserType] = useState(user.userType || "local");
  const [languagesText, setLanguagesText] = useState(
    Array.isArray(user.languages) ? user.languages.join(", ") : ""
  );
  const [interests, setInterests] = useState(
    Array.isArray(user.interests) ? user.interests : []
  );
  const [hikingSkill, setHikingSkill] = useState(
    user.skillLevel?.hiking || ""
  );
  const [skiingSkill, setSkiingSkill] = useState(
    user.skillLevel?.skiing || ""
  );
  const [bio, setBio] = useState(user.bio || "");
  const [lookingFor, setLookingFor] = useState(user.lookingFor || "");
  const [instagram, setInstagram] = useState(user.instagram || "");
  const [website, setWebsite] = useState(user.website || "");
  const [avatarKey, setAvatarKey] = useState(user?.avatarKey || null);
  const [socialValues, setSocialValues] = useState(() => {
    const accounts = Array.isArray(user.socialAccounts)
      ? user.socialAccounts
      : [];

    return SOCIAL_PROVIDERS.reduce((current, { provider }) => {
      current[provider] = getSocialValue(accounts, provider);
      return current;
    }, {});
  });

  async function handleSave() {
    try {
      const languages = languagesText
        .split(",")
        .map((language) => language.trim())
        .filter(Boolean);

      const updates = {
        name,
        town,
        bio,
        userType: isBusiness ? undefined : userType,
        languages: isBusiness ? undefined : languages,
        interests: isBusiness ? undefined : interests,
        skillLevel: isBusiness
          ? undefined
          : {
              ...(hikingSkill ? { hiking: hikingSkill } : {}),
              ...(skiingSkill ? { skiing: skiingSkill } : {}),
            },
        lookingFor: isBusiness ? lookingFor : "",
        instagram: socialValues.instagram || instagram,
        avatarKey,
        socialAccounts: buildSocialAccounts(socialValues),
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

  function handleSocialChange(provider, value) {
    setSocialValues((current) => ({
      ...current,
      [provider]: value,
    }));
  }

  function handleToggleInterest(interest) {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest]
    );
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
          <PageHeader title={titleText} subtitle={helperText} />

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

          {isBusiness ? (
            <>
              <Text style={[styles.label, { color: theme.text }]}>
                Where is your business located?
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
                placeholder="Banff, Canmore, Lake Louise..."
                placeholderTextColor={theme.textMuted}
              />
            </>
          ) : (
            <>
              <Text style={[styles.label, { color: theme.text }]}>Town</Text>
              <ChipGroup
                options={TOWN_OPTIONS}
                value={town}
                onChange={setTown}
                theme={theme}
              />

              <Text style={[styles.label, { color: theme.text }]}>I am a</Text>
              <ChipGroup
                options={USER_TYPE_OPTIONS}
                value={userType}
                onChange={setUserType}
                theme={theme}
              />

              <Text style={[styles.label, { color: theme.text }]}>
                Languages spoken
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
                placeholder="English, French, Spanish..."
                placeholderTextColor={theme.textMuted}
                value={languagesText}
                onChangeText={setLanguagesText}
              />

              <Text style={[styles.label, { color: theme.text }]}>
                Interests
              </Text>
              <ChipGroup
                options={INTEREST_OPTIONS}
                values={interests}
                onToggle={handleToggleInterest}
                theme={theme}
              />

              <Text style={[styles.label, { color: theme.text }]}>
                Hiking level
              </Text>
              <ChipGroup
                options={SKILL_OPTIONS}
                value={hikingSkill}
                onChange={setHikingSkill}
                theme={theme}
              />

              <Text style={[styles.label, { color: theme.text }]}>
                Skiing/Snowboarding level
              </Text>
              <ChipGroup
                options={SKILL_OPTIONS}
                value={skiingSkill}
                onChange={setSkiingSkill}
                theme={theme}
              />
            </>
          )}

          {/* Looking for / business type */}
          {isBusiness ? (
            <>
              <Text style={[styles.label, { color: theme.text }]}>
                Business type
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
                placeholder="Cafe, yoga studio, music venue..."
                placeholderTextColor={theme.textMuted}
              />
            </>
          ) : null}

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

          {/* Website – business only */}
          <Text
            style={[
              styles.label,
              { marginTop: 16, fontWeight: "700", color: theme.text },
            ]}
          >
            Connected socials
          </Text>
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            Add links people can use to recognize you. These show as unverified
            until connected through the social platform.
          </Text>

          {SOCIAL_PROVIDERS.map(({ provider, label, placeholder }) => (
            <View key={provider}>
              <Text style={[styles.label, { color: theme.text }]}>
                {label} (optional)
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
                value={socialValues[provider]}
                onChangeText={(value) => handleSocialChange(provider, value)}
                placeholder={placeholder}
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
              />
            </View>
          ))}

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
            <AppButton
              title="Cancel"
              onPress={handleCancel}
              disabled={isAuthLoading}
              variant="outline"
              style={styles.flexButton}
            />

            <AppButton
              title={isAuthLoading ? "Saving..." : "Save changes"}
              onPress={handleSave}
              loading={isAuthLoading}
              variant="primary"
              style={styles.flexButton}
            />
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
  helperText: {
    fontSize: 12,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    marginBottom: 4,
    marginTop: 10,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
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
  flexButton: {
    flex: 1,
  },
});
