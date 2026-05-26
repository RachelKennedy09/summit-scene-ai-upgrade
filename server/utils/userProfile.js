import {
  ACTIVITY_SKILL_LEVELS,
  PROFILE_TOWNS,
  SOCIAL_PROVIDERS,
  USER_TYPES,
} from "../models/User.js";

const ARRAY_ITEM_MAX_LENGTH = 40;
const ARRAY_MAX_ITEMS = 20;

function normalizeOptionalString(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeEnum(value, allowedValues) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) return undefined;
  return allowedValues.includes(normalized) ? normalized : undefined;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return undefined;

  const seen = new Set();
  const normalized = [];

  value.forEach((item) => {
    const next = normalizeOptionalString(item);
    if (!next || seen.has(next)) return;
    seen.add(next);
    normalized.push(next.slice(0, ARRAY_ITEM_MAX_LENGTH));
  });

  return normalized.slice(0, ARRAY_MAX_ITEMS);
}

function normalizeSkillLevel(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const skillLevel = {};
  const hiking = normalizeEnum(value.hiking, ACTIVITY_SKILL_LEVELS);
  const skiing = normalizeEnum(value.skiing, ACTIVITY_SKILL_LEVELS);
  const discGolf = normalizeEnum(value.discGolf, ACTIVITY_SKILL_LEVELS);

  if (hiking) skillLevel.hiking = hiking;
  if (skiing) skillLevel.skiing = skiing;
  if (discGolf) skillLevel.discGolf = discGolf;

  return Object.keys(skillLevel).length ? skillLevel : undefined;
}

function normalizeSocialAccounts(value) {
  if (!Array.isArray(value)) return undefined;

  return value
    .map((account) => {
      if (!account || typeof account !== "object") return null;

      const provider = normalizeEnum(account.provider, SOCIAL_PROVIDERS);
      if (!provider) return null;

      const handle = normalizeOptionalString(account.handle);
      const url = normalizeOptionalString(account.url);

      if (!handle && !url) return null;

      return {
        provider,
        handle,
        url,
        providerUserId: normalizeOptionalString(account.providerUserId),
        profileImageUrl: normalizeOptionalString(account.profileImageUrl),
        verified: false,
        connectedAt: account.connectedAt || new Date(),
      };
    })
    .filter(Boolean);
}

function isAdminEmail(email) {
  const adminEmails = String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return Boolean(email) && adminEmails.includes(String(email).toLowerCase());
}

export function buildSafeUser(user) {
  return {
    id: user._id,
    _id: user._id,
    email: user.email,
    emailVerified: Boolean(user.emailVerified),
    pendingEmail: user.pendingEmail,
    name: user.name,
    role: user.role || "local",
    isAdmin: isAdminEmail(user.email),
    businessVerificationStatus: user.businessVerificationStatus || "none",
    businessVerificationRequestedAt: user.businessVerificationRequestedAt,
    businessVerifiedAt: user.businessVerifiedAt,
    hasSeenSafetyTips: Boolean(user.hasSeenSafetyTips),
    createdAt: user.createdAt,
    avatarKey: user.avatarKey,
    profileImageUrl: user.profileImageUrl,
    town: user.town,
    userType: user.userType || "local",
    languages: user.languages || [],
    originallyFrom: user.originallyFrom,
    interests: user.interests || [],
    skillLevel: user.skillLevel || {},
    bio: user.bio,
    lookingFor: user.lookingFor,
    instagram: user.instagram,
    facebook: user.facebook,
    website: user.website,
    googleBusinessUrl: user.googleBusinessUrl,
    phone: user.phone,
    socialAccounts: user.socialAccounts || [],
    blockedUsers: (user.blockedUsers || []).map((id) => id.toString()),
  };
}

export function buildProfileUpdates(body = {}) {
  const updates = {};

  const stringFields = [
    "name",
    "bio",
    "lookingFor",
    "instagram",
    "facebook",
    "website",
    "googleBusinessUrl",
    "phone",
    "originallyFrom",
    "profileImageUrl",
  ];
  stringFields.forEach((field) => {
    if (typeof body[field] === "string") {
      updates[field] = body[field].trim();
    }
  });

  if (typeof body.town === "string") {
    const town = normalizeEnum(body.town, PROFILE_TOWNS);
    if (town) updates.town = town;
  }

  if (typeof body.userType === "string") {
    const userType = normalizeEnum(body.userType, USER_TYPES);
    if (userType) updates.userType = userType;
  }

  if (Object.prototype.hasOwnProperty.call(body, "languages")) {
    const languages = normalizeStringArray(body.languages);
    if (languages) updates.languages = languages;
  }

  if (Object.prototype.hasOwnProperty.call(body, "interests")) {
    const interests = normalizeStringArray(body.interests);
    if (interests) updates.interests = interests;
  }

  if (Object.prototype.hasOwnProperty.call(body, "skillLevel")) {
    updates.skillLevel = normalizeSkillLevel(body.skillLevel) || {};
  }

  if (Object.prototype.hasOwnProperty.call(body, "socialAccounts")) {
    const socialAccounts = normalizeSocialAccounts(body.socialAccounts);
    if (socialAccounts) updates.socialAccounts = socialAccounts;
  }

  if (Object.prototype.hasOwnProperty.call(body, "avatarKey")) {
    if (body.avatarKey === null) {
      updates.avatarKey = null;
    } else if (typeof body.avatarKey === "string") {
      updates.avatarKey = body.avatarKey.trim();
    }
  }

  return updates;
}
