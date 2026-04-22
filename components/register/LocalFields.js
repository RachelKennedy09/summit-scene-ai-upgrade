// components/register/LocalFields.js
// Extra profile fields for LOCAL accounts

import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";

function LocalFields({
  town,
  bio,
  lookingFor,
  instagram,
  onChangeTown,
  onChangeBio,
  onChangeLookingFor,
  onChangeInstagram,
  theme,
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: theme.text }]}>
        Tell visitors and locals a bit about you
      </Text>

      {/* TOWN / PLACE OF RESIDENCE */}
      <Text style={[styles.label, { color: theme.text }]}>
        Where do you live?
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
        placeholder="Banff, Canmore, Lake Louise... Visiting?"
        placeholderTextColor={theme.textMuted}
        value={town}
        onChangeText={onChangeTown}
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
        placeholder="Tell locals who you are and what you love..."
        placeholderTextColor={theme.textMuted}
        multiline
        numberOfLines={3}
        value={bio}
        onChangeText={onChangeBio}
      />

      {/* LOOKING FOR */}
      <Text style={[styles.label, { color: theme.text }]}>
        What are you looking for?
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
        placeholder="Markets, yoga buddies, music nights, hiking friends..."
        placeholderTextColor={theme.textMuted}
        multiline
        numberOfLines={2}
        value={lookingFor}
        onChangeText={onChangeLookingFor}
      />

      {/* SOCIAL LINKS */}
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
        placeholder="@yourhandle"
        placeholderTextColor={theme.textMuted}
        value={instagram}
        onChangeText={onChangeInstagram}
      />
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
    fontSize: 14,
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
  smallTextArea: {
    height: 60,
    textAlignVertical: "top",
  },
});
