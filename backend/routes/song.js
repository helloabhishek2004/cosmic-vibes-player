import express from "express";
import { param, validationResult } from "express-validator";
import metadataClient from "../services/metadataClient.js";
import { getYouTubeMetadata } from "../services/youtubeSearch.js";

const router = express.Router();

router.get(
  "/:videoId",
  [param("videoId").trim().notEmpty().withMessage("Video ID is required")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { videoId } = req.params;

    try {
      console.log(`[API Call] Fetching song from Python service: ${videoId}`);
      const response = await metadataClient.get(`/song/${videoId}`);
      if (response.data) return res.json(response.data);
    } catch (err) {
      console.warn(`[Song] Python metadata unavailable (${err.response?.status || err.message}); using yt-dlp fallback.`);
    }

    try {
      const fallback = await getYouTubeMetadata(videoId);
      if (!fallback) return res.status(404).json({ error: "Song not found" });
      return res.json(fallback);
    } catch (fallbackErr) {
      console.error(`[Song] yt-dlp metadata fallback failed: ${fallbackErr.message}`);
      return res.status(502).json({ error: "Song metadata is temporarily unavailable." });
    }
  },
);

export default router;
