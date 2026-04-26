// components/register/LocalFields.js
// Extra profile fields for LOCAL accounts

import React from "react";
import { View, Text, TextInput, StyleSheet, Pressable } from "react-native";

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
const SOCIAL_PROVIDERS = [
  { provider: "instagram", label: "Instagram", placeholder: "@yourhandle" },
  { provider: "tiktok", label: "TikTok", placeholder: "@yourhandle" },
  { provider: "facebook", label: "Facebook", placeholder: "Profile link" },
  { provider: "linkedin", label: "LinkedIn", placeholder: "Profile link" },
  { provider: "website", label: "Website", placeholder: "https://..." },
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

function LocalFields({
  town,
  userType,
  languagesText,
  interests,
  hikingSkill,
  skiingSkill,
  socialValues,
  bio,
  onChangeTown,
  onChangeUserType,
  onChangeLanguagesText,
  onToggleInterest,
  onChangeHikingSkill,
  onChangeSkiingSkill,
  onChangeSocial,
  onChangeBio,
  theme,
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: theme.text }]}>
        Tell visitors and locals a bit about you
      </Text>

      {/* TOWN / PLACE OF RESIDENCE */}
      <Text style={[styles.label, { color: theme.text }]}>
        Town
      </Text>
      <ChipGroup
        options={TOWN_OPTIONS}
        value={town}
        onChange={onChangeTown}
        theme={theme}
      />

      <Text style={[styles.label, { color: theme.text }]}>I am a</Text>
      <ChipGroup
        options={USER_TYPE_OPTIONS}
        value={userType}
        onChange={onChangeUserType}
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
        onChangeText={onChangeLanguagesText}
      />

      <Text style={[styles.label, { color: theme.text }]}>Interests</Text>
      <ChipGroup
        options={INTEREST_OPTIONS}
        values={interests}
        onToggle={onToggleInterest}
        theme={theme}
      />

      <Text style={[styles.label, { color: theme.text }]}>Hiking level</Text>
      <ChipGroup
        options={SKILL_OPTIONS}
        value={hikingSkill}
        onChange={onChangeHikingSkill}
        theme={theme}
      />

      <Text style={[styles.label, { color: theme.text }]}>
        Skiing/Snowboarding level
      </Text>
      <ChipGroup
        options={SKILL_OPTIONS}
        value={skiingSkill}
        onChange={onChangeSkiingSkill}
        theme={theme}
      />

      {/* SHORT BIO */}
      <Text style={[styles.label, { color: theme.text }]}>Short bio</Text>
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
        placeholder="Tell people who you are and what you love..."
        placeholderTextColor={theme.textMuted}
        multiline
        numberOfLines={3}
        value={bio}
        onChangeText={onChangeBio}
      />

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
            placeholder={placeholder}
            placeholderTextColor={theme.textMuted}
            value={socialValues[provider]}
            onChangeText={(value) => onChangeSocial(provider, value)}
            autoCapitalize="none"
          />
        </View>
      ))}
    </View>
  );
}

export default LocalFields;

const styles = StyleSheet.create({
  section: {
    marginTop: 8,
    marginBottom: 8,
  },
  sectionLabel: {
    marginBottom: 8,
    fontWeight: "500",
  },
  label: {
    marginBottom: 6,
    marginTop: 4,
    fontSize: 14,
    fontWeight: "600",
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
  helperText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
});
