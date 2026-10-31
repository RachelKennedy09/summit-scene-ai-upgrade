// server/routes/events.js
// Routes for /api/events
//  - Public event browsing for Hub + Map screens
//  - "My Events" view for creators
//  - Create/Update/Delete event endpoints (admin only)
//
//  - Public: anyone can GET all events or a single event
//  - Authenticated + admin access: can POST, PUT, DELETE
//    (extra ownership checks happen in the controller)

import express from "express";

import {
  getAllEvents,
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent,
  getMyEvents,
  toggleEventAttendance,
} from "../controllers/eventController.js";

import authMiddleware from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";
import optionalAuth from "../middleware/optionalAuth.js";

const router = express.Router();

// -------------------------------------------
// PUBLIC ROUTES
// -------------------------------------------

// GET /api/events
//   Return all events for the Hub + Map screens.
//   - Can later support query params for filtering by date, town, category, etc.
router.get("/", getAllEvents);

// -------------------------------------------
// AUTHENTICATED ROUTES
// -------------------------------------------

// GET /api/events/mine
//   Return events created by the currently logged-in user.
//   Used by admin to manage listings created on behalf of local businesses.
//   - Requires a valid JWT (authMiddleware).
router.get("/mine", authMiddleware, isAdmin, getMyEvents);

// POST /api/events/:id/attendance
//   Toggle "I'm going" for the logged-in user.
router.post("/:id/attendance", authMiddleware, toggleEventAttendance);

// -------------------------------------------
// PUBLIC SINGLE EVENT ROUTE
// -------------------------------------------
// GET /api/events/:id
//   Return detailed info for a single event.
//   Used when the user taps into an event details screen.
router.get("/:id", optionalAuth, getEventById);

// -------------------------------------------
// ADMIN-ONLY ROUTES (CREATE / UPDATE / DELETE)
// -------------------------------------------

// POST /api/events
//   Create a new event.
//   - Must be logged in (authMiddleware)
//   - Must be a Summit Scene admin (isAdmin)
//   - Controller uses req.user.userId as the event owner.
//   - Body should include required fields like title, date, town, etc.
router.post("/", authMiddleware, isAdmin, createEvent);

// PUT /api/events/:id
//   Update an existing event.
//   - Must be logged in (authMiddleware)
//   - Must be a Summit Scene admin (isAdmin)
//   - Controller enforces ownership: only the creator can update.
//   Lets businesses fix details like time, location, or description.
router.put("/:id", authMiddleware, isAdmin, updateEvent);

// DELETE /api/events/:id
//   Delete an event completely.
//   - Must be logged in (authMiddleware)
//   - Must be a Summit Scene admin (isAdmin)
//   - Controller enforces ownership: only the creator can delete.
//   Used when events are cancelled or no longer relevant.
router.delete("/:id", authMiddleware, isAdmin, deleteEvent);

export default router;
