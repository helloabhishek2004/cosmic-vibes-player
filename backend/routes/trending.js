import express from "express";
import metadataClient from "../services/metadataClient.js";
import cache from "../services/cache.js";
import { searchYouTube } from "../services/youtubeSearch.js";

const router = express.Router();
const CACHE_TTL = 600;

router.get("/", async (req, res) => {
  const country = String(req.query.country || "IN").toUpperCase();
  const cacheKey = `trending:${country}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    console.log(`[Trending] Fetching live charts for country: ${country}`);
    const response = await metadataClient.get("/trending", { params: { country } });
    const data = Array.isArray(response.data) ? response.data : [];
    if (data.length) {
      cache.set(cacheKey, data, CACHE_TTL);
      return res.json(data);
    }
    throw new Error("YTMusic returned no chart tracks");
  } catch (err) {
    console.warn(`[Trending] YTMusic charts unavailable (${err.response?.status || err.message}); using yt-dlp search fallback.`);
    try {
      const query = country === "IN" ? "top songs India 2026" : `top songs ${country} 2026`;
      const data = await searchYouTube(query, 20);
      if (data.length) {
        cache.set(cacheKey, data, 120);
        return res.json(data);
      }
    } catch (fallbackErr) {
      console.error(`[Trending] yt-dlp fallback failed: ${fallbackErr.message}`);
    }

    return res.status(502).json({ error: "Live recommendations are temporarily unavailable." });
  }
});

export default router;
