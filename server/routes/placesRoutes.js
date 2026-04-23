import express from "express";
import { autocompleteEventAddresses } from "../services/geocoding.js";

const router = express.Router();

router.get("/autocomplete", async (req, res) => {
  try {
    const query = typeof req.query.q === "string" ? req.query.q : "";
    const town = typeof req.query.town === "string" ? req.query.town : "";

    if (!query.trim() || query.trim().length < 3) {
      return res.json([]);
    }

    const suggestions = await autocompleteEventAddresses({ query, town });
    return res.json(suggestions);
  } catch (error) {
    console.error("Places autocomplete error:", error.message);
    return res.status(500).json({
      message: error.message || "Failed to load address suggestions.",
    });
  }
});

export default router;
