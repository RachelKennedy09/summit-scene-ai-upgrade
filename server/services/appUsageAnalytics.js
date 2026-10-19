import AnalyticsInstallation from "../models/AnalyticsInstallation.js";
import AnalyticsEvent from "../models/AnalyticsEvent.js";

export function validateAppUsage(body) {
  const validId = (value) => typeof value === "string" && /^[a-zA-Z0-9_-]{12,120}$/.test(value);
  if (!validId(body.installationId) || !validId(body.visitId) || !["ios", "android"].includes(body.platform)) {
    throw new Error("Valid installation, visit and native platform are required.");
  }
  const version = (value) => typeof value === "string" && value.length <= 40 && /^\d+(?:\.\d+){0,2}$/.test(value) ? value : null;
  return { installationId: body.installationId, visitId: body.visitId, platform: body.platform,
    appVersion: version(body.appVersion), nativeBuild: version(body.nativeBuild) };
}

export async function recordAppOpen(body, { installations = AnalyticsInstallation, events = AnalyticsEvent, now = new Date() } = {}) {
  const data = validateAppUsage(body);
  const query = { installationId: data.installationId };
  const update = { $setOnInsert: { firstVisitId: data.visitId, firstSeenAt: now }, $max: { lastSeenAt: now } };
  let installation;
  try { installation = await installations.findOneAndUpdate(query, update, { upsert: true, new: true }); }
  catch (error) {
    // Concurrent first opens can race on the unique installation index.
    if (error.code !== 11000) throw error;
    installation = await installations.findOneAndUpdate(query, update, { upsert: true, new: true });
  }
  const dedupeKey = `app_open:${data.installationId}:${data.visitId}`;
  await events.findOneAndUpdate({ dedupeKey }, { $setOnInsert: {
    type: "app_open", ...data, sessionId: data.installationId,
    isReturning: installation.firstVisitId !== data.visitId,
    dedupeKey,
  } }, { upsert: true, new: false });
}

export function usageSummaryPipeline(dateMatch, now = new Date()) {
  const uniqueCount = [{ $group: { _id: "$installationId" } }, { $count: "count" }];
  const period = (stages) => [{ $match: dateMatch }, ...stages];
  const lowerBound = dateMatch.createdAt?.$gte;
  const earliest = lowerBound ? new Date(Math.min(lowerBound.getTime(), now.getTime() - 30 * 86400000)) : null;
  return [
    { $match: { type: "app_open", installationId: { $type: "string", $ne: "" },
      ...(earliest ? { createdAt: { $gte: earliest } } : {}) } },
    { $facet: {
      opens: period([{ $count: "count" }]),
      active: period(uniqueCount),
      firstRecorded: period([{ $match: { isReturning: false } }, { $count: "count" }]),
      returning: period([{ $match: { isReturning: true } }, ...uniqueCount]),
      platforms: period([
        { $group: { _id: { platform: "$platform", installationId: "$installationId" }, opens: { $sum: 1 } } },
        { $group: { _id: "$_id.platform", appOpens: { $sum: "$opens" }, activeInstallations: { $sum: 1 } } },
        { $sort: { appOpens: -1, _id: 1 } },
      ]),
      versions: period([
        { $group: { _id: { platform: "$platform", appVersion: "$appVersion", nativeBuild: "$nativeBuild", installationId: "$installationId" }, opens: { $sum: 1 } } },
        { $group: { _id: { platform: "$_id.platform", appVersion: "$_id.appVersion", nativeBuild: "$_id.nativeBuild" }, appOpens: { $sum: "$opens" }, activeInstallations: { $sum: 1 } } },
        { $sort: { appOpens: -1, "_id.platform": 1, "_id.appVersion": 1, "_id.nativeBuild": 1 } },
        { $limit: 50 },
      ]),
      active24h: [{ $match: { createdAt: { $gte: new Date(now.getTime() - 86400000) } } }, ...uniqueCount],
      active7d: [{ $match: { createdAt: { $gte: new Date(now.getTime() - 7 * 86400000) } } }, ...uniqueCount],
      active30d: [{ $match: { createdAt: { $gte: new Date(now.getTime() - 30 * 86400000) } } }, ...uniqueCount],
    } },
  ];
}

export function formatUsageSummary(result = {}) {
  const period = result;
  const count = (rows) => rows?.[0]?.count || 0;
  return {
    appOpens: count(period.opens), activeInstallations: count(period.active),
    firstRecordedOpens: count(period.firstRecorded), returningInstallations: count(period.returning),
    active24h: count(result.active24h), active7d: count(result.active7d), active30d: count(result.active30d),
    platforms: (period.platforms || []).map(({ _id, ...row }) => ({ platform: _id, ...row })),
    versions: (period.versions || []).map(({ _id, ...row }) => ({ ..._id, ...row })),
  };
}

export async function getAppUsageSummary(dateMatch) {
  const rows = await AnalyticsEvent.aggregate(usageSummaryPipeline(dateMatch)).option({ maxTimeMS: 10000 });
  return formatUsageSummary(rows[0]);
}
