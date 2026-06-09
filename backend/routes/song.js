import express from "express";
import { param, validationResult } from "express-validator";
import metadataClient from "../services/metadataClient.js";

const router = express.Router();

router.get(
  "/:videoId",
  [param("videoId").trim().notEmpty().withMessage("Video ID is required")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { videoId } = req.params;

    try {
      console.log(`[API Call] Fetching song from Python service: ${videoId}`);
      const response = await metadataClient.get(`/song/${videoId}`);
      return res.json(response.data);
    } catch (err) {
      console.error(`Song details error calling Python service: ${err.message}`);

      if (err.response && err.response.status === 404) {
        return res.status(404).json({ error: "Song not found" });
      }

      return res.status(500).json({ error: "Failed to fetch song details" });
    }
  },
);

export default router;
