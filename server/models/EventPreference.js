import mongoose from "mongoose";

const { Schema } = mongoose;

export const EVENT_REMINDER_TIMES = ["none", "1h", "3h", "1d", "1mo"];

const eventPreferenceSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    saved: {
      type: Boolean,
      default: false,
      index: true,
    },
    savedReminderEnabled: {
      type: Boolean,
      default: false,
    },
    goingReminderEnabled: {
      type: Boolean,
      default: false,
    },
    reminderTime: {
      type: String,
      enum: EVENT_REMINDER_TIMES,
      default: "1h",
    },
  },
  { timestamps: true }
);

eventPreferenceSchema.index({ userId: 1, eventId: 1 }, { unique: true });

const EventPreference = mongoose.model(
  "EventPreference",
  eventPreferenceSchema
);

export default EventPreference;
