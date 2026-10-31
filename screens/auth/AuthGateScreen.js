import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";

import AppButton from "../../components/common/AppButton";
import PageHeader from "../../components/common/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const COPY = {
  community: {
    title: "Community requires an account",
    subtitle:
      "Log in or create an account to view Community, post plans, reply, like, report, block, and use the community safety tools.",
    primaryLabel: "Log In",
    secondaryLabel: "Create Account",
    secondaryParams: undefined,
  },
  organizer: {
    title: "List your event",
    subtitle:
      "Summit Scene admin creates and manages event listings. Businesses and organizers can email hello@summitscene.ca to request a listing.",
    primaryLabel: "How to list an event",
    secondaryLabel: "Email event details",
    secondaryParams: { initialRole: "business" },
  },
};

export default function AuthGateScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { theme } = useTheme();
  const mode = route.params?.mode === "organizer" ? "organizer" : "community";
  const copy = COPY[mode];

  function handlePrimaryPress() {
    if (mode === "organizer") { navigation.navigate("BusinessHelp"); return; }
    if (user && mode === "organizer") {
      navigation.navigate("Account");
      return;
    }

    navigation.navigate("Login");
  }

  function handleSecondaryPress() {
    if (mode === "organizer") { Linking.openURL("mailto:hello@summitscene.ca?subject=List%20an%20event").catch(() => navigation.navigate("BusinessHelp")); return; }
    if (user && mode === "organizer") {
      navigation.navigate("BusinessHelp");
      return;
    }

    navigation.navigate("Register", copy.secondaryParams);
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader title={copy.title} subtitle={copy.subtitle} />

        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {mode === "organizer" ? "Official event tools" : "Community tools"}
          </Text>
          <Text style={[styles.cardText, { color: theme.textMuted }]}>
            {mode === "organizer"
              ? "Browsing events and maps is open without an account. Email hello@summitscene.ca to request a listing; admin handles publication."
              : "Browsing events and maps is open without an account. Community is account-based because posts, replies, reports, blocks, and moderation tools need a real profile."}
          </Text>
        </View>

        <AppButton
          title={copy.primaryLabel}
          onPress={handlePrimaryPress}
          size="lg"
          style={{ marginTop: 16 }}
        />
        <AppButton
          title={copy.secondaryLabel}
          onPress={handleSecondaryPress}
          variant="outline"
          size="lg"
          style={{ marginTop: 10 }}
        />

        <Pressable onPress={() => navigation.navigate("Legal")}>
          <Text style={[styles.legalLink, { color: theme.textMuted }]}>
            Privacy, Terms, and Community Guidelines
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
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 6,
  },
  cardText: {
    fontSize: 13,
    lineHeight: 19,
  },
  legalLink: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "800",
  },
});
