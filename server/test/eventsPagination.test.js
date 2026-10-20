import { expect } from "chai";
import { fetchEvents } from "../../services/eventsApi.js";

describe("app event pagination", () => {
  let originalFetch;
  beforeEach(() => { originalFetch = globalThis.fetch; });
  afterEach(() => { globalThis.fetch = originalFetch; });

  const event = (id, category = "Music & Nightlife") => ({
    _id: id, title: id, category, date: "2026-10-23", time: "7:00 PM",
  });
  function respond(body, status = 200) {
    return { ok: status === 200, status, text: async () => JSON.stringify(body) };
  }

  it("keeps later pages available after filtering the first page", async () => {
    const requestedPages = [];
    globalThis.fetch = async (url) => {
      const page = Number(new URL(url).searchParams.get("page"));
      requestedPages.push(page);
      return respond({ events: [event(`page-${page}`)], page, limit: 20,
        totalCount: 94, totalPages: 5, hasMore: page < 5 });
    };
    const first = await fetchEvents({ page: 1, limit: 20, listingType: "events", forceRefresh: true });
    expect(first).to.include({ totalCount: 94, totalPages: 5, hasMore: true });
    const next = await fetchEvents({ page: first.page + 1, limit: 20, listingType: "events", forceRefresh: true });
    expect(next.events[0]._id).to.equal("page-2");
    expect(requestedPages).to.deep.equal([1, 2]);
  });

  it("keeps pagination when every event on a page is filtered out", async () => {
    globalThis.fetch = async () => respond({ events: [event("tour", "Canoe Tours")],
      page: 1, totalCount: 40, totalPages: 2, hasMore: true });
    const result = await fetchEvents({ page: 1, limit: 20, listingType: "events", forceRefresh: true });
    expect(result.events).to.deep.equal([]);
    expect(result).to.include({ totalCount: 40, totalPages: 2, hasMore: true });
  });

  it("stops at the server's final page", async () => {
    globalThis.fetch = async () => respond({ events: [event("last")],
      page: 5, totalCount: 94, totalPages: 5, hasMore: false });
    const result = await fetchEvents({ page: 5, limit: 20, listingType: "events", forceRefresh: true });
    expect(result).to.include({ page: 5, totalCount: 94, totalPages: 5, hasMore: false });
  });

  it("preserves pagination when an older server needs local listing filtering", async () => {
    globalThis.fetch = async (url) => new URL(url).searchParams.get("listingType") === "events"
      ? respond({ message: "Invalid listing type." }, 400)
      : respond({ events: [event("music"), event("tour", "Canoe Tours")],
          page: 1, totalCount: 40, totalPages: 2, hasMore: true });
    const result = await fetchEvents({ page: 1, limit: 20, listingType: "events", forceRefresh: true });
    expect(result.events.map((item) => item._id)).to.deep.equal(["music"]);
    expect(result).to.include({ totalCount: 40, totalPages: 2, hasMore: true });
  });
});
