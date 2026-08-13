import express from "express";
import { query, validationResult } from "express-validator";
import cache from "../services/cache.js";
import { searchPiped } from "../services/providers/piped.js";
import metadataClient from "../services/metadataClient.js";

const router = express.Router();
const CACHE_TTL = 300;

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
    const cacheKey = `search:piped:${queryStr.toLowerCase()}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

    // Piped is the canonical live-search provider. Do not wait for the
    // rate-limited Python/YTMusic service before returning search results.
    try {
      const data = await searchPiped(queryStr, 20);
      if (data.length) {
        cache.set(cacheKey, data, CACHE_TTL);
        return res.json(data);
      }

      return res.status(404).json({ error: "No music results found." });
    } catch (err) {
      console.warn(`[Search] Piped failed, attempting metadata fallback...`);

      try {
        const metadataRes = await metadataClient.get(`/search`, {
          params: { q: queryStr },
        });

        const data = metadataRes.data;
        if (data && data.length) {
          console.log("[Search] Metadata fallback succeeded");
          cache.set(cacheKey, data, CACHE_TTL);
          return res.json(data);
        }

        return res.status(404).json({ error: "No music results found." });
      } catch (fallbackErr) {
        console.error(`[Search] Metadata fallback failed: ${fallbackErr.response?.status || fallbackErr.code || fallbackErr.message}`);
        return res.status(502).json({
          error: "Live search is temporarily unavailable. Please retry shortly.",
        });
      }
    }
  },
);

export default router;
