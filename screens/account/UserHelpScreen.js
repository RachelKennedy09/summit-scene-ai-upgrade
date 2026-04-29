import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import PageHeader from "../../components/common/PageHeader";
import { colors } from "../../theme/colors";
import { useTheme } from "../../context/ThemeContext";

function HelpSection({ title, children, theme }) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function HelpText({ children, theme }) {
  return <Text style={[styles.bodyText, { color: theme.textMuted }]}>{children}</Text>;
}

function Question({ question, answer, theme }) {
  return (
    <View style={styles.questionBlock}>
      <Text style={[styles.question, { color: theme.text }]}>{question}</Text>
      <Text style={[styles.answer, { color: theme.textMuted }]}>{answer}</Text>
    </View>
  );
}

export default function UserHelpScreen() {
  const { theme } = useTheme();

  function handleEmail() {
    Linking.openURL(
      "mailto:admin@summitscene.ca?subject=Summit%20Scene%20Help"
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader
          title="Help & FAQ"
          subtitle="How to find events, meet people, and use Summit Scene safely."
        />

        <HelpSection title="How to use the app" theme={theme}>
          <HelpText theme={theme}>
            Use Hub to browse events, Map to see what is nearby, and Community to
            find people for plans, hikes, groups, and local meetups.
          </HelpText>
          <HelpText theme={theme}>
            On an event page, tap I'm Going to save your attendance, or Find
            Event Buddies to create a post for people who want to go together.
          </HelpText>
        </HelpSection>

        <HelpSection title="Community posts" theme={theme}>
          <HelpText theme={theme}>
            Local Plans are for specific plans like open mic, walks, hikes, or
            coffee before an event. New in Town is for newcomers. Groups are for
            repeatable interests like book club, trivia, hiking, or art nights.
          </HelpText>
        </HelpSection>

        <HelpSection title="Safety" theme={theme}>
          <HelpText theme={theme}>
            Meet in public places, tell someone where you are going, and use
            Report or Block if something feels off. Blocked people are hidden
            from your feeds, replies, profiles, and attendee lists where possible.
          </HelpText>
        </HelpSection>

        <HelpSection title="FAQ" theme={theme}>
          <Question
            theme={theme}
            question="Do I need to message people outside the app?"
            answer="For launch, replies and interest buttons help you connect inside Summit Scene. Social links can add trust when someone chooses to share them."
          />
          <Question
            theme={theme}
            question="Why did an old saved event disappear?"
            answer="Past events are removed from saved and going lists so your account stays focused on upcoming plans."
          />
          <Question
            theme={theme}
            question="Can I create business events from a user account?"
            answer="No. Business and organizer accounts are separate and must be created as business accounts during signup."
          />
        </HelpSection>

        <Pressable
          style={[styles.contactButton, { borderColor: theme.accent }]}
          onPress={handleEmail}
        >
          <Text style={[styles.contactText, { color: theme.accent }]}>
            Contact Summit Scene
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
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  questionBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 10,
  },
  question: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 4,
  },
  answer: {
    fontSize: 13,
    lineHeight: 19,
  },
  contactButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  contactText: {
    fontSize: 13,
    fontWeight: "800",
  },
});
