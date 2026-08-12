import express from "express";
import { query, validationResult } from "express-validator";
import metadataClient from "../services/metadataClient.js";
import cache from "../services/cache.js";
import { searchYouTube } from "../services/youtubeSearch.js";
import { searchPiped } from "../services/providers/piped.js";

const router = express.Router();

router.get(
  "/",
  [
    query("q")
      .trim()
      .isLength({ min: 2 })
      .withMessage("Search query must be at least 2 characters long"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const queryStr = String(req.query.q).trim();
    const cacheKey = `search:${queryStr.toLowerCase()}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

    // YTMusic remains the preferred metadata source when it is healthy.
    try {
      console.log(`[Search] YTMusic search: ${queryStr}`);
      const response = await metadataClient.get("/search", { params: { q: queryStr }, timeout: 6000 });
      const data = Array.isArray(response.data) ? response.data : [];
      if (data.length) {
        cache.set(cacheKey, data);
        return res.json(data);
      }
    } catch (err) {
      console.warn(`[Search] YTMusic unavailable (${err.response?.status || err.message}); trying Piped.`);
    }

    // Piped is the primary datacenter-safe fallback: it returns YouTube search
    // metadata without requiring browser cookies on this Render instance.
    try {
      const data = await searchPiped(queryStr, 20);
      if (data.length) {
        cache.set(cacheKey, data, 300);
        return res.json(data);
      }
    } catch (err) {
      console.warn(`[Search] Piped unavailable (${err.response?.status || err.message}); trying yt-dlp.`);
    }

    try {
      const data = await searchYouTube(queryStr, 20);
      cache.set(cacheKey, data, 120);
      return res.json(data);
    } catch (fallbackErr) {
      console.error(`[Search] All live search providers failed: ${fallbackErr.message}`);
      return res.status(502).json({ error: "Live search is temporarily unavailable. Please retry shortly." });
    }
  },
);

export default router;
