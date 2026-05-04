// screens/RegisterScreen.js
// Registration screen UI
// A low-pressure step-by-step onboarding flow for local users and businesses.

import React, { useEffect, useRef, useState } from "react";
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
  Linking,
  AppState,
  Image,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";

import AvatarPicker from "../../components/AvatarPicker";
import AppButton from "../../components/common/AppButton";
import Logo from "../../assets/logo-app-earth-transparent-alpha.png";
import { AVATARS } from "../../assets/avatars/avatarConfig";

const SOCIAL_PROVIDERS = [
  { provider: "instagram", label: "Instagram", placeholder: "@yourhandle" },
  { provider: "tiktok", label: "TikTok", placeholder: "@yourhandle" },
  { provider: "facebook", label: "Facebook", placeholder: "Profile link" },
  { provider: "linkedin", label: "LinkedIn", placeholder: "Profile link" },
  { provider: "website", label: "Website", placeholder: "https://..." },
];
const TOWN_OPTIONS = ["Banff", "Canmore", "Lake Louise"];
const USER_TYPE_OPTIONS = [
  { value: "local", label: "Local" },
  { value: "seasonal", label: "Seasonal" },
  { value: "visitor", label: "Visiting" },
];
const INTEREST_OPTIONS = [
  "Find local events",
  "Discover things to do",
  "Meet people through activities",
  "Join group plans",
  "Share local updates",
  "Support local businesses",
  "Just exploring",
  "Hiking",
  "Skiing",
  "Snowboarding",
  "Climbing",
  "Live music",
  "Markets",
  "Wellness",
  "Food & drink",
  "Nightlife",
  "Coffee",
  "Book club",
  "Disc golf",
  "Art",
  "Walking",
  "Bingo",
  "Trivia",
  "Shopping",
];
const SKILL_OPTIONS = [
  { value: "beginner", label: "Beginner" },
  { value: "casual", label: "Casual" },
  { value: "experienced", label: "Experienced" },
];
const LOCAL_STEPS = [
  "name",
  "login",
  "userType",
  "town",
  "origin",
  "interests",
  "levels",
  "bio",
  "social",
  "review",
];
const BUSINESS_STEPS = ["name", "login", "business", "photo", "review"];
const OPTIONAL_STEPS = new Set(["origin", "interests", "levels", "bio", "social", "photo"]);

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://summit-scene-backend.onrender.com";
const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;
const FACEBOOK_REDIRECT_URI =
  process.env.EXPO_PUBLIC_FACEBOOK_REDIRECT_URI ||
  `${API_BASE_URL}/api/social/facebook/mobile-callback`;
const FACEBOOK_OPTIONAL_MESSAGE =
  "Facebook connection needs the installed Summit Scene app to return automatically. You can keep building your profile now and connect Facebook later.";

function buildSocialAccounts(values, profileImageUrl = "") {
  return SOCIAL_PROVIDERS.map(({ provider }) => {
    const value = values[provider]?.trim();
    if (!value) return null;

    const isHandle = value.startsWith("@") || !value.includes(".");
    return {
      provider,
      handle: isHandle ? value : undefined,
      url: isHandle ? undefined : value,
      profileImageUrl:
        profileImageUrl && ["facebook", "instagram"].includes(provider)
          ? profileImageUrl
          : undefined,
      verified: false,
    };
  }).filter(Boolean);
}

function getUrlParam(url, paramName) {
  const pattern = new RegExp(`[?&#]${paramName}=([^&#]+)`);
  const match = String(url || "").match(pattern);
  return match ? decodeURIComponent(match[1].replace(/\+/g, " ")) : "";
}

function buildFacebookAuthUrl() {
  const url = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  url.searchParams.set("client_id", FACEBOOK_APP_ID);
  url.searchParams.set("redirect_uri", FACEBOOK_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "public_profile");
  return url.toString();
}

function ChipGroup({ options, value, values, onChange, onToggle, theme }) {
  return (
    <View style={styles.chipRow}>
      {options.map((option) => {
        const optionValue = typeof option === "string" ? option : option.value;
        const optionLabel = typeof option === "string" ? option : option.label;
        const isSelected = values
          ? values.includes(optionValue)
          : value === optionValue;

        return (
          <Pressable
            key={optionValue}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected
                  ? theme.accentSoft || theme.card
                  : theme.card,
                borderColor: isSelected ? theme.accent : theme.border,
              },
            ]}
            onPress={() =>
              onToggle ? onToggle(optionValue) : onChange(optionValue)
            }
          >
            <Text
              style={[
                styles.chipText,
                { color: isSelected ? theme.accent : theme.textMuted },
              ]}
            >
              {optionLabel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function titleCase(value) {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ReviewChip({ label, theme }) {
  return (
    <View
      style={[
        styles.reviewChip,
        {
          backgroundColor: theme.accentSoft || theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      <Text style={[styles.reviewChipText, { color: theme.text }]}>
        {label}
      </Text>
    </View>
  );
}

function SignupProfilePreview({
  theme,
  role,
  name,
  email,
  town,
  userType,
  originallyFrom,
  languagesText,
  interests,
  hikingSkill,
  skiingSkill,
  discGolfSkill,
  bio,
  lookingFor,
  avatarKey,
  profileImageUrl,
  socialValues,
}) {
  const isBusiness = role === "business";
  const avatarSource =
    avatarKey && AVATARS[avatarKey]
      ? AVATARS[avatarKey]
      : profileImageUrl
        ? { uri: profileImageUrl }
        : null;
  const displayName = name || "Summit Scene member";
  const initial = displayName.charAt(0).toUpperCase() || "?";
  const languages = languagesText
    .split(",")
    .map((language) => language.trim())
    .filter(Boolean);
  const socialAccounts = Object.entries(socialValues || {})
    .filter(([, value]) => value?.trim())
    .map(([provider, value]) => `${titleCase(provider)}: ${value.trim()}`);
  const hasSkills = hikingSkill || skiingSkill || discGolfSkill;

  return (
    <View
      style={[
        styles.profilePreview,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <View style={styles.previewHeaderRow}>
        <View
          style={[
            styles.previewAvatar,
            { backgroundColor: theme.pill || theme.background },
          ]}
        >
          {avatarSource ? (
            <Image source={avatarSource} style={styles.previewAvatarImage} />
          ) : (
            <Text style={[styles.previewInitial, { color: theme.text }]}>
              {initial}
            </Text>
          )}
        </View>
        <View style={styles.previewHeaderCopy}>
          <Text style={[styles.previewName, { color: theme.text }]}>
            {displayName}
          </Text>
          <Text style={[styles.previewMeta, { color: theme.textMuted }]}>
            {isBusiness ? "Business review pending" : "Community member"}
          </Text>
          {email ? (
            <Text style={[styles.previewMeta, { color: theme.textMuted }]}>
              {email}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.reviewChipRow}>
        {town ? <ReviewChip label={town} theme={theme} /> : null}
        {!isBusiness && userType ? (
          <ReviewChip
            label={
              USER_TYPE_OPTIONS.find((item) => item.value === userType)
                ?.label || titleCase(userType)
            }
            theme={theme}
          />
        ) : null}
        {!isBusiness && originallyFrom ? (
          <ReviewChip
            label={`Originally from ${originallyFrom}`}
            theme={theme}
          />
        ) : null}
        {isBusiness && lookingFor ? (
          <ReviewChip label={lookingFor} theme={theme} />
        ) : null}
      </View>

      <View style={styles.previewSection}>
        <Text style={[styles.previewLabel, { color: theme.textMuted }]}>
          Bio
        </Text>
        <Text style={[styles.previewValue, { color: theme.text }]}>
          {bio ||
            (isBusiness
              ? "Add a short business description later so people know what you host."
              : "Add a short bio later so people know who you are.")}
        </Text>
      </View>

      {!isBusiness && interests.length ? (
        <View style={styles.previewSection}>
          <Text style={[styles.previewLabel, { color: theme.textMuted }]}>
            Interests
          </Text>
          <View style={styles.reviewChipRow}>
            {interests.map((interest) => (
              <ReviewChip key={interest} label={interest} theme={theme} />
            ))}
          </View>
        </View>
      ) : null}

      {!isBusiness && hasSkills ? (
        <View style={styles.previewSection}>
          <Text style={[styles.previewLabel, { color: theme.textMuted }]}>
            Activity level
          </Text>
          <View style={styles.reviewChipRow}>
            {hikingSkill ? (
              <ReviewChip label={`Hiking: ${titleCase(hikingSkill)}`} theme={theme} />
            ) : null}
            {skiingSkill ? (
              <ReviewChip
                label={`Ski/Snowboard: ${titleCase(skiingSkill)}`}
                theme={theme}
              />
            ) : null}
            {discGolfSkill ? (
              <ReviewChip
                label={`Disc golf: ${titleCase(discGolfSkill)}`}
                theme={theme}
              />
            ) : null}
          </View>
        </View>
      ) : null}

      {!isBusiness && languages.length ? (
        <View style={styles.previewSection}>
          <Text style={[styles.previewLabel, { color: theme.textMuted }]}>
            Languages
          </Text>
          <Text style={[styles.previewValue, { color: theme.text }]}>
            {languages.join(", ")}
          </Text>
        </View>
      ) : null}

      {!isBusiness && socialAccounts.length ? (
        <View style={styles.previewSection}>
          <Text style={[styles.previewLabel, { color: theme.textMuted }]}>
            Social accounts
          </Text>
          {socialAccounts.map((account) => (
            <Text
              key={account}
              style={[styles.previewValue, { color: theme.accent }]}
            >
              {account}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function RegisterScreen() {
  const { register, previewFacebookSignup, isAuthLoading } = useAuth();
  const navigation = useNavigation();
  const { theme } = useTheme();

  const [stepIndex, setStepIndex] = useState(0);
  const [avatarKey, setAvatarKey] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [role, setRole] = useState("local");
  const [town, setTown] = useState("");
  const [userType, setUserType] = useState("local");
  const [originallyFrom, setOriginallyFrom] = useState("");
  const [languagesText, setLanguagesText] = useState("");
  const [interests, setInterests] = useState([]);
  const [hikingSkill, setHikingSkill] = useState("");
  const [skiingSkill, setSkiingSkill] = useState("");
  const [discGolfSkill, setDiscGolfSkill] = useState("");
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
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [facebookConnectToken, setFacebookConnectToken] = useState("");
  const [facebookProfileName, setFacebookProfileName] = useState("");
  const [isConnectingFacebook, setIsConnectingFacebook] = useState(false);
  const facebookTimeoutRef = useRef(null);
  const facebookCallbackHandledRef = useRef(false);

  const isLocal = role === "local";
  const isBusiness = role === "business";
  const steps = isBusiness ? BUSINESS_STEPS : LOCAL_STEPS;
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];
  const progressText = `Step ${Math.min(stepIndex + 1, steps.length)} of ${steps.length}`;
  const isFinalStep = currentStep === "review";

  useEffect(() => {
    if (stepIndex > steps.length - 1) {
      setStepIndex(steps.length - 1);
    }
  }, [stepIndex, steps.length]);

  useEffect(() => {
    return () => {
      if (facebookTimeoutRef.current) {
        clearTimeout(facebookTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active" || !isConnectingFacebook) {
        return;
      }

      setTimeout(() => {
        if (facebookCallbackHandledRef.current) {
          return;
        }

        facebookCallbackHandledRef.current = true;
        if (facebookTimeoutRef.current) {
          clearTimeout(facebookTimeoutRef.current);
          facebookTimeoutRef.current = null;
        }
        setIsConnectingFacebook(false);
        Alert.alert("Continue without Facebook", FACEBOOK_OPTIONAL_MESSAGE);
      }, 1200);
    });

    return () => subscription.remove();
  }, [isConnectingFacebook]);

  function finishFacebookConnection() {
    facebookCallbackHandledRef.current = true;
    if (facebookTimeoutRef.current) {
      clearTimeout(facebookTimeoutRef.current);
      facebookTimeoutRef.current = null;
    }
    setIsConnectingFacebook(false);
  }

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

  function townQuestion() {
    if (userType === "visitor") {
      return "Where are you staying or spending most of your trip?";
    }
    if (userType === "seasonal") {
      return "Where are you based this season?";
    }
    return "Where do you live?";
  }

  function validateStep() {
    if (currentStep === "name" && !name.trim()) {
      Alert.alert("Name needed", "Please enter your name.");
      return false;
    }

    if (currentStep === "login") {
      if (!email.trim() || !password.trim()) {
        Alert.alert("Login needed", "Please enter your email and password.");
        return false;
      }
    }

    if (currentStep === "town" && !town) {
      Alert.alert("Town needed", "Please choose the town that fits best.");
      return false;
    }

    if (currentStep === "business") {
      const hasProofLink = Boolean(website.trim() || instagram.trim());
      if (!town.trim() || !lookingFor.trim() || !hasProofLink) {
        Alert.alert(
          "Business verification info needed",
          "Please add your business town, business type, and either a website or Instagram."
        );
        return false;
      }
    }

    return true;
  }

  async function handleRegister() {
    if (!name || !email || !password) {
      Alert.alert(
        "Missing info",
        "Please enter your name, email, and password."
      );
      return;
    }

    if (role === "business") {
      const hasProofLink = Boolean(website.trim() || instagram.trim());
      if (!town.trim() || !lookingFor.trim() || !hasProofLink) {
        Alert.alert(
          "Business verification info needed",
          "Please add your business town, business type, and either a website or Instagram so Summit Scene can review the profile."
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const languages = languagesText
        .split(",")
        .map((language) => language.trim())
        .filter(Boolean);

      await register({
        name,
        email,
        password,
        role,
        town,
        userType: isLocal ? userType : undefined,
        originallyFrom: isLocal ? originallyFrom : undefined,
        languages: isLocal ? languages : undefined,
        interests: isLocal ? interests : undefined,
        skillLevel: isLocal
          ? {
              ...(hikingSkill ? { hiking: hikingSkill } : {}),
              ...(skiingSkill ? { skiing: skiingSkill } : {}),
              ...(discGolfSkill ? { discGolf: discGolfSkill } : {}),
            }
          : undefined,
        socialAccounts: isLocal
          ? buildSocialAccounts(socialValues, profileImageUrl)
          : undefined,
        bio,
        lookingFor: isBusiness ? lookingFor : undefined,
        instagram: isBusiness ? instagram : socialValues.instagram,
        website,
        avatarKey,
        profileImageUrl,
        facebookConnectToken,
      });
    } catch (error) {
      Alert.alert(
        "Registration failed",
        error.message || "Please check your details and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function goNext() {
    if (!validateStep()) return;
    if (isFinalStep) {
      handleRegister();
      return;
    }
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  function goBack() {
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  function skipStep() {
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  function switchRole(nextRole) {
    setRole(nextRole);
    setAvatarKey(null);
    setStepIndex(0);
  }

  async function handleConnectFacebook() {
    if (!FACEBOOK_APP_ID) {
      Alert.alert(
        "Facebook not configured",
        "Add EXPO_PUBLIC_FACEBOOK_APP_ID to the app environment before connecting Facebook."
      );
      return;
    }

    let subscription;

    try {
      setIsConnectingFacebook(true);
      facebookCallbackHandledRef.current = false;
      if (facebookTimeoutRef.current) {
        clearTimeout(facebookTimeoutRef.current);
      }
      facebookTimeoutRef.current = setTimeout(() => {
        if (facebookCallbackHandledRef.current) {
          return;
        }

        finishFacebookConnection();
        subscription?.remove?.();
        Alert.alert("Continue without Facebook", FACEBOOK_OPTIONAL_MESSAGE);
      }, 90000);

      subscription = Linking.addEventListener("url", async ({ url }) => {
        if (facebookCallbackHandledRef.current) {
          return;
        }

        const code = getUrlParam(url, "code");
        const errorMessage =
          getUrlParam(url, "error_message") || getUrlParam(url, "error");

        subscription?.remove?.();

        if (errorMessage) {
          finishFacebookConnection();
          Alert.alert(
            "Facebook not connected",
            `${errorMessage}\n\nYou can still create your account without Facebook.`
          );
          return;
        }

        if (!code) {
          finishFacebookConnection();
          Alert.alert("Continue without Facebook", FACEBOOK_OPTIONAL_MESSAGE);
          return;
        }

        try {
          const data = await previewFacebookSignup(
            code,
            FACEBOOK_REDIRECT_URI
          );
          const facebookProfile = data.facebookProfile || {};

          setFacebookConnectToken(data.facebookConnectToken || "");
          setFacebookProfileName(facebookProfile.name || "");
          setName((current) => current || facebookProfile.name || "");
          setProfileImageUrl(facebookProfile.profileImageUrl || "");
          setAvatarKey(null);
          setSocialValues((current) => ({
            ...current,
            facebook: facebookProfile.name || "Facebook connected",
          }));

          Alert.alert(
            "Facebook connected",
            "Your name and profile photo are ready for signup."
          );
        } catch (error) {
          Alert.alert(
            "Facebook failed",
            `${error.message || "Could not connect Facebook."}\n\nYou can still create your account without Facebook.`
          );
        } finally {
          finishFacebookConnection();
        }
      });

      await Linking.openURL(buildFacebookAuthUrl());
    } catch (error) {
      subscription?.remove?.();
      finishFacebookConnection();
      Alert.alert(
        "Facebook failed",
        `${error.message || "Could not open Facebook."}\n\nYou can still create your account without Facebook.`
      );
    }
  }

  function renderBusinessLink() {
    return isLocal ? (
      <Pressable
        style={[
          styles.businessLinkBox,
          {
            borderColor: theme.accent,
            backgroundColor: theme.accentSoft || theme.card,
          },
        ]}
        onPress={() => switchRole("business")}
      >
        <Text style={[styles.businessLinkTitle, { color: theme.text }]}>
          Business or organizer signup
        </Text>
        <Text style={[styles.businessLinkText, { color: theme.textMuted }]}>
          Tap here first if this account is for a business, venue, or organizer.
        </Text>
      </Pressable>
    ) : (
      <Pressable
        style={[
          styles.businessLinkBox,
          {
            borderColor: theme.accent,
            backgroundColor: theme.accentSoft || theme.card,
          },
        ]}
        onPress={() => switchRole("local")}
      >
        <Text style={[styles.businessLinkTitle, { color: theme.text }]}>
          Business / organizer account
        </Text>
        <Text style={[styles.businessLinkText, { color: theme.textMuted }]}>
          Switch back to community signup
        </Text>
      </Pressable>
    );
  }

  function renderStep() {
    if (currentStep === "name") {
      return (
        <>
          <Text style={[styles.stepTitle, { color: theme.text }]}>
            {isBusiness ? "What is the name of your business?" : "What is your name?"}
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
            {isBusiness
              ? "This is the public business or organizer name people will see on your event posts and profile."
              : "This is what people will see on posts, replies, and profiles."}
          </Text>
          {renderBusinessLink()}
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
            placeholder={isBusiness ? "Business name" : "Your name"}
            placeholderTextColor={theme.textMuted}
          />
        </>
      );
    }

    if (currentStep === "login") {
      return (
        <>
          <Text style={[styles.stepTitle, { color: theme.text }]}>
            Create your login
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
            Use an email you can access.
          </Text>
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
          <Text style={[styles.label, { color: theme.text }]}>Password</Text>
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
          {renderBusinessLink()}
        </>
      );
    }

    if (currentStep === "userType") {
      return (
        <>
          <Text style={[styles.stepTitle, { color: theme.text }]}>
            Are you local, seasonal, or visiting?
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
            This helps people understand your connection to town.
          </Text>
          <ChipGroup
            options={USER_TYPE_OPTIONS}
            value={userType}
            onChange={setUserType}
            theme={theme}
          />
        </>
      );
    }

    if (currentStep === "town") {
      return (
        <>
          <Text style={[styles.stepTitle, { color: theme.text }]}>
            {townQuestion()}
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
            Choose the town that fits best for this trip or season.
          </Text>
          <ChipGroup
            options={TOWN_OPTIONS}
            value={town}
            onChange={setTown}
            theme={theme}
          />
        </>
      );
    }

    if (currentStep === "origin") {
      return (
        <>
          <Text style={[styles.stepTitle, { color: theme.text }]}>
            Add a little context
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
            These are optional, but helpful in mountain towns with people from
            everywhere.
          </Text>
          <Text style={[styles.label, { color: theme.text }]}>
            Originally from
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
            value={originallyFrom}
            onChangeText={setOriginallyFrom}
            placeholder="Toronto, Australia, Japan..."
            placeholderTextColor={theme.textMuted}
          />
          <Text style={[styles.label, { color: theme.text }]}>
            Languages spoken
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
            value={languagesText}
            onChangeText={setLanguagesText}
            placeholder="English, French, Spanish..."
            placeholderTextColor={theme.textMuted}
          />
        </>
      );
    }

    if (currentStep === "interests") {
      return (
        <>
          <Text style={[styles.stepTitle, { color: theme.text }]}>
            What would you like to find here?
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
            Pick anything that sounds useful. You can change this later.
          </Text>
          <ChipGroup
            options={INTEREST_OPTIONS}
            values={interests}
            onToggle={handleToggleInterest}
            theme={theme}
          />
        </>
      );
    }

    if (currentStep === "levels") {
      return (
        <>
          <Text style={[styles.stepTitle, { color: theme.text }]}>
            Optional activity levels
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
            Skip anything that does not apply.
          </Text>
          <Text style={[styles.label, { color: theme.text }]}>Hiking</Text>
          <ChipGroup
            options={SKILL_OPTIONS}
            value={hikingSkill}
            onChange={setHikingSkill}
            theme={theme}
          />
          <Text style={[styles.label, { color: theme.text }]}>
            Skiing/Snowboarding
          </Text>
          <ChipGroup
            options={SKILL_OPTIONS}
            value={skiingSkill}
            onChange={setSkiingSkill}
            theme={theme}
          />
          <Text style={[styles.label, { color: theme.text }]}>Disc golf</Text>
          <ChipGroup
            options={SKILL_OPTIONS}
            value={discGolfSkill}
            onChange={setDiscGolfSkill}
            theme={theme}
          />
        </>
      );
    }

    if (currentStep === "bio") {
      return (
        <>
          <Text style={[styles.stepTitle, { color: theme.text }]}>
            Add a short bio
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
            A quick line helps people feel more comfortable replying.
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            value={bio}
            onChangeText={setBio}
            placeholder="A little about you, your season, or what you like doing around town..."
            placeholderTextColor={theme.textMuted}
            multiline
            numberOfLines={4}
          />
        </>
      );
    }

    if (currentStep === "social" || currentStep === "photo") {
      return (
        <>
          <Text style={[styles.stepTitle, { color: theme.text }]}>
            Add socials or an avatar
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
            Optional. Manual links work now; Facebook can be connected later
            from the installed app build.
          </Text>
          {isLocal
            ? SOCIAL_PROVIDERS.map(({ provider, label, placeholder }) => (
                <View key={provider}>
                  <Text style={[styles.label, { color: theme.text }]}>
                    {label}
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
                    placeholder={placeholder}
                    placeholderTextColor={theme.textMuted}
                    value={socialValues[provider]}
                    onChangeText={(value) => handleSocialChange(provider, value)}
                    autoCapitalize="none"
                  />
                </View>
              ))
            : null}
          <View
            style={[
              styles.connectPanel,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={styles.connectPanelCopy}>
              <Text style={[styles.connectPanelTitle, { color: theme.text }]}>
                Facebook
              </Text>
              <Text style={[styles.helperText, { color: theme.textMuted }]}>
                Optional verification for later installed app testing.
              </Text>
              {facebookProfileName ? (
                <Text style={[styles.connectedText, { color: theme.accent }]}>
                  Connected as {facebookProfileName}
                </Text>
              ) : null}
            </View>
            <Pressable
              style={[
                styles.connectButton,
                {
                  borderColor: theme.accent,
                  opacity: isConnectingFacebook || isAuthLoading ? 0.65 : 1,
                },
              ]}
              disabled={isConnectingFacebook || isAuthLoading}
              onPress={handleConnectFacebook}
            >
              <Text style={[styles.connectButtonText, { color: theme.accent }]}>
                {isConnectingFacebook ? "Connecting..." : "Connect"}
              </Text>
            </Pressable>
          </View>
          <Text style={[styles.label, { color: theme.text }]}>
            Profile photo URL
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
            value={profileImageUrl}
            onChangeText={setProfileImageUrl}
            placeholder="https://..."
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
          />
          {profileImageUrl ? (
            <Pressable
              style={[styles.useSocialPhotoButton, { borderColor: theme.accent }]}
              onPress={() => setAvatarKey(null)}
            >
              <Text style={[styles.useSocialPhotoText, { color: theme.accent }]}>
                Use this social photo instead of an avatar
              </Text>
            </Pressable>
          ) : null}
          <Text style={[styles.label, { color: theme.text }]}>
            Choose an avatar
          </Text>
          <AvatarPicker
            value={avatarKey}
            onChange={setAvatarKey}
            variant={isBusiness ? "business" : "personal"}
          />
        </>
      );
    }

    if (currentStep === "business") {
      return (
        <>
          <Text style={[styles.stepTitle, { color: theme.text }]}>
            Tell us about the business
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
            Business profiles are reviewed before they can post official events.
          </Text>
          <Text style={[styles.label, { color: theme.text }]}>
            Where is it located?
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
            placeholder="Banff, Canmore, Lake Louise..."
            placeholderTextColor={theme.textMuted}
            value={town}
            onChangeText={setTown}
          />
          <Text style={[styles.label, { color: theme.text }]}>
            Business type / category
          </Text>
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            A short label for what you are, like cafe, ski hill, market,
            wellness studio, shop, live music venue, or community organizer.
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.textAreaSmall,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder="Cafe, yoga studio, live music venue, shop..."
            placeholderTextColor={theme.textMuted}
            value={lookingFor}
            onChangeText={setLookingFor}
            multiline
          />
          <Text style={[styles.label, { color: theme.text }]}>
            Business description
          </Text>
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            This appears on your public profile. Keep it friendly and clear.
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder="Tell people what your business is about, the vibe, and what kinds of events or experiences you host."
            placeholderTextColor={theme.textMuted}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
          />
          <Text style={[styles.label, { color: theme.text }]}>
            Website or official page
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
            placeholder="https://your-business.com"
            placeholderTextColor={theme.textMuted}
            value={website}
            onChangeText={setWebsite}
            autoCapitalize="none"
          />
          <Text style={[styles.label, { color: theme.text }]}>
            Instagram or public social account
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
            placeholder="@yourbusiness"
            placeholderTextColor={theme.textMuted}
            value={instagram}
            onChangeText={setInstagram}
            autoCapitalize="none"
          />
        </>
      );
    }

    return (
      <>
        <Text style={[styles.stepTitle, { color: theme.text }]}>
          Looks good?
        </Text>
        <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
          You can edit your profile anytime from the Account tab.
        </Text>
        <SignupProfilePreview
          theme={theme}
          role={role}
          name={name}
          email={email}
          town={town}
          userType={userType}
          originallyFrom={originallyFrom}
          languagesText={languagesText}
          interests={interests}
          hikingSkill={hikingSkill}
          skiingSkill={skiingSkill}
          discGolfSkill={discGolfSkill}
          bio={bio}
          lookingFor={lookingFor}
          avatarKey={avatarKey}
          profileImageUrl={profileImageUrl}
          socialValues={socialValues}
        />
      </>
    );
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

              <Text style={[styles.progressText, { color: theme.textMuted }]}>
                {progressText}
              </Text>
              <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: theme.accent,
                      width: `${((stepIndex + 1) / steps.length) * 100}%`,
                    },
                  ]}
                />
              </View>

              {renderStep()}

              {isFinalStep ? (
                <Pressable onPress={() => navigation.navigate("Legal")}>
                  <Text style={[styles.termsNotice, { color: theme.textMuted }]}>
                    By creating an account, you agree to Summit Scene's Privacy
                    Policy, Terms of Use, and Community Guidelines.
                  </Text>
                </Pressable>
              ) : null}

              <View style={styles.buttonRow}>
                {stepIndex > 0 ? (
                  <AppButton
                    title="Back"
                    onPress={goBack}
                    disabled={isSubmitting || isAuthLoading}
                    variant="outline"
                    style={styles.flexButton}
                  />
                ) : null}
                {OPTIONAL_STEPS.has(currentStep) ? (
                  <AppButton
                    title="Skip"
                    onPress={skipStep}
                    disabled={isSubmitting || isAuthLoading}
                    variant="outline"
                    style={styles.flexButton}
                  />
                ) : null}
                <AppButton
                  title={
                    isFinalStep
                      ? isSubmitting || isAuthLoading
                        ? "Creating account..."
                        : "Create Account"
                      : "Next"
                  }
                  onPress={goNext}
                  loading={isFinalStep && (isSubmitting || isAuthLoading)}
                  size="lg"
                  style={[
                    styles.flexButton,
                    {
                      backgroundColor: theme.accent,
                      borderColor: theme.accent,
                    },
                  ]}
                  textStyle={{
                    color: theme.onAccent || theme.textOnAccent || "#FFFFFF",
                  }}
                />
              </View>

              <Pressable onPress={() => navigation.navigate("Login")}>
                <Text style={[styles.linkText, { color: theme.accent }]}>
                  Already have an account? Log in
                </Text>
              </Pressable>
              <Pressable onPress={() => navigation.navigate("Legal")}>
                <Text style={[styles.legalLinkText, { color: theme.textMuted }]}>
                  Privacy & Terms
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
    paddingTop: 72,
    paddingBottom: 40,
  },
  inner: {
    flex: 1,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 22,
    paddingHorizontal: 12,
  },
  logo: {
    width: 160,
    height: 172,
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
  progressText: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 22,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  stepTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800",
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  label: {
    marginBottom: 6,
    marginTop: 4,
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  textArea: {
    minHeight: 92,
    textAlignVertical: "top",
  },
  textAreaSmall: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  businessLinkBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  businessLinkTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 3,
  },
  businessLinkText: {
    fontSize: 12,
    lineHeight: 17,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  connectPanel: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  connectPanelCopy: {
    flex: 1,
  },
  connectPanelTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
  },
  connectButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  connectButtonText: {
    fontSize: 12,
    fontWeight: "800",
  },
  connectedText: {
    fontSize: 12,
    fontWeight: "800",
  },
  useSocialPhotoButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: -2,
    marginBottom: 14,
  },
  useSocialPhotoText: {
    fontSize: 12,
    fontWeight: "800",
  },
  profilePreview: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
  },
  previewHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  previewAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  previewAvatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  previewInitial: {
    fontSize: 24,
    fontWeight: "800",
  },
  previewHeaderCopy: {
    flex: 1,
  },
  previewName: {
    fontSize: 18,
    fontWeight: "800",
  },
  previewMeta: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  previewSection: {
    marginTop: 12,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  previewValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  reviewChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reviewChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reviewChipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
  },
  flexButton: {
    flex: 1,
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
  termsNotice: {
    marginTop: 16,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
});
