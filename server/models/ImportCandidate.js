import mongoose from "mongoose";
import { EVENT_CATEGORY_VALUES } from "../../constants/eventCategories.js";

const IMPORT_CANDIDATE_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "duplicate",
  "error",
];
const IMPORT_CANDIDATE_TOWNS = ["Banff", "Canmore", "Lake Louise"];

const importCandidateSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Candidate title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    town: {
      type: String,
      required: [true, "Town is required"],
      enum: IMPORT_CANDIDATE_TOWNS,
      trim: true,
    },
    category: {
      type: String,
      enum: EVENT_CATEGORY_VALUES,
      default: "Other",
      trim: true,
    },
    categories: {
      type: [
        {
          type: String,
          enum: EVENT_CATEGORY_VALUES,
          trim: true,
        },
      ],
      default: undefined,
    },
    venue: {
      type: String,
      trim: true,
    },
    address: {
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
    startDate: {
      type: String,
      required: [true, "Start date is required"],
      match: [/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD"],
    },
    endDate: {
      type: String,
      match: [/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD"],
    },
    startTime: {
      type: String,
      trim: true,
    },
    endTime: {
      type: String,
      trim: true,
    },
    price: {
      type: String,
      trim: true,
    },
    ticketUrl: {
      type: String,
      trim: true,
    },
    sourceUrl: {
      type: String,
      required: [true, "Source URL is required"],
      trim: true,
    },
    sourceName: {
      type: String,
      required: [true, "Source name is required"],
      trim: true,
    },
    source: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventSource",
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: IMPORT_CANDIDATE_STATUSES,
      default: "pending",
      index: true,
    },
    confidenceScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },
    rawExtractedData: {
      type: mongoose.Schema.Types.Mixed,
    },
    discoveredAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    reviewedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    importNotes: {
      type: String,
      trim: true,
    },
    approvedEvent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },
  },
  { timestamps: true }
);

importCandidateSchema.index({ status: 1, discoveredAt: -1 });
importCandidateSchema.index({ sourceUrl: 1, startDate: 1, title: 1 });

importCandidateSchema.pre("validate", function normalizeCandidate(next) {
  if (this.category && !this.categories?.length) {
    this.categories = [this.category];
  }
  if (this.categories?.length) {
    this.category = this.categories[0];
  }
  next();
});

const ImportCandidate = mongoose.model(
  "ImportCandidate",
  importCandidateSchema
);

export default ImportCandidate;
export { IMPORT_CANDIDATE_STATUSES, IMPORT_CANDIDATE_TOWNS };
