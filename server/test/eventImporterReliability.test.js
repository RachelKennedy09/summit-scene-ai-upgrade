import { expect } from "chai";
import * as cheerio from "cheerio";
import ImportCandidate from "../models/ImportCandidate.js";
import { readStructuredEvents } from "../services/eventImporter/structuredEvents.js";
import { coalesceExtractedEvents, enrichExtractedEvents } from "../services/eventImporter/enrichEvents.js";
import { parseEventTime, parseEventTimeRange } from "../services/eventImporter/dateParsing.js";
import { findDuplicateEvent } from "../services/eventImporter/detectDuplicate.js";
import { normalizeExtractedEvent } from "../services/eventImporter/normalizeEvent.js";
import { buildSourceKey, recordSeenSourceCandidate } from "../services/eventImporter/sourceSync.js";

const source = { _id: "507f1f77bcf86cd799439011", url: "https://example.com/events", town: "Banff" };
const options = { now: new Date(2026, 9, 19) };
const event = { title: "Literary Cabaret", startDate: "2026-12-20", startTime: "8 PM", town: "Banff", sourceUrl: "https://example.com/events/cabaret" };
const html = (value) => `<script type="application/ld+json">${JSON.stringify(value)}</script>`;

describe("importer details and occurrence matching", () => {
  it("reads nested JSON-LD, referenced places, postal addresses, ISO times and free offers", () => {
    const events = readStructuredEvents(cheerio.load(html({ "@graph": [
      { "@id": "hall", "@type": "Place", name: "Local Hall", address: { streetAddress: "123 Main St", addressLocality: "Banff" } },
      { "@type": "ItemList", itemListElement: [{ item: { "@type": ["Event", "MusicEvent"], name: event.title,
        startDate: "2026-12-20T20:00:00-07:00", endDate: "2026-12-20T22:30:00-07:00", location: { "@id": "hall" }, offers: [{ price: 0 }], url: event.sourceUrl } }] },
    ] })), source.url);
    expect(events).to.have.length(1);
    expect(events[0]).to.include({ venue: "Local Hall", address: "123 Main St, Banff", startTime: "8:00 PM", endTime: "10:30 PM", price: "Free" });
  });

  it("converts UTC timestamps to mountain local time", () => {
    expect(parseEventTime("2026-12-21T03:00:00Z")).to.equal("8:00 PM");
  });
  it("reads 24-hour clocks and shared-meridiem ranges", () => {
    expect(parseEventTime("20:00")).to.equal("8:00 PM");
    expect(parseEventTimeRange("7–9 pm")).to.deep.equal({ startTime: "7:00 PM", endTime: "9:00 PM" });
    expect(parseEventTimeRange("11-1 PM")).to.deep.equal({ startTime: "11:00 AM", endTime: "1:00 PM" });
    expect(parseEventTimeRange("9 AM to 5 PM")).to.deep.equal({ startTime: "9:00 AM", endTime: "5:00 PM" });
    expect(parseEventTime("8:99 PM")).to.equal(undefined);
  });
  it("matches tracking links and equivalent time formats", () => {
    expect(findDuplicateEvent(event, [{ ...event, startTime: "20:00", sourceUrl: event.sourceUrl + "?utm_source=calendar#tickets" }])).to.not.equal(null);
  });
  it("keeps different dates and different showtimes even on the same URL", () => {
    expect(findDuplicateEvent(event, [{ ...event, startDate: "2026-12-21" }])).to.equal(null);
    expect(findDuplicateEvent(event, [{ ...event, startTime: "6 PM" }])).to.equal(null);
    expect(buildSourceKey(event, source)).to.not.equal(buildSourceKey({ ...event, startTime: "6 PM" }, source));
  });
  it("does not merge generic live music at different venues", () => {
    expect(findDuplicateEvent({ ...event, title: "Live Music", venue: "Hall A" }, [{ ...event, title: "Live Music", venue: "Hall B" }])).to.equal(null);
  });
  it("combines summary and structured copies without losing their fields", () => {
    const merged = coalesceExtractedEvents([{ ...event, venue: "Hall", extractionMethod: "json-ld" }, { ...event, venue: "", address: "123 Main", extractionMethod: "generic-html" }], source, options);
    expect(merged).to.have.length(1);
    expect(merged[0]).to.include({ venue: "Hall", address: "123 Main" });
  });
  it("reads detail pages once per URL and fills factual venue and time fields", async () => {
    let calls = 0;
    const result = await enrichExtractedEvents([{ ...event, startTime: "" }, { ...event, startTime: "" }], source, {
      ...options, fetchDetailPage: async () => { calls++; return { html: html({ "@type": "Event", name: event.title,
        startDate: "2026-12-20T20:00:00-07:00", location: { name: "Local Hall" }, url: event.sourceUrl }) }; },
    });
    expect(calls).to.equal(1);
    expect(result).to.have.length(1);
    expect(result[0]).to.include({ venue: "Local Hall", startTime: "8:00 PM" });
  });
  it("retains summaries when details fail and respects fetch budgets and external links", async () => {
    let calls = 0;
    const events = [event, { ...event, title: "Another", sourceUrl: "https://example.com/another" }, { ...event, title: "External", sourceUrl: "https://external.example/event" }];
    const result = await enrichExtractedEvents(events, source, { ...options, maxDetailPagesPerSource: 1,
      fetchDetailPage: async () => { calls++; throw new Error("timeout"); } });
    expect(calls).to.equal(1);
    expect(result).to.have.length(3);
    expect(result[0].title).to.equal(event.title);
  });
  it("flags missing venue/time and caps bulk-approval confidence", () => {
    const candidate = normalizeExtractedEvent({ ...event, startTime: "" }, source, options);
    expect(candidate.needsReview).to.equal(true);
    expect(candidate.reviewReason).to.contain("venue and start time");
    expect(candidate.confidenceScore).to.be.below(90);
    const complete = normalizeExtractedEvent({ ...event, venue: "Local Hall" }, source, options);
    expect(complete.needsReview).to.not.equal(true);
  });
  it("preserves known venue/time when a later response omits them", async () => {
    const old = ImportCandidate.findOne;
    try {
      ImportCandidate.findOne = async () => ({ venue: "Local Hall", startTime: "8:00 PM", address: "123 Main" });
      const incomplete = { ...event, venue: "", startTime: "" };
      const sync = await recordSeenSourceCandidate(incomplete, source);
      expect(incomplete).to.include({ venue: "Local Hall", startTime: "8:00 PM", address: "123 Main" });
      expect(sync.sourceSnapshot.venue).to.equal("Local Hall");
    } finally { ImportCandidate.findOne = old; }
  });
});
