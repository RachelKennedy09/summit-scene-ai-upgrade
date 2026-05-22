// server/models/Event.js
// Event model for SummitScene
//  - A single event created by a business user
//  - Used on the Hub, Map, My Events, and Event Detail screens
//
// KEY FEATURES:
//  - Supports category filtering
//  - Uses a string date ("YYYY-MM-DD") to avoid timezone issues
//  - Stores creator reference (business user)
//  - Includes optional fields: time, endTime, venue/address, imageUrl, coordinates

import mongoose from "mongoose";

const timeSlotSchema = new mongoose.Schema(
  {
    startTime: {
      type: String,
      trim: true,
    },
    endTime: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const recurrenceSchema = new mongoose.Schema(
  {
    frequency: {
      type: String,
      enum: ["daily", "weekly", "selected_weekdays"],
    },
    weekdays: {
      type: [String],
      enum: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      default: undefined,
    },
    untilDate: {
      type: String,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be in format YYYY-MM-DD"],
    },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    // -------------------------------------------
    // BASIC EVENT DETAILS
    // -------------------------------------------
    // Short title displayed on event cards
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
    },

    // Longer description shown on Event Detail screen
    description: {
      type: String,
      trim: true,
    },

    // Which mountain town this event belongs to (used for filtering)
    town: {
      type: String,
      required: [true, "Town is required"],
      trim: true,
      enum: ["Banff", "Canmore", "Lake Louise"],
    },

    // Event category used for filtering chips
    category: {
      type: String,
      trim: true,
      enum: [
        "Hiking",
        "Trail Running",
        "Climbing",
        "Bouldering",
        "Skiing",
        "Snowboarding",
        "Cross-Country Skiing",
        "Backcountry",
        "Mountain Biking",
        "Paddleboarding",
        "Kayaking",
        "Canoeing",
        "Camping",
        "Fishing",
        "Wildlife Tours",
        "Photography Walks",
        "Ice Skating",
        "Curling",
        "Snowshoeing",
        "Yoga",
        "Meetups",
        "New in Town",
        "Community Gatherings",
        "Networking",
        "Coffee Meetups",
        "Cultural Events",
        "Volunteer Events",
        "Local Clubs",
        "Student Events",
        "Digital Nomad Meetups",
        "LGBTQ+ Meetups",
        "Pride Events",
        "Queer Community",
        "Trans & Non-Binary Inclusive",
        "Allyship",
        "Inclusive Outdoors",
        "Brunch",
        "Coffee",
        "Breweries",
        "Wine Tastings",
        "Cocktail Nights",
        "Food Trucks",
        "Farmers Markets",
        "Pop-Up Dinners",
        "Restaurant Specials",
        "Cooking Classes",
        "Live Music",
        "DJs",
        "Open Mic",
        "Karaoke",
        "Dance Nights",
        "Festivals",
        "Concerts",
        "Pub Nights",
        "After Parties",
        "Comedy",
        "Meditation",
        "Breathwork",
        "Sauna & Cold Plunges",
        "Wellness Retreats",
        "Sound Baths",
        "Fitness Classes",
        "Run Clubs",
        "Gym Events",
        "Mental Wellness",
        "Recovery Sessions",
        "Art Shows",
        "Pottery",
        "Painting Nights",
        "Photography",
        "Writing Groups",
        "Creative Workshops",
        "Film Screenings",
        "Craft Markets",
        "Makers Markets",
        "Business Workshops",
        "Coding Meetups",
        "AI & Tech",
        "Finance",
        "Career Events",
        "Public Speaking",
        "Skill Sharing",
        "Language Exchange",
        "Holiday Events",
        "Canada Day",
        "Christmas Markets",
        "Summer Kickoff",
        "Ski Season Launch",
        "Stampede Events",
        "Local Tours",
        "Visitor Experiences",
        "Family Friendly",
        "Kids Activities",
        "Dog Friendly",
        "Pet Meetups",
        "Adoption Events",
        "Other",
      ],
      default: "Other",
    },

    // -------------------------------------------
    // DATE & TIME
    // -------------------------------------------
    // Event date stored as a string to avoid timezone shifting.
    // Ex: "2025-12-06"
    date: {
      type: String,
      required: [true, "Event date is required"],
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be in format YYYY-MM-DD"],
    },

    // Optional start time (e.g., "7:00 PM")
    time: {
      type: String,
      trim: true,
    },

    // Optional end time (e.g., "9:00 PM")
    endTime: {
      type: String,
      trim: true,
    },

    scheduleType: {
      type: String,
      enum: ["single", "recurring"],
      default: "single",
    },

    isAllDay: {
      type: Boolean,
      default: false,
    },

    recurrence: recurrenceSchema,

    timeSlots: {
      type: [timeSlotSchema],
      default: undefined,
    },

    // -------------------------------------------
    // LOCATION & IMAGES
    // -------------------------------------------
    // Venue or meeting place (used in card + detail view)
    locationName: {
      type: String,
      trim: true,
    },

    // Full address used for exact map placement and external maps links
    address: {
      type: String,
      trim: true,
    },

    // Legacy display field kept for backward compatibility with older clients
    location: {
      type: String,
      trim: true,
    },

    latitude: {
      type: Number,
      min: -90,
      max: 90,
    },

    longitude: {
      type: Number,
      min: -180,
      max: 180,
    },

    // Optional image poster for event card / detail hero
    imageUrl: {
      type: String,
      trim: true,
    },

    // -------------------------------------------
    // CREATOR INFO
    // -------------------------------------------
    // Business user who created this event
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    attendees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    // Automatically add createdAt / updatedAt timestamps
    timestamps: true,

    // Include virtuals when converting to JSON / plain objects
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

eventSchema.pre("validate", function normalizeLegacyCategories(next) {
  const legacyCategoryMap = {
    "Food & Drink": "Restaurant Specials",
    Market: "Farmers Markets",
    Markets: "Farmers Markets",
    Outdoors: "Hiking",
    "Outdoor Adventure": "Hiking",
    "Ski Hill Events": "Skiing",
    "Disc Golf": "Hiking",
    "DJ/Dance": "DJs",
    Nightlife: "Pub Nights",
    Workshop: "Creative Workshops",
    Classes: "Creative Workshops",
    Family: "Meetups",
    Kids: "Meetups",
    Retail: "Makers Markets",
    "Happy Hour": "Restaurant Specials",
    Specials: "Restaurant Specials",
    Vendors: "Makers Markets",
    Fundraiser: "Volunteer Events",
    Festival: "Festivals",
    Parade: "Festivals",
    "Seasonal/Holiday Special": "Festivals",
    "Sports/Watch Party": "Pub Nights",
    "Community Info Session": "Community Gatherings",
    Art: "Art Shows",
    Cultural: "Cultural Events",
    Theatre: "Concerts",
    Film: "Film Screenings",
    Dance: "Dance Nights",
    "Museum/Heritage": "Cultural Events",
    "Book Club": "Local Clubs",
    Wellness: "Wellness Retreats",
    "Yoga/Fitness": "Yoga",
    "Outdoor Yoga": "Yoga",
  };

  if (legacyCategoryMap[this.category]) {
    this.category = legacyCategoryMap[this.category];
  }

  next();
});

// -------------------------------------------
// VIRTUALS
// -------------------------------------------
// Quick string used for debugging logs.
// Example: "Open Mic Night (Banff) on 2025-12-10"
eventSchema.virtual("summary").get(function () {
  return `${this.title} (${this.town}) on ${this.date}`;
});

// -------------------------------------------
// MODEL EXPORT
// -------------------------------------------
// Creates/uses the "events" collection in MongoDB.
const Event = mongoose.model("Event", eventSchema);

export default Event;
