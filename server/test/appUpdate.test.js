import { expect } from "chai";
import express from "express";
import request from "supertest";
import { compareVersions, defaultUpdatePolicy, evaluateUpdatePolicy, validateUpdatePolicy } from "../../utils/appUpdatePolicy.js";
import { attachUpdateLifecycle, createAppUpdateController, openUpdateStore, POLICY_LEASE_MS } from "../../utils/appUpdateController.js";
import { fetchAppVersionInfo } from "../../services/appVersionApi.js";
import { createAppVersionRouter } from "../routes/appVersion.js";

const enabled = (platform, changes = {}) => ({
  ...defaultUpdatePolicy(platform), minimumVersion: "1.0.10", latestVersion: "1.0.10",
  mandatoryEnabled: true, storeAvailable: true, ...changes,
});
const payload = (ios = enabled("ios"), android = defaultUpdatePolicy("android")) => ({ schemaVersion: 2, platforms: { ios, android } });
const installed = { version: "1.0.9", build: "9" };

describe("app update policies", () => {
  it("compares numeric versions, including 1.10.0 versus 1.9.0", () => {
    expect(compareVersions("1.10.0", "1.9.0")).to.equal(1);
    expect(compareVersions("1.0.9", "1.0.10")).to.equal(-1);
    expect(compareVersions("1.0", "1.0.0")).to.equal(0);
    expect(compareVersions("2.0.0", "1.99.99")).to.equal(1);
    for (const value of [undefined, "", "1.2beta", "v1.2.3", "1.-1.0", "1.2.3.4", "9007199254740992.0.0"]) {
      expect(() => compareVersions(value, "1.0.0")).to.throw();
    }
  });

  it("keeps iOS and Android independent, and respects disabled requirements", () => {
    expect(evaluateUpdatePolicy(enabled("ios"), installed, "ios").required).to.equal(true);
    expect(evaluateUpdatePolicy(defaultUpdatePolicy("android"), installed, "android").required).to.equal(false);
    const decision = evaluateUpdatePolicy(enabled("ios", { mandatoryEnabled: false }), installed, "ios");
    expect(decision).to.include({ required: false, optional: true });
  });

  it("does not force an update just because the latest version is newer", () => {
    expect(evaluateUpdatePolicy(enabled("ios", { minimumVersion: "1.0.2" }), installed, "ios"))
      .to.include({ required: false, optional: true });
    expect(evaluateUpdatePolicy(enabled("ios"), { version: "1.0.10", build: "12" }, "ios"))
      .to.include({ required: false, optional: false });
  });

  it("uses separate native build floors with numeric iOS and Android comparisons", () => {
    expect(evaluateUpdatePolicy(enabled("ios", { minimumVersion: "1.0.9", minimumBuild: "1.10", latestBuild: "1.11" }),
      { version: "1.0.10", build: "1.9" }, "ios").required).to.equal(true);
    expect(evaluateUpdatePolicy(enabled("android", { minimumBuild: "10", latestBuild: "11" }),
      { version: "1.0.10", build: "9" }, "android").required).to.equal(true);
    expect(evaluateUpdatePolicy(enabled("android", { minimumBuild: "10", latestBuild: "11" }),
      { version: "1.0.10", build: "10" }, "android").required).to.equal(false);
    expect(() => validateUpdatePolicy(enabled("android", { minimumBuild: "1.2", latestBuild: "2" }), "android")).to.throw();
  });

  it("fails open for missing installed metadata", () => {
    expect(evaluateUpdatePolicy(enabled("ios"), {}, "ios")).to.include({ required: false, unknown: true });
    expect(evaluateUpdatePolicy(enabled("ios", { minimumBuild: "10", latestBuild: "10" }), { version: "1.0.9" }, "ios"))
      .to.include({ required: false, unknown: true });
  });

  it("rejects invalid or unavailable mandatory policies and non-store links", () => {
    for (const changes of [
      { storeAvailable: false }, { mandatoryEnabled: "true" }, { message: "" },
      { minimumVersion: "2.0.0" }, { minimumBuild: "12", latestBuild: "11" },
      { storeUrl: "https://example.com/phishing" }, { storeUrl: defaultUpdatePolicy("android").storeUrl },
      { unexpected: true },
    ]) expect(() => validateUpdatePolicy(enabled("ios", changes), "ios")).to.throw();
  });
});

describe("app update lifecycle and failure handling", () => {
  it("allows launch after network, HTTP, malformed data and timeout failures", async () => {
    for (const fetchInfo of [
      async () => { throw new Error("Offline"); },
      async () => ({}),
      async () => payload(enabled("ios", { mandatoryEnabled: "yes" })),
      () => fetchAppVersionInfo({ fetchImpl: async () => ({ ok: false }) }),
      () => fetchAppVersionInfo({ fetchImpl: async () => ({ ok: true, json: async () => { throw new Error("Invalid JSON"); } }) }),
      () => fetchAppVersionInfo({ timeoutMs: 5, fetchImpl: () => new Promise(() => {}) }),
      () => fetchAppVersionInfo({ timeoutMs: 5, fetchImpl: async () => ({ ok: true, json: () => new Promise(() => {}) }) }),
    ]) {
      const controller = createAppUpdateController({ platform: "ios", installed, fetchInfo });
      expect(await controller.check()).to.include({ checking: false, required: false, ready: true });
      controller.dispose();
    }
  });

  it("holds a recent confirmed requirement during a transient failure, but expires it", async () => {
    let clock = 1000;
    let online = true;
    const controller = createAppUpdateController({ platform: "ios", installed, now: () => clock,
      fetchInfo: async () => { if (!online) throw new Error("Offline"); return payload(); } });
    expect((await controller.check()).required).to.equal(true);
    online = false;
    clock += 60000;
    expect((await controller.check()).required).to.equal(true);
    clock += POLICY_LEASE_MS;
    expect(controller.expire().required).to.equal(false);
    expect((await controller.check()).required).to.equal(false);
  });

  it("rechecks on returning from the store, and accepts a remote reversal", async () => {
    let nextPayload = payload();
    let checks = 0;
    let listener;
    let removed = false;
    const controller = createAppUpdateController({ platform: "ios", installed,
      fetchInfo: async () => { checks += 1; return nextPayload; } });
    const detach = attachUpdateLifecycle(controller, { currentState: "active", addEventListener: (_, fn) => {
      listener = fn; return { remove: () => { removed = true; } };
    } });
    await controller.check();
    expect(checks).to.equal(1);
    expect(controller.getState().required).to.equal(true);
    let opened;
    expect(await openUpdateStore(controller.getState().policy, async (url) => { opened = url; })).to.equal("");
    expect(opened).to.equal(defaultUpdatePolicy("ios").storeUrl);
    listener("inactive"); listener("background");
    nextPayload = payload(enabled("ios", { mandatoryEnabled: false }));
    listener("active");
    await controller.check();
    expect(checks).to.equal(2);
    expect(controller.getState().required).to.equal(false);
    listener("active");
    expect(checks).to.equal(2);
    detach(); controller.dispose();
    expect(removed).to.equal(true);
  });

  it("keeps the block when returning from the store without installing", async () => {
    const controller = createAppUpdateController({ platform: "android", installed,
      fetchInfo: async () => payload(defaultUpdatePolicy("ios"), enabled("android")) });
    await controller.check();
    const error = await openUpdateStore(controller.getState().policy, async () => { throw new Error("No store"); });
    expect(error).to.include("Could not open the store");
    expect((await controller.check()).required).to.equal(true);
  });

  it("allows the installed replacement release and preserves the running app during refresh", async () => {
    let next = payload(enabled("ios", { minimumVersion: "1.0.10" }));
    const states = [];
    const controller = createAppUpdateController({ platform: "ios", installed: { version: "1.0.10", build: "10" },
      fetchInfo: async () => next, onChange: (state) => states.push(state) });
    expect((await controller.check()).required).to.equal(false);
    const refresh = controller.check();
    expect(controller.getState()).to.include({ ready: true, checking: true, required: false });
    await refresh;
    next = payload(enabled("ios", { minimumVersion: "1.0.11", latestVersion: "1.0.11" }));
    expect((await controller.check()).required).to.equal(true);
    expect(states.length).to.be.greaterThan(0);
  });

  it("does not query the API in web/Expo Go and deduplicates simultaneous checks", async () => {
    let checks = 0;
    const fetchInfo = async () => { checks += 1; return payload(); };
    const web = createAppUpdateController({ platform: "web", installed, fetchInfo });
    await web.check();
    const expoGo = createAppUpdateController({ platform: "ios", installed: { version: null }, fetchInfo });
    await expoGo.check();
    expect(checks).to.equal(0);
    const controller = createAppUpdateController({ platform: "ios", installed, fetchInfo });
    await Promise.all([controller.check(), controller.check(), controller.check()]);
    expect(checks).to.equal(1);
  });
});

describe("app update API (isolated persistence)", () => {
  function setup({ authenticated = true, admin = true, databaseFails = false, realAuth = false } = {}) {
    const docs = new Map();
    const model = {
      find: () => ({ lean: async () => { if (databaseFails) throw new Error("DB offline"); return [...docs.values()]; } }),
      findOneAndUpdate: async (query, update, options) => {
        const current = docs.get(query.platform);
        if ((current?.revision || 0) !== query.revision) {
          if (options.upsert) throw Object.assign(new Error("Conflict"), { code: 11000 });
          return null;
        }
        const document = { platform: query.platform, ...update.$set, revision: query.revision + 1 };
        docs.set(query.platform, document);
        return document;
      },
    };
    const app = express(); app.use(express.json());
    const authenticate = (req, res, next) => {
      if (!authenticated) return res.sendStatus(401);
      req.user = { userId: "507f1f77bcf86cd799439011", email: admin ? "hello@summitscene.ca" : "not-admin@example.com" };
      // Remove id for a non-admin so the real authorizer can deny without DB.
      if (!admin) delete req.user.userId;
      next();
    };
    app.use("/api/app-version", createAppVersionRouter({ model, env: {}, ...(realAuth ? {} : { authenticate }) }));
    return { app, docs };
  }

  it("returns disabled defaults and keeps the legacy contract uncached", async () => {
    const { app } = setup();
    const response = await request(app).get("/api/app-version");
    expect(response.status).to.equal(200);
    expect(response.headers["cache-control"]).to.equal("no-store");
    expect(response.body.platforms.ios.mandatoryEnabled).to.equal(false);
    expect(response.body.platforms.android.mandatoryEnabled).to.equal(false);
    expect(response.body.minimumSupportedVersion).to.equal("1.0.2");
  });

  it("requires real authentication and server-side admin authorization", async () => {
    const unauthenticated = setup({ realAuth: true });
    expect((await request(unauthenticated.app).put("/api/app-version/admin/ios").send({})).status).to.equal(401);
    const nonAdmin = setup({ admin: false });
    expect((await request(nonAdmin.app).put("/api/app-version/admin/ios").send({})).status).to.equal(403);
    expect((await request(nonAdmin.app).get("/api/app-version/admin")).status).to.equal(403);
  });

  it("saves and reverses only the selected platform, detects conflicting changes", async () => {
    const { app } = setup();
    const write = (expectedRevision, config, platform = "ios") => request(app).put(`/api/app-version/admin/${platform}`).send({ expectedRevision, config });
    const saved = await write(0, enabled("ios"));
    expect(saved.status).to.equal(200);
    expect(saved.body.revision).to.equal(1);
    expect((await write(0, enabled("ios"))).status).to.equal(409);
    const publicInfo = (await request(app).get("/api/app-version")).body;
    expect(publicInfo.platforms.ios.mandatoryEnabled).to.equal(true);
    expect(publicInfo.platforms.android.mandatoryEnabled).to.equal(false);
    expect(publicInfo.minimumSupportedVersion).to.equal("1.0.2");
    expect((await write(1, enabled("ios", { mandatoryEnabled: false }))).status).to.equal(200);
    expect((await request(app).get("/api/app-version")).body.platforms.ios.mandatoryEnabled).to.equal(false);
  });

  it("rejects invalid configuration and returns unavailable on database failure", async () => {
    const { app, docs } = setup();
    expect((await request(app).put("/api/app-version/admin/ios").send({ expectedRevision: 0, config: enabled("ios", { storeAvailable: false }) })).status).to.equal(400);
    expect((await request(app).put("/api/app-version/admin/web").send({ expectedRevision: 0, config: enabled("ios") })).status).to.equal(400);
    expect(docs.size).to.equal(0);
    expect((await request(setup({ databaseFails: true }).app).get("/api/app-version")).status).to.equal(503);
  });
});
