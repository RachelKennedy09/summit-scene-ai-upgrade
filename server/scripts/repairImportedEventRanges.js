import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Event from "../models/Event.js";
import ImportCandidate from "../models/ImportCandidate.js";

function isDateRange(startDate, endDate) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(String(startDate || "")) &&
    /^\d{4}-\d{2}-\d{2}$/.test(String(endDate || "")) &&
    endDate > startDate
  );
}

try {
  await connectDB();

  const candidates = await ImportCandidate.find({
    status: "approved",
    approvedEvent: { $exists: true, $ne: null },
    endDate: { $exists: true, $ne: "" },
  }).select("approvedEvent startDate endDate startTime endTime");

  let repaired = 0;

  for (const candidate of candidates) {
    if (!isDateRange(candidate.startDate, candidate.endDate)) continue;

    const result = await Event.updateOne(
      { _id: candidate.approvedEvent },
      {
        $set: {
          date: candidate.startDate,
          time: candidate.startTime || undefined,
          endTime: candidate.endTime || undefined,
          scheduleType: "recurring",
          isAllDay: false,
          recurrence: {
            frequency: "daily",
            weekdays: [],
            dates: [],
            untilDate: candidate.endDate,
          },
        },
      },
      { runValidators: true }
    );

    repaired += result.modifiedCount || 0;
  }

  console.log(`Imported range events repaired: ${repaired}`);
  await mongoose.disconnect();
  process.exit(0);
} catch (error) {
  console.error("Failed to repair imported event ranges:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
}
