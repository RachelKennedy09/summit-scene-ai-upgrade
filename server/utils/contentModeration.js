const DEFAULT_BLOCKED_PATTERNS = [
  /\bkill yourself\b/i,
  /\bkys\b/i,
  /\brape\b/i,
  /\bporn\b/i,
  /\bnudes?\b/i,
  /\bonlyfans\b/i,
  /\bescort\b/i,
  /\bsex for\b/i,
  /\bnazi\b/i,
  /\bwhite power\b/i,
  /\bbomb threat\b/i,
  /\bterrorist threat\b/i,
];

function getEnvBlockedPatterns() {
  return String(process.env.CONTENT_MODERATION_BLOCKLIST || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => new RegExp(`\\b${escapeRegExp(value)}\\b`, "i"));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function findContentModerationIssue(fields = {}) {
  const patterns = [...DEFAULT_BLOCKED_PATTERNS, ...getEnvBlockedPatterns()];

  for (const [field, value] of Object.entries(fields)) {
    if (typeof value !== "string" || !value.trim()) continue;
    if (patterns.some((pattern) => pattern.test(value))) {
      return {
        field,
        message:
          "Please remove unsafe, explicit, hateful, or abusive wording before posting.",
      };
    }
  }

  return null;
}
