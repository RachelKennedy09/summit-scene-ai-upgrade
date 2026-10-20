import { expect } from "chai";
import { aggregate, Query } from "mingo";
import * as cheerio from "cheerio";
import request from "supertest";
import express from "express";
import Event from "../models/Event.js";
import router from "../routes/publicEvents.js";
import { PUBLIC_VISIBILITY, publicQuery, publicEventDTO, getPublicEvent, listPublicEvents, occurrenceExpression, parsePublicFilters } from "../services/publicEvents.js";
import { localDate, dateRange, nextOccurrence, eventTimestamp } from "../../utils/publicEventDates.js";
import { eventPath, eventUrl } from "../../utils/eventLinks.js";
import { appLinkingConfig, eventLinkState } from "../../utils/appLinking.js";
import { renderListing, renderDetail, eventSchema } from "../../website/render.js";
import { handleEvents } from "../../netlify/functions/events.mjs";
import { associationFiles } from "../../scripts/buildWebsite.mjs";
import { sampleEvents } from "../../website/fixtures.js";
import { categoryImagePath, CATEGORY_IMAGE_FILES } from "../../website/eventImages.js";
import { readFileSync, statSync } from "node:fs";
import { runInNewContext } from "node:vm";

const now = new Date("2026-10-20T15:00:00Z");
const base = { ...sampleEvents[0] };
const env = { PUBLIC_API_BASE_URL: "https://api.example", PUBLIC_SITE_URL: "https://summitscene.ca" };
const listing = (events = [base], extra = {}) => ({ events, page: 1, hasMore: false, filters: parsePublicFilters({}, now), ...extra });

describe("public event visibility and privacy", () => {
  it("keeps legacy published events visible and excludes all explicit unpublished flags", () => {
    expect(new Query(PUBLIC_VISIBILITY).test(base)).to.equal(true);
    for (const flags of [{ status: "draft" }, { status: "pending" }, { status: "unknown" }, { publicationStatus: "draft" }, { visibility: "private" }, { visibility: "unlisted" }, { isPublished: false }, { isDeleted: true }, { deletedAt: new Date() }]) {
      expect(new Query(PUBLIC_VISIBILITY).test({ ...base, ...flags }), JSON.stringify(flags)).to.equal(false);
    }
  });
  it("uses the existing app rules to keep happy hours and promotions out of the main feed", () => {
    const query = new Query(publicQuery());
    expect(query.test(base)).to.equal(true);
    expect(query.test({ ...base, title: "Happy Hour", description: "Daily drink specials" })).to.equal(false);
    expect(query.test({ ...base, category: "Restaurant Specials" })).to.equal(false);
    expect(query.test({ ...base, category: "Tours & Experiences" })).to.equal(false);
  });
  it("never exposes creator IDs, attendees, private profiles, snapshots or administrative fields", () => {
    const dto = publicEventDTO({ ...base, attendees: [{ email: "private@example.com" }], sourceSnapshot: { secret: "internal" }, importReviewReason: "Internal", createdBy: { _id: "private-id", name: "Public Host", website: "https://venue.example", role: "business", businessVerificationStatus: "verified", email: "private@example.com" } });
    expect(dto.organizer).to.deep.equal({ name: "Public Host", url: "https://venue.example/" });
    expect(JSON.stringify(dto)).to.not.match(/private|internal|attendees|createdBy|Snapshot|ReviewReason/);
    expect(publicEventDTO({ ...base, importedBySummitScene: true, createdBy: { name: "Admin" } })).to.not.have.property("organizer");
  });
  it("strips unsafe image and booking URLs", () => {
    const dto = publicEventDTO({ ...base, imageUrl: "data:text/html,<script>", bookingUrl: "javascript:alert(1)" });
    expect(dto.imageUrl).to.equal(""); expect(dto.bookingUrl).to.equal("");
  });
  it("serves anonymous details through the public projection and hides private records", async () => {
    const originals = { findOne: Event.findOne, exists: Event.exists };
    let document = { ...base, attendees: [{ email: "secret@example.com" }] };
    try {
      Event.findOne = (query) => ({ setOptions() { return this; }, select() { return this; }, populate() { return this; }, lean() { return this; }, maxTimeMS: async () => new Query(query).test(document) ? document : null });
      Event.exists = () => ({ setOptions() { return this; }, maxTimeMS: async () => ({ _id: base._id }) });
      const app = express(); app.use("/api/public/events", router);
      const res = await request(app).get(`/api/public/events/${base._id}`);
      expect(res.status).to.equal(200); expect(res.body.event.title).to.equal(base.title);
      expect(JSON.stringify(res.body)).to.not.contain("secret@example.com");
      document = { ...document, visibility: "private" };
      expect((await request(app).get(`/api/public/events/${base._id}`)).status).to.equal(404);
      expect(await getPublicEvent("invalid")).to.equal(null);
    } finally { Event.findOne = originals.findOne; Event.exists = originals.exists; }
  });
});

describe("Mountain date filtering and recurrence", () => {
  it("uses the Alberta date at UTC midnight, including DST", () => {
    expect(localDate(new Date("2026-10-21T02:00:00Z"))).to.equal("2026-10-20");
    expect(localDate(new Date("2026-12-21T06:30:00Z"))).to.equal("2026-12-20");
    expect(dateRange("tomorrow", "", "", now)).to.deep.equal({ from: "2026-10-21", to: "2026-10-21" });
    expect(dateRange("weekend", "", "", now)).to.deep.equal({ from: "2026-10-23", to: "2026-10-25" });
    expect(dateRange("weekend", "", "", new Date("2026-10-25T18:00:00Z"))).to.deep.equal({ from: "2026-10-25", to: "2026-10-25" });
  });
  it("uses the correct timestamp offset and rejects ambiguous or impossible DST times", () => {
    expect(eventTimestamp("2026-07-20", "8 PM")).to.equal("2026-07-20T20:00:00-06:00");
    expect(eventTimestamp("2026-12-20", "20:00")).to.equal("2026-12-20T20:00:00-07:00");
    expect(eventTimestamp("2026-03-08", "2:30 AM")).to.equal(null);
    expect(eventTimestamp("2026-11-01", "1:30 AM")).to.equal(null);
  });
  for (const [frequency, recurrence] of [
    ["daily", {}], ["weekly", {}], ["biweekly", {}], ["monthly", {}],
    ["selected_weekdays", { weekdays: ["Friday", "Sunday"] }], ["selected_weekdays", { weekdays: [] }],
    ["selected_dates", { dates: ["2026-10-23", "2026-11-02"] }],
  ]) {
    it(`matches the app recurrence rules for ${frequency} ${JSON.stringify(recurrence)}`, () => {
      const event = { ...base, date: "2026-01-31", scheduleType: "recurring", recurrence: { frequency, ...recurrence } };
      for (const from of ["2026-02-01", "2026-02-27", "2026-03-08", "2026-10-20", "2027-01-01"]) {
        const result = aggregate([event], [{ $set: { next: occurrenceExpression(from) } }])[0];
        expect(result.next, from).to.equal(nextOccurrence(event, from));
      }
    });
  }
  it("respects recurrence end dates and keeps single events fixed", () => {
    const rows = [base, { ...base, scheduleType: "recurring", recurrence: { frequency: "daily", untilDate: "2026-10-19" } }];
    const results = aggregate(rows, [{ $set: { next: occurrenceExpression("2026-10-20") } }]);
    expect(results[0].next).to.equal(base.date); expect(results[1].next).to.equal(null);
  });
  for (const input of [{ town: "Unknown" }, { category: "Fake" }, { from: "2026-02-30" }, { when: "never" }, { page: "-1" }, { from: "2026-10-22", to: "2026-10-20" }, { town: { $ne: "Banff" } }]) {
    it(`rejects invalid filters: ${JSON.stringify(input)}`, () => expect(() => parsePublicFilters(input, now)).to.throw());
  }
  it("paginates in the database and filters by town, category and real occurrence date", async () => {
    const original = Event.aggregate;
    const rows = Array.from({ length: 30 }, (_, index) => ({ ...base, _id: String(index).padStart(24, "0") }));
    rows.push({ ...base, title: "Hidden", publicationStatus: "draft" }, { ...base, town: "Canmore" });
    try {
      Event.aggregate = (pipeline) => ({ option: async () => aggregate(rows, pipeline) });
      const first = await listPublicEvents({ town: "Banff", category: "Music & Nightlife", from: "2026-10-24", to: "2026-10-24" }, now);
      const second = await listPublicEvents({ town: "Banff", page: "2" }, now);
      expect(first.events).to.have.length(24); expect(first.hasMore).to.equal(true);
      expect(second.events).to.have.length(6); expect(second.hasMore).to.equal(false);
      expect(first.events.every((event) => event.town === "Banff" && event.title !== "Hidden")).to.equal(true);
    } finally { Event.aggregate = original; }
  });
});

describe("server rendered website and links", () => {
  it("renders meaningful content, ordinary links, filters and metadata in initial HTML", () => {
    const $ = cheerio.load(renderListing(listing(), new URL("https://summitscene.ca/events/banff"), env.PUBLIC_SITE_URL));
    expect($("h1").text()).to.contain("Banff");
    expect($(".event-card h2 a").attr("href")).to.equal(eventPath(base));
    expect($(".event-card").text()).to.contain(base.title);
    expect($("form").attr("method")).to.equal("get");
    expect($("link[rel=canonical]").attr("href")).to.equal("https://summitscene.ca/events/banff");
    expect($("meta[property='og:image']").attr("content")).to.match(/^https:/);
  });
  it("does not index filter combinations or expose an event schema on lists", () => {
    const $ = cheerio.load(renderListing(listing(), new URL("https://summitscene.ca/events?when=today"), env.PUBLIC_SITE_URL));
    expect($("meta[name=robots]").attr("content")).to.equal("noindex,follow");
    expect($("script[type='application/ld+json']")).to.have.length(0);
  });
  it("shows empty results and escapes source text without executing HTML", () => {
    const empty = cheerio.load(renderListing(listing([]), new URL("https://summitscene.ca/events"), env.PUBLIC_SITE_URL));
    expect(empty(".empty").text()).to.contain("No events match");
    const html = renderDetail({ ...base, title: '<script>alert("x")</script>', description: '</script><script>alert("x")</script>' }, env.PUBLIC_SITE_URL);
    const $ = cheerio.load(html);
    expect($("h1").text()).to.equal('<script>alert("x")</script>');
    expect($("script:not([src])")).to.have.length(1); // Escaped JSON-LD only.
    expect(JSON.parse($("script[type='application/ld+json']").text()).name).to.equal('<script>alert("x")</script>');
  });
  it("creates eligible schema using visible data and handles cancellation and rescheduling", () => {
    const schema = eventSchema(base, env.PUBLIC_SITE_URL);
    expect(schema.startDate).to.equal("2026-10-24T19:00:00-06:00");
    expect(schema).to.not.have.property("offers");
    expect(eventSchema({ ...base, eventStatus: "cancelled" }, env.PUBLIC_SITE_URL).eventStatus).to.contain("EventCancelled");
    expect(eventSchema({ ...base, eventStatus: "rescheduled", previousStartDate: "2026-10-22" }, env.PUBLIC_SITE_URL).previousStartDate).to.equal("2026-10-22");
    expect(eventSchema({ ...base, eventStatus: "rescheduled" }, env.PUBLIC_SITE_URL)).to.equal(null);
  });
  it("omits schema on promotions, recurring listings, multiple showtimes and incomplete locations", () => {
    for (const changes of [{ listingKind: "promotion" }, { scheduleType: "recurring" }, { address: "" }, { time: "" }, { timeSlots: [{ startTime: "6 PM" }, { startTime: "9 PM" }] }]) {
      expect(eventSchema({ ...base, ...changes }, env.PUBLIC_SITE_URL)).to.equal(null);
    }
  });
  it("opens stable event IDs and town pages without changing existing authentication routes", () => {
    const url = eventUrl(base);
    expect(url).to.equal(`https://summitscene.ca${eventPath(base)}`);
    expect(eventLinkState(eventPath(base)).routes.at(-1).params.eventId).to.equal(base._id);
    expect(eventLinkState("events/banff").routes[0].state.routes[0].params.town).to.equal("Banff");
    expect(eventLinkState("events/not-an-id")).to.equal(undefined);
    expect(appLinkingConfig.config.screens.VerifyEmail).to.equal("verify-email");
    expect(appLinkingConfig.config.screens.ResetPassword).to.equal("reset-password");
  });
  it("does not invent app verification identifiers and validates supplied fingerprints", () => {
    expect(associationFiles({}).apple.applinks.details).to.have.length(0);
    expect(associationFiles({}).android).to.have.length(0);
    expect(() => associationFiles({ APPLE_TEAM_ID: "com.rachellauren.summitscene" })).to.throw();
    const configured = associationFiles({ APPLE_TEAM_ID: "1234567890", ANDROID_SHA256_CERT_FINGERPRINTS: Array(32).fill("AA").join(":") });
    expect(configured.apple.applinks.details[0].appID).to.equal("1234567890.com.rachellauren.summitscene");
    expect(configured.android[0].target.package_name).to.equal("com.rachellauren.summitscene");
  });
});

describe("website event photos and app category illustrations", () => {
  it("renders category images without JavaScript when events have no photo URL", () => {
    const $ = cheerio.load(renderListing(listing(), new URL("https://summitscene.ca/events"), env.PUBLIC_SITE_URL));
    const image = $(".event-card img");
    expect(image.attr("src")).to.equal("/assets/event-categories/music-800.jpg");
    expect(image.attr("srcset")).to.contain("music-320.jpg 320w");
    expect(image.attr("loading")).to.equal("lazy");
    expect(categoryImagePath({ category: "Unknown" })).to.equal("/assets/event-categories/other-800.jpg");
  });
  it("preserves real photos and provides a category fallback when they fail", () => {
    const event = { ...base, imageUrl: "https://venue.example/photo.jpg" };
    const $ = cheerio.load(renderDetail(event, env.PUBLIC_SITE_URL));
    expect($(".detail-image").attr("src")).to.equal(event.imageUrl);
    expect($(".detail-image").attr("data-fallback-src")).to.equal(categoryImagePath(event));
    expect($(".detail-media figcaption").attr("hidden")).to.not.equal(undefined);
    const fallback = cheerio.load(renderDetail(base, env.PUBLIC_SITE_URL));
    expect(fallback(".detail-media figcaption").attr("hidden")).to.equal(undefined);
    expect(fallback(".detail-image").attr("alt")).to.contain("category illustration");
    expect(eventSchema(base, env.PUBLIC_SITE_URL)).to.not.have.property("image");
  });
  it("does not render unsafe image URLs as an image source", () => {
    const $ = cheerio.load(renderDetail({ ...base, imageUrl: "javascript:alert(1)" }, env.PUBLIC_SITE_URL));
    expect($(".detail-image").attr("src")).to.equal(categoryImagePath(base));
  });
  it("includes every optimized image required by the category resolver", () => {
    let total = 0;
    for (const file of CATEGORY_IMAGE_FILES) {
      const path = new URL(`../../landing/${file}`, import.meta.url);
      const data = readFileSync(path);
      expect(data.subarray(0, 2).toString("hex"), file).to.equal("ffd8");
      total += statSync(path).size;
    }
    expect(CATEGORY_IMAGE_FILES).to.have.length(20);
    expect(total).to.be.below(1000000);
  });
  for (const cached of [false, true]) {
    it(`recovers from ${cached ? "cached" : "new"} image failures without a retry loop`, () => {
      const caption = { hidden: true };
      const attributes = { src: "https://venue.example/broken.jpg", "data-fallback-src": categoryImagePath(base), srcset: "old" };
      let listener;
      const image = {
        complete: cached, naturalWidth: 0, alt: base.title, hidden: false,
        getAttribute: (key) => attributes[key], removeAttribute: (key) => { delete attributes[key]; },
        closest: () => ({ querySelector: () => caption }), addEventListener: (_, fn) => { listener = fn; },
        set src(value) { attributes.src = value; }, get src() { return attributes.src; },
      };
      runInNewContext(readFileSync(new URL("../../landing/event-images.js", import.meta.url), "utf8"), { document: { querySelectorAll: () => [image] } });
      if (!cached) listener();
      expect(attributes.src).to.equal(categoryImagePath(base));
      expect(attributes).to.not.have.property("srcset");
      expect(caption.hidden).to.equal(false);
      expect(image.alt).to.equal("Event category illustration");
      listener();
      expect(image.hidden).to.equal(true);
    });
  }
});

describe("website HTTP responses without production data", () => {
  const req = (path, options = {}) => new Request(`https://summitscene.ca${path}`, options);
  it("server-renders direct town navigation and forces the matching town filter", async () => {
    let endpoint;
    const res = await handleEvents(req("/events/banff"), { env, fetcher: async (url) => { endpoint = url; return Response.json(listing()); } });
    expect(res.status).to.equal(200); expect(endpoint).to.contain("town=Banff");
    expect(await res.text()).to.contain(base.title);
  });
  it("redirects old or missing slugs to the current stable-ID URL", async () => {
    const res = await handleEvents(req(`/events/${base._id}/old-title`), { env, fetcher: async () => Response.json({ event: base }) });
    expect(res.status).to.equal(301); expect(res.headers.get("location")).to.equal(eventPath(base));
  });
  it("returns genuine 404s for removed events and malformed paths", async () => {
    const res = await handleEvents(req(`/events/${base._id}`), { env, fetcher: async () => new Response(null, { status: 404 }) });
    expect(res.status).to.equal(404);
    expect((await handleEvents(req("/events/missing"), { env })).status).to.equal(404);
  });
  it("returns an uncached 503 and useful retry link on service failures", async () => {
    const res = await handleEvents(req("/events"), { env, fetcher: async () => { throw new Error("timeout"); } });
    expect(res.status).to.equal(503); expect(res.headers.get("cache-control")).to.equal("no-store");
    expect(await res.text()).to.contain("Try again");
  });
  it("rejects invalid filters with 400 before calling the API", async () => {
    for (const path of ["/events?from=nope", "/events?category=fake", "/events?page=-2"]) {
      const res = await handleEvents(req(path), { env, fetcher: async () => { throw new Error("Should not fetch"); } });
      expect(res.status).to.equal(400);
    }
  });
  it("maintains a bounded sitemap index and canonical event sitemap", async () => {
    const fetcher = async () => Response.json({ events: [base], pages: 1 });
    const index = await handleEvents(req("/sitemap.xml"), { env, fetcher });
    expect(await index.text()).to.contain("/sitemaps/events-1.xml");
    const page = await handleEvents(req("/sitemaps/events-1.xml"), { env, fetcher });
    expect(await page.text()).to.contain(eventPath(base));
    expect(page.headers.get("content-type")).to.contain("application/xml");
  });
  it("returns HEAD without a response body", async () => {
    const res = await handleEvents(req("/events", { method: "HEAD" }), { env, fetcher: async () => Response.json(listing()) });
    expect(res.status).to.equal(200); expect(await res.text()).to.equal("");
  });
  it("keeps public API writes unavailable and validates queries without touching MongoDB", async () => {
    const app = express(); app.use("/api/public/events", router);
    expect((await request(app).post("/api/public/events").send({ title: "No write" })).status).to.equal(405);
    expect((await request(app).get("/api/public/events?town=Unknown")).status).to.equal(400);
  });
});
