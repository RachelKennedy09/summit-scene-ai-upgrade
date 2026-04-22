// server/index.js
// Entry point for the SummitScene backend API
//  - Creates the Express app
//  - Sets up global middleware (CORS, JSON parsing)
//  - Mounts all route modules (auth, users, community, events)
//  - Connects to MongoDB and starts the HTTP server

import express from "express"; // Web framework: routing + middleware
import cors from "cors"; // Allows Expo / web clients on other origins
import { connectDB } from "./config/db.js"; // MongoDB connection helper

// Route modules
import eventRoutes from "./routes/events.js";
import authRouter from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import communityRoutes from "./routes/community.js";

// ---------------------------
// APP SETUP
// ---------------------------

// Create the Express application instance
const app = express();

// Global middleware
// Enable CORS so the mobile app / web client can talk to this API
app.use(cors());

// Automatically parse JSON request bodies into req.body
app.use(express.json());

// ---------------------------
// HEALTH + ROOT ROUTES
// ---------------------------

// Simple health-check endpoint for Render / monitoring / debugging
// e.g. GET https://your-api.com/api/health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "SummitScene API is healthy" });
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

// Event routes: create, list, update, delete events
app.use("/api/events", eventRoutes);

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
