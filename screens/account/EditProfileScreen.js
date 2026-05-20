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
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import AppButton from "../../components/common/AppButton";
import PageHeader from "../../components/common/PageHeader";
import { PROFILE_INTEREST_GROUPS } from "../../constants/eventCategories";

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
const PROFILE_PHOTO_MAX_BASE64_LENGTH = 2200000;
const MAX_PROFILE_INTERESTS_PER_GROUP = 4;
const TOWN_OPTIONS = ["Banff", "Canmore", "Lake Louise", "All"];
const USER_TYPE_OPTIONS = [
  { value: "local", label: "Local" },
  { value: "seasonal", label: "Seasonal" },
  { value: "visitor", label: "Visitor" },
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

function getSocialValue(accounts, provider) {
  const account = accounts.find((item) => item.provider === provider);
  return account?.handle || account?.url || "";
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

export default function EditProfileScreen({ navigation }) {
  const { user, updateProfile, connectFacebook, isAuthLoading } = useAuth();
  const { theme } = useTheme();

  // Safeguard – if somehow no user
  const isBusiness = user?.role === "business";

  // Role-based heading + helper text
  const titleText = isBusiness ? "Event posting profile" : "Edit profile";
  const helperText = isBusiness
    ? "This is how your profile appears when you make an event."
    : "Update the profile details people see when you post, reply, or join plans.";

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
  const [bio, setBio] = useState(user?.bio || "");
  const [lookingFor, setLookingFor] = useState(user?.lookingFor || "");
  const [instagram, setInstagram] = useState(user?.instagram || "");
  const [website, setWebsite] = useState(user?.website || "");
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
        lookingFor: isBusiness ? lookingFor : "",
        instagram: socialValues.instagram || instagram,
        avatarKey: null,
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
                Profile type
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
                Main interests (optional)
              </Text>
              <Text style={[styles.helperText, { color: theme.textMuted }]}>
                Pick optional interests you are comfortable showing on your
                profile. Choose up to {MAX_PROFILE_INTERESTS_PER_GROUP} in each
                category. These help your Hub start with events you care about,
                and you can change them at any time.
              </Text>
              <InterestGroupList
                groups={PROFILE_INTEREST_GROUPS}
                values={interests}
                onToggle={handleToggleInterest}
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
            {isBusiness ? "Business description" : "Short bio"} (optional)
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
                : "A little about you or what you like doing around town..."
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
            Optional links people can use to recognize you.
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
            Profile photo
          </Text>
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            Choose a photo from your camera roll. This will be shown on your
            public profile, posts, replies, and event hosting card.
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
            <View style={styles.socialPhotoRow}>
              <Image
                source={{ uri: profileImageUrl }}
                style={styles.socialPhotoPreview}
              />
              <View style={styles.socialPhotoCopy}>
                <Text style={[styles.socialPhotoTitle, { color: theme.text }]}>
                  Profile photo ready
                </Text>
                <Text style={[styles.helperText, { color: theme.textMuted }]}>
                  This photo will be used publicly.
                </Text>
                <View style={styles.photoActionRow}>
                  <Pressable
                    style={[
                      styles.smallOutlineButton,
                      { borderColor: theme.border },
                    ]}
                    onPress={handleClearProfilePhoto}
                  >
                    <Text
                      style={[
                        styles.smallOutlineText,
                        { color: theme.textMuted },
                      ]}
                    >
                      Remove
                    </Text>
                  </Pressable>
                </View>
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
  interestGroups: {
    gap: 10,
    marginBottom: 4,
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
    fontWeight: "600",
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
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
  photoActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
