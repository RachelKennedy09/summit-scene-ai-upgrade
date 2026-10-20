import Event from "../models/Event.js";
import { buildListingTypeCondition } from "../controllers/eventController.js";
import { getMainCategoryForTag, getEventCategoryFilterOptions } from "../../constants/eventCategories.js";
import { parsePublicFilters } from "../../utils/publicEventFilters.js";
export { parsePublicFilters } from "../../utils/publicEventFilters.js";

// Event is the published collection; ImportCandidate holds unapproved imports.
// Also fail closed for explicit visibility/deletion flags in legacy documents.
export const PUBLIC_VISIBILITY = { $and: [
  { publicationStatus: { $in: [null, "published"] } },
  { status: { $in: [null, "published", "active", "scheduled", "cancelled", "canceled", "postponed", "rescheduled"] } },
  { visibility: { $in: [null, "public"] } },
  { isPublished: { $ne: false } }, { isDeleted: { $ne: true } }, { deletedAt: null },
] };
const PUBLIC_FIELDS = "title description town category categories date time endTime scheduleType recurrence timeSlots isAllDay locationName location address imageUrl bookingUrl sourceUrl sourceName priceRange createdBy importedBySummitScene updatedAt eventStatus previousStartDate";
const ID = /^[a-f\d]{24}$/i;
export function publicQuery() { return { $and: [PUBLIC_VISIBILITY, buildListingTypeCondition("events")] }; }
export function safeUrl(value) {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : ""; } catch { return ""; }
}
export function publicEventDTO(row, listingKind = "event") {
  const result = {};
  for (const field of PUBLIC_FIELDS.split(" ").filter((name) => !["createdBy", "importedBySummitScene"].includes(name))) {
    if (row[field] !== undefined && row[field] !== null) result[field] = row[field];
  }
  result._id = String(row._id);
  result.category = getMainCategoryForTag(row.category) || row.category || "Other";
  result.categories = [result.category];
  if (result.recurrence) result.recurrence = Object.fromEntries(["frequency", "weekdays", "untilDate", "dates"]
    .filter((key) => result.recurrence[key] !== undefined).map((key) => [key, result.recurrence[key]]));
  if (Array.isArray(result.timeSlots)) result.timeSlots = result.timeSlots.map((slot) => ({ startTime: slot.startTime, endTime: slot.endTime }));
  result.listingKind = listingKind;
  for (const field of ["imageUrl", "bookingUrl", "sourceUrl"]) if (result[field]) result[field] = safeUrl(result[field]);
  // Never return creator IDs, emails, attendee records or admin/source snapshots.
  const host = row.createdBy;
  if (!row.importedBySummitScene && host?.role === "business" && host.businessVerificationStatus === "verified" && host.name) {
    result.organizer = { name: host.name, ...(safeUrl(host.website) ? { url: safeUrl(host.website) } : {}) };
  }
  if (row._publicNextDate) result.nextOccurrenceDate = row._publicNextDate;
  return result;
}

// Calendar arithmetic uses UTC purely for date-only values. Mountain local
// "today" is resolved before the query, independent of the server's timezone.
export function occurrenceExpression(from) {
  const letIn = (vars, expression) => ({ $let: { vars, in: expression } });
  const dateString = (date) => ({ $dateToString: { date, format: "%Y-%m-%d", timezone: "+00:00", onNull: null } });
  const add = (date, days) => ({ $dateAdd: { startDate: date, unit: "day", amount: days } });
  const interval = { $cond: [{ $eq: ["$recurrence.frequency", "biweekly"] }, 14, 7] };
  const daysSinceStart = { $dateDiff: { startDate: "$$start", endDate: "$$candidate", unit: "day" } };
  const weekly = dateString(add("$$candidate", { $mod: [{ $subtract: [interval, { $mod: [daysSinceStart, interval] }] }, interval] }));
  const allowedOffsets = { $filter: { input: { $range: [0, 7] }, as: "offset", cond: { $in: [
    { $arrayElemAt: [["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], { $subtract: [{ $dayOfWeek: add("$$candidate", "$$offset") }, 1] }] },
    { $ifNull: ["$recurrence.weekdays", []] },
  ] } } };
  const selectedWeekdays = { $cond: [
    { $eq: [{ $size: { $ifNull: ["$recurrence.weekdays", []] } }, 0] }, dateString("$$candidate"),
    dateString({ $min: { $map: { input: allowedOffsets, as: "offset", in: add("$$candidate", "$$offset") } } }),
  ] };
  const clampMonth = (months) => letIn({ monthStart: { $dateFromParts: { year: { $year: "$$start" }, month: { $add: [{ $month: "$$start" }, months] }, day: 1 } } }, {
    $dateFromParts: { year: { $year: "$$monthStart" }, month: { $month: "$$monthStart" }, day: { $min: [
      { $dayOfMonth: "$$start" }, { $dayOfMonth: add({ $dateAdd: { startDate: "$$monthStart", unit: "month", amount: 1 } }, -1) },
    ] } },
  });
  const months = { $add: [{ $multiply: [{ $subtract: [{ $year: "$$candidate" }, { $year: "$$start" }] }, 12] }, { $subtract: [{ $month: "$$candidate" }, { $month: "$$start" }] }] };
  const monthly = letIn({ months }, letIn({ thisMonth: clampMonth("$$months") }, dateString({ $cond: [
    { $gte: ["$$thisMonth", "$$candidate"] }, "$$thisMonth", clampMonth({ $add: ["$$months", 1] }),
  ] })));
  const chooseNext = { $switch: { branches: [
    { case: { $eq: ["$recurrence.frequency", "selected_dates"] }, then: { $min: { $filter: { input: { $ifNull: ["$recurrence.dates", []] }, as: "date", cond: { $gte: ["$$date", from] } } } } },
    { case: { $in: ["$recurrence.frequency", ["weekly", "biweekly"]] }, then: weekly },
    { case: { $eq: ["$recurrence.frequency", "selected_weekdays"] }, then: selectedWeekdays },
    { case: { $eq: ["$recurrence.frequency", "monthly"] }, then: monthly },
  ], default: dateString("$$candidate") } };
  const withinUntil = { $or: [
    { $in: [{ $ifNull: ["$recurrence.untilDate", ""] }, ["", null]] }, { $lte: ["$$next", "$recurrence.untilDate"] },
  ] };
  const recurring = letIn({ candidate: { $max: ["$$start", "$$from"] } }, letIn({ next: chooseNext }, {
    $cond: [{ $and: [{ $ne: ["$$next", null] }, withinUntil] }, "$$next", null],
  }));
  return letIn({
    start: { $dateFromString: { dateString: "$date", timezone: "+00:00", onError: null, onNull: null } },
    from: { $dateFromString: { dateString: from, timezone: "+00:00" } },
  }, { $cond: [{ $eq: ["$scheduleType", "recurring"] }, recurring, "$date"] });
}

export async function listPublicEvents(input = {}, now = new Date()) {
  const filters = parsePublicFilters(input, now);
  const query = publicQuery();
  // Indexed initial selection keeps historical singles out of recurrence work.
  query.$and.push({ $or: [{ date: { $gte: filters.from, $lte: filters.to } }, { scheduleType: "recurring", date: { $lte: filters.to }, $or: [{ "recurrence.untilDate": { $in: [null, ""] } }, { "recurrence.untilDate": { $gte: filters.from } }] }] });
  if (filters.town) query.$and.push({ town: filters.town });
  if (filters.category) {
    const options = getEventCategoryFilterOptions(filters.category) || [filters.category];
    query.$and.push({ $or: [{ category: { $in: options } }, { categories: { $in: options } }, { categoryTags: { $in: options } }] });
  }
  const limit = 24;
  const rows = await Event.aggregate([
    { $match: query }, { $set: { _publicNextDate: occurrenceExpression(filters.from) } },
    { $match: { _publicNextDate: { $gte: filters.from, $lte: filters.to } } },
    { $sort: { _publicNextDate: 1, time: 1, _id: 1 } }, { $skip: (filters.page - 1) * limit }, { $limit: limit + 1 },
    { $project: Object.fromEntries([...PUBLIC_FIELDS.split(" "), "_publicNextDate"].map((field) => [field, 1])) },
  ]).option({ maxTimeMS: 6000 });
  // List cards do not need organizer lookups.
  return { events: rows.slice(0, limit).map((row) => publicEventDTO(row)), page: filters.page, hasMore: rows.length > limit, filters, timeZone: "America/Edmonton" };
}
export async function getPublicEvent(id) {
  if (!ID.test(id)) return null;
  const row = await Event.findOne({ $and: [PUBLIC_VISIBILITY, { _id: id }] }).setOptions({ strictQuery: false }).select(PUBLIC_FIELDS)
    .populate("createdBy", "name website role businessVerificationStatus").lean().maxTimeMS(6000);
  if (!row) return null;
  const actualEvent = await Event.exists({ $and: [publicQuery(), { _id: id }] }).setOptions({ strictQuery: false }).maxTimeMS(6000);
  return publicEventDTO(row, actualEvent ? "event" : "promotion");
}
export async function sitemapEvents(page = 1) {
  if (!Number.isSafeInteger(page) || page < 1 || page > 50000) throw new Error("Invalid sitemap page.");
  const query = publicQuery();
  const [total, rows] = await Promise.all([
    Event.countDocuments(query).setOptions({ strictQuery: false }).maxTimeMS(6000),
    Event.find(query).setOptions({ strictQuery: false }).sort({ _id: 1 }).skip((page - 1) * 1000).limit(1000).select("title updatedAt").lean().maxTimeMS(6000),
  ]);
  return { events: rows.map((row) => ({ _id: String(row._id), title: row.title, updatedAt: row.updatedAt })), pages: Math.ceil(total / 1000) };
}
