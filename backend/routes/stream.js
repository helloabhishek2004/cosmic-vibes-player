import express from "express";
import { param, validationResult } from "express-validator";
import { spawnYtDlp } from "../services/ytdlpSpawn.js";

const router = express.Router();

router.get(
  "/:videoId",
  [
    param("videoId")
      .trim()
      .notEmpty()
      .withMessage("Video ID is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { videoId } = req.params;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    console.log(`[Audio Stream] Streaming real-time audio for video: ${videoId}`);

    // Prefer m4a for broader browser support; fall back to webm opus.
    const args = [
      "-f",
      "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best",
      "--no-playlist",
      "-o",
      "-",
      videoUrl,
    ];

    const child = spawnYtDlp(args);
    let contentTypeSet = false;

    const setContentType = (line) => {
      if (contentTypeSet) return;
      if (/\.m4a|audio.?mp4/i.test(line)) {
        res.setHeader("Content-Type", "audio/mp4");
        contentTypeSet = true;
      } else if (/\.webm|audio.?webm/i.test(line)) {
        res.setHeader("Content-Type", "audio/webm");
        contentTypeSet = true;
      }
    };

    child.stderr.on("data", (data) => {
      const text = data.toString();
      setContentType(text);
      if (/error|unable/i.test(text)) {
        console.error(`[Audio Stream] yt-dlp: ${text.trim()}`);
      }
    });

    child.stdout.on("data", () => {
      if (!contentTypeSet && !res.headersSent) {
        res.setHeader("Content-Type", "audio/webm");
        contentTypeSet = true;
      }
    });

    child.stdout.pipe(res);

    child.on("close", (code) => {
      console.log(`[Audio Stream] Completed streaming with exit code ${code} for video: ${videoId}`);
      res.end();
    });

    child.on("error", (err) => {
      console.error(`[Audio Stream] Error spawning yt-dlp:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to stream audio" });
      }
    });

    // If user stops playing or closes the tab, kill the child process to save CPU/Network
    req.on("close", () => {
      console.log(`[Audio Stream] Connection closed by client. Killing process for video: ${videoId}`);
      try {
        child.kill();
      } catch (err) {
        // Process might already be dead
      }
    });
  }
);

export default router;
