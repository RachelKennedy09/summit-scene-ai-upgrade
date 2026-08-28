import express from "express";
import {
  deleteAttributionAnalytics,
  getAnalyticsAttributions,
  getAnalyticsSummary,
  getAttributionAnalytics,
  getBusinessAnalytics,
  trackAnalytics,
} from "../controllers/analyticsController.js";
import authMiddleware from "../middleware/auth.js";
import optionalAuth from "../middleware/optionalAuth.js";

const router = express.Router();

router.post("/track", optionalAuth, trackAnalytics);
router.get("/summary", authMiddleware, getAnalyticsSummary);
router.get("/attributions", authMiddleware, getAnalyticsAttributions);
router.get("/attribution/:attributionKey", authMiddleware, getAttributionAnalytics);
router.delete("/attribution/:attributionKey", authMiddleware, deleteAttributionAnalytics);
router.get("/business/:businessId", authMiddleware, getBusinessAnalytics);

export default router;
