import express from "express";
import fs from "fs";
import { exec } from "child_process";
import { getFFmpegLocation } from "../services/ytdlp.js";
import { getYoutubeCookiesPath } from "../services/cookieManager.js";
import { isQueueReady } from "../services/queue.js";
import metadataClient from "../services/metadataClient.js";
import { PYTHON } from "../services/pythonConfig.js";

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
    exec(`${PYTHON} -m yt_dlp --version`, { timeout: 10000 }, (error) => {
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

// Helper to get Node version
function getNodeVersion() {
  return new Promise((resolve) => {
    exec("node -v", { timeout: 5000 }, (error, stdout) => {
      if (!error && stdout) {
        resolve(stdout.trim());
      } else {
        resolve(null);
      }
    });
  });
}

// Helper to get yt-dlp version
function getYtdlpVersion() {
  return new Promise((resolve) => {
    exec(`${PYTHON} -m yt_dlp --version`, { timeout: 10000 }, (error, stdout) => {
      if (!error && stdout) {
        resolve(stdout.trim());
      } else {
        resolve(null);
      }
    });
  });
}

// Helper to check --js-runtimes node support
function checkJsRuntimesSupport() {
  return new Promise((resolve) => {
    exec(`${PYTHON} -m yt_dlp --js-runtimes node --version`, { timeout: 10000 }, (error) => {
      resolve(!error);
    });
  });
}

router.get("/youtube", async (req, res) => {
  try {
    const ytdlpVersion = await getYtdlpVersion();
    const nodeVersion = await getNodeVersion();
    const jsRuntimesSupported = await checkJsRuntimesSupport();
    const cookiesPath = getYoutubeCookiesPath();

    res.json({
      ytdlpInstalled: !!ytdlpVersion,
      ytdlpVersion: ytdlpVersion || null,
      nodeAvailable: !!nodeVersion,
      nodeVersion: nodeVersion || null,
      jsRuntimesSupported,
      cookiesConfigured: !!cookiesPath,
      cookiesFileExists: !!cookiesPath && fs.existsSync(cookiesPath),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to check YouTube status" });
  }
});

router.get("/cookies", (req, res) => {
  const envCookies = process.env.YOUTUBE_COOKIES;
  const cookiesPath = getYoutubeCookiesPath();
  const fileExists = cookiesPath ? fs.existsSync(cookiesPath) : false;

  res.json({
    envExists: !!(envCookies && envCookies.trim() !== ""),
    cookiesPath: cookiesPath || "null",
    fileExists: fileExists,
  });
});

export default router;
