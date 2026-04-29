import React, { useState } from "react";
import { Alert, Image, SafeAreaView, StyleSheet, Text, View } from "react-native";

import Logo from "../../assets/logo-app-earth-transparent-alpha.png";
import AppButton from "../../components/common/AppButton";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const TIPS = [
  "Meet in public places for first plans.",
  "Check profiles before making plans.",
  "Keep first meetups simple and low-pressure.",
  "Use report or block if something feels off.",
];

export default function SafetyTipsScreen() {
  const { markSafetyTipsSeen, isAuthLoading } = useAuth();
  const { theme } = useTheme();
  const [submitting, setSubmitting] = useState(false);

  async function handleContinue() {
    try {
      setSubmitting(true);
      await markSafetyTipsSeen();
    } catch (error) {
      Alert.alert("Please try again", error.message || "Could not continue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <View style={styles.content}>
        <Image source={Logo} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.title, { color: theme.text }]}>
          A quick note before you explore
        </Text>
        <Text style={[styles.intro, { color: theme.textMuted }]}>
          Summit Scene is made for amazing, safe, fun mountain towns. Most
          people are here for good reasons, but it is always worth keeping a few
          simple things in mind.
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          {TIPS.map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: theme.accent },
                ]}
              />
              <Text style={[styles.tipText, { color: theme.text }]}>
                {tip}
              </Text>
            </View>
          ))}
        </View>

        <Text style={[styles.footerText, { color: theme.textMuted }]}>
          You can always report or block from profiles, replies, and buddy
          posts.
        </Text>

        <AppButton
          title="Got it"
          onPress={handleContinue}
          loading={submitting || isAuthLoading}
          variant="primary"
          size="lg"
          style={styles.button}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  logo: {
    width: 142,
    height: 154,
    alignSelf: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 10,
  },
  intro: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 18,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  footerText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 16,
  },
  button: {
    marginTop: 20,
  },
});
