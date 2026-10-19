import express from "express";
import AppUpdatePolicy from "../models/AppUpdatePolicy.js";
import authMiddleware from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";
import { compareVersions, defaultUpdatePolicy, STORE_URLS, UPDATE_MESSAGE, validateUpdatePolicy } from "../../utils/appUpdatePolicy.js";

function policyFromDocument(document, platform) {
  const defaults = defaultUpdatePolicy(platform);
  if (!document) return defaults;
  return validateUpdatePolicy(Object.fromEntries(Object.keys(defaults).map((key) => [key, document[key]])), platform);
}

export function createAppVersionRouter({ model = AppUpdatePolicy, authenticate = authMiddleware, authorize = isAdmin, env = process.env } = {}) {
  const router = express.Router();
  router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  router.get("/", async (req, res) => {
    try {
      const documents = await model.find({}).lean();
      const platforms = {};
      for (const platform of ["ios", "android"]) {
        platforms[platform] = policyFromDocument(documents.find((doc) => doc.platform === platform), platform);
      }
      // Keep the unqualified legacy contract stable. Old binaries do not send a
      // platform, so projecting the iOS floor here would also lock out Android.
      let minimumSupportedVersion = env.MIN_SUPPORTED_APP_VERSION || "1.0.2";
      let latestVersion = env.LATEST_APP_VERSION || "1.0.2";
      try { compareVersions(minimumSupportedVersion, latestVersion); }
      catch { minimumSupportedVersion = "0.0.0"; latestVersion = "0.0.0"; }
      return res.json({
        schemaVersion: 2, platforms, minimumSupportedVersion, latestVersion,
        iosStoreUrl: STORE_URLS.ios, androidStoreUrl: STORE_URLS.android,
        optionalUpdateMessage: env.APP_OPTIONAL_UPDATE_MESSAGE || "A newer version of Summit Scene is available.",
        message: env.APP_UPDATE_MESSAGE || UPDATE_MESSAGE,
      });
    } catch {
      return res.status(503).json({ message: "Update settings temporarily unavailable." });
    }
  });

  router.get("/admin", authenticate, authorize, async (req, res) => {
    try {
      const documents = await model.find({}).lean();
      return res.json(Object.fromEntries(["ios", "android"].map((platform) => {
        const doc = documents.find((item) => item.platform === platform);
        return [platform, { revision: doc?.revision || 0, config: policyFromDocument(doc, platform), updatedAt: doc?.updatedAt }];
      })));
    } catch {
      return res.status(503).json({ message: "Could not load update settings." });
    }
  });

  router.put("/admin/:platform", authenticate, authorize, async (req, res) => {
    const { platform } = req.params;
    let config;
    try {
      if (!Number.isSafeInteger(req.body?.expectedRevision) || req.body.expectedRevision < 0) throw new Error("Expected revision is required.");
      config = validateUpdatePolicy(req.body.config, platform);
    } catch (error) { return res.status(400).json({ message: error.message }); }
    try {
      const document = await model.findOneAndUpdate(
        { platform, revision: req.body.expectedRevision },
        { $set: { ...config, updatedBy: req.user.userId }, $inc: { revision: 1 } },
        { new: true, upsert: req.body.expectedRevision === 0, runValidators: true }
      );
      if (!document) return res.status(409).json({ message: "Settings changed. Reload before saving." });
      return res.json({ revision: document.revision, config: policyFromDocument(document, platform) });
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ message: "Settings changed. Reload before saving." });
      return res.status(503).json({ message: "Could not save update settings." });
    }
  });
  return router;
}

export default createAppVersionRouter();
