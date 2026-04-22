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
        Tell visitors and locals about your business
      </Text>

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
      <Text style={[styles.label, { color: theme.text }]}>Website</Text>
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
