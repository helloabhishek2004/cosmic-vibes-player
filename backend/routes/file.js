import express from "express";
import { param, validationResult } from "express-validator";
import fs from "fs";
import path from "path";
import { downloadQueue, isQueueReady } from "../services/queue.js";

const router = express.Router();

router.get(
  "/:jobId",
  [
    param("jobId")
      .trim()
      .notEmpty()
      .withMessage("jobId is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!isQueueReady()) {
      return res.status(503).json({ error: "Download service unavailable" });
    }

    const { jobId } = req.params;

    try {
      const job = await downloadQueue.getJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      const state = await job.getState();
      if (state !== "completed") {
        return res.status(400).json({ error: `File download not ready. Job state is currently: ${state}` });
      }

      // The worker returns the final MP3 file path
      const filePath = job.returnvalue;
      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(410).json({ error: "File has expired or is no longer available on the server" });
      }

      const title = job.data.title || "audio";
      // Clean title for filename header (replace double quotes and normalize)
      const safeTitle = title.replace(/"/g, "'");
      const encodedTitle = encodeURIComponent(safeTitle);

      // Support UTF-8 encoded filename for special characters
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodedTitle}.mp3"; filename*=UTF-8''${encodedTitle}.mp3`
      );
      res.setHeader("Content-Type", "audio/mpeg");

      console.log(`[Stream] Starting download stream for: ${title} (${filePath})`);
      res.download(filePath, `${safeTitle}.mp3`, (err) => {
        if (err) {
          console.error(`Error during file download stream for ${title}:`, err);
        } else {
          console.log(`[Stream] Download stream finished. Cleaning up file from disk: ${filePath}`);
        }

        // Always attempt deletion after transmission is completed or failed
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (unlinkErr) {
          console.error(`Failed to delete temp file ${filePath}:`, unlinkErr);
        }
      });

    } catch (err) {
      console.error(`Error streaming file for job ${jobId}: ${err.message}`);
      return res.status(500).json({ error: "Failed to download file" });
    }
  }
);

export default router;
