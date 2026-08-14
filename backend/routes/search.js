import express from "express";
import { query, validationResult } from "express-validator";
import { getCached, getStaleCached, setCached } from "../services/cache.js";
import { searchPiped } from "../services/providers/piped.js";
import metadataClient from "../services/metadataClient.js";

const router = express.Router();
const CACHE_TTL = 300;
const METADATA_TIMEOUT = 2000;
let metadataBlockedUntil = 0;

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
    const cachedData = getCached(cacheKey);
    if (cachedData) return res.json(cachedData);

    // YTMusic is canonical. Public proxy providers are only a bounded fallback.
    try {
      if (Date.now() < metadataBlockedUntil) throw new Error("metadata circuit open");
      const metadataRes = await metadataClient.get(`/search`, { params: { q: queryStr }, timeout: METADATA_TIMEOUT });
      const data = Array.isArray(metadataRes.data) ? metadataRes.data.filter((item) => item?.videoId && item?.title) : [];
      if (data.length) {
        setCached(cacheKey, data, CACHE_TTL);
        data.forEach((item) => setCached(`song:${item.videoId}`, item, 900));
        return res.json(data);
      }
      throw new Error("metadata returned no valid results");
    } catch (err) {
      metadataBlockedUntil = Date.now() + 30_000;
      console.warn(`[Search] YTMusic unavailable; using bounded Piped/Invidious fallback: ${err.message}`);

      try {
        const data = (await searchPiped(queryStr, 20)).filter((item) => item?.videoId && item?.title);
        if (data && data.length) {
          setCached(cacheKey, data, CACHE_TTL);
          data.forEach((item) => setCached(`song:${item.videoId}`, item, 900));
          return res.json(data);
        }
      } catch (fallbackErr) {
        console.error(`[Search] fallback failed: ${fallbackErr.response?.status || fallbackErr.code || fallbackErr.message}`);
      }
      const stale = getStaleCached(cacheKey);
      if (stale) return res.json(stale);
      return res.status(502).json({ error: "Live search is temporarily unavailable. Please retry shortly." });
    }
  },
);

export default router;
