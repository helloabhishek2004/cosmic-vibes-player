import express from "express";
import metadataClient from "../services/metadataClient.js";
import cache from "../services/cache.js";

const router = express.Router();
const CACHE_KEY = "trending:US";
const CACHE_TTL = 600; // 10 minutes

router.get("/", async (_req, res) => {
  const cached = cache.get(CACHE_KEY);
  if (cached) {
    return res.json(cached);
  }

  try {
    const response = await metadataClient.get("/trending", {
      params: { country: "US" },
    });
    const data = response.data || [];
    cache.set(CACHE_KEY, data, CACHE_TTL);
    return res.json(data);
  } catch (err) {
    console.error(`Trending error: ${err.message}`);
    return res.status(500).json({ error: "Failed to fetch trending songs." });
  }
});

export default router;
