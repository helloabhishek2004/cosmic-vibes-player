import express from "express";
import { param, validationResult } from "express-validator";
import fs from "fs";
import path from "path";
import jobManager from "../services/jobManager.js";

const rawDownloadDir = process.env.DOWNLOAD_DIR || "downloads";
const DOWNLOAD_DIR = path.isAbsolute(rawDownloadDir)
  ? rawDownloadDir
  : path.resolve(process.cwd(), rawDownloadDir);

const MIME_BY_EXT = {
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".webm": "audio/webm",
  ".opus": "audio/ogg",
};

function sendAudioFile(res, filePath, title, onComplete) {
  const ext = path.extname(filePath).toLowerCase();
  // Sanitize filename to prevent header injection or filesystem quirks
  const safeTitle = (title || "audio")
    .replace(/["\\]/g, "") // strip double quotes and backslashes
    .replace(/[^a-zA-Z0-9 -]/g, "_"); // replace non-alphanumeric/spaces/hyphens with underscore
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
      .withMessage("jobId is required")
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage("Invalid jobId format"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { jobId } = req.params;

    try {
      const jobStatus = await jobManager.getJobStatus(jobId);
      if (!jobStatus) {
        return res.status(404).json({ error: "Job not found" });
      }

      if (jobStatus.status !== "done") {
        return res
          .status(400)
          .json({ error: `File download not ready. Job state is currently: ${jobStatus.status}` });
      }

      const filePath = jobStatus.filePath;
      if (!filePath || !fs.existsSync(filePath)) {
        return res
          .status(410)
          .json({ error: "File has expired or is no longer available on the server" });
      }

      // Security: Check for path traversal. Ensure filePath resides under DOWNLOAD_DIR.
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(DOWNLOAD_DIR)) {
        return res.status(403).json({ error: "Access denied. Path traversal detected." });
      }

      const title = jobStatus.title || "audio";
      console.log(`[Stream] Starting download stream for: ${title} (${filePath})`);
      sendAudioFile(res, filePath, title, async () => {
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (unlinkErr) {
          console.error(`Failed to delete temp file ${filePath}:`, unlinkErr);
        }
        await jobManager.cleanupJob(jobId);
      });
    } catch (err) {
      console.error(`Error streaming file for job ${jobId}: ${err.message}`);
      return res.status(500).json({ error: "Failed to download file" });
    }
  },
);

export default router;
