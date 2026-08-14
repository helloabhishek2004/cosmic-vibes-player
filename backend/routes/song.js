import express from "express";
import { param, validationResult } from "express-validator";
import metadataClient from "../services/metadataClient.js";
import { getCached } from "../services/cache.js";
import { getPipedMetadata } from "../services/providers/piped.js";
import { getYouTubeMetadata } from "../services/youtubeSearch.js";

const router = express.Router();

router.get(
  "/:videoId",
  [param("videoId").trim().notEmpty().withMessage("Video ID is required")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { videoId } = req.params;

    const cached = getCached(`song:${videoId}`);
    if (cached?.videoId && cached?.title && cached.title !== "Unknown Title") return res.json(cached);

    try {
      console.log(`[API Call] Fetching song from Python service: ${videoId}`);
      const response = await metadataClient.get(`/song/${videoId}`, { timeout: 2000 });
      if (response.data?.videoId && response.data?.title && response.data.title !== "Unknown Title") return res.json(response.data);
    } catch (err) {
      console.warn(`[Song] Python metadata unavailable (${err.response?.status || err.message}); using Piped fallback.`);
    }

    try {
      const piped = await getPipedMetadata(videoId);
      if (piped) return res.json(piped);
    } catch (err) {
      console.warn(`[Song] Piped metadata unavailable for ${videoId}: ${err.message}`);
    }

    try {
      const fallback = await getYouTubeMetadata(videoId);
      if (!fallback) return res.status(404).json({ error: "Song not found" });
      return res.json(fallback);
    } catch (fallbackErr) {
      console.error(`[Song] All metadata providers failed: ${fallbackErr.message}`);
      return res.status(502).json({ error: "Song metadata is temporarily unavailable." });
    }
  },
);

export default router;
