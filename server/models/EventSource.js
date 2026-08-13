import mongoose from "mongoose";

const EVENT_SOURCE_TOWNS = ["Banff", "Canmore", "Lake Louise"];
const EVENT_SOURCE_TYPES = ["html", "json-ld", "rss", "custom"];

const eventSourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Source name is required"],
      trim: true,
    },
    url: {
      type: String,
      required: [true, "Source URL is required"],
      trim: true,
    },
    town: {
      type: String,
      required: [true, "Town is required"],
      enum: EVENT_SOURCE_TOWNS,
      trim: true,
    },
    sourceType: {
      type: String,
      enum: EVENT_SOURCE_TYPES,
      default: "html",
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    trusted: {
      type: Boolean,
      default: false,
    },
    lastCheckedAt: Date,
    lastSuccessfulCheckAt: Date,
    consecutiveFailures: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

eventSourceSchema.index({ url: 1 }, { unique: true });
eventSourceSchema.index({ enabled: 1, town: 1 });

const EventSource = mongoose.model("EventSource", eventSourceSchema);

export default EventSource;
export { EVENT_SOURCE_TOWNS, EVENT_SOURCE_TYPES };
