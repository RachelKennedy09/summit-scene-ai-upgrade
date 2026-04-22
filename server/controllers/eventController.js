// server/controllers/eventController.js
// Controller functions for SummitScene events
//  - Listing upcoming events (for Hub + Map)
//  - Creating new events (business users only)
//  - Fetching a single event
//  - Updating and deleting events (owner-only)
//  - Fetching "My Events" for the logged-in business user
//
// USED BY ROUTES:
//  - GET    /api/events
//  - GET    /api/events/mine
//  - GET    /api/events/:id
//  - POST   /api/events
//  - PUT    /api/events/:id
//  - DELETE /api/events/:id

import Event from "../models/Event.js";
import User from "../models/User.js";

// -------------------------------------------
// GET /api/events
//   Return upcoming events (today or later).
//   - Build today's date as "YYYY-MM-DD".
//   - Query events where date >= today.
//   - Sort ascending by date.
//   - Populate createdBy with business host profile fields.
// -------------------------------------------
export async function getAllEvents(req, res) {
  try {
    // Build today's date in YYYY-MM-DD format
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const todayStr = `${year}-${month}-${day}`;

    // Only events on or after today
    const events = await Event.find({ date: { $gte: todayStr } })
      .sort({ date: 1 })
      .populate(
        "createdBy",
        "name email role avatarKey town bio lookingFor instagram website"
      );

    return res.json(events);
  } catch (error) {
    console.error("Error in GET /api/events:", error);
    return res.status(500).json({
      message: "Error fetching events.",
      error: error.message,
    });
  }
}

// -------------------------------------------
// POST /api/events
//   Create a new event.
//   - Requires authMiddleware (req.user.userId).
//   - Requires isBusiness middleware at route level.
//   - This controller double-checks the user + role in DB.
//
// FLOW:
//   1) Check userId from JWT.
//   2) Look up the user and confirm they're a business.
//   3) Validate required event fields.
//   4) Create and save a new Event linked to createdBy.
// -------------------------------------------
export async function createEvent(req, res) {
  try {
    const userId = req.user?.userId; // from auth middleware
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: no user ID." });
    }

    // Make sure this user still exists and is allowed to host events
    const hostUser = await User.findById(userId);
    if (!hostUser) {
      return res.status(401).json({
        message: "Your account no longer exists. Please log in again.",
      });
    }

    if (hostUser.role !== "business") {
      return res
        .status(403)
        .json({ message: "Only business accounts can post events." });
    }

    const {
      title,
      description,
      town,
      category,
      date,
      time,
      endTime,
      location,
      imageUrl,
    } = req.body || {};

    // Basic validation
    if (!title || !town || !category || !date) {
      return res.status(400).json({
        message: "title, town, category and date are required.",
      });
    }

    const event = new Event({
      title,
      description,
      town,
      category,
      date,
      time,
      endTime,
      location,
      imageUrl,
      createdBy: userId,
    });

    const savedEvent = await event.save();

    return res.status(201).json(savedEvent);
  } catch (error) {
    console.error("Error in POST /api/events:", error);
    return res.status(500).json({
      message: "Error creating event.",
      error: error.message,
    });
  }
}

// -------------------------------------------
// GET /api/events/:id
//   Fetch a single event by its MongoDB ID.
//   - Populates createdBy so the frontend can show host info.
// -------------------------------------------
export async function getEventById(req, res) {
  try {
    console.log("🔥 getEventById hit with id =", req.params.id);
    const { id } = req.params;

    const event = await Event.findById(id).populate(
      "createdBy",
      "name email role avatarKey town bio lookingFor instagram website"
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    return res.json(event);
  } catch (error) {
    console.error("Error in GET /api/events/:id:", error);
    return res.status(500).json({
      message: "Error fetching event.",
      error: error.message,
    });
  }
}

// -------------------------------------------
// PUT /api/events/:id
//   Update an existing event.
//   - Must be logged in.
//   - Must be the creator (business user who posted it).
//
//   1) Find event by ID.
//   2) If not found -> 404.
//   3) Check ownership (event.createdBy === userId).
//   4) Apply allowed updates from body.
//   5) Save and return updated event.
// -------------------------------------------
export async function updateEvent(req, res) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    // Find the event
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    // Check ownership
    if (!event.createdBy || event.createdBy.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not allowed to edit this event." });
    }

    // Only update allowed fields
    const {
      title,
      description,
      town,
      category,
      date,
      time,
      endTime,
      location,
      imageUrl,
    } = req.body || {};

    if (title !== undefined) event.title = title;
    if (description !== undefined) event.description = description;
    if (town !== undefined) event.town = town;
    if (category !== undefined) event.category = category;
    if (date !== undefined) event.date = date;
    if (time !== undefined) event.time = time;
    if (endTime !== undefined) event.endTime = endTime;
    if (location !== undefined) event.location = location;
    if (imageUrl !== undefined) event.imageUrl = imageUrl;

    const updated = await event.save();

    return res.json(updated);
  } catch (error) {
    console.error("Error in PUT /api/events/:id:", error);
    return res.status(500).json({
      message: "Error updating event.",
      error: error.message,
    });
  }
}

// -------------------------------------------
// DELETE /api/events/:id
//   Delete an event completely.
//   - Must be logged in.
//   - Must be the business user that created it.
// -------------------------------------------
export async function deleteEvent(req, res) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    // Find the event
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    // Check ownership
    if (!event.createdBy || event.createdBy.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not allowed to delete this event." });
    }

    await event.deleteOne();

    return res.json({ message: "Event deleted successfully." });
  } catch (error) {
    console.error("Error in DELETE /api/events/:id:", error);
    return res.status(500).json({
      message: "Error deleting event.",
      error: error.message,
    });
  }
}

// -------------------------------------------
// GET /api/events/mine
//   Fetch events created by the currently logged-in user.
//   - Must be logged in.
//   - Used for the "My Events" screen so businesses can manage their posts.
// -------------------------------------------
export async function getMyEvents(req, res) {
  try {
    console.log("🌲 getMyEvents hit for user =", req.user?.userId);
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: no user ID." });
    }

    // Find events where createdBy matches this user
    const events = await Event.find({ createdBy: userId })
      .sort({ date: 1 })
      .populate(
        "createdBy",
        "name email role avatarKey town bio lookingFor instagram website"
      );

    return res.json(events);
  } catch (error) {
    console.error("Error in GET /api/events/mine:", error);
    return res.status(500).json({
      message: "Error fetching your events.",
      error: error.message,
    });
  }
}
