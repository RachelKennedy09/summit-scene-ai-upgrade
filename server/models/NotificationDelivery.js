import mongoose from "mongoose";

const { Schema } = mongoose;

const notificationDeliverySchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    deliveryDate: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Delivery date must be YYYY-MM-DD"],
      index: true,
    },
    timezone: {
      type: String,
      trim: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

notificationDeliverySchema.index(
  { user: 1, type: 1, deliveryDate: 1 },
  { unique: true }
);

const NotificationDelivery = mongoose.model(
  "NotificationDelivery",
  notificationDeliverySchema
);

export default NotificationDelivery;
