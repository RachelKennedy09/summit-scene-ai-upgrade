import express from "express";
import {
  getAnalyticsSummary,
  getBusinessAnalytics,
  trackAnalytics,
} from "../controllers/analyticsController.js";
import authMiddleware from "../middleware/auth.js";
import optionalAuth from "../middleware/optionalAuth.js";

const router = express.Router();

router.post("/track", optionalAuth, trackAnalytics);
router.get("/summary", authMiddleware, getAnalyticsSummary);
router.get("/business/:businessId", authMiddleware, getBusinessAnalytics);

export default router;
