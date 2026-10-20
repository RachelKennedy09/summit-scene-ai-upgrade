import express from "express";
import { getPublicEvent, listPublicEvents, sitemapEvents, parsePublicFilters } from "../services/publicEvents.js";
const router = express.Router();
router.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return res.status(405).set("Allow", "GET, HEAD").json({ message: "Read only." });
  res.set("Cache-Control", "public, max-age=30, s-maxage=60");
  res.set("X-Robots-Tag", "noindex");
  next();
});
router.get("/", async (req, res) => {
  try { parsePublicFilters(req.query); } catch (error) { return res.status(400).set("Cache-Control", "no-store").json({ message: error.message }); }
  try { return res.json(await listPublicEvents(req.query)); }
  catch { return res.status(503).set("Cache-Control", "no-store").json({ message: "Events are temporarily unavailable." }); }
});
router.get("/sitemap", async (req, res) => {
  const page = Number(req.query.page || 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 50000) return res.status(400).json({ message: "Invalid sitemap page." });
  try { return res.json(await sitemapEvents(page)); }
  catch { return res.status(503).set("Cache-Control", "no-store").json({ message: "Sitemap unavailable." }); }
});
router.get("/:id", async (req, res) => {
  try {
    const event = await getPublicEvent(req.params.id);
    if (!event) return res.status(404).set("Cache-Control", "no-store").json({ message: "Event not found." });
    return res.json({ event });
  } catch { return res.status(503).set("Cache-Control", "no-store").json({ message: "Event unavailable." }); }
});
export default router;
