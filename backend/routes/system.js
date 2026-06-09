import express from "express";
import { exec } from "child_process";
import { getFFmpegLocation } from "../services/ytdlp.js";
import { isQueueReady } from "../services/queue.js";
import metadataClient from "../services/metadataClient.js";

const router = express.Router();

// Helper to check if a CLI tool exists in the PATH
function checkCommandExists(cmd) {
  return new Promise((resolve) => {
    exec(`${cmd} -version`, { timeout: 1500 }, (error) => {
      resolve(!error);
    });
  });
}

// Helper to check if yt-dlp is available via Python
function checkYtDlpExists() {
  return new Promise((resolve) => {
    const pythonCmd = process.env.PYTHON_PATH || "python";
    exec(`${pythonCmd} -m yt_dlp --version`, { timeout: 1500 }, (error) => {
      resolve(!error);
    });
  });
}

router.get("/health", async (req, res) => {
  try {
    const resolvedFFmpegDir = getFFmpegLocation();

    // Check ffmpeg and ffprobe presence
    const hasFfmpeg = resolvedFFmpegDir !== null || (await checkCommandExists("ffmpeg"));
    const hasFfprobe = resolvedFFmpegDir !== null || (await checkCommandExists("ffprobe"));

    // Check yt-dlp presence
    const hasYtdlp = await checkYtDlpExists();

    // Check Redis connection status
    const redisConnected = isQueueReady();

    // Get Queue Mode
    const queueMode = process.env.QUEUE_MODE || "redis";

    // Check Python service reachability
    let pythonServiceReachable = false;
    try {
      const response = await metadataClient.get("/health", { timeout: 1500 });
      if (response.status === 200 && response.data?.status === "ok") {
        pythonServiceReachable = true;
      }
    } catch (err) {
      pythonServiceReachable = false;
    }

    res.json({
      ffmpeg: hasFfmpeg,
      ffprobe: hasFfprobe,
      ytdlp: hasYtdlp,
      redisConnected,
      queueMode,
      pythonServiceReachable,
    });
  } catch (err) {
    console.error(`[Health Check Error] ${err.message}`);
    res.status(500).json({ error: "Failed to perform system health check" });
  }
});

export default router;
