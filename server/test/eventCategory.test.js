import { expect } from "chai";
import Event from "../models/Event.js";
import { getEventCategory } from "../../utils/eventCategory.js";

describe("single event category", () => {
  it("uses the primary category for existing events with multiple categories", () => {
    expect(getEventCategory({ category: "Wellness", categories: ["Wellness", "Learning"] }))
      .to.equal("Wellness");
    expect(getEventCategory({ categories: ["Food & Drink", "Learning"] }))
      .to.equal("Food & Drink");
  });

  it("maps legacy event categories to their main category", () => {
    expect(getEventCategory({ category: "Live Music" })).to.equal("Music & Nightlife");
    expect(getEventCategory()).to.equal("");
  });

  it("saves one category and clears obsolete event tags", async () => {
    const event = new Event({
      title: "Community concert",
      town: "Banff",
      category: "Music & Nightlife",
      categories: ["Music & Nightlife", "Learning"],
      categoryTags: ["Live Music"],
      vibeTags: ["Sober-friendly"],
      date: "2099-12-29",
      createdBy: "507f1f77bcf86cd799439011",
    });
    await event.validate();
    expect(event.category).to.equal("Music & Nightlife");
    expect(event.categories).to.deep.equal(["Music & Nightlife"]);
    expect(event.categoryTags).to.deep.equal([]);
    expect(event.vibeTags).to.deep.equal([]);
  });
});
