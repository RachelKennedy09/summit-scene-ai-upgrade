import mongoose from "mongoose";

const schema = new mongoose.Schema({
  installationId: { type: String, required: true, unique: true, maxlength: 120 },
  firstVisitId: { type: String, required: true, maxlength: 120 },
  firstSeenAt: { type: Date, required: true, index: true },
  lastSeenAt: { type: Date, required: true },
}, { versionKey: false });

export default mongoose.model("AnalyticsInstallation", schema);
