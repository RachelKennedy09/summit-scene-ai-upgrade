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

  it("extracts Banff Lake Louise Next.js event cards", () => {
    const events = extractEvents(
      `
        <script id="__NEXT_DATA__" type="application/json">
          {
            "props": {
              "pageProps": {
                "data": {
                  "content": [
                    {
                      "lists": [
                        {
                          "initialItems": [
                            {
                              "type": "event",
                              "title": "Sunset Festival",
                              "cardSummary": "Live music at the summit nightly this summer.",
                              "tag": "Events & Festivals",
                              "dateInfo": "Jun 19 - Sep 7, 2026",
                              "slug": "sunset-festival",
                              "dates": [
                                {
                                  "start": "2026-06-19T18:00:00-06:00",
                                  "end": "2026-09-07T21:30:00-06:00"
                                }
                              ],
                              "bynderImage": {
                                "previewUrl": "https://example.com/sunset.jpg"
                              }
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              }
            }
          }
        </script>
      `,
      { url: "https://www.banfflakelouise.com/events" }
    );

    expect(events).to.have.length(1);
    expect(events[0]).to.include({
      title: "Sunset Festival",
      startTime: "6:00 PM",
      endTime: "9:30 PM",
      sourceUrl: "https://www.banfflakelouise.com/events/sunset-festival",
    });
  });

  it("uses embedded Next.js event data instead of generic page fragments", () => {
    const events = extractEvents(
      `
        <script id="__NEXT_DATA__" type="application/json">
          {
            "props": {
              "pageProps": {
                "data": {
                  "content": [
                    {
                      "lists": [
                        {
                          "initialItems": [
                            {
                              "type": "event",
                              "title": "Winter Festival",
                              "slug": " winter-festival ",
                              "dates": [{"start": "2026-12-01T10:00:00-07:00"}]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              }
            }
          }
        </script>
        <div class="event-fragment">Date: Tue, Dec 1 2026 @ 10:00 AM</div>
      `,
      { url: "https://www.banfflakelouise.com/events" }
    );

    expect(events.map((event) => event.title)).to.deep.equal(["Winter Festival"]);
    expect(events[0].sourceUrl).to.equal(
      "https://www.banfflakelouise.com/events/winter-festival"
    );
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

  it("detects cross-source duplicates with same date, town and time", () => {
    const duplicate = findDuplicateEvent(
      {
        title: "SHY FRiEND",
        town: "Banff",
        startDate: "2026-08-14",
        startTime: "8:00 PM",
      },
      [
        {
          title: "Live at CLVB '33: SHY FRiEND",
          town: "Banff",
          date: "2026-08-14",
          time: "8:00 PM",
        },
      ]
    );

    expect(duplicate?.reason).to.equal(
      "same date, town and time with similar title"
    );
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
