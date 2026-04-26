// screens/RegisterScreen.js
// Registration screen UI
// Lets new users create an account via the /register API
// I collect core auth fields (email/password)
// plus optional profile fields that power the Community + Event host UI.

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
  ScrollView,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";
import { Image } from "react-native";

import AvatarPicker from "../../components/AvatarPicker";
import LocalFields from "../../components/register/LocalFields";
import BusinessFields from "../../components/register/BusinessFields";
import AppButton from "../../components/common/AppButton";
import Logo from "../../assets/logo-app-earth-transparent-alpha.png";

const SOCIAL_PROVIDERS = ["instagram", "tiktok", "facebook", "linkedin", "website"];

function buildSocialAccounts(values) {
  return SOCIAL_PROVIDERS.map((provider) => {
    const value = values[provider]?.trim();
    if (!value) return null;

    const isHandle = value.startsWith("@") || !value.includes(".");
    return {
      provider,
      handle: isHandle ? value : undefined,
      url: isHandle ? undefined : value,
      verified: false,
    };
  }).filter(Boolean);
}

function RegisterScreen() {
  const { register, isAuthLoading } = useAuth();
  const navigation = useNavigation();
  const { theme } = useTheme();

  const [avatarKey, setAvatarKey] = useState(null);
  const [name, setName] = useState(""); // display name (required so posts can show a name)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // account type/role
  // local = here to find events and use community boards
  // business = posting/managing events as a host
  const [role, setRole] = useState("local");

  // profile / business fields
  const [town, setTown] = useState("");
  const [userType, setUserType] = useState("local");
  const [languagesText, setLanguagesText] = useState("");
  const [interests, setInterests] = useState([]);
  const [hikingSkill, setHikingSkill] = useState("");
  const [skiingSkill, setSkiingSkill] = useState("");
  const [socialValues, setSocialValues] = useState({
    instagram: "",
    tiktok: "",
    facebook: "",
    linkedin: "",
    website: "",
  });
  const [bio, setBio] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [instagram, setInstagram] = useState("");
  const [website, setWebsite] = useState("");

  async function handleRegister() {
    if (!name || !email || !password) {
      Alert.alert(
        "Missing info",
        "Please enter your name, email, and password."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const languages = languagesText
        .split(",")
        .map((language) => language.trim())
        .filter(Boolean);

      // avatarKey is a stable string (like "w3_dark_blackpony")
      // that can be stored in MongoDB. The front-end uses avatarConfig to map it
      // back to a local PNG.
      await register({
        name,
        email,
        password,
        role,
        town,
        userType: isLocal ? userType : undefined,
        languages: isLocal ? languages : undefined,
        interests: isLocal ? interests : undefined,
        skillLevel: isLocal
          ? {
              ...(hikingSkill ? { hiking: hikingSkill } : {}),
              ...(skiingSkill ? { skiing: skiingSkill } : {}),
            }
          : undefined,
        socialAccounts: isLocal ? buildSocialAccounts(socialValues) : undefined,
        bio,
        lookingFor: isBusiness ? lookingFor : undefined,
        instagram: isBusiness ? instagram : socialValues.instagram,
        website,
        avatarKey,
      });
      // After successful registration, the AuthContext logs the user in
      // and the RootNavigator switches screens based on auth state.
    } catch (error) {
      Alert.alert(
        "Registration failed",
        error.message || "Please check your details and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLocal = role === "local";
  const isBusiness = role === "business";

  function handleToggleInterest(interest) {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest]
    );
  }

  function handleSocialChange(provider, value) {
    setSocialValues((current) => ({
      ...current,
      [provider]: value,
    }));
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.inner}>
              <View style={styles.logoContainer}>
                <Image source={Logo} style={styles.logo} resizeMode="contain" />
                <Text style={[styles.tagline, { color: theme.textMuted }]}>
                  Your Rocky Mountain Social & Events Hub
                </Text>
              </View>

              <Text style={[styles.title, { color: theme.text }]}>
                Create your Summit Scene account{" "}
              </Text>
              <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                Sign up to post, save, and/or explore local events in your
                mountain town.
              </Text>

              {/* Name */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Name</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={theme.textMuted}
                />
              </View>

              {/* Email */}
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
                />
              </View>

              {/* Password */}
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
                  placeholder="Create a password"
                  placeholderTextColor={theme.textMuted}
                  secureTextEntry
                />
              </View>

              {/* Account type selection */}
              {/* Role drives access in the UI.
                  Local accounts see community boards + Hub.
                  Business accounts unlock Post/My Events host tools. */}
              <Text style={[styles.sectionLabel, { color: theme.text }]}>
                What type of account is this?
              </Text>

              <View style={styles.roleColumn}>
                {/* Local / Visitor */}
                <Pressable
                  style={[
                    styles.roleOption,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.card,
                    },
                    isLocal && {
                      borderColor: theme.accent,
                      backgroundColor: theme.accentSoft || theme.card,
                    },
                  ]}
                  onPress={() => setRole("local")}
                >
                  <Text style={[styles.roleTitle, { color: theme.text }]}>
                    I'm here to find things to do!
                  </Text>
                  <Text
                    style={[styles.roleSubtitle, { color: theme.textMuted }]}
                  >
                    Discover what's happening in Banff, Canmore, and Lake
                    Louise.
                  </Text>
                </Pressable>

                {/* Business / organizer */}
                <Pressable
                  style={[
                    styles.roleOption,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.card,
                    },
                    isBusiness && {
                      borderColor: theme.accent,
                      backgroundColor: theme.accentSoft || theme.card,
                    },
                  ]}
                  onPress={() => setRole("business")}
                >
                  <Text style={[styles.roleTitle, { color: theme.text }]}>
                    I'm a registered business / organizer
                  </Text>
                  <Text
                    style={[styles.roleSubtitle, { color: theme.textMuted }]}
                  >
                    Post and manage events for your venue, shop, or
                    organization.
                  </Text>
                </Pressable>
              </View>

              {/* LOCAL FIELDS (extracted component) */}
              {isLocal && (
                <LocalFields
                  town={town}
                  userType={userType}
                  languagesText={languagesText}
                  interests={interests}
                  hikingSkill={hikingSkill}
                  skiingSkill={skiingSkill}
                  socialValues={socialValues}
                  bio={bio}
                  onChangeTown={setTown}
                  onChangeUserType={setUserType}
                  onChangeLanguagesText={setLanguagesText}
                  onToggleInterest={handleToggleInterest}
                  onChangeHikingSkill={setHikingSkill}
                  onChangeSkiingSkill={setSkiingSkill}
                  onChangeSocial={handleSocialChange}
                  onChangeBio={setBio}
                  theme={theme}
                />
              )}

              {/* BUSINESS FIELDS (extracted component) */}
              {isBusiness && (
                <BusinessFields
                  town={town}
                  businessType={lookingFor}
                  website={website}
                  instagram={instagram}
                  onChangeTown={setTown}
                  onChangeBusinessType={setLookingFor}
                  onChangeWebsite={setWebsite}
                  onChangeInstagram={setInstagram}
                  theme={theme}
                />
              )}

              {/* Avatar picker */}
              <Text
                style={{
                  marginTop: 16,
                  marginBottom: 8,
                  fontWeight: "600",
                  color: theme.text,
                }}
              >
                Choose an avatar
              </Text>
              <AvatarPicker value={avatarKey} onChange={setAvatarKey} />

              {/* Sign up button*/}
              <AppButton
                title={
                  isSubmitting || isAuthLoading
                    ? "Creating account..."
                    : "Create Account"
                }
                onPress={handleRegister}
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

              <Pressable onPress={() => navigation.navigate("Login")}>
                <Text
                  style={[
                    styles.linkText,
                    {
                      color: theme.accent,
                    },
                  ]}
                >
                  Already have an account? Log in
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

export default RegisterScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 40,
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
  sectionLabel: {
    marginTop: 8,
    marginBottom: 8,
    fontWeight: "500",
  },
  roleColumn: {
    gap: 10,
    marginBottom: 16,
  },
  roleOption: {
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
  },
  roleTitle: {
    fontWeight: "600",
    marginBottom: 4,
  },
  roleSubtitle: {
    fontSize: 12,
  },
  linkText: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 14,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 12,
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
