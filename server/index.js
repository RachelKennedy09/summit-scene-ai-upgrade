// server/index.js
// Entry point for the SummitScene backend API
//  - Creates the Express app
//  - Sets up global middleware (CORS, JSON parsing)
//  - Mounts all route modules (auth, users, community, events)
//  - Connects to MongoDB and starts the HTTP server

import "dotenv/config";
import express from "express"; // Web framework: routing + middleware
import cors from "cors"; // Allows Expo / web clients on other origins
import compression from "compression";
import { connectDB } from "./config/db.js"; // MongoDB connection helper

// Route modules
import eventRoutes from "./routes/events.js";
import eventImportRoutes from "./routes/eventImport.js";
import authRouter from "./routes/auth.js";
import authMiddleware from "./middleware/auth.js";
import isAdmin from "./middleware/isAdmin.js";
import userRoutes from "./routes/users.js";
import communityRoutes from "./routes/community.js";
import buddyPostRoutes from "./routes/buddyPosts.js";
import eventPreferenceRoutes from "./routes/eventPreferences.js";
import reportRoutes from "./routes/reports.js";
import placesRoutes from "./routes/placesRoutes.js";
import notificationRoutes from "./routes/notifications.js";
import analyticsRoutes from "./routes/analytics.js";
import { startDailyEventsNotificationJob } from "./services/dailyEventsNotificationService.js";

// ---------------------------
// APP SETUP
// ---------------------------

// Create the Express application instance
const app = express();

const BANDWIDTH_LOG_INTERVAL_MS = Number(
  process.env.BANDWIDTH_LOG_INTERVAL_MS || 5 * 60 * 1000
);
const bandwidthStats = new Map();
const bandwidthStatsSinceBoot = new Map();
let lastBandwidthSummary = [];

function normalizeBandwidthPath(path = "") {
  return String(path)
    .replace(/[a-f\d]{24}/gi, ":id")
    .replace(/\d{5,}/g, ":num");
}

function getChunkSize(chunk, encoding) {
  if (!chunk) return 0;
  if (Buffer.isBuffer(chunk)) return chunk.length;
  if (typeof chunk === "string") return Buffer.byteLength(chunk, encoding);
  return Buffer.byteLength(String(chunk));
}

function responseBandwidthLogger(req, res, next) {
  if (!req.path?.startsWith("/api")) {
    return next();
  }

  const startedAt = Date.now();
  let responseBytes = 0;
  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);

  res.write = (chunk, encoding, callback) => {
    responseBytes += getChunkSize(chunk, encoding);
    return originalWrite(chunk, encoding, callback);
  };

  res.end = (chunk, encoding, callback) => {
    responseBytes += getChunkSize(chunk, encoding);
    return originalEnd(chunk, encoding, callback);
  };

  res.on("finish", () => {
    const key = `${req.method} ${normalizeBandwidthPath(req.path)} ${res.statusCode}`;
    const updateStats = (statsMap) => {
      const current = statsMap.get(key) || {
        requests: 0,
        bytes: 0,
        maxBytes: 0,
        totalMs: 0,
      };

      current.requests += 1;
      current.bytes += responseBytes;
      current.maxBytes = Math.max(current.maxBytes, responseBytes);
      current.totalMs += Date.now() - startedAt;
      statsMap.set(key, current);
    };

    updateStats(bandwidthStats);
    updateStats(bandwidthStatsSinceBoot);
  });

  return next();
}

function formatBandwidthRows(statsMap, limit = 20) {
  return [...statsMap.entries()]
    .map(([key, value]) => ({
      endpoint: key,
      requests: value.requests,
      bytes: value.bytes,
      avgBytes: Math.round(value.bytes / Math.max(1, value.requests)),
      maxBytes: value.maxBytes,
      avgMs: Math.round(value.totalMs / Math.max(1, value.requests)),
    }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, limit);
}

function startBandwidthSummaryLogger() {
  if (process.env.BANDWIDTH_LOG_ENABLED === "false") return;

  const interval = setInterval(() => {
    if (!bandwidthStats.size) return;

    const rows = formatBandwidthRows(bandwidthStats, 12);
    lastBandwidthSummary = rows;

    console.info(
      "[bandwidth] endpoint summary",
      rows
    );

    bandwidthStats.clear();
  }, BANDWIDTH_LOG_INTERVAL_MS);

  interval.unref?.();
  console.info(
    `[bandwidth] summary logging enabled every ${BANDWIDTH_LOG_INTERVAL_MS}ms`
  );
}

// Global middleware
// Enable CORS so the mobile app / web client can talk to this API
app.use(cors());

app.use(responseBandwidthLogger);

app.use(compression({ threshold: 1024 }));

// Automatically parse JSON request bodies into req.body.
// Profile photo uploads are compressed data URLs during testing, so the limit
// needs to be higher than Express's small default.
app.use(express.json({ limit: "3mb" }));



// ---------------------------
// HEALTH + ROOT ROUTES
// ---------------------------

// Simple health-check endpoint for Render / monitoring / debugging
// e.g. GET https://your-api.com/api/health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "SummitScene API is healthy" });
});

app.get("/api/app-version", (req, res) => {
  res.json({
    minimumSupportedVersion:
      process.env.MIN_SUPPORTED_APP_VERSION || "1.0.2",
    latestVersion: process.env.LATEST_APP_VERSION || "1.0.2",
    iosStoreUrl:
      process.env.IOS_APP_STORE_URL ||
      "https://apps.apple.com/app/summit-scene/id6777819596",
    androidStoreUrl:
      process.env.ANDROID_PLAY_STORE_URL ||
      "https://play.google.com/store/apps/details?id=com.rachellauren.summitscene",
    optionalUpdateMessage:
      process.env.APP_OPTIONAL_UPDATE_MESSAGE ||
      "A newer version of Summit Scene is available. Update for the latest fixes and improvements.",
    message:
      process.env.APP_UPDATE_MESSAGE ||
      "Newer version available - please download the latest Summit Scene update before using the app.",
  });
});

app.get("/api/admin/bandwidth", authMiddleware, isAdmin, (req, res) => {
  const limit = Math.min(
    Math.max(Number.parseInt(req.query?.limit, 10) || 20, 1),
    50
  );

  res.json({
    message:
      "Approximate API response bytes by endpoint. Query strings, request bodies, auth tokens, and user data are not logged.",
    currentWindow: formatBandwidthRows(bandwidthStats, limit),
    lastLoggedWindow: lastBandwidthSummary.slice(0, limit),
    sinceBoot: formatBandwidthRows(bandwidthStatsSinceBoot, limit),
    logIntervalMs: BANDWIDTH_LOG_INTERVAL_MS,
  });
});

// Simple root route
app.get("/", (req, res) => {
  res.json({ message: "SummitScene API is running" });
});

// ---------------------------
// API ROUTES
// ---------------------------

// Auth routes: register, login, get current user, etc.
app.use("/api/auth", authRouter);

// User profile routes: update profile, avatar, town, etc.
app.use("/api/users", userRoutes);

// Community routes: posts, likes, comments, etc.
app.use("/api/community", communityRoutes);

// Buddy post routes: find people for events, hiking, skiing/snowboarding, etc.
app.use("/api/buddy-posts", buddyPostRoutes);

// Event preferences: saved events, reminder settings, in-app reminders
app.use("/api/event-preferences", eventPreferenceRoutes);

// User notifications: in-app alerts and push-token registration
app.use("/api/notifications", notificationRoutes);

// Report routes: safety reports for posts, replies, events, and users
app.use("/api/reports", reportRoutes);

// Event routes: create, list, update, delete events
app.use("/api/events", eventRoutes);

// Admin-only event discovery/import review routes
app.use("/api/event-import", eventImportRoutes);

// Free address autocomplete and place lookup helpers
app.use("/api/places", placesRoutes);

// Lightweight aggregate analytics for event/business reporting.
app.use("/api/analytics", analyticsRoutes);

// ---------------------------
// SERVER STARTUP
// ---------------------------

// Port configuration
// In production, PORT should come from environment (e.g. Render).
// In local dev, we fall back to 4000.
const PORT = process.env.PORT || 4000;

// Start function: connect to DB, then start listening for requests
async function startServer() {
  try {
    // 1) Connect to MongoDB
    await connectDB();

    // 2) Start HTTP server only after DB is ready
    app.listen(PORT, () => {
      console.log(` SummitScene API listening on port ${PORT}`);
      if (process.env.NODE_ENV) {
        console.log(`🌲 Environment: ${process.env.NODE_ENV}`);
      }
      startBandwidthSummaryLogger();
      startDailyEventsNotificationJob();
    });
  } catch (error) {
    // If DB connection fails, there is no point in running the API
    console.error(" Failed to start server:", error.message);
    process.exit(1); // Exit with non-zero code so hosting sees the failure
  }
}

// Boot the app
startServer();

// Export app for testing or specialized setups (e.g. supertest)
export default app;
