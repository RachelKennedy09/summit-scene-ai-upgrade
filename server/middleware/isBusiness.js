// server/middleware/isBusiness.js
// Authorization middleware for SummitScene
//  - Ensures the logged-in user has role "business"
//  - Protects routes like:
//       • POST /api/events
//       • PUT /api/events/:id
//       • DELETE /api/events/:id
//
// REQUIREMENTS:
//  - Must run *after* authMiddleware
//  - Expects req.user to contain { userId, role, name, email }

export default function isBusiness(req, res, next) {
  const user = req.user; // populated by authMiddleware

  // If authentication unexpectedly failed earlier
  if (!user) {
    return res
      .status(401)
      .json({ message: "Not authenticated. Please log in." });
  }

  // Authorization check
  if (user.role !== "business") {
    return res.status(403).json({
      message: "Business account required to perform this action.",
    });
  }

  // Success → User is a business account
  return next();
}
