// AuthContext.js
// Global auth state (user, token) + login/register/logout/upgrade/updateProfile
// Any screen can know if the user is logged in and call auth actions
// Centralizes auth logic instead of duplicating it across screens

import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { toUserFriendlyError } from "../utils/friendlyErrors";

// API base URL (Expo public env OR fallback to Render backend)
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://summit-scene-backend.onrender.com";

// Single place for token key
const TOKEN_KEY = "authToken";
const SESSION_RESTORE_TIMEOUT_MS = 10000;
const AUTH_REQUEST_TIMEOUT_MS = 30000;

async function fetchWithTimeout(url, options = {}, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeNetworkError(error, fallbackMessage) {
  if (error?.name === "AbortError") {
    return new Error(fallbackMessage);
  }

  if (
    typeof error?.message === "string" &&
    error.message.toLowerCase().includes("aborted")
  ) {
    return new Error(fallbackMessage);
  }

  return error;
}

async function readJsonSafely(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function isExpectedAuthFailure(error) {
  if (!error?.message) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("invalid email or password") ||
    message.includes("login failed") ||
    message.includes("registration failed")
  );
}

// Create the context object
const AuthContext = createContext(null);

// Helper hook so it can use: const { user, login } = useAuth()
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return value;
}

// Provider component that wraps the app
export function AuthProvider({ children }) {
  // user will hold {_id, email, name, role, town, avatarKey, ...} from backend
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null); // JWT from the backend
  const [isSessionBootstrapping, setIsSessionBootstrapping] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authDebugMessage, setAuthDebugMessage] = useState(
    "Booting auth session..."
  );

  // On app start, try to restore a saved session from AsyncStorage
  useEffect(() => {
    restoreSession();
  }, []);

  function buildUser(rawUser) {
    return {
      ...rawUser,
      emailVerified: Boolean(rawUser?.emailVerified),
      pendingEmail: rawUser?.pendingEmail ?? "",
      avatarKey: rawUser?.avatarKey ?? null,
      profileImageUrl: rawUser?.profileImageUrl ?? "",
      businessVerificationStatus:
        rawUser?.businessVerificationStatus ?? "none",
      businessVerificationRequestedAt:
        rawUser?.businessVerificationRequestedAt ?? null,
      businessVerifiedAt: rawUser?.businessVerifiedAt ?? null,
      isAdmin: Boolean(rawUser?.isAdmin),
      hasSeenSafetyTips: Boolean(rawUser?.hasSeenSafetyTips),
      userType: rawUser?.userType ?? "local",
      languages: Array.isArray(rawUser?.languages) ? rawUser.languages : [],
      originallyFrom: rawUser?.originallyFrom ?? "",
      interests: Array.isArray(rawUser?.interests) ? rawUser.interests : [],
      skillLevel: rawUser?.skillLevel ?? {},
      socialAccounts: Array.isArray(rawUser?.socialAccounts)
        ? rawUser.socialAccounts
        : [],
      blockedUsers: Array.isArray(rawUser?.blockedUsers)
        ? rawUser.blockedUsers
        : [],
    };
  }

  async function setLoggedOutState(debugMessage) {
    if (debugMessage) {
      setAuthDebugMessage(debugMessage);
    }

    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem(TOKEN_KEY);
  }

  async function setLoggedInState(nextToken, rawUser, debugMessage) {
    const normalizedUser = buildUser(rawUser || {});

    if (debugMessage) {
      setAuthDebugMessage(debugMessage);
    }

    await AsyncStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
    setUser(normalizedUser);

    return normalizedUser;
  }

  async function restoreSession() {
    try {
      setIsSessionBootstrapping(true);
      setAuthDebugMessage("Checking saved session token...");
      console.log("restoreSession started");

      const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (!savedToken) {
        console.log("No saved token, skipping restore");
        await setLoggedOutState("No saved token found. Opening logged-out app.");
        return;
      }

      setAuthDebugMessage("Saved token found. Restoring session...");
      console.log("Restoring session from:", `${API_BASE_URL}/api/auth/me`);
      setAuthDebugMessage(`Calling ${API_BASE_URL}/api/auth/me`);

      // Check that the token is still valid and get the current user
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/auth/me`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        },
        SESSION_RESTORE_TIMEOUT_MS
      );

      const data = await readJsonSafely(response);

      if (!response.ok) {
        console.log("Session restore failed:", response.status, data?.message);
        await setLoggedOutState(
          `Session restore failed (${response.status}). Clearing saved token.`
        );
        return;
      }
      const rawUser = data.user || data;
      if (!rawUser || !rawUser._id) {
        await setLoggedOutState(
          "Session restore returned no user. Clearing saved token."
        );
        return;
      }

      await setLoggedInState(
        savedToken,
        rawUser,
        "Session restored. User loaded."
      );
    } catch (error) {
      const normalizedError = normalizeNetworkError(
        error,
        "Session restore timed out."
      );
      console.error("Error restoring auth session:", normalizedError);
      const friendlyError = toUserFriendlyError(
        normalizedError,
        "We couldn't restore your session. Please log in again."
      );
      await setLoggedOutState(
        `Session restore error: ${friendlyError.message}. Clearing token.`
      );
    } finally {
      setAuthDebugMessage((current) => `${current} Done.`);
      setIsSessionBootstrapping(false);
      console.log("restoreSession finished");
    }
  }

  async function retrySessionRestore() {
    await restoreSession();
  }

  async function skipSessionRestore() {
    setAuthDebugMessage("Session restore skipped. Opening logged-out app.");
    await setLoggedOutState("Session restore skipped. Opening logged-out app.");
    setIsSessionBootstrapping(false);
  }

  // LOGIN: call backend /api/auth/login, save token and user
  async function login({ email, password }) {
    try {
      setIsAuthLoading(true);
      console.log("Logging in against:", `${API_BASE_URL}/api/auth/login`);

      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        },
        AUTH_REQUEST_TIMEOUT_MS
      );

      const data = await readJsonSafely(response);

      if (!response.ok) {
        // backend should send { message: "Invalid email or password" }
        const message = data?.message || "Login failed.";
        throw new Error(message);
      }

      const mergedUser = await setLoggedInState(
        data.token,
        data.user || {},
        "Login successful. Opening app."
      );

      return { ...data, user: mergedUser }; // screen can react if needed
    } catch (error) {
      const normalizedError = normalizeNetworkError(
        error,
        "Login request timed out. Check the backend URL/server and try again."
      );
      const friendlyError = toUserFriendlyError(
        normalizedError,
        "We couldn't log you in right now. Please try again."
      );
      if (isExpectedAuthFailure(normalizedError)) {
        console.log("Login rejected:", friendlyError.message);
      } else {
        console.warn("Login request issue:", friendlyError.message);
      }
      throw friendlyError; // let screen show an alert
    } finally {
      setIsAuthLoading(false);
    }
  }

  // REGISTER: hit /api/auth/register then store auth + user
  async function register({
    name,
    email,
    password,
    role,
    town,
    userType,
    languages,
    originallyFrom,
    interests,
    skillLevel,
    socialAccounts,
    bio,
    lookingFor,
    instagram,
    website,
    avatarKey,
    profileImageUrl,
    facebookConnectToken,
    acceptedAgeTerms,
  }) {
    try {
      setIsAuthLoading(true);

      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            password,
            role,
            town: town || undefined,
            userType: userType || undefined,
            languages: Array.isArray(languages) ? languages : undefined,
            originallyFrom: originallyFrom || undefined,
            interests: Array.isArray(interests) ? interests : undefined,
            skillLevel: skillLevel || undefined,
            socialAccounts: Array.isArray(socialAccounts)
              ? socialAccounts
              : undefined,
            bio: bio || undefined,
            lookingFor: lookingFor || undefined,
            instagram: instagram || undefined,
            website: website || undefined,
            avatarKey: avatarKey || undefined,
            profileImageUrl: profileImageUrl || undefined,
            facebookConnectToken: facebookConnectToken || undefined,
            acceptedAgeTerms: acceptedAgeTerms === true,
          }),
        },
        AUTH_REQUEST_TIMEOUT_MS
      );

      const data = await readJsonSafely(response);

      if (!response.ok) {
        const message = data?.message || "Registration failed.";
        throw new Error(message);
      }

      const rawUser = data.user || {};
      const mergedUser = await setLoggedInState(
        data.token,
        {
          ...rawUser,
          avatarKey: rawUser.avatarKey ?? avatarKey ?? null,
          profileImageUrl: rawUser.profileImageUrl ?? profileImageUrl ?? "",
        },
        "Registration successful. Opening app."
      );

      console.log("Merged user in AuthContext.register:", mergedUser);

      return { ...data, user: mergedUser };
    } catch (error) {
      const normalizedError = normalizeNetworkError(
        error,
        "Registration request timed out. Check the backend URL/server and try again."
      );
      const friendlyError = toUserFriendlyError(
        normalizedError,
        "We couldn't create your account right now. Please try again."
      );
      if (isExpectedAuthFailure(normalizedError)) {
        console.log("Registration rejected:", friendlyError.message);
      } else {
        console.warn("Registration request issue:", friendlyError.message);
      }
      throw friendlyError;
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function revertToLocalProfile() {
    if (!token) {
      throw new Error("You must be logged in to switch profile type.");
    }

    try {
      setIsAuthLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/users/revert-to-local`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await readJsonSafely(response);

      if (!response.ok) {
        const message = data?.message || "Profile switch failed.";
        throw new Error(message);
      }

      if (data.user) {
        setUser(buildUser(data.user));
      }

      return data.user;
    } catch (error) {
      console.error("Error in revertToLocalProfile:", error);
      throw toUserFriendlyError(
        error,
        "We couldn't switch your account back right now. Please try again."
      );
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function blockUser(targetUserId) {
    if (!token) {
      throw new Error("You must be logged in to block a user.");
    }

    if (!targetUserId) {
      throw new Error("User was not found.");
    }

    try {
      setIsAuthLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/users/${targetUserId}/block`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(data?.message || "Could not block user.");
      }

      if (data.user) {
        setUser(buildUser(data.user));
      }

      return data.user;
    } catch (error) {
      console.error("Error in blockUser:", error);
      throw toUserFriendlyError(
        error,
        "We couldn't block that user right now. Please try again."
      );
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function unblockUser(targetUserId) {
    if (!token) {
      throw new Error("You must be logged in to unblock a user.");
    }

    try {
      setIsAuthLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/users/${targetUserId}/block`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(data?.message || "Could not unblock user.");
      }

      if (data.user) {
        setUser(buildUser(data.user));
      }

      return data.user;
    } catch (error) {
      console.error("Error in unblockUser:", error);
      throw toUserFriendlyError(
        error,
        "We couldn't unblock that user right now. Please try again."
      );
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function fetchBlockedUsers() {
    if (!token) {
      throw new Error("You must be logged in to view blocked users.");
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/me/blocked-users`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(data?.message || "Could not load blocked users.");
      }

      return Array.isArray(data.blockedUsers) ? data.blockedUsers : [];
    } catch (error) {
      console.error("Error in fetchBlockedUsers:", error);
      throw toUserFriendlyError(
        error,
        "We couldn't load blocked users right now. Please try again."
      );
    }
  }

  async function markSafetyTipsSeen() {
    if (!token) {
      throw new Error("You must be logged in to continue.");
    }

    try {
      setIsAuthLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/users/me/safety-tips-seen`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(data?.message || "Could not save safety tips state.");
      }

      if (data.user) {
        setUser(buildUser(data.user));
      }

      return data.user;
    } catch (error) {
      console.error("Error in markSafetyTipsSeen:", error);
      throw toUserFriendlyError(
        error,
        "We couldn't save this right now. Please try again."
      );
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function connectFacebook(code, redirectUri) {
    if (!token) {
      throw new Error("You must be logged in to connect Facebook.");
    }

    try {
      setIsAuthLoading(true);

      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/social/facebook/connect`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code, redirectUri }),
        },
        AUTH_REQUEST_TIMEOUT_MS
      );

      const data = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(data?.message || "Could not connect Facebook.");
      }

      if (data.user) {
        setUser(buildUser(data.user));
      }

      return data.user;
    } catch (error) {
      console.error("Error in connectFacebook:", error);
      throw toUserFriendlyError(
        error,
        "We couldn't connect Facebook right now. Please try again."
      );
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function previewFacebookSignup(code, redirectUri) {
    try {
      setIsAuthLoading(true);

      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/social/facebook/signup-preview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code, redirectUri }),
        },
        AUTH_REQUEST_TIMEOUT_MS
      );

      const data = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(data?.message || "Could not connect Facebook.");
      }

      return data;
    } catch (error) {
      console.error("Error in previewFacebookSignup:", error);
      throw toUserFriendlyError(
        error,
        "We couldn't connect Facebook right now. Please try again."
      );
    } finally {
      setIsAuthLoading(false);
    }
  }

  // UPDATE PROFILE: edit name / avatar / town / bio / etc. (not email/password yet)
  async function updateProfile(updates) {
    if (!token) {
      throw new Error("You must be logged in to update your profile.");
    }

    try {
      setIsAuthLoading(true);

      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/users/me`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        },
        AUTH_REQUEST_TIMEOUT_MS
      );

      const data = await readJsonSafely(response);

      if (!response.ok) {
        const message = data?.message || "Failed to update profile.";
        throw new Error(message);
      }

      if (data.user) {
        setUser(buildUser(data.user));
      }

      return data.user;
    } catch (error) {
      console.error("Error in updateProfile:", error);
      throw toUserFriendlyError(
        error,
        "We couldn't save your profile right now. Please try again."
      );
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function deleteAccount() {
    if (!token) {
      throw new Error("You must be logged in to delete your account.");
    }

    try {
      setIsAuthLoading(true);

      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/users/me`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
        AUTH_REQUEST_TIMEOUT_MS
      );

      const data = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(data?.message || "Failed to delete account.");
      }

      await setLoggedOutState("Account deleted. Clearing session.");
      return data;
    } catch (error) {
      console.error("Error in deleteAccount:", error);
      throw toUserFriendlyError(
        error,
        "We couldn't delete your account right now. Please try again."
      );
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function resendVerificationEmail() {
    if (!token) {
      throw new Error("You must be logged in to verify your email.");
    }

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/auth/resend-verification`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
      AUTH_REQUEST_TIMEOUT_MS
    );

    const data = await readJsonSafely(response);
    if (!response.ok) {
      throw new Error(data?.message || "Could not send verification email.");
    }
    if (data.user) {
      setUser(buildUser(data.user));
    }
    return data;
  }

  async function verifyEmail(verificationToken) {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/auth/verify-email`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verificationToken }),
      },
      AUTH_REQUEST_TIMEOUT_MS
    );

    const data = await readJsonSafely(response);
    if (!response.ok) {
      throw new Error(data?.message || "Could not verify email.");
    }
    if (data.user) {
      setUser(buildUser(data.user));
    }
    return data;
  }

  async function forgotPassword(email) {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/auth/forgot-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      },
      AUTH_REQUEST_TIMEOUT_MS
    );

    const data = await readJsonSafely(response);
    if (!response.ok) {
      throw new Error(data?.message || "Could not request password reset.");
    }
    return data;
  }

  async function checkEmailAvailability(email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/auth/email-availability?email=${encodeURIComponent(
        normalizedEmail
      )}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
      AUTH_REQUEST_TIMEOUT_MS
    );

    const data = await readJsonSafely(response);
    if (!response.ok) {
      throw new Error(data?.message || "Could not check that email.");
    }
    return data;
  }

  async function resetPassword({ resetToken, password }) {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/auth/reset-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password }),
      },
      AUTH_REQUEST_TIMEOUT_MS
    );

    const data = await readJsonSafely(response);
    if (!response.ok) {
      throw new Error(data?.message || "Could not reset password.");
    }
    return data;
  }

  async function changePassword({ currentPassword, newPassword }) {
    if (!token) {
      throw new Error("You must be logged in to change your password.");
    }

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/auth/change-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      },
      AUTH_REQUEST_TIMEOUT_MS
    );

    const data = await readJsonSafely(response);
    if (!response.ok) {
      throw new Error(data?.message || "Could not change password.");
    }
    await setLoggedOutState("Password changed. Please log in again.");
    return data;
  }

  async function requestEmailChange({ newEmail, currentPassword }) {
    if (!token) {
      throw new Error("You must be logged in to change your email.");
    }

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/auth/request-email-change`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newEmail, currentPassword }),
      },
      AUTH_REQUEST_TIMEOUT_MS
    );

    const data = await readJsonSafely(response);
    if (!response.ok) {
      throw new Error(data?.message || "Could not request email change.");
    }
    if (data.user) {
      setUser(buildUser(data.user));
    }
    return data;
  }

  async function confirmEmailChange(emailChangeToken) {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/auth/confirm-email-change`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: emailChangeToken }),
      },
      AUTH_REQUEST_TIMEOUT_MS
    );

    const data = await readJsonSafely(response);
    if (!response.ok) {
      throw new Error(data?.message || "Could not confirm email change.");
    }
    if (data.user) {
      setUser(buildUser(data.user));
    }
    return data;
  }

  // LOGOUT: clear token + user + storage
  async function logout() {
    try {
      setIsAuthLoading(true);
      await setLoggedOutState("Logging out. Clearing session.");
    } catch (error) {
      console.error("Error in logout:", error);
    } finally {
      setIsAuthLoading(false);
    }
  }

  const value = {
    user,
    token,
    isSessionBootstrapping,
    isAuthLoading,
    authDebugMessage,
    retrySessionRestore,
    skipSessionRestore,
    login,
    register,
    logout,
    revertToLocalProfile,
    blockUser,
    unblockUser,
    fetchBlockedUsers,
    markSafetyTipsSeen,
    connectFacebook,
    previewFacebookSignup,
    updateProfile,
    deleteAccount,
    resendVerificationEmail,
    verifyEmail,
    forgotPassword,
    checkEmailAvailability,
    resetPassword,
    changePassword,
    requestEmailChange,
    confirmEmailChange,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
