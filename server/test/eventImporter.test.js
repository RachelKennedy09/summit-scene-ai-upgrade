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

  it("keeps active date-range events importable when the original start passed", () => {
    const candidate = normalizeExtractedEvent(
      {
        title: "Summer Exhibition",
        description: "An exhibition running through fall.",
        startDate: "2026-05-01T00:00:00-06:00",
        endDate: "2026-11-08T00:00:00-07:00",
      },
      source,
      { now: fixedNow }
    );

    expect(candidate.startDate).to.equal("2026-08-13");
    expect(candidate.endDate).to.equal("2026-11-08");
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

  it("extracts dated calendar links with clean titles and source links", () => {
    const events = extractEvents(
      `
        <a href="/events/that-friday-feeling">
          Friday Aug. 14 6:00pm That Friday Feeling - Rooftop Sessions Learn more
        </a>
      `,
      {
        url: "https://roseandcrown.ca/events/",
        town: "Banff",
      }
    );

    expect(events).to.have.length(1);
    expect(events[0]).to.include({
      title: "That Friday Feeling - Rooftop Sessions",
      dateText: "Aug 14 6:00pm",
      startTime: "6:00pm",
      venue: "Rose & Crown Banff",
      sourceUrl: "https://roseandcrown.ca/events/that-friday-feeling",
    });
  });

  it("extracts happenings links where the date is at the end", () => {
    const events = extractEvents(
      `
        <a href="/happenings/studio-rose-pink-party">Studio Rose Pink Party Sep. 5</a>
      `,
      {
        url: "https://fatoxbanff.ca/happenings/",
        town: "Banff",
      }
    );

    expect(events).to.have.length(1);
    expect(events[0]).to.include({
      title: "Studio Rose Pink Party",
      dateText: "Sep 5",
      venue: "The Fat Ox",
      sourceUrl: "https://fatoxbanff.ca/happenings/studio-rose-pink-party",
    });

    const candidate = normalizeExtractedEvent(events[0], source, { now: fixedNow });
    expect(candidate.startDate).to.equal("2026-09-05");
  });

  it("extracts known recurring specials as recurring import events", () => {
    const events = extractEvents(
      `
        <h5>Daily</h5>
        <p>50% off Select Cocktails $6 Bud and Coors. Mon-Thurs 5-7pm & Fri-Sun 4-6pm</p>
        <h5>Tuesday, Wednesday & Sunday</h5>
        <p>FREE instructed line dancing. TUESDAY 8:30pm for beginners.</p>
        <h5>Friday</h5>
        <p>Live Music from 6:30pm-Late</p>
        <h5>Saturday</h5>
        <p>Live Music from 6:30pm-Late</p>
      `,
      {
        url: "https://www.dustybootbanff.com/live-music-specials",
        town: "Banff",
      }
    );

    const titles = events.map((event) => event.title);
    expect(titles).to.include("Dusty Boot Happy Hour - Monday to Thursday");
    expect(titles).to.include("Free Line Dancing at The Dusty Boot");
    expect(titles).to.include("Friday Live Music at The Dusty Boot");

    const lineDancing = events.find((event) =>
      event.title.includes("Line Dancing")
    );
    expect(lineDancing).to.deep.include({
      scheduleType: "recurring",
      startTime: "8:30 PM",
      sourceUrl: "https://www.dustybootbanff.com/live-music-specials",
    });
    expect(lineDancing.recurrence).to.deep.include({
      frequency: "selected_weekdays",
    });
    expect(lineDancing.recurrence.weekdays).to.deep.equal([
      "Tuesday",
      "Wednesday",
      "Sunday",
    ]);
  });

  it("normalizes recurring extracted events without fixed dates", () => {
    const candidate = normalizeExtractedEvent(
      {
        title: "Friday Live Music",
        description: "Live music every Friday.",
        scheduleType: "recurring",
        recurrence: {
          frequency: "selected_weekdays",
          weekdays: ["Friday"],
        },
        startTime: "6:30 PM",
      },
      source,
      { now: fixedNow }
    );

    expect(candidate).to.include({
      title: "Friday Live Music",
      scheduleType: "recurring",
      startDate: "2026-08-13",
      startTime: "6:30 PM",
    });
    expect(candidate.recurrence).to.deep.include({
      frequency: "selected_weekdays",
    });
    expect(candidate.recurrence.weekdays).to.deep.equal(["Friday"]);
    expect(candidate.confidenceScore).to.be.at.least(90);
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

  it("validates recurring import candidate schedules", async () => {
    const candidate = new ImportCandidate({
      title: "Happy Hour",
      town: "Banff",
      category: "Food & Drink",
      categories: ["Food & Drink"],
      startDate: "2026-08-13",
      startTime: "5:00 PM",
      endTime: "7:00 PM",
      scheduleType: "recurring",
      recurrence: {
        frequency: "selected_weekdays",
        weekdays: ["Monday", "Tuesday", "Wednesday", "Thursday"],
      },
      sourceUrl: "https://example.com/happy-hour",
      sourceName: "Example Import Source",
    });

    await candidate.validate();
    expect(candidate.recurrence.weekdays).to.deep.equal([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
    ]);
  });
});
