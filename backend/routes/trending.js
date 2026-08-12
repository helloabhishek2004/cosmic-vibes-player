import express from "express";
import metadataClient from "../services/metadataClient.js";
import cache from "../services/cache.js";

const router = express.Router();
const CACHE_TTL = 600; // 10 minutes

router.get("/", async (req, res) => {
  const country = String(req.query.country || "IN").toUpperCase();
  const cacheKey = `trending:${country}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    console.log(`[Trending] Fetching live charts for country: ${country}`);
    const response = await metadataClient.get("/trending", {
      params: { country },
    });
    const data = Array.isArray(response.data) ? response.data : [];
    cache.set(cacheKey, data, CACHE_TTL);
    return res.json(data);
  } catch (err) {
    console.error(`[Trending] Primary charts request failed: ${err.message}`);

    // Keep the home/discovery page useful if YouTube Music charts temporarily
    // fail. This is still live YouTube Music search data, not mock songs.
    try {
      const fallback = await metadataClient.get("/search", {
        params: { q: "trending music" },
      });
      const data = Array.isArray(fallback.data) ? fallback.data : [];
      if (data.length) cache.set(cacheKey, data, 120);
      return res.json(data);
    } catch (fallbackErr) {
      console.error(`[Trending] Live fallback search failed: ${fallbackErr.message}`);
      return res.status(502).json({ error: "Live recommendations are temporarily unavailable." });
    }
  }
});

export default router;
