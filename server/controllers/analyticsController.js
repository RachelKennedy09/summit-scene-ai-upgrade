import mongoose from "mongoose";
import AnalyticsEvent, {
  ANALYTICS_EVENT_TYPES,
} from "../models/AnalyticsEvent.js";
import Event from "../models/Event.js";
import User from "../models/User.js";
import { isAdminEmail } from "../utils/adminAccess.js";

const SUMMARY_KEYS = {
  event_impression: "eventImpressions",
  event_view: "eventViews",
  business_view: "businessViews",
  website_click: "websiteClicks",
  event_save: "saves",
  event_going: "going",
  event_share: "shares",
};
const ALLOWED_DAY_FILTERS = new Set(["7", "30", "90", "all"]);

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function normalizeDays(value) {
  const raw = String(value || "30").toLowerCase();
  return ALLOWED_DAY_FILTERS.has(raw) ? raw : "30";
}

function buildDateMatch(days) {
  if (days === "all") return {};

  const since = new Date();
  since.setDate(since.getDate() - Number(days));
  return { createdAt: { $gte: since } };
}

function getUserId(req) {
  return req.user?.userId && isObjectId(req.user.userId)
    ? req.user.userId
    : null;
}

async function requireAdmin(req, res) {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Not authorized." });
    return null;
  }

  const user = await User.findById(userId).select("email isAdmin");
  const isAdmin = Boolean(user?.isAdmin) || isAdminEmail(user?.email || req.user?.email);
  if (!isAdmin) {
    res.status(403).json({ message: "Admin access required." });
    return null;
  }

  return user;
}

function sanitizeMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  // Keep metadata intentionally small and non-identifying.
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entryValue]) =>
        ["string", "number", "boolean"].includes(typeof entryValue)
      )
      .slice(0, 12)
      .map(([key, entryValue]) => [String(key).slice(0, 60), entryValue])
  );
}

function buildSummaryFromRows(rows) {
  const summary = {
    eventImpressions: 0,
    eventViews: 0,
    businessViews: 0,
    websiteClicks: 0,
    saves: 0,
    going: 0,
    shares: 0,
  };

  rows.forEach((row) => {
    const key = SUMMARY_KEYS[row._id];
    if (key) summary[key] = row.count;
  });

  return summary;
}

async function aggregateSummary(match) {
  const rows = await AnalyticsEvent.aggregate([
    { $match: match },
    { $group: { _id: "$type", count: { $sum: 1 } } },
  ]);

  return buildSummaryFromRows(rows);
}

async function resolveAnalyticsContext({ eventId, businessId }) {
  let event = null;
  let business = null;

  if (eventId && isObjectId(eventId)) {
    event = await Event.findById(eventId).select(
      "_id createdBy town category categories"
    );
  }

  if (event?.createdBy) {
    business = await User.findById(event.createdBy).select("_id role");
  } else if (businessId && isObjectId(businessId)) {
    business = await User.findById(businessId).select("_id role");
  }

  return {
    event,
    business:
      business && business.role === "business"
        ? business
        : null,
  };
}

function buildImpressionDedupeKey({ sessionId, eventId }) {
  if (!sessionId || !eventId) return null;
  const day = new Date().toISOString().slice(0, 10);
  return `event_impression:${sessionId}:${eventId}:${day}`;
}

export async function trackAnalytics(req, res) {
  try {
    const type = String(req.body?.type || "").trim();
    if (!ANALYTICS_EVENT_TYPES.includes(type)) {
      return res.status(400).json({ message: "Invalid analytics event type." });
    }

    const eventId = isObjectId(req.body?.eventId) ? req.body.eventId : null;
    const businessId = isObjectId(req.body?.businessId)
      ? req.body.businessId
      : null;
    const { event, business } = await resolveAnalyticsContext({
      eventId,
      businessId,
    });

    const resolvedEventId = event?._id || null;
    const resolvedBusinessId = event?.createdBy || business?._id || null;
    const sessionId =
      typeof req.body?.sessionId === "string"
        ? req.body.sessionId.trim().slice(0, 120)
        : null;
    const dedupeKey =
      type === "event_impression"
        ? buildImpressionDedupeKey({ sessionId, eventId: resolvedEventId })
        : null;

    const payload = {
      type,
      eventId: resolvedEventId,
      businessId: resolvedBusinessId,
      userId: getUserId(req),
      town: event?.town || null,
      category:
        event?.category ||
        (Array.isArray(event?.categories) ? event.categories[0] : null) ||
        null,
      sessionId,
      metadata: sanitizeMetadata(req.body?.metadata),
      dedupeKey,
    };

    if (dedupeKey) {
      await AnalyticsEvent.findOneAndUpdate(
        { dedupeKey },
        { $setOnInsert: payload },
        { upsert: true, new: false }
      );
      return res.status(202).json({ ok: true });
    }

    await AnalyticsEvent.create(payload);
    return res.status(202).json({ ok: true });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(202).json({ ok: true });
    }

    console.error("Analytics track issue:", error.message);
    return res.status(500).json({ message: "Could not track analytics." });
  }
}

export async function getAnalyticsSummary(req, res) {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const days = normalizeDays(req.query?.days);
    const summary = await aggregateSummary(buildDateMatch(days));
    return res.json({ days, ...summary });
  } catch (error) {
    console.error("Analytics summary issue:", error.message);
    return res.status(500).json({ message: "Could not load analytics summary." });
  }
}

export async function getBusinessAnalytics(req, res) {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const businessId = req.params.businessId;
    if (!isObjectId(businessId)) {
      return res.status(400).json({ message: "Invalid business ID." });
    }

    const days = normalizeDays(req.query?.days);
    const match = {
      ...buildDateMatch(days),
      businessId: new mongoose.Types.ObjectId(businessId),
    };
    const summary = await aggregateSummary(match);

    const topRows = await AnalyticsEvent.aggregate([
      {
        $match: {
          ...match,
          eventId: { $ne: null },
          type: { $in: ["event_view", "event_save"] },
        },
      },
      {
        $group: {
          _id: { eventId: "$eventId", type: "$type" },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.eventId",
          counts: {
            $push: {
              type: "$_id.type",
              count: "$count",
            },
          },
        },
      },
      { $limit: 50 },
    ]);

    const eventIds = topRows.map((row) => row._id);
    const events = await Event.find({ _id: { $in: eventIds } }).select("title");
    const eventTitleMap = new Map(
      events.map((event) => [event._id.toString(), event.title])
    );
    const topEvents = topRows
      .map((row) => {
        const counts = Object.fromEntries(
          row.counts.map((entry) => [entry.type, entry.count])
        );
        return {
          eventId: row._id,
          title: eventTitleMap.get(row._id.toString()) || "Event",
          views: counts.event_view || 0,
          saves: counts.event_save || 0,
        };
      })
      .sort((a, b) => b.views - a.views || b.saves - a.saves);

    return res.json({
      days,
      businessId,
      ...summary,
      topEventsByViews: topEvents.filter((event) => event.views > 0).slice(0, 10),
      topEventsBySaves: [...topEvents]
        .filter((event) => event.saves > 0)
        .sort((a, b) => b.saves - a.saves || b.views - a.views)
        .slice(0, 10),
    });
  } catch (error) {
    console.error("Business analytics issue:", error.message);
    return res.status(500).json({ message: "Could not load business analytics." });
  }
}
