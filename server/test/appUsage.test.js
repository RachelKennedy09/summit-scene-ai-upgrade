import { expect } from "chai";
import { createAnalyticsIdentity } from "../../utils/analyticsIdentity.js";
import { attachAppUsageLifecycle, createAppUsageTracker, USAGE_QUEUE_KEY, VISIT_IDLE_MS } from "../../utils/appUsageTracker.js";
import { formatUsageSummary, recordAppOpen, validateAppUsage } from "../services/appUsageAnalytics.js";
import { trackAnalytics, getAnalyticsSummary } from "../controllers/analyticsController.js";
import AnalyticsEvent from "../models/AnalyticsEvent.js";
import AnalyticsInstallation from "../models/AnalyticsInstallation.js";
import User from "../models/User.js";

function memoryStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return { getItem: async (key) => values.get(key) || null, setItem: async (key, value) => { values.set(key, value); } };
}
const example = { installationId: "anon_installation123", visitId: "visit_open000001", platform: "ios", appVersion: "1.0.10", nativeBuild: "12" };
function memoryModels() {
  const installations = new Map();
  const events = new Map();
  return {
    installationRows: installations, eventRows: events,
    installations: { findOneAndUpdate: async (query, update) => {
      const existing = installations.get(query.installationId);
      const row = existing || { installationId: query.installationId, ...update.$setOnInsert };
      row.lastSeenAt = update.$max.lastSeenAt;
      installations.set(query.installationId, row);
      return row;
    } },
    events: { findOneAndUpdate: async (query, update) => {
      if (!events.has(query.dedupeKey)) events.set(query.dedupeKey, update.$setOnInsert);
    } },
  };
}
function response() {
  return { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}

describe("anonymous usage identity and lifecycle", () => {
  it("preserves existing installation IDs and serializes first-time initialization", async () => {
    expect(await createAnalyticsIdentity(memoryStorage({ analyticsSessionId: "anon_existing" }))()).to.equal("anon_existing");
    let generated = 0;
    const getId = createAnalyticsIdentity(memoryStorage(), () => `new_${++generated}`);
    expect(await Promise.all([getId(), getId(), getId()])).to.deep.equal(["new_1", "new_1", "new_1"]);
    expect(generated).to.equal(1);
  });

  it("counts a cold launch once and short returns as the same visit", async () => {
    let clock = 1000;
    const sent = [];
    const tracker = createAppUsageTracker({ storage: memoryStorage(), getInstallationId: async () => example.installationId,
      send: async (event) => sent.push(event), metadata: { platform: "ios", appVersion: "1.0.10" }, now: () => clock });
    await Promise.all([tracker.foreground(), tracker.foreground()]);
    tracker.background(); clock += 1000;
    await tracker.foreground();
    expect(sent).to.have.length(1);
    tracker.background(); clock += VISIT_IDLE_MS;
    await tracker.foreground();
    expect(sent).to.have.length(2);
    expect(sent[0].visitId).to.not.equal(sent[1].visitId);
    expect(sent.every((event) => event.installationId === example.installationId)).to.equal(true);
  });

  it("retries offline opens using the same visit IDs, including after restart", async () => {
    const storage = memoryStorage();
    let online = false;
    const sent = [];
    const send = async (event) => { if (!online) throw new Error("offline"); sent.push(event); };
    const options = { storage, getInstallationId: async () => example.installationId, send, metadata: { platform: "android" } };
    const tracker = createAppUsageTracker(options);
    await tracker.foreground();
    const queued = JSON.parse(await storage.getItem(USAGE_QUEUE_KEY));
    expect(queued).to.have.length(1);
    await tracker.retry();
    expect(JSON.parse(await storage.getItem(USAGE_QUEUE_KEY))[0].visitId).to.equal(queued[0].visitId);
    online = true;
    const restarted = createAppUsageTracker(options);
    await restarted.foreground();
    expect(sent).to.have.length(2);
    expect(sent[0].visitId).to.equal(queued[0].visitId);
    expect(JSON.parse(await storage.getItem(USAGE_QUEUE_KEY))).to.deep.equal([]);
  });

  it("counts initial inactive launch only when active and ignores repeated AppState messages", async () => {
    let listener;
    let foreground = 0;
    let background = 0;
    let removed = false;
    const detach = attachAppUsageLifecycle({ foreground: () => foreground++, background: () => background++ }, {
      currentState: "inactive", addEventListener: (_, fn) => { listener = fn; return { remove: () => { removed = true; } }; },
    });
    expect(foreground).to.equal(0);
    listener("active"); listener("active"); listener("inactive"); listener("background"); listener("active");
    expect(foreground).to.equal(2);
    expect(background).to.equal(1);
    detach(); expect(removed).to.equal(true);
  });

  it("bounds queued reports and tolerates malformed storage", async () => {
    const storage = memoryStorage({ [USAGE_QUEUE_KEY]: "invalid JSON" });
    let clock = 0;
    let id = 0;
    const tracker = createAppUsageTracker({ storage, now: () => clock, generateVisitId: () => `visit_pending_${++id}`,
      getInstallationId: async () => example.installationId, metadata: { platform: "ios" }, send: async () => { throw new Error("offline"); } });
    for (let i = 0; i < 25; i++) { await tracker.foreground(); tracker.background(); clock += VISIT_IDLE_MS; }
    expect(JSON.parse(await storage.getItem(USAGE_QUEUE_KEY))).to.have.length(20);
  });
});

describe("app usage recording", () => {
  it("validates guests and strips arbitrary metadata and identifiers", () => {
    const data = validateAppUsage({ ...example, email: "private@example.com", userId: "private", metadata: { location: "private" } });
    expect(data).to.deep.equal(example);
    expect(() => validateAppUsage({ ...example, installationId: "$bad" })).to.throw();
    expect(() => validateAppUsage({ ...example, platform: "web" })).to.throw();
    expect(validateAppUsage({ ...example, appVersion: "bad" }).appVersion).to.equal(null);
  });

  it("deduplicates retries and distinguishes the first recorded visit from later visits", async () => {
    const models = memoryModels();
    await recordAppOpen(example, models);
    await recordAppOpen(example, models);
    await recordAppOpen({ ...example, visitId: "visit_open000002" }, models);
    expect(models.installationRows.size).to.equal(1);
    expect(models.eventRows.size).to.equal(2);
    const [first, second] = [...models.eventRows.values()];
    expect(first.isReturning).to.equal(false);
    expect(second.isReturning).to.equal(true);
    expect(first).to.not.have.property("userId");
    expect(first).to.not.have.property("metadata");
  });

  it("accepts anonymous app-open requests through the existing controller", async () => {
    const oldInstallation = AnalyticsInstallation.findOneAndUpdate;
    const oldEvent = AnalyticsEvent.findOneAndUpdate;
    const models = memoryModels();
    try {
      AnalyticsInstallation.findOneAndUpdate = models.installations.findOneAndUpdate;
      AnalyticsEvent.findOneAndUpdate = models.events.findOneAndUpdate;
      const res = response();
      await trackAnalytics({ body: { ...example, type: "app_open" } }, res);
      expect(res.code).to.equal(202);
      expect(models.eventRows.size).to.equal(1);
      const invalid = response();
      await trackAnalytics({ body: { ...example, type: "app_open", visitId: "" } }, invalid);
      expect(invalid.code).to.equal(400);
    } finally {
      AnalyticsInstallation.findOneAndUpdate = oldInstallation;
      AnalyticsEvent.findOneAndUpdate = oldEvent;
    }
  });

  it("excludes signed-in admins and protects summary reports", async () => {
    const old = User.findById;
    try {
      User.findById = () => ({ select: async () => ({ isAdmin: true }) });
      const tracked = response();
      await trackAnalytics({ user: { userId: "507f1f77bcf86cd799439011" }, body: { ...example, type: "app_open" } }, tracked);
      expect(tracked.body.skipped).to.equal("admin");
      const guest = response();
      await getAnalyticsSummary({ query: {} }, guest);
      expect(guest.code).to.equal(401);
      User.findById = () => ({ select: async () => ({ isAdmin: false, email: "other@example.com" }) });
      const denied = response();
      await getAnalyticsSummary({ user: { userId: "507f1f77bcf86cd799439011" }, query: {} }, denied);
      expect(denied.code).to.equal(403);
    } finally { User.findById = old; }
  });

  it("formats distinct-installation and platform/version aggregate results", () => {
    expect(formatUsageSummary().appOpens).to.equal(0);
    const summary = formatUsageSummary({
      opens: [{ count: 12 }], active: [{ count: 5 }], firstRecorded: [{ count: 3 }], returning: [{ count: 4 }],
      active24h: [{ count: 2 }], active7d: [{ count: 8 }], active30d: [{ count: 10 }],
      platforms: [{ _id: "ios", appOpens: 12, activeInstallations: 5 }],
      versions: [{ _id: { platform: "ios", appVersion: "1.0.10", nativeBuild: "12" }, appOpens: 12, activeInstallations: 5 }],
    });
    expect(summary).to.include({ appOpens: 12, activeInstallations: 5, firstRecordedOpens: 3, returningInstallations: 4, active24h: 2, active7d: 8, active30d: 10 });
    expect(summary.versions[0].appVersion).to.equal("1.0.10");
    expect(summary.platforms[0].platform).to.equal("ios");
  });
});
