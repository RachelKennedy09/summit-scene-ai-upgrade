import express from "express";
import authMiddleware from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";
import {
  applyReportAction,
  createReport,
  getReports,
  updateReportStatus,
} from "../controllers/reportController.js";

const router = express.Router();

router.post("/", authMiddleware, createReport);
router.get("/", authMiddleware, isAdmin, getReports);
router.patch("/:id", authMiddleware, isAdmin, updateReportStatus);
router.post("/:id/actions", authMiddleware, isAdmin, applyReportAction);

export default router;
