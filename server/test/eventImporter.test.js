import { expect } from "chai";
import ImportCandidate from "../models/ImportCandidate.js";
import { parseEventDate, parseEventTime } from "../services/eventImporter/dateParsing.js";
import { findDuplicateEvent, normalizeTitle } from "../services/eventImporter/detectDuplicate.js";
import { extractEvents } from "../services/eventImporter/extractEvents.js";
import { normalizeExtractedEvent } from "../services/eventImporter/normalizeEvent.js";

describe("event importer helpers", () => {
  const fixedNow = new Date(2026, 7, 13);
  const source = {
    _id: "507f1f77bcf86cd799439011",
    name: "Banff Test Calendar",
    url: "https://example.com/events",
    town: "Banff",
  };

  it("parses ISO and month-name event dates", () => {
    expect(parseEventDate("2026-09-15T19:00:00-06:00", { now: fixedNow })).to.equal("2026-09-15");
    expect(parseEventDate("September 20, 2026 at 7 PM", { now: fixedNow })).to.equal("2026-09-20");
    expect(parseEventDate("August 1 at 7 PM", { now: fixedNow })).to.equal("2027-08-01");
  });

  it("parses simple event times", () => {
    expect(parseEventTime("Doors at 7:30 pm")).to.equal("7:30 PM");
    expect(parseEventTime("Starts 9am")).to.equal("9:00 AM");
  });

  it("normalizes extracted event data into Summit Scene fields", () => {
    const candidate = normalizeExtractedEvent(
      {
        title: "Live Music at the Lodge",
        description: "A Canmore concert with local artists.",
        dateText: "September 20, 2026 at 7 PM",
        venue: "The Lodge",
        ticketUrl: "https://example.com/tickets",
      },
      source,
      { now: fixedNow }
    );

    expect(candidate).to.include({
      title: "Live Music at the Lodge",
      town: "Canmore",
      category: "Music & Nightlife",
      startDate: "2026-09-20",
      startTime: "7:00 PM",
      venue: "The Lodge",
      sourceName: "Banff Test Calendar",
    });
    expect(candidate.confidenceScore).to.be.at.least(90);
  });

  it("extracts full Banff Centre event cards without date-only titles", () => {
    const events = extractEvents(
      `
        <div class="event-card">
          <span>Date: Thu, Aug 13 2026 @ 7:30 PM</span>
        </div>
        <article class="event-card">
          <span>Date: Thu, Aug 13 2026 @ 7:30 PM Rolston Recital Hall</span>
          <h3>Jazz & Sonic Arts Concert 2</h3>
          <p>Simon Barker and Melissa Aldana unite live for one adventurous night.</p>
          <a href="/events/jazz-sonic-arts-concert-2">View Event $45.00</a>
        </article>
      `,
      source
    );

    expect(events).to.have.length(1);
    expect(events[0]).to.include({
      title: "Jazz & Sonic Arts Concert 2",
      venue: "Rolston Recital Hall",
    });
  });

  it("detects likely duplicate existing events", () => {
    const duplicate = findDuplicateEvent(
      {
        title: "Live Music at the Lodge!",
        town: "Canmore",
        startDate: "2026-09-20",
        venue: "The Lodge",
      },
      [
        {
          _id: "507f1f77bcf86cd799439012",
          title: "Live Music at the Lodge",
          town: "Canmore",
          date: "2026-09-20",
          locationName: "The Lodge",
        },
      ]
    );

    expect(normalizeTitle(" Live Music: at the Lodge! ")).to.equal("live music at the lodge");
    expect(duplicate?.reason).to.match(/similar title|same venue/);
  });

  it("validates required import candidate fields with existing enums", async () => {
    const candidate = new ImportCandidate({
      title: "Community Market",
      town: "Banff",
      category: "Food & Drink",
      startDate: "2026-09-20",
      sourceUrl: "https://example.com/market",
      sourceName: "Example Market",
    });

    await candidate.validate();
    expect(candidate.categories).to.deep.equal(["Food & Drink"]);
  });
});
