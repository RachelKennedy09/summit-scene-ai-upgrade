// server/middleware/auth.js
// Authentication middleware for SummitScene
//  - Protects routes that require the user to be logged in
//  - Reads the Authorization header: "Bearer <JWT>"
//  - Verifies the JWT signature
//  - Attaches the decoded payload (userId, role, name, email) to req.user
//
// USED BY:
//  - /api/events (business-only create/update/delete)
//  - /api/community (all actions require login)
//  - /api/users (profile updates, upgrade-to-business)
//  - /api/auth/me (session restore)

import jwt from "jsonwebtoken";

export default function authMiddleware(req, res, next) {
  // Expecting: Authorization: Bearer <token>
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res
      .status(401)
      .json({ message: "No authorization header provided." });
  }

  // Split by whitespace, supports formats like:
  //   "Bearer token" or "bearer token"
  const [type, token] = authHeader.split(/\s+/);

  // Validate format
  if (!type || type.toLowerCase() !== "bearer" || !token) {
    return res.status(401).json({ message: "Invalid authorization format." });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not set in environment variables.");
    }

    // Verify signature + expiration
    // decoded payload includes: userId, role, name, email, etc.
    const decoded = jwt.verify(token, secret);

    // Attach user info to request for downstream controllers
    req.user = decoded;

    return next();
  } catch (error) {
    console.error("authMiddleware error:", error.message);

    // Handle expired JWT separately 
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Token expired. Please log in again." });
    }

    // Any other error means invalid token
    return res
      .status(401)
      .json({ message: "Invalid token. Please log in again." });
  }
}
