export const PASSWORD_RULES_TEXT =
  "Use at least 10 characters with a letter, number, and symbol.";

export function validatePasswordStrength(password) {
  const value = String(password || "");

  if (value.length < 10) {
    return "Password must be at least 10 characters.";
  }

  if (!/[A-Za-z]/.test(value)) {
    return "Password must include at least one letter.";
  }

  if (!/\d/.test(value)) {
    return "Password must include at least one number.";
  }

  if (!/[^A-Za-z0-9]/.test(value)) {
    return "Password must include at least one symbol.";
  }

  return "";
}
