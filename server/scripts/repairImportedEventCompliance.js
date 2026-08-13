import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Event from "../models/Event.js";
import ImportCandidate from "../models/ImportCandidate.js";
import {
  buildFactualRawExtractedData,
  buildOriginalSummary,
} from "../services/eventImporter/normalizeEvent.js";

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function candidateSummary(candidate) {
  return buildOriginalSummary({
    title: cleanText(candidate.title),
    startDate: cleanText(candidate.startDate),
    endDate: cleanText(candidate.endDate),
    startTime: cleanText(candidate.startTime),
    endTime: cleanText(candidate.endTime),
    venue: cleanText(candidate.venue),
    town: cleanText(candidate.town),
    price: cleanText(candidate.price),
    sourceName: cleanText(candidate.sourceName),
  });
}

function eventSummary(event) {
  return buildOriginalSummary({
    title: cleanText(event.title),
    startDate: cleanText(event.date),
    endDate: cleanText(event.recurrence?.untilDate),
    startTime: cleanText(event.time),
    endTime: cleanText(event.endTime),
    venue: cleanText(event.locationName || event.location),
    town: cleanText(event.town),
    price: cleanText(event.priceRange),
    sourceName: cleanText(event.sourceName),
  });
}

try {
  await connectDB();

  const candidates = await ImportCandidate.find({
    sourceUrl: { $exists: true, $ne: "" },
  });
  let candidatesRepaired = 0;

  for (const candidate of candidates) {
    candidate.description = candidateSummary(candidate);
    candidate.imageUrl = undefined;
    candidate.rawExtractedData = buildFactualRawExtractedData(candidate, {
      name: candidate.sourceName,
      town: candidate.town,
      url: candidate.sourceUrl,
    });
    await candidate.save();
    candidatesRepaired += 1;
  }

  const events = await Event.find({
    importedBySummitScene: true,
    sourceUrl: { $exists: true, $ne: "" },
  });
  let eventsRepaired = 0;

  for (const event of events) {
    event.description = eventSummary(event);
    event.imageUrl = undefined;
    await event.save();
    eventsRepaired += 1;
  }

  console.log(
    JSON.stringify(
      {
        candidatesRepaired,
        importedEventsRepaired: eventsRepaired,
      },
      null,
      2
    )
  );
  await mongoose.disconnect();
  process.exit(0);
} catch (error) {
  console.error("Failed to repair imported event compliance:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
}
