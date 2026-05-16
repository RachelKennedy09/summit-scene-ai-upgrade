// components/register/LocalFields.js
// Extra profile fields for LOCAL accounts

import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, Alert } from "react-native";
import { PROFILE_INTEREST_GROUPS } from "../../constants/eventCategories";

const TOWN_OPTIONS = ["Banff", "Canmore", "Lake Louise"];
const USER_TYPE_OPTIONS = [
  { value: "local", label: "Local" },
  { value: "seasonal", label: "Seasonal" },
  { value: "visitor", label: "Visiting" },
];
const MAX_PROFILE_INTERESTS_PER_GROUP = 4;
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

function InterestGroupList({ groups, values, onToggle, theme }) {
  const [openGroup, setOpenGroup] = useState(null);

  function handleToggleInterest(group, interest) {
    if (values.includes(interest)) {
      onToggle(interest);
      return;
    }

    const selectedInGroup = values.filter((item) =>
      group.options.includes(item)
    ).length;

    if (selectedInGroup >= MAX_PROFILE_INTERESTS_PER_GROUP) {
      Alert.alert(
        "Main interests limit",
        `Choose up to ${MAX_PROFILE_INTERESTS_PER_GROUP} interests in each category so your profile stays easy to scan.`
      );
      return;
    }

    onToggle(interest);
  }

  return (
    <View style={styles.interestGroups}>
      {groups.map((group) => {
        const isOpen = openGroup === group.title;
        const selectedCount = group.options.filter((option) =>
          values.includes(option)
        ).length;

        return (
          <View
            key={group.title}
            style={[
              styles.interestGroup,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Pressable
              style={styles.interestGroupHeader}
              onPress={() => setOpenGroup(isOpen ? null : group.title)}
            >
              <View style={styles.interestGroupCopy}>
                <Text style={[styles.interestGroupTitle, { color: theme.text }]}>
                  {group.title}
                </Text>
                <Text
                  style={[styles.interestGroupMeta, { color: theme.textMuted }]}
                >
                  {selectedCount
                    ? `${selectedCount} selected`
                    : "Tap to choose"}
                </Text>
              </View>
              <Text style={[styles.interestGroupChevron, { color: theme.accent }]}>
                {isOpen ? "-" : "+"}
              </Text>
            </Pressable>
            {isOpen ? (
              <View style={styles.interestGroupOptions}>
                <ChipGroup
                  options={group.options}
                  values={values}
                  onToggle={(interest) => handleToggleInterest(group, interest)}
                  theme={theme}
                />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function LocalFields({
  town,
  userType,
  languagesText,
  originallyFrom,
  interests,
  socialValues,
  bio,
  onChangeTown,
  onChangeUserType,
  onChangeLanguagesText,
  onChangeOriginallyFrom,
  onToggleInterest,
  onChangeSocial,
  onChangeBio,
  theme,
}) {
  const townLabel =
    userType === "visitor"
      ? "Where are you staying or spending most of your trip?"
      : userType === "seasonal"
        ? "Where are you based this season?"
        : "Where do you live?";

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: theme.text }]}>
        Tell people enough to know who they are meeting.
      </Text>

      <Text style={[styles.label, { color: theme.text }]}>
        Are you local, seasonal, or visiting?
      </Text>
      <ChipGroup
        options={USER_TYPE_OPTIONS}
        value={userType}
        onChange={onChangeUserType}
        theme={theme}
      />

      {/* TOWN / PLACE OF RESIDENCE */}
      <Text style={[styles.label, { color: theme.text }]}>
        {townLabel}
      </Text>
      <ChipGroup
        options={TOWN_OPTIONS}
        value={town}
        onChange={onChangeTown}
        theme={theme}
      />

      <Text style={[styles.label, { color: theme.text }]}>
        Originally from (optional)
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
        placeholder="Toronto, Australia, Japan..."
        placeholderTextColor={theme.textMuted}
        value={originallyFrom}
        onChangeText={onChangeOriginallyFrom}
      />

      <Text style={[styles.label, { color: theme.text }]}>
        Languages spoken (optional)
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

      <Text style={[styles.label, { color: theme.text }]}>
        Main interests (optional)
      </Text>
      <Text style={[styles.helperText, { color: theme.textMuted }]}>
        Pick up to {MAX_PROFILE_INTERESTS_PER_GROUP} in each category. These
        show on your profile and help start your Hub with event categories you
        care about. You can change these at any time.
      </Text>
      <InterestGroupList
        groups={PROFILE_INTEREST_GROUPS}
        values={interests}
        onToggle={onToggleInterest}
        theme={theme}
      />

      {/* SHORT BIO */}
      <Text style={[styles.label, { color: theme.text }]}>
        Short bio (optional)
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
        placeholder="A little about you, your season, or what you like doing around town..."
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
        until connected through the social platform. Optional at signup.
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
  interestGroups: {
    gap: 10,
    marginBottom: 4,
  },
  interestGroup: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  interestGroupHeader: {
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  interestGroupCopy: {
    flex: 1,
  },
  interestGroupTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  interestGroupMeta: {
    fontSize: 12,
    marginTop: 3,
  },
  interestGroupChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 20,
    fontWeight: "800",
  },
  interestGroupOptions: {
    paddingHorizontal: 12,
    paddingBottom: 2,
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
