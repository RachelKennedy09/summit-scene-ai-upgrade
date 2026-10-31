import { expect } from "chai";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import Event from "../models/Event.js";
import EventPreference from "../models/EventPreference.js";
import User from "../models/User.js";
import authRouter from "../routes/auth.js";
import authMiddleware from "../middleware/auth.js";
import { getEventLikeCount, updateEventPreference } from "../controllers/eventPreferenceController.js";
import { encryptAppleToken, decryptAppleToken, exchangeAppleCode, revokeAppleAccount } from "../services/appleAccountService.js";
import { accountDestination, shouldClearSession } from "../../utils/accountNavigation.js";

const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const eventId = "507f1f77bcf86cd799439011";
const userId = "507f1f77bcf86cd799439012";

describe("member account recovery and navigation", () => {
  it("only clears saved credentials for a JSON 401 from the API", () => {
    for (const status of [200, 403, 429, 500, 502, 503]) expect(shouldClearSession(status, "application/json")).to.equal(false);
    expect(shouldClearSession(401, "text/html")).to.equal(false);
    expect(shouldClearSession(401, "application/json; charset=utf-8")).to.equal(true);
  });
  it("carries a guest action through profile setup and back to its event", () => {
    const intent = { eventId, action: "save" };
    expect(accountDestination({ onboardingCompleted: false }, intent).at(-1)).to.deep.equal({ name: "MemberProfile", params: { onboarding: true } });
    expect(accountDestination({ onboardingCompleted: true }, intent).at(-1)).to.deep.equal({ name: "EventDetail", params: { eventId } });
  });
  it("does not report a database outage as an invalid JWT", async () => {
    const original = User.findById;
    const secret = process.env.JWT_SECRET;
    try {
      process.env.JWT_SECRET = "offline-test-secret";
      User.findById = () => ({ select: async () => { throw new Error("Database unavailable"); } });
      const res = response();
      await authMiddleware({ headers: { authorization: `Bearer ${jwt.sign({ userId }, process.env.JWT_SECRET)}` } }, res, () => { throw new Error("Unexpected authorization"); });
      expect(res.code).to.equal(503);
    } finally { User.findById = original; if (secret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = secret; }
  });
});

describe("event saves and likes", () => {
  let originals;
  beforeEach(() => { originals = { event: Event.findById, exists: Event.exists, preference: EventPreference.findOneAndUpdate, count: EventPreference.countDocuments }; });
  afterEach(() => { Event.findById = originals.event; Event.exists = originals.exists; EventPreference.findOneAndUpdate = originals.preference; EventPreference.countDocuments = originals.count; });
  it("updates likes independently of saves and does not opt into reminders", async () => {
    Event.findById = () => ({ select: async () => ({ _id: eventId, date: "2099-12-30", time: "18:00" }) });
    let mutation;
    EventPreference.findOneAndUpdate = (filter, update, options) => {
      mutation = { filter, update, options };
      return { populate: async () => ({ liked: true, saved: false }) };
    };
    const res = response();
    await updateEventPreference({ user: { userId }, params: { eventId }, body: { liked: true, userId: "another-user" } }, res);
    expect(mutation.filter).to.deep.equal({ userId, eventId });
    expect(mutation.update).to.deep.equal({ $set: { liked: true } });
    expect(mutation.options.upsert).to.equal(true);
    expect(res.body).to.deep.equal({ liked: true, saved: false });
  });
  it("turns off the saved reminder when unsaving even with conflicting input", async () => {
    Event.findById = () => ({ select: async () => ({ _id: eventId, date: "2099-12-30", time: "18:00" }) });
    let mutation;
    EventPreference.findOneAndUpdate = (_filter, update) => { mutation = update; return { populate: async () => update.$set }; };
    await updateEventPreference({ user: { userId }, params: { eventId }, body: { saved: false, savedReminderEnabled: true } }, response());
    expect(mutation.$set).to.deep.equal({ saved: false, savedReminderEnabled: false });
  });
  it("exposes only an aggregate public like count", async () => {
    Event.exists = async () => ({ _id: eventId });
    EventPreference.countDocuments = async filter => { expect(filter).to.deep.equal({ eventId, liked: true }); return 7; };
    const res = response();
    await getEventLikeCount({ params: { eventId } }, res);
    expect(res.body).to.deep.equal({ likeCount: 7 });
  });
  it("rejects invalid event identifiers without a database lookup", async () => {
    Event.exists = () => { throw new Error("Must not reach MongoDB"); };
    const res = response();
    await getEventLikeCount({ params: { eventId: "invalid" } }, res);
    expect(res.code).to.equal(400);
  });
});

describe("Google account identity", () => {
  it("requires an authenticated link instead of silently merging a matching email", async () => {
    const original = { fetch: globalThis.fetch, findOne: User.findOne, exists: User.exists };
    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    const previousClient = process.env.GOOGLE_WEB_CLIENT_ID;
    try {
      process.env.GOOGLE_WEB_CLIENT_ID = "test-client";
      const jwk = publicKey.export({ format: "jwk" });
      globalThis.fetch = async () => ({ ok: true, json: async () => ({ keys: [{ ...jwk, kid: "test-key" }] }) });
      User.findOne = async query => { expect(query.socialAccounts.$elemMatch).to.include({ provider: "google", providerUserId: "google-subject", verified: true }); return null; };
      User.exists = async () => ({ _id: userId });
      const handler = authRouter.stack.find(layer => layer.route?.path === "/google").route.stack.at(-1).handle;
      const idToken = jwt.sign({ sub: "google-subject", email: "member@example.com", email_verified: true }, privateKey, { algorithm: "RS256", keyid: "test-key", audience: "test-client", issuer: "https://accounts.google.com", expiresIn: "5m" });
      const res = response();
      await handler({ body: { idToken, acceptedAgeTerms: true } }, res);
      expect(res.code).to.equal(409);
      expect(res.body.message).to.include("connect Google from Account");
    } finally {
      globalThis.fetch = original.fetch; User.findOne = original.findOne; User.exists = original.exists;
      if (previousClient === undefined) delete process.env.GOOGLE_WEB_CLIENT_ID; else process.env.GOOGLE_WEB_CLIENT_ID = previousClient;
    }
  });
});

describe("Apple account lifecycle", () => {
  let originalFetch, previous;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
    previous = Object.fromEntries(["JWT_SECRET", "APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_PRIVATE_KEY", "APPLE_BUNDLE_ID"].map(key => [key, process.env[key]]));
    const { privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    Object.assign(process.env, { JWT_SECRET: "test-encryption-key", APPLE_TEAM_ID: "test-team", APPLE_KEY_ID: "test-key", APPLE_PRIVATE_KEY: privateKey.export({ type: "pkcs8", format: "pem" }), APPLE_BUNDLE_ID: "test.app" });
  });
  afterEach(() => { globalThis.fetch = originalFetch; for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
  it("encrypts refresh tokens and detects tampering", () => {
    const encrypted = encryptAppleToken("private-refresh-token");
    expect(encrypted).not.to.include("private-refresh-token");
    expect(decryptAppleToken(encrypted)).to.equal("private-refresh-token");
    const parts = encrypted.split("."); parts[1] = Buffer.alloc(16).toString("base64url");
    expect(() => decryptAppleToken(parts.join("."))).to.throw();
  });
  it("exchanges a code bound to the verified Apple identity then revokes it", async () => {
    const requests = [];
    globalThis.fetch = async (url, options) => {
      requests.push({ url, body: options.body });
      return { ok: true, json: async () => ({ refresh_token: "private-refresh-token", id_token: jwt.sign({ sub: "apple-member", aud: "test.app" }, "mock-apple-response") }) };
    };
    const encrypted = await exchangeAppleCode("one-use-code", "apple-member");
    await revokeAppleAccount(encrypted);
    expect(requests[0].body.get("code")).to.equal("one-use-code");
    expect(requests[1].url).to.equal("https://appleid.apple.com/auth/revoke");
    expect(requests[1].body.get("token")).to.equal("private-refresh-token");
  });
  it("rejects an authorization code for a different Apple account", async () => {
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ refresh_token: "token", id_token: jwt.sign({ sub: "different-member", aud: "test.app" }, "mock") }) });
    let rejected = false;
    try { await exchangeAppleCode("code", "expected-member"); } catch { rejected = true; }
    expect(rejected).to.equal(true);
  });
});
