import express from "express";
import authMiddleware from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";
import {
  createReport,
  getReports,
  updateReportStatus,
} from "../controllers/reportController.js";

const router = express.Router();

router.post("/", authMiddleware, createReport);
router.get("/", authMiddleware, isAdmin, getReports);
router.patch("/:id", authMiddleware, isAdmin, updateReportStatus);

export default router;
