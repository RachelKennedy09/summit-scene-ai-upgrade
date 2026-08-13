import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { runEventImport } from "../services/eventImporter/runEventImport.js";

try {
  await connectDB();
  const summary = await runEventImport();
  console.log(
    [
      "Event import completed",
      `Sources checked: ${summary.sourcesChecked}`,
      `Events discovered: ${summary.eventsDiscovered}`,
      `New candidates: ${summary.newCandidates}`,
      `Duplicates: ${summary.duplicates}`,
      `Errors: ${summary.errors}`,
    ].join("\n")
  );
  await mongoose.disconnect();
  process.exit(0);
} catch (error) {
  console.error("Event import failed:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
}
