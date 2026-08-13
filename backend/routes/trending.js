import express from "express";
import cache from "../services/cache.js";
import { requestPipedTrending } from "../services/providers/piped.js";

const router = express.Router();
const CACHE_TTL = 600;

router.get("/", async (req, res) => {
  const country = String(req.query.country || "IN").toUpperCase();
  const cacheKey = `trending:piped:${country}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    // Piped is the canonical live recommendation source. This avoids the
    // rate-limited Python/YTMusic service and keeps the request path simple.
    const data = await requestPipedTrending(country, 20);
    if (data.length) {
      cache.set(cacheKey, data, CACHE_TTL);
      return res.json(data);
    }

    return res.status(404).json({ error: "No recommendations available." });
  } catch (err) {
    console.error(`[Trending] Piped recommendations failed: ${err.response?.status || err.code || err.message}`);
    return res.status(502).json({
      error: "Live recommendations are temporarily unavailable.",
    });
  }
});

export default router;
