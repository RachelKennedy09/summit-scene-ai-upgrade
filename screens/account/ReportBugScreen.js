import React, { useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import PageHeader from "../../components/common/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const ISSUE_TYPES = ["Bug", "Wrong event info", "Safety concern", "Idea"];

export default function ReportBugScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [issueType, setIssueType] = useState("Bug");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [steps, setSteps] = useState("");

  const canSend = title.trim() && details.trim();

  const body = useMemo(() => {
    return [
      `Issue type: ${issueType}`,
      `Title: ${title.trim()}`,
      "",
      "What happened:",
      details.trim(),
      "",
      "Steps to reproduce:",
      steps.trim() || "Not provided",
      "",
      "Account:",
      `${user?.name || "Unknown"} | ${user?.email || "No email"} | ${
        user?.role || "unknown"
      }`,
      "",
      "Device:",
      Platform.OS,
    ].join("\n");
  }, [details, issueType, steps, title, user]);

  function handleSend() {
    if (!canSend) {
      Alert.alert(
        "Add a little more detail",
        "Please add a short title and what happened before sending."
      );
      return;
    }

    const subject = encodeURIComponent(`Summit Scene ${issueType}: ${title.trim()}`);
    const encodedBody = encodeURIComponent(body);
    const url = `mailto:summitscene@outlook.com?subject=${subject}&body=${encodedBody}`;

    Linking.openURL(url).catch(() => {
      Alert.alert(
        "Could not open email",
        "Please email summitscene@outlook.com with what happened."
      );
    });
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader
          title="Report a Bug"
          subtitle="Tell Summit Scene what went wrong so it can be fixed."
        />

        <Text style={[styles.label, { color: theme.text }]}>Type</Text>
        <View style={styles.typeRow}>
          {ISSUE_TYPES.map((type) => {
            const selected = issueType === type;
            return (
              <Pressable
                key={type}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: selected
                      ? theme.accentSoft || theme.pill
                      : theme.card,
                    borderColor: selected ? theme.accent : theme.border,
                  },
                ]}
                onPress={() => setIssueType(type)}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    { color: selected ? theme.accent : theme.text },
                  ]}
                >
                  {type}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.label, { color: theme.text }]}>Short title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Example: Map filters are not loading"
            placeholderTextColor={theme.textMuted}
            style={[
              styles.input,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.background,
              },
            ]}
          />

          <Text style={[styles.label, { color: theme.text }]}>What happened?</Text>
          <TextInput
            value={details}
            onChangeText={setDetails}
            placeholder="Tell us what you expected and what happened instead."
            placeholderTextColor={theme.textMuted}
            multiline
            textAlignVertical="top"
            style={[
              styles.textArea,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.background,
              },
            ]}
          />

          <Text style={[styles.label, { color: theme.text }]}>
            Steps to reproduce
          </Text>
          <TextInput
            value={steps}
            onChangeText={setSteps}
            placeholder="Example: Open Hub, choose category, tap filter..."
            placeholderTextColor={theme.textMuted}
            multiline
            textAlignVertical="top"
            style={[
              styles.textAreaSmall,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.background,
              },
            ]}
          />
        </View>

        <Pressable
          style={[
            styles.sendButton,
            {
              backgroundColor: canSend ? theme.accent : theme.card,
              borderColor: canSend ? theme.accent : theme.border,
              opacity: canSend ? 1 : 0.75,
            },
          ]}
          onPress={handleSend}
        >
          <Text
            style={[
              styles.sendButtonText,
              { color: canSend ? theme.onAccent || "#fff" : theme.textMuted },
            ]}
          >
            Email Bug Report
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 7,
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  typeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: "800",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 14,
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  textAreaSmall: {
    minHeight: 86,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  sendButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },
});
