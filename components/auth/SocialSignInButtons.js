import React, { useEffect, useState } from "react";
import {
  Alert,
  NativeModules,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

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

export default function SocialSignInButtons({
  disabled = false,
  onBeforeSubmit,
  onBusyChange,
  showTermsNote = true,
}) {
  const {
    signInWithApple,
    signInWithGoogle,
    isAuthLoading,
    clearAuthNoticeMessage,
  } = useAuth();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const isDisabled = disabled || isSubmitting || isAuthLoading;

  useEffect(() => {
    let isMounted = true;

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

  function setBusy(nextValue) {
    setIsSubmitting(nextValue);
    onBusyChange?.(nextValue);
  }

  function finishAuthNavigation(result) {
    const nextUser = result?.user || {};
    if (result?.isNewUser && nextUser.onboardingCompleted === false) {
      if (nextUser.hasSeenSafetyTips) {
        navigation.reset({ index: 0, routes: [{ name: "SocialOnboarding" }] });
        return;
      }
    }

    navigation.reset({ index: 0, routes: [{ name: "tabs" }] });
  }

  async function handleAppleSignIn() {
    if (isDisabled) return;

    try {
      onBeforeSubmit?.();
      clearAuthNoticeMessage?.();
      setBusy(true);

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

      const result = await signInWithApple({
        identityToken: credential.identityToken,
        fullName: credential.fullName,
      });
      finishAuthNavigation(result);
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
      setBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    if (isDisabled) return;

    try {
      onBeforeSubmit?.();
      clearAuthNoticeMessage?.();
      setBusy(true);

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

      const authResult = await signInWithGoogle({ idToken: result.data.idToken });
      finishAuthNavigation(authResult);
    } catch (error) {
      if (error?.code === "SIGN_IN_CANCELLED") {
        return;
      }

      Alert.alert(
        "Google sign-in failed",
        error.message || "Please try again or use email login."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.socialAuthGroup}>
      {Platform.OS === "ios" && isAppleAuthAvailable ? (
        <>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={8}
            style={[styles.appleButton, { opacity: isDisabled ? 0.65 : 1 }]}
            onPress={handleAppleSignIn}
          />
          {showTermsNote ? (
            <Text style={[styles.termsNote, { color: theme.textMuted }]}>
              By continuing, you confirm you are 18+ and agree to Summit Scene's
              Privacy & Terms.
            </Text>
          ) : null}
        </>
      ) : null}

      <Pressable
        style={[styles.googleButton, { opacity: isDisabled ? 0.65 : 1 }]}
        disabled={isDisabled}
        onPress={handleGoogleSignIn}
      >
        <Ionicons name="logo-google" size={18} color="#FFFFFF" />
        <Text style={styles.googleButtonText}>Continue with Google</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  socialAuthGroup: {
    gap: 8,
    marginBottom: 16,
  },
  termsNote: {
    marginBottom: 2,
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
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1F1F1F",
  },
  googleButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
