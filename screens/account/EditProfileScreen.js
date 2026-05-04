// screens/account/EditProfileScreen.js
// Lets logged-in users edit their profile fields (not email/password yet)

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image,
  Linking,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import AvatarPicker from "../../components/AvatarPicker";
import AppButton from "../../components/common/AppButton";
import PageHeader from "../../components/common/PageHeader";

const SOCIAL_PROVIDERS = [
  { provider: "instagram", label: "Instagram", placeholder: "@yourhandle" },
  { provider: "tiktok", label: "TikTok", placeholder: "@yourhandle" },
  { provider: "facebook", label: "Facebook", placeholder: "Profile link" },
  { provider: "linkedin", label: "LinkedIn", placeholder: "Profile link" },
  { provider: "website", label: "Website", placeholder: "https://..." },
];
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://summit-scene-backend.onrender.com";
const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;
const FACEBOOK_REDIRECT_URI =
  process.env.EXPO_PUBLIC_FACEBOOK_REDIRECT_URI ||
  `${API_BASE_URL}/api/social/facebook/mobile-callback`;
const FACEBOOK_OPTIONAL_MESSAGE =
  "Facebook connection needs the installed Summit Scene app to return automatically. You can keep using manual social links now and connect Facebook later.";
const TOWN_OPTIONS = ["Banff", "Canmore", "Lake Louise", "All"];
const USER_TYPE_OPTIONS = [
  { value: "local", label: "Local" },
  { value: "seasonal", label: "Seasonal" },
  { value: "visitor", label: "Visitor" },
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

function getSocialValue(accounts, provider) {
  const account = accounts.find((item) => item.provider === provider);
  return account?.handle || account?.url || "";
}

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

export default function EditProfileScreen({ navigation }) {
  const { user, updateProfile, connectFacebook, isAuthLoading } = useAuth();
  const { theme } = useTheme();

  // Safeguard – if somehow no user
  const isBusiness = user?.role === "business";

  // Role-based heading + helper text
  const titleText = isBusiness ? "Event posting profile" : "Edit profile";
  const helperText = isBusiness
    ? "This is how your profile appears when you make an event."
    : "This helps Summit Scene personalize events, plans, groups, and updates around you.";

  // Pre-fill fields from current user
  const [name, setName] = useState(user?.name || "");
  const [town, setTown] = useState(user?.town || "");
  const [userType, setUserType] = useState(user?.userType || "local");
  const [originallyFrom, setOriginallyFrom] = useState(user?.originallyFrom || "");
  const [languagesText, setLanguagesText] = useState(
    Array.isArray(user?.languages) ? user.languages.join(", ") : ""
  );
  const [interests, setInterests] = useState(
    Array.isArray(user?.interests) ? user.interests : []
  );
  const [hikingSkill, setHikingSkill] = useState(
    user?.skillLevel?.hiking || ""
  );
  const [skiingSkill, setSkiingSkill] = useState(
    user?.skillLevel?.skiing || ""
  );
  const [discGolfSkill, setDiscGolfSkill] = useState(
    user?.skillLevel?.discGolf || ""
  );
  const [bio, setBio] = useState(user?.bio || "");
  const [lookingFor, setLookingFor] = useState(user?.lookingFor || "");
  const [instagram, setInstagram] = useState(user?.instagram || "");
  const [website, setWebsite] = useState(user?.website || "");
  const [avatarKey, setAvatarKey] = useState(user?.avatarKey || null);
  const [profileImageUrl, setProfileImageUrl] = useState(
    user?.profileImageUrl || ""
  );
  const [isConnectingFacebook, setIsConnectingFacebook] = useState(false);
  const facebookTimeoutRef = useRef(null);
  const facebookCallbackHandledRef = useRef(false);
  const [socialValues, setSocialValues] = useState(() => {
    const accounts = Array.isArray(user?.socialAccounts)
      ? user.socialAccounts
      : [];

    return SOCIAL_PROVIDERS.reduce((current, { provider }) => {
      current[provider] = getSocialValue(accounts, provider);
      return current;
    }, {});
  });

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
        Alert.alert(
          "Continue without Facebook",
          FACEBOOK_OPTIONAL_MESSAGE
        );
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

  if (!user) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.background }]}
      >
        <View style={styles.container}>
          <PageHeader
            title="Edit profile"
            subtitle="You need to be logged in to edit your profile."
          />
        </View>
      </SafeAreaView>
    );
  }

  async function handleSave() {
    try {
      const languages = languagesText
        .split(",")
        .map((language) => language.trim())
        .filter(Boolean);

      const updates = {
        name,
        town,
        bio,
        userType: isBusiness ? undefined : userType,
        originallyFrom: isBusiness ? undefined : originallyFrom,
        languages: isBusiness ? undefined : languages,
        interests: isBusiness ? undefined : interests,
        skillLevel: isBusiness
          ? undefined
          : {
              ...(hikingSkill ? { hiking: hikingSkill } : {}),
              ...(skiingSkill ? { skiing: skiingSkill } : {}),
              ...(discGolfSkill ? { discGolf: discGolfSkill } : {}),
            },
        lookingFor: isBusiness ? lookingFor : "",
        instagram: socialValues.instagram || instagram,
        avatarKey,
        profileImageUrl,
        socialAccounts: buildSocialAccounts(socialValues, profileImageUrl),
      };

      if (isBusiness) {
        updates.website = website;
      }

      await updateProfile(updates);

      Alert.alert("Profile updated", "Your changes have been saved.");
      navigation.goBack();
    } catch (error) {
      console.error("updateProfile error:", error);
      Alert.alert(
        "Update failed",
        error.message || "Could not save your profile."
      );
    }
  }

  function handleCancel() {
    navigation.goBack();
  }

  function handleSocialChange(provider, value) {
    setSocialValues((current) => ({
      ...current,
      [provider]: value,
    }));
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
        Alert.alert(
          "Continue without Facebook",
          FACEBOOK_OPTIONAL_MESSAGE
        );
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
            `${errorMessage}\n\nYou can still use manual social links and connect Facebook later.`
          );
          return;
        }

        if (!code) {
          finishFacebookConnection();
          Alert.alert(
            "Continue without Facebook",
            FACEBOOK_OPTIONAL_MESSAGE
          );
          return;
        }

        try {
          const updatedUser = await connectFacebook(code, FACEBOOK_REDIRECT_URI);
          const facebookAccount = updatedUser?.socialAccounts?.find(
            (account) => account.provider === "facebook"
          );

          setProfileImageUrl(updatedUser?.profileImageUrl || "");
          setAvatarKey(updatedUser?.avatarKey || null);
          setSocialValues((current) => ({
            ...current,
            facebook:
              facebookAccount?.handle ||
              facebookAccount?.url ||
              current.facebook ||
              "Facebook connected",
          }));

          Alert.alert(
            "Facebook connected",
            "Your Facebook profile photo is now ready to use on Summit Scene."
          );
        } catch (error) {
          Alert.alert(
            "Facebook failed",
            `${error.message || "Could not connect Facebook."}\n\nYou can still use manual social links and connect Facebook later.`
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
        `${error.message || "Could not open Facebook."}\n\nYou can still use manual social links and connect Facebook later.`
      );
    }
  }

  function handleToggleInterest(interest) {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest]
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <PageHeader title={titleText} subtitle={helperText} />

          {/* Name */}
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

          {isBusiness ? (
            <>
              <Text style={[styles.label, { color: theme.text }]}>
                Where is your business located?
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
                value={town}
                onChangeText={setTown}
                placeholder="Banff, Canmore, Lake Louise..."
                placeholderTextColor={theme.textMuted}
              />
            </>
          ) : (
            <>
              <Text style={[styles.label, { color: theme.text }]}>
                Where are you based?
              </Text>
              <ChipGroup
                options={TOWN_OPTIONS}
                value={town}
                onChange={setTown}
                theme={theme}
              />

              <Text style={[styles.label, { color: theme.text }]}>
                How should people know you?
              </Text>
              <ChipGroup
                options={USER_TYPE_OPTIONS}
                value={userType}
                onChange={setUserType}
                theme={theme}
              />

              <Text style={[styles.label, { color: theme.text }]}>
                Originally from (optional)
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
                placeholder="Toronto, Australia, Japan..."
                placeholderTextColor={theme.textMuted}
                value={originallyFrom}
                onChangeText={setOriginallyFrom}
              />

              <Text style={[styles.label, { color: theme.text }]}>
                Languages spoken (optional)
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
                placeholder="English, French, Spanish..."
                placeholderTextColor={theme.textMuted}
                value={languagesText}
                onChangeText={setLanguagesText}
              />

              <Text style={[styles.label, { color: theme.text }]}>
                What would you like to see here? (optional)
              </Text>
              <ChipGroup
                options={INTEREST_OPTIONS}
                values={interests}
                onToggle={handleToggleInterest}
                theme={theme}
              />

              <Text style={[styles.label, { color: theme.text }]}>
                Optional activity levels
              </Text>
              <Text style={[styles.helperText, { color: theme.textMuted }]}>
                Skip anything that does not apply.
              </Text>
              <Text style={[styles.label, { color: theme.text }]}>
                Hiking level
              </Text>
              <ChipGroup
                options={SKILL_OPTIONS}
                value={hikingSkill}
                onChange={setHikingSkill}
                theme={theme}
              />

              <Text style={[styles.label, { color: theme.text }]}>
                Skiing/Snowboarding level
              </Text>
              <ChipGroup
                options={SKILL_OPTIONS}
                value={skiingSkill}
                onChange={setSkiingSkill}
                theme={theme}
              />

              <Text style={[styles.label, { color: theme.text }]}>
                Disc golf level
              </Text>
              <ChipGroup
                options={SKILL_OPTIONS}
                value={discGolfSkill}
                onChange={setDiscGolfSkill}
                theme={theme}
              />
            </>
          )}

          {/* Looking for / business type */}
          {isBusiness ? (
            <>
              <Text style={[styles.label, { color: theme.text }]}>
                Business type
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.multiline,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={lookingFor}
                onChangeText={setLookingFor}
                multiline
                numberOfLines={3}
                placeholder="Cafe, yoga studio, music venue..."
                placeholderTextColor={theme.textMuted}
              />
            </>
          ) : null}

          {/* Bio */}
          <Text style={[styles.label, { color: theme.text }]}>
            Short bio {isBusiness ? "" : "(optional)"}
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.multiline,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            placeholder={
              isBusiness
                ? "Tell people about your business, vibe, and what you host."
                : "A little about you, your season, or what you like doing around town..."
            }
            placeholderTextColor={theme.textMuted}
          />

          {/* Website – business only */}
          <Text
            style={[
              styles.label,
              { marginTop: 16, fontWeight: "700", color: theme.text },
            ]}
          >
            Connected socials
          </Text>
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            Add links people can use to recognize you. These show as unverified
            until connected through the social platform. Optional.
          </Text>

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
                Optional: verify Facebook and use its profile photo when the
                installed app build is available.
              </Text>
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

          {SOCIAL_PROVIDERS.map(({ provider, label, placeholder }) => (
            <View key={provider}>
              <Text style={[styles.label, { color: theme.text }]}>
                {label} (optional)
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
                value={socialValues[provider]}
                onChangeText={(value) => handleSocialChange(provider, value)}
                placeholder={placeholder}
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
              />
            </View>
          ))}

          <Text style={[styles.label, { color: theme.text }]}>
            Facebook or Instagram profile photo URL (optional)
          </Text>
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            Paste a public profile image URL for now. Facebook can fill this in
            automatically later from the installed app build.
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
            <View style={styles.socialPhotoRow}>
              <Image
                source={{ uri: profileImageUrl }}
                style={styles.socialPhotoPreview}
              />
              <View style={styles.socialPhotoCopy}>
                <Text style={[styles.socialPhotoTitle, { color: theme.text }]}>
                  Social photo ready
                </Text>
                <Text style={[styles.helperText, { color: theme.textMuted }]}>
                  Clear your preset avatar below to use this photo publicly.
                </Text>
                <Pressable
                  style={[styles.smallOutlineButton, { borderColor: theme.accent }]}
                  onPress={() => setAvatarKey(null)}
                >
                  <Text style={[styles.smallOutlineText, { color: theme.accent }]}>
                    Use social photo
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {isBusiness && (
            <>
              <Text style={[styles.label, { color: theme.text }]}>
                Website (optional)
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
                value={website}
                onChangeText={setWebsite}
                placeholder="https://your-business.com"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
              />
            </>
          )}

          {/* Avatar Picker */}
          <Text
            style={[
              styles.label,
              { marginTop: 16, fontWeight: "600", color: theme.text },
            ]}
          >
            Avatar
          </Text>
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            Choose the avatar that shows on your Community posts and event
            hosting card.
          </Text>

          <AvatarPicker
            value={avatarKey}
            onChange={setAvatarKey}
            variant={isBusiness ? "business" : "personal"}
          />
          <Pressable
            style={[styles.clearAvatarButton, { borderColor: theme.border }]}
            onPress={() => setAvatarKey(null)}
          >
            <Text style={[styles.clearAvatarText, { color: theme.textMuted }]}>
              Clear preset avatar
            </Text>
          </Pressable>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <AppButton
              title="Cancel"
              onPress={handleCancel}
              disabled={isAuthLoading}
              variant="outline"
              style={styles.flexButton}
            />

            <AppButton
              title={isAuthLoading ? "Saving..." : "Save changes"}
              onPress={handleSave}
              loading={isAuthLoading}
              variant="primary"
              style={styles.flexButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  helperText: {
    fontSize: 12,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    marginBottom: 4,
    marginTop: 10,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  socialPhotoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  socialPhotoPreview: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ddd",
  },
  socialPhotoCopy: {
    flex: 1,
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
  socialPhotoTitle: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 2,
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
  clearAvatarButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: -4,
  },
  clearAvatarText: {
    fontSize: 12,
    fontWeight: "800",
  },
  multiline: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
  },
  flexButton: {
    flex: 1,
  },
});
