import crypto from "node:crypto";
import jwt from "jsonwebtoken";

function configuration() {
  const clientId = process.env.APPLE_BUNDLE_ID || "com.rachellauren.summitscene";
  const { APPLE_TEAM_ID: teamId, APPLE_KEY_ID: keyId, APPLE_PRIVATE_KEY: privateKey } = process.env;
  if (!teamId || !keyId || !privateKey || !process.env.JWT_SECRET) {
    throw new Error("Apple account service is not configured. Please use Google or email sign-in.");
  }
  const secret = jwt.sign({}, privateKey.replace(/\\n/g, "\n"), {
    algorithm: "ES256", keyid: keyId, issuer: teamId,
    subject: clientId, audience: "https://appleid.apple.com", expiresIn: "5m",
  });
  return { clientId, secret };
}

function encryptionKey() {
  if (!process.env.JWT_SECRET) throw new Error("Account encryption is not configured.");
  return crypto.createHash("sha256").update(`apple-refresh:${process.env.JWT_SECRET}`).digest();
}
export function encryptAppleToken(token) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(value => value.toString("base64url")).join(".");
}
export function decryptAppleToken(value) {
  const [iv, tag, encrypted] = value.split(".").map(part => Buffer.from(part, "base64url"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export async function exchangeAppleCode(code, expectedSubject) {
  if (typeof code !== "string" || !code) throw new Error("Please sign in with Apple again to complete account setup.");
  const { clientId, secret } = configuration();
  const response = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: secret, code, grant_type: "authorization_code" }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Apple could not complete sign-in. Please try again.");
  const result = await response.json();
  // This response comes directly from Apple's authenticated HTTPS token endpoint.
  const identity = jwt.decode(result.id_token);
  if (!result.refresh_token || identity?.sub !== expectedSubject || identity?.aud !== clientId) {
    throw new Error("Apple account verification failed. Please sign in again.");
  }
  return encryptAppleToken(result.refresh_token);
}

export async function revokeAppleAccount(encryptedToken) {
  if (!encryptedToken) return;
  const { clientId, secret } = configuration();
  const response = await fetch("https://appleid.apple.com/auth/revoke", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: secret, token: decryptAppleToken(encryptedToken), token_type_hint: "refresh_token" }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Apple account disconnect failed. Please try deleting your account again shortly.");
}
