import { expect } from "chai";
import { readFileSync } from "node:fs";
import * as cheerio from "cheerio";
import User from "../models/User.js";
import isAdmin from "../middleware/isAdmin.js";
import eventsRouter from "../routes/events.js";
import authRouter from "../routes/auth.js";
import { createEvent } from "../controllers/eventController.js";

const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
describe("admin-managed event listings", () => {
  let findById;
  beforeEach(() => { findById = User.findById; });
  afterEach(() => { User.findById = findById; });
  it("protects creation, editing, deletion, and management with the existing admin middleware", () => {
    for (const [method, path] of [["post", "/"], ["put", "/:id"], ["delete", "/:id"], ["get", "/mine"]]) {
      const route = eventsRouter.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route;
      expect(route.stack.some(layer => layer.handle === isAdmin)).to.equal(true);
    }
  });
  it("denies a legacy verified business the right to manage listings", async () => {
    User.findById = () => ({ select: async () => ({ email: "legacy-listing@example.invalid", isAdmin: false, role: "business", businessVerificationStatus: "verified" }) });
    const res = response(); let authorized = false;
    await isAdmin({ user: { userId: "member", email: "legacy-listing@example.invalid" } }, res, () => { authorized = true; });
    expect(authorized).to.equal(false); expect(res.code).to.equal(403);
  });
  it("retains access for admin", async () => {
    User.findById = () => ({ select: async () => ({ email: "listing-admin@example.invalid", isAdmin: true }) });
    let authorized = false;
    await isAdmin({ user: { userId: "admin" } }, response(), () => { authorized = true; });
    expect(authorized).to.equal(true);
  });
  it("also rejects business creation in the event controller", async () => {
    User.findById = async () => ({ email: "legacy-listing@example.invalid", isAdmin: false, role: "business", businessVerificationStatus: "verified" });
    const res = response();
    await createEvent({ user: { userId: "member" }, body: {} }, res);
    expect(res.code).to.equal(403); expect(res.body.message).to.include("hello@summitscene.ca");
  });
  it("rejects business signup before creating any account", async () => {
    const handler = authRouter.stack.find(layer => layer.route?.path === "/register").route.stack.at(-1).handle;
    const res = response();
    await handler({ body: { role: "business" } }, res);
    expect(res.code).to.equal(403); expect(res.body.message).to.include("hello@summitscene.ca");
  });
  it("gives businesses a working email submission link and the details to send", () => {
    const $ = cheerio.load(readFileSync(new URL("../../landing/business.html", import.meta.url), "utf8"));
    expect($("main").text()).to.include("There are no business or organizer accounts");
    expect($("main").text()).to.include("start and end times");
    expect($("main a[href^='mailto:hello@summitscene.ca']").length).to.be.greaterThan(0);
    expect($("main").text()).not.to.include("Verified Local Organizer");
  });
});
