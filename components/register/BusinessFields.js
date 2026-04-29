// components/register/BusinessFields.js
// Extra profile fields for BUSINESS accounts

import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";

function BusinessFields({
  town,
  businessType,
  website,
  instagram,
  onChangeTown,
  onChangeBusinessType,
  onChangeWebsite,
  onChangeInstagram,
  theme,
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: theme.text }]}>
        Tell Summit Scene about your business
      </Text>
      <Text style={[styles.helperText, { color: theme.textMuted }]}>
        Business profiles are reviewed before they can post official events.
        Use an official website, business Instagram, or public page that clearly
        matches your business.
      </Text>
      <View style={[styles.noticeBox, { borderColor: theme.border }]}>
        <Text style={[styles.noticeText, { color: theme.textMuted }]}>
          If your proof link is unclear, email Summit Scene or DM from the
          official business account so we can verify you are authorized to
          create this profile.
        </Text>
      </View>

      {/* BUSINESS LOCATION */}
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
        placeholder="Banff, Canmore, Lake Louise..."
        placeholderTextColor={theme.textMuted}
        value={town}
        onChangeText={onChangeTown}
      />

      {/* BUSINESS TYPE */}
      <Text style={[styles.label, { color: theme.text }]}>
        What type of business is this?
      </Text>
      <TextInput
        style={[
          styles.input,
          styles.smallTextArea,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            color: theme.text,
          },
        ]}
        placeholder="Cafe, yoga studio, live music venue, shop..."
        placeholderTextColor={theme.textMuted}
        multiline
        numberOfLines={2}
        value={businessType}
        onChangeText={onChangeBusinessType}
      />

      {/* WEBSITE */}
      <Text style={[styles.label, { color: theme.text }]}>
        Website or official page
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
        placeholder="https://your-business.com"
        placeholderTextColor={theme.textMuted}
        value={website}
        onChangeText={onChangeWebsite}
      />

      {/* SOCIAL LINKS (OPTIONAL) */}
      <Text style={[styles.label, { color: theme.text }]}>
        Instagram or public social account
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
        placeholder="@yourbusiness"
        placeholderTextColor={theme.textMuted}
        value={instagram}
        onChangeText={onChangeInstagram}
      />
    </View>
  );
}

export default BusinessFields;

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
    fontSize: 14,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  noticeBox: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 12,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 17,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  smallTextArea: {
    height: 60,
    textAlignVertical: "top",
  },
});
