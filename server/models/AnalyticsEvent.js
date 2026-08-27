import mongoose from "mongoose";

const { Schema } = mongoose;

export const ANALYTICS_EVENT_TYPES = [
  "event_impression",
  "event_view",
  "business_view",
  "website_click",
  "event_save",
  "event_going",
  "event_share",
];

const analyticsEventSchema = new Schema(
  {
    type: {
      type: String,
      enum: ANALYTICS_EVENT_TYPES,
      required: true,
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      default: null,
      index: true,
    },
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    town: {
      type: String,
      trim: true,
      default: null,
    },
    category: {
      type: String,
      trim: true,
      default: null,
    },
    attributionType: {
      type: String,
      enum: ["business", "source", "venue", "unknown"],
      default: "unknown",
      index: true,
    },
    attributionName: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    attributionKey: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      index: true,
    },
    sourceName: {
      type: String,
      trim: true,
      default: null,
    },
    sourceUrl: {
      type: String,
      trim: true,
      default: null,
    },
    sessionId: {
      type: String,
      trim: true,
      maxlength: 120,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // Used only for deliberate duplicate protection such as impression/day.
    dedupeKey: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

analyticsEventSchema.index({ businessId: 1, type: 1, createdAt: -1 });
analyticsEventSchema.index({ attributionKey: 1, type: 1, createdAt: -1 });
analyticsEventSchema.index({ eventId: 1, type: 1, createdAt: -1 });
analyticsEventSchema.index({ type: 1, createdAt: -1 });
analyticsEventSchema.index(
  { dedupeKey: 1 },
  {
    unique: true,
    partialFilterExpression: { dedupeKey: { $type: "string" } },
  }
);

const AnalyticsEvent = mongoose.model("AnalyticsEvent", analyticsEventSchema);

export default AnalyticsEvent;
