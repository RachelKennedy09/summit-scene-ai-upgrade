import { expect } from "chai";
import { parseOptions, configurationPlan, saveConfigurationPlan } from "../../scripts/configureAppUpdates.mjs";
import { defaultUpdatePolicy } from "../../utils/appUpdatePolicy.js";

const settings = () => ({ ios: { revision: 3, config: defaultUpdatePolicy("ios") }, android: { revision: 7, config: defaultUpdatePolicy("android") } });
describe("guided admin update configuration", () => {
  it("requires a deliberate platform and valid version", () => {
    expect(parseOptions(["--platform", "android", "--version", "1.0.10"])).to.deep.equal({ platform: "android", version: "1.0.10" });
    for (const args of [[], ["--platform", "both"], ["--platform", "web", "--version", "1.0.10"], ["--platform", "android", "--version", "beta"], ["--disable", "--platform", "android", "--version", "1.0.10"]]) expect(() => parseOptions(args)).to.throw();
  });
  it("prepares only Android without changing iOS or its store URL", () => {
    const current = settings();
    const before = JSON.stringify(current);
    const plan = configurationPlan(current, { platform: "android", version: "1.0.10" });
    expect(plan).to.have.length(1);
    expect(plan[0]).to.include({ platform: "android", expectedRevision: 7 });
    expect(plan[0].config).to.include({ minimumVersion: "1.0.10", latestVersion: "1.0.10", mandatoryEnabled: true, storeAvailable: true, minimumBuild: null, latestBuild: null });
    expect(plan[0].config.storeUrl).to.equal(current.android.config.storeUrl);
    expect(JSON.stringify(current)).to.equal(before);
  });
  it("keeps a newer latest version instead of downgrading release metadata", () => {
    const current = settings(); current.android.config.latestVersion = "1.10.0";
    expect(configurationPlan(current, { platform: "android", version: "1.9.0" })[0].config.latestVersion).to.equal("1.10.0");
  });
  it("prepares rollback without changing version, build or availability values", () => {
    const current = settings();
    current.android.config = { ...current.android.config, minimumVersion: "1.0.10", latestVersion: "1.0.10", minimumBuild: "13", latestBuild: "13", mandatoryEnabled: true, storeAvailable: true };
    const plan = configurationPlan(current, { platform: "android", disable: true });
    expect(plan[0].config).to.deep.equal({ ...current.android.config, mandatoryEnabled: false });
  });
  it("rejects malformed policies and revision data before any write", () => {
    const current = settings(); current.android.revision = -1;
    expect(() => configurationPlan(current, { platform: "both", version: "1.0.10" })).to.throw();
    current.android.revision = 7; current.android.config.storeUrl = "https://example.com";
    expect(() => configurationPlan(current, { platform: "both", version: "1.0.10" })).to.throw();
  });
  it("uses existing bearer authorization and each platform's current revision", async () => {
    const plan = configurationPlan(settings(), { platform: "both", version: "1.0.10" });
    const requests = []; const saved = [];
    await saveConfigurationPlan("https://api.example", plan, { token: "test-session", onSaved: (platform) => saved.push(platform), fetchImpl: async (url, options) => {
      requests.push({ url, options });
      const body = JSON.parse(options.body);
      return Response.json({ revision: body.expectedRevision + 1, config: body.config });
    } });
    expect(saved).to.deep.equal(["ios", "android"]);
    expect(requests.map((req) => JSON.parse(req.options.body).expectedRevision)).to.deep.equal([3, 7]);
    expect(requests[1].url).to.equal("https://api.example/api/app-version/admin/android");
    expect(requests[1].options.headers.Authorization).to.equal("Bearer test-session");
    expect(requests[1].options.redirect).to.equal("error");
  });
  it("stops on an authorization or revision failure without retrying", async () => {
    for (const status of [401, 403, 409]) {
      let requests = 0; let failed = false;
      try {
        await saveConfigurationPlan("https://api.example", configurationPlan(settings(), { platform: "both", version: "1.0.10" }), { token: "test", fetchImpl: async () => { requests++; return new Response(null, { status }); } });
      } catch { failed = true; }
      expect(failed).to.equal(true); expect(requests).to.equal(1);
    }
  });
  it("reports earlier successful saves if a later platform fails", async () => {
    const completed = []; let calls = 0; let failed = false;
    try {
      await saveConfigurationPlan("https://api.example", configurationPlan(settings(), { platform: "both", version: "1.0.10" }), { token: "test", onSaved: (platform) => completed.push(platform), fetchImpl: async (_, options) => {
        calls++; if (calls === 2) throw new Error("offline");
        const body = JSON.parse(options.body); return Response.json({ revision: body.expectedRevision + 1, config: body.config });
      } });
    } catch { failed = true; }
    expect(failed).to.equal(true); expect(completed).to.deep.equal(["ios"]);
  });
});
