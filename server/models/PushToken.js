import mongoose from "mongoose";

const { Schema } = mongoose;

const pushTokenSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    platform: {
      type: String,
      enum: ["ios", "android", "web", "unknown"],
      default: "unknown",
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

pushTokenSchema.index({ user: 1, enabled: 1 });

const PushToken = mongoose.model("PushToken", pushTokenSchema);

export default PushToken;
