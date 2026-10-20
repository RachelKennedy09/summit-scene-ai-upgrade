import mongoose from "mongoose";

// One shared slot serializes admin-triggered runs across server instances.
const schema = new mongoose.Schema({
  _id: { type: String },
  runId: String,
  status: { type: String, enum: ["running", "completed", "failed"] },
  sourceId: String,
  startedAt: Date,
  heartbeatAt: Date,
  finishedAt: Date,
  summary: mongoose.Schema.Types.Mixed,
  message: String,
});

export default mongoose.model("EventImportRun", schema);
