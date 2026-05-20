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

export default function BusinessHelpScreen() {
  const { theme } = useTheme();

  function handleEmail() {
    Linking.openURL(
      "mailto:summitscene@outlook.com?subject=Summit%20Scene%20Business%20Support"
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader
          title="Business Help"
          subtitle="How verified businesses and organizers post events on Summit Scene."
        />

        <HelpSection title="Getting verified" theme={theme}>
          <HelpText theme={theme}>
            Business accounts are reviewed before official event posting unlocks.
            Add your business type, website, and official social links in Edit
            Profile.
          </HelpText>
          <HelpText theme={theme}>
            To speed up approval, email Summit Scene or DM from the official
            business account so we can confirm you are authorized to post.
          </HelpText>
        </HelpSection>

        <HelpSection title="Posting events" theme={theme}>
          <HelpText theme={theme}>
            Use Post Event for official events hosted by your venue, shop,
            organization, or event series. Choose a specific category so users
            can find it through Hub, Map, filters, and buddy posts.
          </HelpText>
          <HelpText theme={theme}>
            Keep titles clear, add accurate time and location details, and update
            events if anything changes.
          </HelpText>
        </HelpSection>

        <HelpSection title="Permits and local rules" theme={theme}>
          <HelpText theme={theme}>
            You are responsible for checking whether your event needs permits,
            licences, insurance, venue approval, food approval, liquor licensing,
            road use approval, Parks Canada approval, or municipal approval.
          </HelpText>
          <HelpText theme={theme}>
            Posting on Summit Scene does not mean an event is approved by Parks
            Canada, the Town of Banff, the Town of Canmore, Alberta Health
            Services, AGLC, or the venue.
          </HelpText>
        </HelpSection>

        <HelpSection title="What users can do with your event" theme={theme}>
          <HelpText theme={theme}>
            Users can mark I'm Going, save reminders, invite friends outside the
            app, and create Find Event Buddies posts linked to your event.
          </HelpText>
        </HelpSection>

        <HelpSection title="FAQ" theme={theme}>
          <Question
            theme={theme}
            question="Why can I not post yet?"
            answer="Your business profile may still be pending review. Event posting unlocks after Summit Scene verifies the account."
          />
          <Question
            theme={theme}
            question="Should I use a user account for business posts?"
            answer="No. Community accounts are for people making plans. Official events should come from verified business or organizer accounts."
          />
          <Question
            theme={theme}
            question="Can I edit or remove my event?"
            answer="Yes. Use My Events to manage events created by your business account."
          />
        </HelpSection>

        <Pressable
          style={[styles.contactButton, { borderColor: theme.accent }]}
          onPress={handleEmail}
        >
          <Text style={[styles.contactText, { color: theme.accent }]}>
            Email summitscene@outlook.com
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
