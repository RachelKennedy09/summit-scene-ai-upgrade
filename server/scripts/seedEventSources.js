import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import EventSource from "../models/EventSource.js";

const STARTER_SOURCES = [
  {
    name: "Banff Centre Events",
    url: "https://www.banffcentre.ca/events",
    town: "Banff",
    sourceType: "html",
    enabled: true,
    trusted: true,
  },
];

try {
  await connectDB();

  for (const source of STARTER_SOURCES) {
    await EventSource.findOneAndUpdate(
      { url: source.url },
      { $set: source },
      { upsert: true, new: true, runValidators: true }
    );
    console.log(`Seeded event source: ${source.name} (${source.url})`);
  }

  await mongoose.disconnect();
  process.exit(0);
} catch (error) {
  console.error("Failed to seed event sources:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
}
