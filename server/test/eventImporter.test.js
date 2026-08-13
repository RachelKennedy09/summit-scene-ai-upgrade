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
    expect(candidate.description).to.equal(
      "Live Music at the Lodge is listed for 2026-09-20, 7:00 PM at The Lodge in Canmore. Details are attributed to Banff Test Calendar; view the organizer website for the latest information."
    );
    expect(candidate.imageUrl).to.equal(undefined);
    expect(candidate.rawExtractedData).to.not.have.property("description");
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

  it("extracts Ski Louise listing cards with exact detail links", () => {
    const events = extractEvents(
      `
        <article class="event-card">
          <h3>Parkway to Pint</h3>
          <p>It is the ultimate outdoor summer activity to do with your family or friends.</p>
          <span>Aug 1 - Sep 1 2026</span>
          <a href="/things-to-do/parkway-to-pint26/">More Details</a>
        </article>
        <article class="event-card">
          <h3>Banded Peak Acoustic Afternoons are back!</h3>
          <p>Enjoy specials on draft beer and live music from 2pm-5pm.</p>
          <span>Aug 15 2026</span>
          <a href="/things-to-do/banded-peak-acoustic-afternoons-are-back/">More Details</a>
        </article>
      `,
      {
        url: "https://www.skilouise.com/things-to-do/category/events/",
        town: "Lake Louise",
      }
    );

    expect(events).to.have.length(2);
    expect(events[0]).to.include({
      title: "Parkway to Pint",
      dateText: "Aug 1 - Sep 1 2026",
      startDate: "Aug 1 2026",
      endDate: "Sep 1 2026",
      venue: "Lake Louise Ski Resort",
      sourceUrl: "https://www.skilouise.com/things-to-do/parkway-to-pint26/",
    });
    expect(events[1]).to.include({
      title: "Banded Peak Acoustic Afternoons are back!",
      dateText: "Aug 15 2026",
      category: "Music & Nightlife",
      sourceUrl:
        "https://www.skilouise.com/things-to-do/banded-peak-acoustic-afternoons-are-back/",
    });
  });

  it("extracts Chateau Lake Louise recurring calendar cards", () => {
    const events = extractEvents(
      `
        <article class="calendar-event">
          <div>Resort Activities</div>
          <div>Family-Friendly</div>
          <div>DAILY</div>
          <h2>Resort Activities Hub</h2>
          <p>Gather, play, and unwind with daily resort activities.</p>
          <div>Victoria Ballroom</div>
          <div>DAILY</div>
          <div>9:00AM</div>
          <a href="#">View Details</a>
        </article>
        <article class="calendar-event">
          <div>Fitness and Wellness</div>
          <div>WEEKLY</div>
          <h2>Silent Meditation Walk</h2>
          <p>Begin your day with a sunrise Silent Meditation Walk.</p>
          <div>Louise</div>
          <div>WEEKLY</div>
          <div>7:00AM</div>
          <a href="#">View Details</a>
        </article>
      `,
      {
        url: "https://www.chateau-lake-louise.com/experience/events-calendar/",
        town: "Lake Louise",
      }
    );

    expect(events).to.have.length(2);
    expect(events[0]).to.deep.include({
      title: "Resort Activities Hub",
      scheduleType: "recurring",
      startTime: "9:00AM",
      venue: "Fairmont Chateau Lake Louise - Victoria Ballroom",
      category: "Family & Pets",
      sourceUrl: "https://www.chateau-lake-louise.com/experience/events-calendar/",
    });
    expect(events[0].recurrence).to.deep.include({ frequency: "daily" });
    expect(events[1]).to.deep.include({
      title: "Silent Meditation Walk",
      scheduleType: "recurring",
      startTime: "7:00AM",
      venue: "Fairmont Chateau Lake Louise - Louise",
      category: "Wellness",
    });
    expect(events[1].recurrence).to.deep.include({ frequency: "weekly" });
  });

  it("extracts SkiBig3 dated cards with exact links", () => {
    const events = extractEvents(
      `
        <article class="event-card">
          <img src="/images/slush-cup.jpg" />
          <time>Sat, 25 Apr 2026</time>
          <h3>Mt. Slushmore at Lake Louise</h3>
          <p>Lake Louise's season send-off with costumes, spring laps, and big mountain energy.</p>
          <a href="/events/mt-slushmore/">Learn more</a>
        </article>
        <article class="event-card">
          <time>Apr 25 - Apr 26 2026</time>
          <h3>Spring Ski Festival</h3>
          <p>Two days of music and spring skiing across Banff and Lake Louise.</p>
          <a href="/events/spring-ski-festival/">View details</a>
        </article>
      `,
      {
        url: "https://www.skibig3.com/events/?page=1",
        town: "Banff",
      }
    );

    expect(events).to.have.length(2);
    expect(events[0]).to.include({
      title: "Mt. Slushmore at Lake Louise",
      dateText: "Sat, 25 Apr 2026",
      venue: "SkiBig3",
      category: "Outdoors & Sports",
      sourceUrl: "https://www.skibig3.com/events/mt-slushmore/",
    });
    expect(events[1]).to.include({
      title: "Spring Ski Festival",
      dateText: "Apr 25 - Apr 26 2026",
      startDate: "Apr 25 2026",
      endDate: "Apr 26 2026",
      category: "Music & Nightlife",
      sourceUrl: "https://www.skibig3.com/events/spring-ski-festival/",
    });
  });

  it("extracts Explore Canmore event listings and visit links", () => {
    const events = extractEvents(
      `
        <article class="event-listing">
          <a href="/events/canmore-mountain-market/">Canmore Mountain Market</a>
          <div>Aug 13</div>
          <a href="https://www.google.com/maps/place/700+Railway+Ave">700 Railway Ave #100 Canmore, Alberta, T1W 1N9</a>
          <a href="/events/canmore-mountain-market/">More details</a>
          <a href="https://canmore.ca/events/mountain-market">Visit Website</a>
        </article>
        <article class="event-listing">
          <a href="/events/free-range-country/">Free Range Country</a>
          <div>Aug 20 - Sep 6</div>
          <a href="https://www.google.com/maps/place/705+8+St">705 8 St Canmore, Alberta, T1W 2B6</a>
          <a href="/events/free-range-country/">More details</a>
          <a href="https://www.carter-ryan.com/free-range-country">Visit Website</a>
        </article>
        <article class="event-listing">
          <a href="/events/nadgt/">2026 NADGT Canada Exclusive in Canmore</a>
          <div>Aug 15</div>
          <a href="https://www.google.com/maps/place/1988+Olympic+Way">1988 Olympic Way Canmore, Alberta, T1W 2T6</a>
          <a href="/events/nadgt/">More details</a>
          <a href="https://example.com/nadgt">Visit Website</a>
        </article>
        <article class="story-card">
          <a href="/stories/things-to-do-this-summer/">Things to do in Kananaskis this Summer</a>
          <p>Featured Stories</p>
          <a href="/stories/things-to-do-this-summer/">More Details</a>
        </article>
      `,
      {
        url: "https://www.explorecanmore.ca/events/",
        town: "Canmore",
      }
    );

    expect(events).to.have.length(3);
    expect(events[0]).to.include({
      title: "Canmore Mountain Market",
      dateText: "Aug 13",
      startDate: "Aug 13",
      town: "Canmore",
      address: "700 Railway Ave #100 Canmore, Alberta, T1W 1N9",
      category: "Food & Drink",
      sourceUrl: "https://www.explorecanmore.ca/events/canmore-mountain-market/",
      ticketUrl: "https://canmore.ca/events/mountain-market",
    });
    expect(events[1]).to.include({
      title: "Free Range Country",
      dateText: "Aug 20 - Sep 6",
      startDate: "Aug 20",
      endDate: "Sep 6",
      category: "Music & Nightlife",
      sourceUrl: "https://www.explorecanmore.ca/events/free-range-country/",
    });
    expect(events[2]).to.include({
      title: "2026 NADGT Canada Exclusive in Canmore",
      dateText: "Aug 15",
      startDate: "Aug 15",
      sourceUrl: "https://www.explorecanmore.ca/events/nadgt/",
    });
  });

  it("keeps active no-year date ranges importable", () => {
    const candidate = normalizeExtractedEvent(
      {
        title: "The Cheezie Musical",
        description: "A Canmore theatre run.",
        startDate: "Jun 26",
        endDate: "Aug 16",
        venue: "artsPlace",
      },
      {
        ...source,
        town: "Canmore",
      },
      { now: fixedNow }
    );

    expect(candidate).to.include({
      title: "The Cheezie Musical",
      town: "Canmore",
      startDate: "2026-08-13",
      endDate: "2026-08-16",
    });
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

  it("does not mark different recurring items from one listing page as duplicates", () => {
    const duplicate = findDuplicateEvent(
      {
        title: "Dusty Boot Happy Hour - Monday to Thursday",
        town: "Banff",
        startDate: "2026-08-13",
        startTime: "5:00 PM",
        endTime: "7:00 PM",
        venue: "The Dusty Boot Banff",
        scheduleType: "recurring",
        recurrence: {
          frequency: "selected_weekdays",
          weekdays: ["Monday", "Tuesday", "Wednesday", "Thursday"],
        },
        sourceUrl: "https://www.dustybootbanff.com/live-music-specials",
      },
      [
        {
          _id: "507f1f77bcf86cd799439013",
          title: "Dusty Boot Happy Hour - Friday to Sunday",
          town: "Banff",
          date: "2026-08-13",
          time: "4:00 PM",
          endTime: "6:00 PM",
          locationName: "The Dusty Boot Banff",
          scheduleType: "recurring",
          recurrence: {
            frequency: "selected_weekdays",
            weekdays: ["Friday", "Saturday", "Sunday"],
          },
          sourceUrl: "https://www.dustybootbanff.com/live-music-specials",
        },
      ]
    );

    expect(duplicate).to.equal(null);
  });

  it("still marks the same item from the same source link as a duplicate", () => {
    const duplicate = findDuplicateEvent(
      {
        title: "Dusty Boot Happy Hour - Monday to Thursday",
        town: "Banff",
        startDate: "2026-08-13",
        sourceUrl: "https://www.dustybootbanff.com/live-music-specials",
      },
      [
        {
          _id: "507f1f77bcf86cd799439014",
          title: "Dusty Boot Happy Hour - Monday to Thursday",
          town: "Banff",
          date: "2026-08-13",
          sourceUrl: "https://www.dustybootbanff.com/live-music-specials",
        },
      ]
    );

    expect(duplicate?.reason).to.equal("same source URL and similar title");
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
