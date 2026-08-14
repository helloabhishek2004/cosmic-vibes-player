import express from "express";
import { getCached, getStaleCached, setCached } from "../services/cache.js";
import { requestPipedTrending } from "../services/providers/piped.js";
import metadataClient from "../services/metadataClient.js";

const router = express.Router();
const CACHE_TTL = 600;
const METADATA_TIMEOUT = 2000;
let metadataBlockedUntil = 0;

router.get("/", async (req, res) => {
  const country = String(req.query.country || "IN").toUpperCase();
  const cacheKey = `trending:${country}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    if (Date.now() < metadataBlockedUntil) throw new Error("metadata circuit open");
    const metadataRes = await metadataClient.get(`/trending`, { params: { country }, timeout: METADATA_TIMEOUT });
    const data = Array.isArray(metadataRes.data) ? metadataRes.data.filter((item) => item?.videoId && item?.title) : [];
    if (data.length) {
      setCached(cacheKey, data, CACHE_TTL);
      data.forEach((item) => setCached(`song:${item.videoId}`, item, 900));
      return res.json(data);
    }
    throw new Error("metadata returned no valid results");
  } catch (err) {
    metadataBlockedUntil = Date.now() + 30_000;
    console.warn(`[Trending] YTMusic unavailable; using bounded fallback: ${err.message}`);

    try {
      const data = (await requestPipedTrending(country, 20)).filter((item) => item?.videoId && item?.title);
      if (data && data.length) {
        setCached(cacheKey, data, CACHE_TTL);
        data.forEach((item) => setCached(`song:${item.videoId}`, item, 900));
        return res.json(data);
      }
    } catch (fallbackErr) {
      console.error(`[Trending] fallback failed: ${fallbackErr.response?.status || fallbackErr.code || fallbackErr.message}`);
    }
    const stale = getStaleCached(cacheKey);
    if (stale) return res.json(stale);
    return res.status(502).json({ error: "Live recommendations are temporarily unavailable." });
  }
});

export default router;
