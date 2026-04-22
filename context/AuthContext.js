// AuthContext.js
// Global auth state (user, token) + login/register/logout/upgrade/updateProfile
// Any screen can know if the user is logged in and call auth actions
// Centralizes auth logic instead of duplicating it across screens

import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// API base URL (Expo public env OR fallback to Render backend)
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://summit-scene-backend.onrender.com";

// Single place for token key
const TOKEN_KEY = "authToken";

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
  const [isAuthLoading, setIsAuthLoading] = useState(true); // true while restoring session

  // On app start, try to restore a saved session from AsyncStorage
  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      setIsAuthLoading(true);

      const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (!savedToken) {
        // No token saved - user is logged out
        setToken(null);
        setUser(null);
        return;
      }

      // Check that the token is still valid and get the current user
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${savedToken}`,
        },
      });

      if (!response.ok) {
        // Token invalid or expired - clear it
        await AsyncStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
        return;
      }

      const data = await response.json();
      const rawUser = data.user || data;

      // Keep avatarKey if backend returns it; otherwise fall back to null
      const restoredUser = {
        ...rawUser,
        avatarKey: rawUser.avatarKey ?? null,
      };

      setToken(savedToken);
      setUser(restoredUser);
    } catch (error) {
      console.error("Error restoring auth session:", error);
      // On any error, treat as logged out
      setToken(null);
      setUser(null);
      await AsyncStorage.removeItem(TOKEN_KEY);
    } finally {
      setIsAuthLoading(false);
    }
  }

  // LOGIN: call backend /api/auth/login, save token and user
  async function login({ email, password }) {
    try {
      setIsAuthLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // backend should send { message: "Invalid email or password" }
        const message = data?.message || "Login failed.";
        throw new Error(message);
      }

      // Normalize user shape + avatarKey
      const rawUser = data.user || {};
      const mergedUser = {
        ...rawUser,
        avatarKey: rawUser.avatarKey ?? null,
      };

      // Save token and user in state and AsyncStorage
      setToken(data.token);
      setUser(mergedUser);
      await AsyncStorage.setItem(TOKEN_KEY, data.token);

      return { ...data, user: mergedUser }; // screen can react if needed
    } catch (error) {
      console.error("Error in login:", error);
      throw error; // let screen show an alert
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
    bio,
    lookingFor,
    instagram,
    website,
    avatarKey,
  }) {
    try {
      setIsAuthLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
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
          bio: bio || undefined,
          lookingFor: lookingFor || undefined,
          instagram: instagram || undefined,
          website: website || undefined,
          avatarKey: avatarKey || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = data?.message || "Registration failed.";
        throw new Error(message);
      }

      // Ensure avatarKey is present even if backend forgot to return it
      const rawUser = data.user || {};
      const mergedUser = {
        ...rawUser,
        avatarKey: rawUser.avatarKey ?? avatarKey ?? null,
      };

      console.log("Merged user in AuthContext.register:", mergedUser);

      setToken(data.token);
      setUser(mergedUser);
      await AsyncStorage.setItem(TOKEN_KEY, data.token);

      return { ...data, user: mergedUser };
    } catch (error) {
      console.error("Error in register:", error);
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  }

  // UPGRADE: local -> business
  async function upgradeToBusiness() {
    if (!token) {
      throw new Error("You must be logged in to upgrade your account.");
    }

    try {
      setIsAuthLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/users/upgrade-to-business`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const message = data?.message || "Upgrade failed.";
        throw new Error(message);
      }

      if (data.user) {
        setUser(data.user);
      }

      return data.user;
    } catch (error) {
      console.error("Error in upgradeToBusiness:", error);
      throw error;
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

      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = data?.message || "Failed to update profile.";
        throw new Error(message);
      }

      if (data.user) {
        setUser(data.user);
      }

      return data.user;
    } catch (error) {
      console.error("Error in updateProfile:", error);
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  }

  // LOGOUT: clear token + user + storage
  async function logout() {
    try {
      setIsAuthLoading(true);
      setUser(null);
      setToken(null);
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error("Error in logout:", error);
    } finally {
      setIsAuthLoading(false);
    }
  }

  const value = {
    user,
    token,
    isAuthLoading,
    login,
    register,
    logout,
    upgradeToBusiness,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
