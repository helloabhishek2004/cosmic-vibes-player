import express from "express";
import cache from "../services/cache.js";
import { requestPipedTrending } from "../services/providers/piped.js";
import metadataClient from "../services/metadataClient.js";

const router = express.Router();
const CACHE_TTL = 600;

router.get("/", async (req, res) => {
  const country = String(req.query.country || "IN").toUpperCase();
  const cacheKey = `trending:piped:${country}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    // Piped is the canonical live recommendation source.
    const data = await requestPipedTrending(country, 20);
    if (data.length) {
      cache.set(cacheKey, data, CACHE_TTL);
      return res.json(data);
    }

    return res.status(404).json({ error: "No recommendations available." });
  } catch (err) {
    console.warn(`[Trending] Piped failed, attempting metadata fallback...`);

    try {
      const metadataRes = await metadataClient.get(`/trending`, {
        params: { country },
      });

      const data = metadataRes.data;
      if (data && data.length) {
        console.log("[Trending] Metadata fallback succeeded");
        cache.set(cacheKey, data, CACHE_TTL);
        return res.json(data);
      }

      return res.status(404).json({ error: "No recommendations available." });
    } catch (fallbackErr) {
      console.error(`[Trending] Metadata fallback failed: ${fallbackErr.response?.status || fallbackErr.code || fallbackErr.message}`);
      return res.status(502).json({
        error: "Live recommendations are temporarily unavailable.",
      });
    }
  }
});

export default router;
