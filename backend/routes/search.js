import express from "express";
import { query, validationResult } from "express-validator";
import metadataClient from "../services/metadataClient.js";
import cache from "../services/cache.js";
import { searchYouTube } from "../services/youtubeSearch.js";

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

    try {
      console.log(`[Search] YTMusic search: ${queryStr}`);
      const response = await metadataClient.get("/search", { params: { q: queryStr } });
      const data = Array.isArray(response.data) ? response.data : [];
      if (data.length) {
        cache.set(cacheKey, data);
        return res.json(data);
      }
      throw new Error("YTMusic returned no results");
    } catch (err) {
      console.warn(`[Search] YTMusic unavailable (${err.response?.status || err.message}); using yt-dlp fallback.`);
      try {
        const data = await searchYouTube(queryStr, 20);
        cache.set(cacheKey, data, 120);
        return res.json(data);
      } catch (fallbackErr) {
        console.error(`[Search] yt-dlp fallback failed: ${fallbackErr.message}`);
        return res.status(502).json({ error: "Live search is temporarily unavailable. Please retry shortly." });
      }
    }
  },
);

export default router;
