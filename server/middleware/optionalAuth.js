// server/middleware/optionalAuth.js
// Attaches req.user when a valid Bearer token is present, but never blocks
// public routes when the token is missing.

import jwt from "jsonwebtoken";

export default function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();

  const [type, token] = authHeader.split(/\s+/);
  if (!type || type.toLowerCase() !== "bearer" || !token) return next();

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return next();
    req.user = jwt.verify(token, secret);
  } catch {
    // Public route: ignore invalid optional auth and continue unauthenticated.
  }

  return next();
}
