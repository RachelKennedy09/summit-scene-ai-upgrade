import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import AnalyticsEvent from "../models/AnalyticsEvent.js";
import Event from "../models/Event.js";
import User from "../models/User.js";

function normalizeAttributionKey(type, value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized ? `${type}:${normalized}` : null;
}

function getUrlHost(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function resolveAttribution({ event, business }) {
  if (event?.importedBySummitScene) {
    const sourceName =
      event.sourceName ||
      event.locationName ||
      getUrlHost(event.sourceUrl) ||
      "Imported source";
    const type = event.sourceName || event.sourceUrl ? "source" : "venue";

    return {
      attributionType: type,
      attributionName: sourceName,
      attributionKey: normalizeAttributionKey(type, sourceName),
      sourceName: event.sourceName || null,
      sourceUrl: event.sourceUrl || null,
    };
  }

  if (business) {
    const name = business.name || "Business";
    return {
      attributionType: "business",
      attributionName: name,
      attributionKey: normalizeAttributionKey("business", business._id),
      sourceName: event?.sourceName || null,
      sourceUrl: event?.sourceUrl || null,
    };
  }

  const fallbackName = event?.sourceName || event?.locationName || null;
  return {
    attributionType: fallbackName ? "source" : "unknown",
    attributionName: fallbackName,
    attributionKey: fallbackName
      ? normalizeAttributionKey("source", fallbackName)
      : null,
    sourceName: event?.sourceName || null,
    sourceUrl: event?.sourceUrl || null,
  };
}

try {
  await connectDB();

  const analyticsRows = await AnalyticsEvent.find({
    eventId: { $ne: null },
    $or: [
      { attributionKey: { $exists: false } },
      { attributionKey: null },
      { attributionKey: "" },
    ],
  }).select("_id eventId");

  let updated = 0;
  let skipped = 0;

  for (const analyticsRow of analyticsRows) {
    const event = await Event.findById(analyticsRow.eventId).select(
      "_id createdBy importedBySummitScene sourceName sourceUrl locationName"
    );

    if (!event) {
      skipped += 1;
      continue;
    }

    const business = event.createdBy
      ? await User.findById(event.createdBy).select("_id role name")
      : null;
    const attribution = resolveAttribution({ event, business });

    if (!attribution.attributionKey) {
      skipped += 1;
      continue;
    }

    await AnalyticsEvent.updateOne(
      { _id: analyticsRow._id },
      { $set: attribution }
    );
    updated += 1;
  }

  console.log(
    JSON.stringify(
      {
        updated,
        skipped,
        checked: analyticsRows.length,
      },
      null,
      2
    )
  );
} catch (error) {
  console.error("Backfill analytics attribution failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
