import React from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
      "mailto:hello@summitscene.ca?subject=List%20an%20event%20on%20Summit%20Scene"
    ).catch(() => Alert.alert("Contact Summit Scene", "Email hello@summitscene.ca with your event details."));
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader title="List your event" subtitle="For businesses, venues, and organizers in the Bow Valley." />
        <HelpSection title="Let Summit Scene share your event" theme={theme}>
          <HelpText theme={theme}>Have an event in Banff, Canmore, or Lake Louise? Email hello@summitscene.ca. Summit Scene admin reviews submissions and creates listings on behalf of businesses and organizers.</HelpText>
          <HelpText theme={theme}>There are no business or organizer accounts. A member account is only for personal features such as saved events, likes, and notifications.</HelpText>
        </HelpSection>
        <HelpSection title="What to send" theme={theme}>
          <HelpText theme={theme}>Include your business or organizer name, event title, date, start and end times, town, venue and address, a short description, price, age restrictions, accessibility details, and a website or booking link.</HelpText>
          <HelpText theme={theme}>Include a contact email and an official source link so we can confirm the details. If you send an image, confirm you own it or have permission for Summit Scene to use it.</HelpText>
        </HelpSection>
        <HelpSection title="Changes and corrections" theme={theme}>
          <HelpText theme={theme}>Email the event link and the details to change if your event is rescheduled, cancelled, or needs a correction. Admin manages all listing updates. Submitting an event does not guarantee publication.</HelpText>
        </HelpSection>
        <HelpSection title="Bookings and event responsibilities" theme={theme}>
          <HelpText theme={theme}>Bookings take place on the organizer's external website. Businesses and organizers remain responsible for accurate event details, cancellations, refunds, safety, and any permits, licences, insurance, or venue approvals that apply. A Summit Scene listing is not an endorsement or approval of an event.</HelpText>
        </HelpSection>
        <Pressable onPress={handleEmail} accessibilityRole="button" style={[styles.contactButton, { backgroundColor: theme.accent }]}>
          <Text style={[styles.contactText, { color: theme.onAccent || theme.textOnAccent || "#FFFFFF" }]}>Email your event details</Text>
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
