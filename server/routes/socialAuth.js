import express from "express";
import authMiddleware from "../middleware/auth.js";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { buildSafeUser } from "../utils/userProfile.js";

const router = express.Router();
const FACEBOOK_GRAPH_VERSION = "v19.0";
const APP_FACEBOOK_REDIRECT_URI =
  process.env.FACEBOOK_APP_REDIRECT_URI || "summitscene://auth/facebook";

function requireFacebookConfig() {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) {
    return null;
  }

  return { appId, appSecret };
}

async function fetchFacebookJson(url) {
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data?.error?.message || data?.message || "Facebook request failed.";
    throw new Error(message);
  }

  return data;
}

function buildFacebookAccount(profile, profileImageUrl) {
  return {
    provider: "facebook",
    handle: profile.name,
    providerUserId: profile.id,
    verified: true,
    connectedAt: new Date(),
    profileImageUrl,
  };
}

function createFacebookSignupToken(profile, profileImageUrl) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set in environment variables.");
  }

  return jwt.sign(
    {
      provider: "facebook",
      providerUserId: profile.id,
      name: profile.name,
      profileImageUrl,
    },
    secret,
    { expiresIn: "15m" }
  );
}

async function exchangeFacebookCode(code, redirectUri, config) {
  const tokenUrl = new URL(
    `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/oauth/access_token`
  );
  tokenUrl.searchParams.set("client_id", config.appId);
  tokenUrl.searchParams.set("redirect_uri", redirectUri);
  tokenUrl.searchParams.set("client_secret", config.appSecret);
  tokenUrl.searchParams.set("code", code);

  const tokenData = await fetchFacebookJson(tokenUrl);
  if (!tokenData.access_token) {
    throw new Error("Facebook did not return an access token.");
  }

  const profileUrl = new URL(
    `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/me`
  );
  profileUrl.searchParams.set("fields", "id,name,picture.type(large)");
  profileUrl.searchParams.set("access_token", tokenData.access_token);

  const profile = await fetchFacebookJson(profileUrl);
  const profileImageUrl = profile?.picture?.data?.url || "";

  return { profile, profileImageUrl };
}

function upsertFacebookAccount(user, profile, profileImageUrl) {
  const account = buildFacebookAccount(profile, profileImageUrl);

  const currentAccounts = Array.isArray(user.socialAccounts)
    ? user.socialAccounts
    : [];
  const existingIndex = currentAccounts.findIndex(
    (item) => item.provider === "facebook"
  );

  if (existingIndex >= 0) {
    currentAccounts[existingIndex] = {
      ...currentAccounts[existingIndex].toObject?.(),
      ...account,
    };
  } else {
    currentAccounts.push(account);
  }

  user.socialAccounts = currentAccounts;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

router.get("/facebook/mobile-callback", (req, res) => {
  const redirectUrl = new URL(APP_FACEBOOK_REDIRECT_URI);
  const allowedParams = [
    "code",
    "state",
    "error",
    "error_code",
    "error_message",
    "error_reason",
  ];

  allowedParams.forEach((param) => {
    if (req.query[param]) {
      redirectUrl.searchParams.set(param, req.query[param]);
    }
  });

  const appUrl = redirectUrl.toString();

  return res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Opening Summit Scene</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f5f3ee;
        color: #153c2f;
      }
      main {
        max-width: 420px;
        padding: 28px;
        text-align: center;
      }
      h1 {
        font-size: 24px;
        margin: 0 0 10px;
      }
      p {
        color: #5c685f;
        line-height: 1.5;
        margin: 0 0 18px;
      }
      a {
        display: inline-block;
        border-radius: 999px;
        padding: 12px 18px;
        background: #153c2f;
        color: #ffffff;
        font-weight: 800;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Opening Summit Scene</h1>
      <p>If the app does not reopen automatically, tap the button below.</p>
      <a href="${escapeHtml(appUrl)}">Return to Summit Scene</a>
    </main>
    <script>
      window.location.href = ${JSON.stringify(appUrl)};
    </script>
  </body>
</html>`);
});

router.post("/facebook/signup-preview", async (req, res) => {
  try {
    const config = requireFacebookConfig();
    if (!config) {
      return res.status(503).json({
        message:
          "Facebook connection is not configured yet. Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET on the server.",
      });
    }

    const { code, redirectUri } = req.body || {};
    if (!code || !redirectUri) {
      return res
        .status(400)
        .json({ message: "Facebook authorization code is required." });
    }

    const { profile, profileImageUrl } = await exchangeFacebookCode(
      code,
      redirectUri,
      config
    );

    return res.json({
      message: "Facebook ready for signup.",
      facebookConnectToken: createFacebookSignupToken(profile, profileImageUrl),
      facebookProfile: {
        name: profile.name,
        providerUserId: profile.id,
        profileImageUrl,
      },
    });
  } catch (error) {
    console.error("Facebook signup preview error:", error);
    return res.status(500).json({
      message:
        error.message || "Could not connect Facebook right now. Try again.",
    });
  }
});

router.post("/facebook/connect", authMiddleware, async (req, res) => {
  try {
    const config = requireFacebookConfig();
    if (!config) {
      return res.status(503).json({
        message:
          "Facebook connection is not configured yet. Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET on the server.",
      });
    }

    const { code, redirectUri } = req.body || {};
    if (!code || !redirectUri) {
      return res
        .status(400)
        .json({ message: "Facebook authorization code is required." });
    }

    const { profile: facebookProfile, profileImageUrl } =
      await exchangeFacebookCode(code, redirectUri, config);

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    upsertFacebookAccount(user, facebookProfile, profileImageUrl);

    if (profileImageUrl) {
      user.profileImageUrl = profileImageUrl;
      user.avatarKey = null;
    }

    await user.save();

    return res.json({
      message: "Facebook connected.",
      user: buildSafeUser(user),
      socialAccount: user.socialAccounts.find(
        (item) => item.provider === "facebook"
      ),
    });
  } catch (error) {
    console.error("Facebook connect error:", error);
    return res.status(500).json({
      message:
        error.message || "Could not connect Facebook right now. Try again.",
    });
  }
});

export default router;
