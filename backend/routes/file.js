import express from "express";
import { param, validationResult } from "express-validator";
import fs from "fs";
import path from "path";
import { downloadQueue, isQueueReady } from "../services/queue.js";
import {
  deleteLocalJob,
  getLocalJobFile,
  isLocalJob,
} from "../services/localJobs.js";

const MIME_BY_EXT = {
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".webm": "audio/webm",
  ".opus": "audio/ogg",
};

function sendAudioFile(res, filePath, title, onComplete) {
  const ext = path.extname(filePath).toLowerCase();
  const safeTitle = (title || "audio").replace(/"/g, "'");
  const encodedTitle = encodeURIComponent(safeTitle);
  const filename = `${safeTitle}${ext || ".m4a"}`;

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodedTitle}${ext}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
  );
  res.setHeader("Content-Type", MIME_BY_EXT[ext] || "application/octet-stream");

  res.download(filePath, filename, (err) => {
    if (err) {
      console.error(`Error during file download stream for ${title}:`, err);
    }
    onComplete?.();
  });
}

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

    const { jobId } = req.params;

    if (isLocalJob(jobId)) {
      const local = getLocalJobFile(jobId);
      if (!local) {
        return res.status(410).json({ error: "File not ready or expired" });
      }
      return sendAudioFile(res, local.filePath, local.title, () => {
        try {
          if (fs.existsSync(local.filePath)) fs.unlinkSync(local.filePath);
        } catch {
          /* ignore */
        }
        deleteLocalJob(jobId);
      });
    }

    if (!isQueueReady()) {
      return res.status(503).json({ error: "Download service unavailable" });
    }

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
      console.log(`[Stream] Starting download stream for: ${title} (${filePath})`);
      sendAudioFile(res, filePath, title, () => {
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
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
