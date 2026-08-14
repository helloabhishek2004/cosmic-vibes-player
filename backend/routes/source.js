import express from "express";
import { param, validationResult } from "express-validator";
import metadataClient from "../services/metadataClient.js";
import { resolveAudioSourceDetailed, getSourceProviderStatus } from "../services/sourceResolver.js";

const router = express.Router();

router.get("/status", (_req, res) => {
  res.json(getSourceProviderStatus());
});

router.get(
  "/:videoId",
  [param("videoId").trim().notEmpty().withMessage("videoId is required")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { videoId } = req.params;
      const response = await metadataClient.get(`/song/${videoId}`);
      const result = await resolveAudioSourceDetailed(response.data);
      const source = result.source;

      if (!source) {
        return res.status(404).json({
          error: "No compatible licensed/open audio source was found for this song.",
          videoId,
          providers: getSourceProviderStatus(),
          diagnostics: result.diagnostics,
        });
      }

      return res.json({
        sourceType: source.provider === "audius" ? "open-audio" : "proxy",
        provider: source.provider,
        bitrate: source.bitrate || null,
        expiresAt: source.expiresAt || null,
        ...source,
      });
    } catch (error) {
      console.error(`[Source API] ${error.message}`);
      return res.status(502).json({ error: "Audio source resolution failed" });
    }
  },
);

export default router;
