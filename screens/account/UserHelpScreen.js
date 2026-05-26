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

function HelpList({ items, theme }) {
  return (
    <View style={styles.helpList}>
      {items.map((item) => (
        <View key={item} style={styles.helpListItem}>
          <Text style={[styles.helpListDot, { color: theme.accent }]}>-</Text>
          <Text style={[styles.helpListText, { color: theme.textMuted }]}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
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
      "mailto:hello@summitscene.ca?subject=Summit%20Scene%20Help"
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader
          title="Help & FAQ"
          subtitle="How to find events, meet people, and use Summit Scene safely."
        />

        <HelpSection title="How to use the Hub" theme={theme}>
          <HelpText theme={theme}>
            Hub is the main place to browse what is happening. Start with search
            if you already know what you want, or choose a category, town, and
            date range to browse more casually.
          </HelpText>
          <HelpList
            theme={theme}
            items={[
              "Use Search events to look across events plus community posts like groups/clubs, town notices, and buddy posts.",
              "Use Category when you want a specific type of event, such as music, markets, wellness, sports, food, nightlife, arts, or community activities.",
              "Use Town to focus on Banff, Canmore, Lake Louise, or all towns.",
              "Use Date to switch from today or upcoming dates to All Dates when you want to plan farther ahead.",
              "Use Near me when you want events close to your current location. Location access is optional and can be turned off.",
              "Open an event to see the host, date, time, location, description, map actions, and attendance options.",
              "Tap I'm Going to save your attendance, or use Find Event Buddies if you want to connect with others going to the same event.",
            ]}
          />
        </HelpSection>

        <HelpSection title="How to use the Map" theme={theme}>
          <HelpText theme={theme}>
            Map shows events by location so you can understand what is nearby,
            what is clustered in one area, and what is worth visiting without
            leaving Summit Scene.
          </HelpText>
          <HelpList
            theme={theme}
            items={[
              "Use Search map events when you know the event, venue, category, town, or address you are looking for.",
              "Use Category, Town, and Date the same way as Hub to narrow the pins on the map.",
              "Tap a single pin to open the event preview, then tap the preview to view full event details.",
              "When several events share one location, tap the numbered marker to choose which event you want.",
              "Zoom in when many events are close together. Summit Scene separates close pins at tighter zoom levels so busy streets are easier to browse.",
              "Use Open in Summit Scene Map from an event page when you want to jump back to the map focused on that event.",
              "Use Open in Google Maps when you need outside directions.",
            ]}
          />
        </HelpSection>

        <HelpSection title="How to use Connect and Community" theme={theme}>
          <HelpText theme={theme}>
            Connect and Community help people make plans, meet newcomers, join
            repeat groups, and share practical local updates.
          </HelpText>
          <HelpList
            theme={theme}
            items={[
              "Make a Plan is for specific meetups like coffee, walks, hikes, ski days, casual hangouts, or attending an event together.",
              "New in Town is for introductions from people who recently moved, arrived for a season, or want to meet locals.",
              "Groups are for repeat interests like book clubs, trivia, yoga, outdoor days, art nights, sports, or hobby meetups.",
              "Town Notices are for practical updates like ride shares, gear swaps, garage sales, road blocks, lost and found, and local notices.",
              "Use post replies and interest buttons to connect inside the app before moving to any outside contact.",
              "Open a profile before meeting someone so you can review their public name, interests, town, languages, and shared socials.",
            ]}
          />
        </HelpSection>

        <HelpSection title="How to use Account" theme={theme}>
          <HelpText theme={theme}>
            Account is where you manage your profile, safety settings, saved
            activity, business tools, support, and privacy controls.
          </HelpText>
          <HelpList
            theme={theme}
            items={[
              "Edit Profile lets you update your public name, town, languages, interests, photo, bio, and social links.",
              "Saved Events and I'm Going help you keep track of upcoming plans you care about.",
              "Email verification protects your account and lets password resets go to the correct email address.",
              "Business accounts can manage business profile details, verification, and posted events from Account.",
              "Help & FAQ, Safety, Privacy, Terms, and Community Guidelines are available from Account so public rules are easy to find.",
              "Report a Bug is for app issues. Contact Summit Scene is for support questions or account help.",
              "Delete Account removes your account and associated activity where Summit Scene can safely remove it.",
            ]}
          />
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
            question="Why do I need to verify my email?"
            answer="Email verification helps protect accounts and keeps password resets, login changes, and safety messages connected to the right person."
          />
          <Question
            theme={theme}
            question="Why does the map sometimes show fewer events?"
            answer="The map follows your date and category filters. Change the date range or clear filters if you want to see more events."
          />
          <Question
            theme={theme}
            question="What is the difference between Local Plans, New in Town, Groups, and Town Notices?"
            answer="Local Plans are for specific meetups, New in Town is for introductions, Groups are for repeat interests, and Town Notices are for practical local updates like gear swaps, garage sales, road blocks, ride shares, and lost and found."
          />
          <Question
            theme={theme}
            question="Do I need to message people outside the app?"
            answer="Replies and interest buttons help you connect inside Summit Scene. Social links can add trust when someone chooses to share them."
          />
          <Question
            theme={theme}
            question="What happens when I block someone?"
            answer="Blocked people are hidden from your posts, replies, profiles, attendee lists, and community areas where possible."
          />
          <Question
            theme={theme}
            question="When should I report something?"
            answer="Report posts, events, replies, or profiles that feel unsafe, misleading, abusive, spammy, or not connected to the local community."
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
          <Question
            theme={theme}
            question="Can I delete my account?"
            answer="Yes. Go to Account and choose Delete Account. This removes your profile and associated app activity where the app can safely remove it."
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
  helpList: {
    gap: 7,
  },
  helpListItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  helpListDot: {
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 19,
  },
  helpListText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
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
