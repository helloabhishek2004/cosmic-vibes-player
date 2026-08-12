import express from "express";
import metadataClient from "../services/metadataClient.js";
import cache from "../services/cache.js";
import { searchYouTube } from "../services/youtubeSearch.js";
import { requestPipedTrending } from "../services/providers/piped.js";

const router = express.Router();
const CACHE_TTL = 600;

router.get("/", async (req, res) => {
  const country = String(req.query.country || "IN").toUpperCase();
  const cacheKey = `trending:${country}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    console.log(`[Trending] Fetching live charts for country: ${country}`);
    const response = await metadataClient.get("/trending", { params: { country }, timeout: 6000 });
    const data = Array.isArray(response.data) ? response.data : [];
    if (data.length) {
      cache.set(cacheKey, data, CACHE_TTL);
      return res.json(data);
    }
  } catch (err) {
    console.warn(`[Trending] YTMusic unavailable (${err.response?.status || err.message}); trying Piped.`);
  }

  try {
    const data = await requestPipedTrending(country);
    if (data.length) {
      cache.set(cacheKey, data, CACHE_TTL);
      return res.json(data);
    }
  } catch (err) {
    console.warn(`[Trending] Piped unavailable (${err.response?.status || err.message}); trying yt-dlp.`);
  }

  try {
    const query = country === "IN" ? "top songs India 2026" : `top songs ${country} 2026`;
    const data = await searchYouTube(query, 20);
    if (data.length) {
      cache.set(cacheKey, data, 120);
      return res.json(data);
    }
  } catch (fallbackErr) {
    console.error(`[Trending] All recommendation providers failed: ${fallbackErr.message}`);
  }

  return res.status(502).json({ error: "Live recommendations are temporarily unavailable." });
});

export default router;
