// server/middleware/isBusiness.js
// Authorization middleware for SummitScene
//  - Ensures the logged-in user has a verified business profile
//  - Protects official event routes like POST/PUT/DELETE /api/events

import User from "../models/User.js";

function getAdminEmails() {
  return String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export default async function isBusiness(req, res, next) {
  const user = req.user;

  if (!user) {
    return res
      .status(401)
      .json({ message: "Not authenticated. Please log in." });
  }

  try {
    const fullUser = await User.findById(user.userId).select(
      "email role businessVerificationStatus"
    );

    if (!fullUser) {
      return res.status(401).json({ message: "User not found." });
    }

    const adminEmails = getAdminEmails();
    const tokenEmail = user.email?.toLowerCase();
    const dbEmail = fullUser.email?.toLowerCase();
    if (
      (tokenEmail && adminEmails.includes(tokenEmail)) ||
      (dbEmail && adminEmails.includes(dbEmail))
    ) {
      return next();
    }

    if (
      fullUser.role !== "business" ||
      fullUser.businessVerificationStatus !== "verified"
    ) {
      return res.status(403).json({
        message:
          "A verified business or organizer profile is required for official event posting.",
      });
    }

    return next();
  } catch (error) {
    console.error("Business verification check failed:", error);
    return res.status(500).json({
      message: "Server error while checking business verification.",
    });
  }
}
