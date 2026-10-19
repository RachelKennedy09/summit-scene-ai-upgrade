import mongoose from "mongoose";

const schema = new mongoose.Schema({
  platform: { type: String, enum: ["ios", "android"], required: true, unique: true },
  revision: { type: Number, required: true },
  minimumVersion: { type: String, required: true },
  minimumBuild: { type: String, default: null },
  latestVersion: { type: String, required: true },
  latestBuild: { type: String, default: null },
  mandatoryEnabled: { type: Boolean, default: false },
  storeAvailable: { type: Boolean, default: false },
  storeUrl: { type: String, required: true },
  message: { type: String, required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

export default mongoose.model("AppUpdatePolicy", schema);
