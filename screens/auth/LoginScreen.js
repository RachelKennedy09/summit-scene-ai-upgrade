// screens/auth/LoginScreen.js (or similar path)
// Lets users enter email/password and requests a JWT from the backend via AuthContext

import React, { useEffect, useState } from "react";
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
  Alert,
  NativeModules,
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";
import Logo from "../../assets/logo-app-earth-transparent-alpha.png";
import AppButton from "../../components/common/AppButton";

const REMEMBERED_EMAIL_KEY = "rememberedLoginEmail";

function getGoogleSignInModule() {
  if (!NativeModules.RNGoogleSignin) {
    return null;
  }

  try {
    return require("@react-native-google-signin/google-signin");
  } catch {
    return null;
  }
}

function LoginScreen() {
  const {
    login,
    signInWithApple,
    signInWithGoogle,
    isAuthLoading,
    authNoticeMessage,
    clearAuthNoticeMessage,
  } = useAuth(); // login() talks to backend, isAuthLoading = global auth state
  const navigation = useNavigation();
  const { theme } = useTheme();

  // ----- FORM STATE -----
  const [email, setEmail] = useState(""); // user email
  const [password, setPassword] = useState(""); // user password
  const [isSubmitting, setIsSubmitting] = useState(false); // local loading flag for this screen
  const [errorMessage, setErrorMessage] = useState("");
  const [rememberEmail, setRememberEmail] = useState(true);
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  useEffect(() => {
    let isMounted = true;

    async function loadRememberedEmail() {
      try {
        const savedEmail = await AsyncStorage.getItem(REMEMBERED_EMAIL_KEY);
        if (isMounted && savedEmail) {
          setEmail(savedEmail);
          setRememberEmail(true);
        }
      } catch {
        // Remembered email is optional. Ignore storage errors.
      }
    }

    async function checkAppleAuthAvailability() {
      if (Platform.OS !== "ios") {
        return;
      }

      try {
        const available = await AppleAuthentication.isAvailableAsync();
        if (isMounted) {
          setIsAppleAuthAvailable(Boolean(available));
        }
      } catch {
        if (isMounted) {
          setIsAppleAuthAvailable(false);
        }
      }
    }

    loadRememberedEmail();
    checkAppleAuthAvailability();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!googleWebClientId) {
      return;
    }

    const googleModule = getGoogleSignInModule();
    googleModule?.GoogleSignin?.configure({
      webClientId: googleWebClientId,
      offlineAccess: false,
    });
  }, [googleWebClientId]);

  // ----- HANDLERS -----

  // Runs when user taps "Log In"
  async function handleLogin() {
    // Prevent sending empty requests
    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setErrorMessage("");
    clearAuthNoticeMessage?.();
    setIsSubmitting(true);

    try {
      // Hand off to AuthContext to call /login on backend
      const trimmedEmail = email.trim();
      await login({ email: trimmedEmail, password });
      if (rememberEmail) {
        await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, trimmedEmail);
      } else {
        await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
      navigation.reset({ index: 0, routes: [{ name: "tabs" }] });
    } catch (error) {
      const message = error.message || "Please try again.";
      setErrorMessage(message);
      Alert.alert("Login failed", message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAppleSignIn() {
    try {
      setErrorMessage("");
      clearAuthNoticeMessage?.();
      setIsSubmitting(true);

      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        throw new Error(
          "Sign in with Apple is not available on this device. Please use email login."
        );
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("Apple did not return an identity token.");
      }

      await signInWithApple({
        identityToken: credential.identityToken,
        fullName: credential.fullName,
      });
      navigation.reset({ index: 0, routes: [{ name: "tabs" }] });
    } catch (error) {
      if (error?.code === "ERR_REQUEST_CANCELED") {
        return;
      }

      Alert.alert(
        "Apple sign-in failed",
        error.message || "Please try again or use email login."
      );
      clearAuthNoticeMessage?.();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    try {
      setErrorMessage("");
      clearAuthNoticeMessage?.();
      setIsSubmitting(true);

      if (!googleWebClientId) {
        throw new Error("Google sign-in is not configured yet.");
      }

      const googleModule = getGoogleSignInModule();
      const googleSignIn = googleModule?.GoogleSignin;
      if (!googleSignIn) {
        throw new Error("Google sign-in requires a development or store build.");
      }

      await googleSignIn.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      const result = await googleSignIn.signIn();

      if (result.type !== "success" || !result.data?.idToken) {
        return;
      }

      await signInWithGoogle({ idToken: result.data.idToken });
      navigation.reset({ index: 0, routes: [{ name: "tabs" }] });
    } catch (error) {
      if (error?.code === "SIGN_IN_CANCELLED") {
        return;
      }

      Alert.alert(
        "Google sign-in failed",
        error.message || "Please try again or use email login."
      );
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

            {authNoticeMessage ? (
              <View
                style={[
                  styles.noticeBox,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={[styles.noticeText, { color: theme.text }]}>
                  {authNoticeMessage}
                </Text>
              </View>
            ) : null}

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
                  if (authNoticeMessage) {
                    clearAuthNoticeMessage?.();
                  }
                }}
                placeholder="you@example.com"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                autoComplete="email"
                textContentType="username"
                inputMode="email"
              />
            </View>

            <Pressable
              style={styles.rememberRow}
              onPress={() => setRememberEmail((current) => !current)}
            >
              <View
                style={[
                  styles.checkbox,
                  styles.rememberCheckbox,
                  {
                    borderColor: rememberEmail ? theme.accent : theme.border,
                    backgroundColor: rememberEmail
                      ? theme.accent
                      : theme.background,
                  },
                ]}
              >
                {rememberEmail ? (
                  <Text
                    style={[
                      styles.checkboxMark,
                      { color: theme.onAccent || theme.textOnAccent || "#FFFFFF" },
                    ]}
                  >
                    ✓
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.rememberText, { color: theme.textMuted }]}>
                Remember email on this device
              </Text>
            </Pressable>

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
                  if (authNoticeMessage) {
                    clearAuthNoticeMessage?.();
                  }
                }}
                placeholder="••••••••"
                placeholderTextColor={theme.textMuted}
                secureTextEntry
                autoComplete="password"
                textContentType="password"
              />
            </View>

            {errorMessage ? (
              <Text style={[styles.errorText, { color: "#D14343" }]}>
                {errorMessage}
              </Text>
            ) : null}

            <View
              style={[
                styles.agreementCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.agreementTitle, { color: theme.text }]}>
                Account terms
              </Text>
              <Text style={[styles.agreementText, { color: theme.textMuted }]}>
                By logging in, you confirm you are at least 18 years old and
                agree to Summit Scene's Privacy Policy, Terms of Use, and
                Community Guidelines.
              </Text>
              <Pressable onPress={() => navigation.navigate("Legal")}>
                <Text style={[styles.agreementLink, { color: theme.accent }]}>
                  Read Privacy, Terms, and Community Guidelines
                </Text>
              </Pressable>
            </View>

            {/* LOGIN BUTTON */}
            <AppButton
              title={isSubmitting || isAuthLoading ? "Logging in..." : "Log In"}
              onPress={handleLogin}
              loading={isSubmitting || isAuthLoading}
              disabled={isSubmitting || isAuthLoading}
              size="lg"
              style={{
                marginTop: 8,
                backgroundColor: theme.accent,
                borderColor: theme.accent,
                opacity: isSubmitting || isAuthLoading ? 0.65 : 1,
              }}
              textStyle={{
                color: theme.onAccent || theme.textOnAccent || "#FFFFFF",
              }}
            />

            {Platform.OS === "ios" && isAppleAuthAvailable ? (
              <>
                <Text style={[styles.termsNote, { color: theme.textMuted }]}>
                  By continuing with Apple, you confirm you are 18+ and agree to
                  Summit Scene's Privacy & Terms.
                </Text>
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={8}
                  style={styles.appleButton}
                  onPress={handleAppleSignIn}
                />
              </>
            ) : null}

            {Platform.OS === "android" ? (
              <>
                <Text style={[styles.termsNote, { color: theme.textMuted }]}>
                  By continuing with Google, you confirm you are 18+ and agree
                  to Summit Scene's Privacy & Terms.
                </Text>
                <Pressable
                  style={[
                    styles.googleButton,
                    { opacity: isSubmitting || isAuthLoading ? 0.65 : 1 },
                  ]}
                  disabled={isSubmitting || isAuthLoading}
                  onPress={handleGoogleSignIn}
                >
                  <Text style={styles.googleButtonText}>
                    Sign in with Google
                  </Text>
                </Pressable>
              </>
            ) : null}

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

            <Pressable
              onPress={() => navigation.navigate("tabs", { screen: "Hub" })}
            >
              <Text style={[styles.browseLinkText, { color: theme.accent }]}>
                Continue browsing without an account
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 36,
  },
  inner: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 18,
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
  noticeBox: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    textAlign: "center",
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
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: -6,
    marginBottom: 16,
  },
  rememberCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    marginTop: 0,
  },
  rememberText: {
    fontSize: 13,
    fontWeight: "700",
  },
  agreementCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  agreementRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxMark: {
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 18,
  },
  agreementCopy: {
    flex: 1,
  },
  agreementTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 5,
  },
  agreementText: {
    fontSize: 12,
    lineHeight: 17,
  },
  agreementLink: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  linkText: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 14,
  },
  browseLinkText: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "800",
  },
  legalLinkText: {
    marginTop: 12,
    marginBottom: 8,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
  },
  termsNote: {
    marginTop: 14,
    marginBottom: 8,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 16,
  },
  appleButton: {
    height: 46,
    width: "100%",
    marginBottom: 4,
  },
  googleButton: {
    height: 46,
    width: "100%",
    marginBottom: 4,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1F1F1F",
  },
  googleButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  errorText: {
    marginTop: -4,
    marginBottom: 12,
    fontSize: 13,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 18,
    padding: 10,
  },
  logo: {
    width: 154,
    height: 164,
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
