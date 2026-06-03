import express from "express";
import { spawn } from "child_process";
import { param, validationResult } from "express-validator";

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

    // Set headers for audio streaming
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Transfer-Encoding", "chunked");

    console.log(`[Audio Stream] Streaming real-time audio for video: ${videoId}`);

    // yt-dlp arguments: stream best audio, write to stdout (-)
    const args = [
      "-f", "bestaudio",
      "-o", "-",
      videoUrl
    ];

    // spawn with shell: true for Windows executable resolution
    const child = spawn("yt-dlp", args, { shell: true });

    // Pipe the stdout directly to the express response
    child.stdout.pipe(res);

    child.stderr.on("data", (data) => {
      // Log errors if necessary, but don't output to user
    });

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
