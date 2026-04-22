// screens/auth/LoginScreen.js (or similar path)
// Lets users enter email/password and requests a JWT from the backend via AuthContext

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  ScrollView,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";
import Logo from "../../assets/logo.png";

function LoginScreen() {
  const { login, isAuthLoading } = useAuth(); // login() talks to backend, isAuthLoading = global auth state
  const navigation = useNavigation();
  const { isDark } = useTheme();

  // Logged-out auth screens intentionally ignore the user's saved palette.
  // They only follow light/dark appearance with a neutral black/white UI.
  const theme = isDark
    ? {
        background: "#000000",
        card: "#111111",
        border: "#2A2A2A",
        text: "#FFFFFF",
        textMuted: "#B3B3B3",
        accent: "#FFFFFF",
      }
    : {
        background: "#FFFFFF",
        card: "#F5F5F5",
        border: "#D4D4D4",
        text: "#111111",
        textMuted: "#5C5C5C",
        accent: "#111111",
      };

  // ----- FORM STATE -----
  const [email, setEmail] = useState(""); // user email
  const [password, setPassword] = useState(""); // user password
  const [isSubmitting, setIsSubmitting] = useState(false); // local loading flag for this screen

  // ----- HANDLERS -----

  // Runs when user taps "Log In"
  async function handleLogin() {
    // Prevent sending empty requests
    if (!email || !password) {
      Alert.alert("Missing info", "Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Hand off to AuthContext to call /login on backend
      await login({ email, password });
      // If successful, AuthContext will update user + token
      // Navigation is handled by RootNavigator based on auth state
    } catch (error) {
      console.error("Login failed:", error);
      Alert.alert("Login failed", error.message || "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    // KeyboardAvoidingView keeps inputs visible when keyboard is open
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Dismiss keyboard when tapping outside inputs */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            {/* App logo */}
            <View style={styles.logoContainer}>
              <Image source={Logo} style={styles.logo} resizeMode="contain" />
            </View>

            {/* Headline + intro text */}
            <Text style={[styles.title, { color: theme.text }]}>
              Welcome To Summit Scene Hub!
            </Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              Log in to see and post local events in Banff, Canmore and Lake
              Louise.
            </Text>

            {/* EMAIL FIELD */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>

            {/* PASSWORD FIELD */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                Password
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
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={theme.textMuted}
                secureTextEntry
              />
            </View>

            {/* LOGIN BUTTON */}
            <Pressable
              style={[
                styles.button,
                {
                  backgroundColor: theme.accent,
                },
                (isSubmitting || isAuthLoading) && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isSubmitting || isAuthLoading}
            >
              <Text
                style={[
                styles.buttonText,
                {
                    // On auth screens the accent is black or white, so invert text.
                    color: isDark ? "#000000" : "#FFFFFF",
                  },
                ]}
              >
                {isSubmitting || isAuthLoading ? "Logging in..." : "Log In"}
              </Text>
            </Pressable>

            {/* LINK → REGISTER SCREEN */}
            <Pressable onPress={() => navigation.navigate("Register")}>
              <Text
                style={[
                  styles.linkText,
                  {
                    color: theme.accent,
                  },
                ]}
              >
                Don't have an account? Sign up
              </Text>
            </Pressable>
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
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
  },
  button: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontWeight: "700",
    fontSize: 16,
  },
  linkText: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 14,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 28,
    padding: 18,
  },
  logo: {
    width: 160,
    height: 180,
    opacity: 0.95,
  },
});
