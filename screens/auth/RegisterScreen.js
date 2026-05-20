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
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";

import AppButton from "../../components/common/AppButton";
import Logo from "../../assets/logo-app-earth-transparent-alpha.png";
import { PROFILE_INTEREST_GROUPS } from "../../constants/eventCategories";
import { ORIGIN_CITY_OPTIONS } from "../../constants/originCities";

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
const LANGUAGE_OPTIONS = [
  "Afrikaans",
  "American Sign Language",
  "Arabic",
  "Bengali",
  "Cantonese",
  "Croatian",
  "Czech",
  "Danish",
  "Dutch",
  "English",
  "Farsi",
  "Filipino",
  "Finnish",
  "French",
  "German",
  "Greek",
  "Hebrew",
  "Hindi",
  "Hungarian",
  "Indonesian",
  "Italian",
  "Japanese",
  "Korean",
  "Mandarin",
  "Norwegian",
  "Polish",
  "Portuguese",
  "Punjabi",
  "Romanian",
  "Russian",
  "Spanish",
  "Swedish",
  "Tagalog",
  "Tamil",
  "Thai",
  "Turkish",
  "Ukrainian",
  "Vietnamese",
];
const LOCAL_STEPS = [
  "name",
  "login",
  "userType",
  "town",
  "origin",
  "interests",
  "bio",
  "social",
  "review",
];
const BUSINESS_STEPS = ["name", "login", "business", "photo", "review"];
const OPTIONAL_STEPS = new Set(["origin", "interests", "bio", "social", "photo"]);

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://summit-scene-backend.onrender.com";
const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;
const FACEBOOK_REDIRECT_URI =
  process.env.EXPO_PUBLIC_FACEBOOK_REDIRECT_URI ||
  `${API_BASE_URL}/api/social/facebook/mobile-callback`;
const FACEBOOK_OPTIONAL_MESSAGE =
  "Facebook connection needs the installed Summit Scene app to return automatically. You can keep building your profile now and connect Facebook later.";
const PROFILE_PHOTO_MAX_BASE64_LENGTH = 2200000;
const MAX_PROFILE_INTERESTS_PER_GROUP = 4;
const ORIGIN_CITY_SUGGESTION_LIMIT = 7;
const LANGUAGE_SUGGESTION_LIMIT = 7;

function normalizeSearchText(value = "") {
  return String(value).trim().toLowerCase();
}

function getOriginCitySuggestions(query) {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < 2) {
    return [];
  }

  return ORIGIN_CITY_OPTIONS.filter((city) =>
    city.toLowerCase().includes(normalizedQuery)
  ).slice(0, ORIGIN_CITY_SUGGESTION_LIMIT);
}

function isKnownOriginCity(value) {
  const normalizedValue = normalizeSearchText(value);
  return ORIGIN_CITY_OPTIONS.some(
    (city) => city.toLowerCase() === normalizedValue
  );
}

function getLanguageSuggestions(query, selectedLanguages = []) {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < 1) {
    return [];
  }

  const selectedSet = new Set(
    selectedLanguages.map((language) => language.toLowerCase())
  );

  return LANGUAGE_OPTIONS.filter((language) => {
    const normalizedLanguage = language.toLowerCase();
    return (
      !selectedSet.has(normalizedLanguage) &&
      normalizedLanguage.includes(normalizedQuery)
    );
  }).slice(0, LANGUAGE_SUGGESTION_LIMIT);
}

function buildSocialAccounts(values, profileImageUrl = "") {
  const socialProfileImageUrl = profileImageUrl.startsWith("data:")
    ? ""
    : profileImageUrl;

  return SOCIAL_PROVIDERS.map(({ provider }) => {
    const value = values[provider]?.trim();
    if (!value) return null;

    const isHandle = value.startsWith("@") || !value.includes(".");
    return {
      provider,
      handle: isHandle ? value : undefined,
      url: isHandle ? undefined : value,
      profileImageUrl:
        socialProfileImageUrl && ["facebook", "instagram"].includes(provider)
          ? socialProfileImageUrl
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

function InterestGroupList({ groups, values, onToggle, theme }) {
  const [openGroup, setOpenGroup] = useState(null);

  return (
    <View style={styles.interestGroups}>
      {groups.map((group) => {
        const isOpen = openGroup === group.title;
        const selectedCount = group.options.filter((option) =>
          values.includes(option)
        ).length;

        return (
          <View
            key={group.title}
            style={[
              styles.interestGroup,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Pressable
              style={styles.interestGroupHeader}
              onPress={() => setOpenGroup(isOpen ? null : group.title)}
            >
              <View style={styles.interestGroupCopy}>
                <Text style={[styles.interestGroupTitle, { color: theme.text }]}>
                  {group.title}
                </Text>
                <Text
                  style={[styles.interestGroupMeta, { color: theme.textMuted }]}
                >
                  {selectedCount
                    ? `${selectedCount} selected`
                    : "Tap to choose"}
                </Text>
              </View>
              <Text style={[styles.interestGroupChevron, { color: theme.accent }]}>
                {isOpen ? "-" : "+"}
              </Text>
            </Pressable>
            {isOpen ? (
              <View style={styles.interestGroupOptions}>
                <ChipGroup
                  options={group.options}
                  values={values}
                  onToggle={onToggle}
                  theme={theme}
                />
              </View>
            ) : null}
          </View>
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
  languages,
  interests,
  bio,
  lookingFor,
  profileImageUrl,
  socialValues,
}) {
  const isBusiness = role === "business";
  const avatarSource = profileImageUrl ? { uri: profileImageUrl } : null;
  const displayName = name || "Summit Scene member";
  const initial = displayName.charAt(0).toUpperCase() || "?";
  const socialAccounts = Object.entries(socialValues || {})
    .filter(([, value]) => value?.trim())
    .map(([provider, value]) => `${titleCase(provider)}: ${value.trim()}`);

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
  const {
    register,
    previewFacebookSignup,
    checkEmailAvailability,
    isAuthLoading,
  } = useAuth();
  const navigation = useNavigation();
  const { theme } = useTheme();

  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailAvailability, setEmailAvailability] = useState({
    status: "idle",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [role, setRole] = useState("local");
  const [town, setTown] = useState("");
  const [userType, setUserType] = useState("local");
  const [originallyFrom, setOriginallyFrom] = useState("");
  const [originCitySuggestions, setOriginCitySuggestions] = useState([]);
  const [showOriginCitySuggestions, setShowOriginCitySuggestions] =
    useState(false);
  const [languages, setLanguages] = useState([]);
  const [languageQuery, setLanguageQuery] = useState("");
  const [languageSuggestions, setLanguageSuggestions] = useState([]);
  const [showLanguageSuggestions, setShowLanguageSuggestions] = useState(false);
  const [interests, setInterests] = useState([]);
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
  const [hasAcceptedAgreements, setHasAcceptedAgreements] = useState(false);
  const facebookTimeoutRef = useRef(null);
  const facebookCallbackHandledRef = useRef(false);
  const languageInputRef = useRef(null);

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
    setInterests((current) => {
      if (current.includes(interest)) {
        return current.filter((item) => item !== interest);
      }

      const group = PROFILE_INTEREST_GROUPS.find((item) =>
        item.options.includes(interest)
      );
      const selectedInGroup = group
        ? current.filter((item) => group.options.includes(item)).length
        : 0;

      if (selectedInGroup >= MAX_PROFILE_INTERESTS_PER_GROUP) {
        Alert.alert(
          "Main interests limit",
          `Choose up to ${MAX_PROFILE_INTERESTS_PER_GROUP} interests in each category so your profile stays easy to scan.`
        );
        return current;
      }

      return [...current, interest];
    });
  }

  function handleSocialChange(provider, value) {
    setSocialValues((current) => ({
      ...current,
      [provider]: value,
    }));
  }

  function handleOriginCityChange(value) {
    setOriginallyFrom(value);
    const suggestions = getOriginCitySuggestions(value);
    setOriginCitySuggestions(suggestions);
    setShowOriginCitySuggestions(suggestions.length > 0);
  }

  function handleSelectOriginCity(city) {
    setOriginallyFrom(city);
    setOriginCitySuggestions([]);
    setShowOriginCitySuggestions(false);
    Keyboard.dismiss();
  }

  function handleLanguageQueryChange(value) {
    setLanguageQuery(value);
    const suggestions = getLanguageSuggestions(value, languages);
    setLanguageSuggestions(suggestions);
    setShowLanguageSuggestions(suggestions.length > 0);
  }

  function handleSelectLanguage(language) {
    setLanguages((current) =>
      current.includes(language) ? current : [...current, language]
    );
    setLanguageQuery("");
    setLanguageSuggestions([]);
    setShowLanguageSuggestions(false);
    setTimeout(() => languageInputRef.current?.focus(), 0);
  }

  function handleRemoveLanguage(language) {
    setLanguages((current) => {
      const nextLanguages = current.filter((item) => item !== language);
      const suggestions = getLanguageSuggestions(languageQuery, nextLanguages);
      setLanguageSuggestions(suggestions);
      setShowLanguageSuggestions(suggestions.length > 0);
      return nextLanguages;
    });
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

  async function validateEmailAvailability() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setEmailAvailability({ status: "idle", message: "" });
      return false;
    }

    setEmailAvailability({
      status: "checking",
      message: "Checking email...",
    });

    try {
      const data = await checkEmailAvailability(normalizedEmail);

      if (!data.available) {
        const result = {
          status: "taken",
          message: "This email is already registered. Please log in instead.",
        };
        setEmailAvailability(result);
        return result;
      }

      const result = {
        status: "available",
        message: "Email is available.",
      };
      setEmailAvailability(result);
      return result;
    } catch (error) {
      const result = {
        status: "error",
        message: error.message || "Could not check email right now.",
      };
      setEmailAvailability(result);
      return result;
    }
  }

  async function validateStep() {
    if (currentStep === "name" && !name.trim()) {
      Alert.alert("Name needed", "Please enter your name.");
      return false;
    }

    if (currentStep === "login") {
      if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
        Alert.alert(
          "Login needed",
          "Please enter your email, password, and confirmation password."
        );
        return false;
      }

      if (password.length < 8) {
        Alert.alert("Password too short", "Password must be at least 8 characters.");
        return false;
      }

      if (password !== confirmPassword) {
        Alert.alert("Passwords do not match", "Please re-enter your password.");
        return false;
      }

      const emailCheck = await validateEmailAvailability();
      if (emailCheck.status !== "available") {
        Alert.alert(
          emailCheck.status === "taken"
            ? "Email already registered"
            : "Email check needed",
          emailCheck.status === "taken"
            ? "This email is already registered. Please log in instead."
            : emailCheck.message || "Please use a different email or try again."
        );
        return false;
      }
    }

    if (currentStep === "town" && !town) {
      Alert.alert("Town needed", "Please choose the town that fits best.");
      return false;
    }

    if (currentStep === "origin" && originallyFrom.trim()) {
      if (!isKnownOriginCity(originallyFrom)) {
        Alert.alert(
          "Choose a city",
          "Please pick one of the city suggestions so profiles stay consistent, or clear this field and skip it."
        );
        return false;
      }
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
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert(
        "Missing info",
        "Please enter your name, email, password, and confirmation password."
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Passwords do not match", "Please re-enter your password.");
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

    if (!hasAcceptedAgreements) {
      Alert.alert(
        "Agreement needed",
        "Please agree to Summit Scene's Privacy Policy, Terms of Use, and Community Guidelines before creating your account."
      );
      return;
    }

    setIsSubmitting(true);

    try {
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
        socialAccounts: isLocal
          ? buildSocialAccounts(socialValues, profileImageUrl)
          : undefined,
        bio,
        lookingFor: isBusiness ? lookingFor : undefined,
        instagram: isBusiness ? instagram : socialValues.instagram,
        website,
        avatarKey: null,
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

  async function goNext() {
    if (!(await validateStep())) return;
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
    setStepIndex(0);
    setHasAcceptedAgreements(false);
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
          setSocialValues((current) => ({
            ...current,
            facebook: facebookProfile.name || "Facebook connected",
          }));

          Alert.alert(
            "Facebook connected",
            "Your Facebook account is connected for signup."
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

  async function handleChooseProfilePhoto() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Photo access needed",
          "Allow photo library access to choose a profile photo from your camera roll."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.45,
        base64: true,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.base64) {
        Alert.alert(
          "Photo not selected",
          "We could not read that photo. Please try another image."
        );
        return;
      }

      if (asset.base64.length > PROFILE_PHOTO_MAX_BASE64_LENGTH) {
        Alert.alert(
          "Photo too large",
          "Please choose a smaller photo or crop it tighter before saving."
        );
        return;
      }

      const mimeType = asset.mimeType || "image/jpeg";
      setProfileImageUrl(`data:${mimeType};base64,${asset.base64}`);
    } catch (error) {
      Alert.alert(
        "Could not choose photo",
        error.message || "Please try again."
      );
    }
  }

  function handleClearProfilePhoto() {
    setProfileImageUrl("");
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
            onChangeText={(value) => {
              setEmail(value);
              setEmailAvailability({ status: "idle", message: "" });
            }}
            onBlur={validateEmailAvailability}
            placeholder="you@example.com"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {emailAvailability.message ? (
            <Text
              style={[
                styles.validationText,
                {
                  color:
                    emailAvailability.status === "available"
                      ? theme.accent
                      : "#D14343",
                },
              ]}
            >
              {emailAvailability.message}
            </Text>
          ) : null}
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
          <Text style={[styles.label, { color: theme.text }]}>
            Confirm password
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
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter your password"
            placeholderTextColor={theme.textMuted}
            secureTextEntry
          />
          {confirmPassword && password !== confirmPassword ? (
            <Text style={[styles.validationText, { color: "#D14343" }]}>
              Passwords do not match.
            </Text>
          ) : null}
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
            onChangeText={handleOriginCityChange}
            onFocus={() => {
              const suggestions = getOriginCitySuggestions(originallyFrom);
              setOriginCitySuggestions(suggestions);
              setShowOriginCitySuggestions(suggestions.length > 0);
            }}
            placeholder="Start typing a city..."
            placeholderTextColor={theme.textMuted}
          />
          {showOriginCitySuggestions ? (
            <View
              style={[
                styles.originSuggestionsCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              {originCitySuggestions.map((city) => (
                <Pressable
                  key={city}
                  style={[
                    styles.originSuggestionRow,
                    { borderBottomColor: theme.border },
                  ]}
                  onPress={() => handleSelectOriginCity(city)}
                >
                  <Text
                    style={[styles.originSuggestionText, { color: theme.text }]}
                  >
                    {city}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Text style={[styles.label, { color: theme.text }]}>
            Languages spoken
          </Text>
          <TextInput
            ref={languageInputRef}
            style={[
              styles.input,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            value={languageQuery}
            onChangeText={handleLanguageQueryChange}
            onFocus={() => {
              const suggestions = getLanguageSuggestions(
                languageQuery,
                languages
              );
              setLanguageSuggestions(suggestions);
              setShowLanguageSuggestions(suggestions.length > 0);
            }}
            placeholder="Start typing a language..."
            placeholderTextColor={theme.textMuted}
          />
          {showLanguageSuggestions ? (
            <View
              style={[
                styles.originSuggestionsCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              {languageSuggestions.map((language) => (
                <Pressable
                  key={language}
                  style={[
                    styles.originSuggestionRow,
                    { borderBottomColor: theme.border },
                  ]}
                  onPress={() => handleSelectLanguage(language)}
                >
                  <Text
                    style={[styles.originSuggestionText, { color: theme.text }]}
                  >
                    {language}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {languages.length ? (
            <View style={styles.chipRow}>
              {languages.map((language) => (
                <Pressable
                  key={language}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: theme.accentSoft || theme.card,
                      borderColor: theme.accent,
                    },
                  ]}
                  onPress={() => handleRemoveLanguage(language)}
                >
                  <Text style={[styles.chipText, { color: theme.accent }]}>
                    {language} x
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </>
      );
    }

    if (currentStep === "interests") {
      return (
        <>
          <Text style={[styles.stepTitle, { color: theme.text }]}>
            Main interests
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
            Pick optional interests you are comfortable showing on your profile. Choose up to {MAX_PROFILE_INTERESTS_PER_GROUP} in each category. These help people find like-minded locals and inclusive events. You can change them at any time.
          </Text>
          <InterestGroupList
            groups={PROFILE_INTEREST_GROUPS}
            values={interests}
            onToggle={handleToggleInterest}
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
            Profile photo
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
            Choose a photo from your phone. You can skip this and add one later
            from Edit Profile.
          </Text>
          <Pressable
            style={[
              styles.photoPickerButton,
              { backgroundColor: theme.card, borderColor: theme.accent },
            ]}
            onPress={handleChooseProfilePhoto}
          >
            <Text style={[styles.photoPickerText, { color: theme.accent }]}>
              Choose from camera roll
            </Text>
          </Pressable>
          {profileImageUrl ? (
            <View
              style={[
                styles.photoPreviewCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Image source={{ uri: profileImageUrl }} style={styles.photoPreview} />
              <View style={styles.photoPreviewCopy}>
                <Text style={[styles.photoPreviewTitle, { color: theme.text }]}>
                  Profile photo selected
                </Text>
                <Pressable
                  style={[styles.smallOutlineButton, { borderColor: theme.border }]}
                  onPress={handleClearProfilePhoto}
                >
                  <Text
                    style={[styles.smallOutlineText, { color: theme.textMuted }]}
                  >
                    Remove
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}
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
          languages={languages}
          interests={interests}
          bio={bio}
          lookingFor={lookingFor}
          profileImageUrl={profileImageUrl}
          socialValues={socialValues}
        />
        <View
          style={[
            styles.agreementCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Pressable
            style={styles.agreementRow}
            onPress={() => setHasAcceptedAgreements((current) => !current)}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: hasAcceptedAgreements
                    ? theme.accent
                    : theme.border,
                  backgroundColor: hasAcceptedAgreements
                    ? theme.accent
                    : theme.background,
                },
              ]}
            >
              {hasAcceptedAgreements ? (
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
            <View style={styles.agreementCopy}>
              <Text style={[styles.agreementTitle, { color: theme.text }]}>
                I agree to Summit Scene's account terms
              </Text>
              <Text style={[styles.agreementText, { color: theme.textMuted }]}>
                I agree to the Privacy Policy, Terms of Use, Community
                Guidelines, and Safety reminders. I understand that my public
                profile, posts, replies, and event activity may be visible to
                other users.
              </Text>
              {isBusiness ? (
                <Text style={[styles.agreementText, { color: theme.textMuted }]}>
                  I also confirm I am authorized to create this business or
                  organizer profile, and that I am responsible for event
                  permits, licences, insurance, venue approvals, and local rules.
                </Text>
              ) : null}
            </View>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("Legal")}>
            <Text style={[styles.agreementLink, { color: theme.accent }]}>
              Read Privacy, Terms, and Community Guidelines
            </Text>
          </Pressable>
        </View>
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
                  disabled={
                    isSubmitting ||
                    isAuthLoading ||
                    (isFinalStep && !hasAcceptedAgreements)
                  }
                  loading={isFinalStep && (isSubmitting || isAuthLoading)}
                  size="lg"
                  style={[
                    styles.flexButton,
                    {
                      backgroundColor: theme.accent,
                      borderColor: theme.accent,
                      opacity:
                        isFinalStep && !hasAcceptedAgreements ? 0.56 : 1,
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
  validationText: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: -8,
    marginBottom: 12,
  },
  originSuggestionsCard: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: -8,
    marginBottom: 14,
    overflow: "hidden",
  },
  originSuggestionRow: {
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  originSuggestionText: {
    fontSize: 14,
    fontWeight: "700",
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
  interestGroups: {
    gap: 10,
  },
  interestGroup: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  interestGroupHeader: {
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  interestGroupCopy: {
    flex: 1,
  },
  interestGroupTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  interestGroupMeta: {
    fontSize: 12,
    marginTop: 3,
  },
  interestGroupChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 20,
    fontWeight: "800",
  },
  interestGroupOptions: {
    paddingHorizontal: 12,
    paddingBottom: 2,
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
  photoPickerButton: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 12,
  },
  photoPickerText: {
    fontSize: 13,
    fontWeight: "800",
  },
  photoPreviewCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  photoPreview: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ddd",
  },
  photoPreviewCopy: {
    flex: 1,
  },
  photoPreviewTitle: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },
  smallOutlineButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  smallOutlineText: {
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
  agreementCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
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
    marginBottom: 6,
  },
  agreementLink: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
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
