// screens/auth/LoginScreen.js (or similar path)
// Lets users enter email/password and requests a JWT from the backend via AuthContext

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
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
import Logo from "../../assets/logo-app-earth-transparent-alpha.png";
import AppButton from "../../components/common/AppButton";

function LoginScreen() {
  const { login, isAuthLoading } = useAuth(); // login() talks to backend, isAuthLoading = global auth state
  const navigation = useNavigation();
  const { theme } = useTheme();

  // ----- FORM STATE -----
  const [email, setEmail] = useState(""); // user email
  const [password, setPassword] = useState(""); // user password
  const [isSubmitting, setIsSubmitting] = useState(false); // local loading flag for this screen
  const [errorMessage, setErrorMessage] = useState("");

  // ----- HANDLERS -----

  // Runs when user taps "Log In"
  async function handleLogin() {
    // Prevent sending empty requests
    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      // Hand off to AuthContext to call /login on backend
      await login({ email, password });
      // If successful, AuthContext will update user + token
      // Navigation is handled by RootNavigator based on auth state
    } catch (error) {
      setErrorMessage(error.message || "Please try again.");
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
              <Text style={[styles.tagline, { color: theme.textMuted }]}>
                Your Rocky Mountain Social & Events Hub
              </Text>
            </View>

            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              Log in to discover local events, connect with the community, and
              manage your Summit Scene profile across Banff, Canmore, and Lake
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
                onChangeText={(value) => {
                  setEmail(value);
                  if (errorMessage) {
                    setErrorMessage("");
                  }
                }}
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
                onChangeText={(value) => {
                  setPassword(value);
                  if (errorMessage) {
                    setErrorMessage("");
                  }
                }}
                placeholder="••••••••"
                placeholderTextColor={theme.textMuted}
                secureTextEntry
              />
            </View>

            {errorMessage ? (
              <Text style={[styles.errorText, { color: "#D14343" }]}>
                {errorMessage}
              </Text>
            ) : null}

            {/* LOGIN BUTTON */}
            <AppButton
              title={isSubmitting || isAuthLoading ? "Logging in..." : "Log In"}
              onPress={handleLogin}
              loading={isSubmitting || isAuthLoading}
              size="lg"
              style={{
                marginTop: 8,
                backgroundColor: theme.accent,
                borderColor: theme.accent,
              }}
              textStyle={{
                color: theme.onAccent || theme.textOnAccent || "#FFFFFF",
              }}
            />

            <Pressable onPress={() => navigation.navigate("ForgotPassword")}>
              <Text style={[styles.linkText, { color: theme.accent }]}>
                Forgot password?
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

            <Pressable onPress={() => navigation.navigate("Legal")}>
              <Text style={[styles.legalLinkText, { color: theme.textMuted }]}>
                Privacy & Terms
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
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
    textAlign: "center",
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
  linkText: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 14,
  },
  legalLinkText: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
  },
  errorText: {
    marginTop: -4,
    marginBottom: 12,
    fontSize: 13,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 28,
    padding: 18,
  },
  logo: {
    width: 170,
    height: 182,
    opacity: 0.95,
  },
  tagline: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "600",
    fontStyle: "italic",
    textAlign: "center",
    letterSpacing: 0.2,
  },
});
