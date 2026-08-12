import express from "express";
import fs from "fs";
import { exec } from "child_process";
import { getFFmpegLocation } from "../services/ytdlp.js";
import { getYoutubeCookiesPath } from "../services/cookieManager.js";
import { isQueueReady } from "../services/queue.js";
import metadataClient from "../services/metadataClient.js";
import { PYTHON } from "../services/pythonConfig.js";
import { resolveAudioSource, getSourceProviderStatus } from "../services/sourceResolver.js";

const router = express.Router();

function checkCommandExists(cmd) {
  return new Promise((resolve) => {
    exec(`${cmd} -version`, { timeout: 1500 }, (error) => resolve(!error));
  });
}

function checkYtDlpExists() {
  return new Promise((resolve) => {
    exec(`${PYTHON} -m yt_dlp --version`, { timeout: 10000 }, (error) => resolve(!error));
  });
}

router.get("/health", async (req, res) => {
  try {
    const resolvedFFmpegDir = getFFmpegLocation();
    const hasFfmpeg = resolvedFFmpegDir !== null || (await checkCommandExists("ffmpeg"));
    const hasFfprobe = resolvedFFmpegDir !== null || (await checkCommandExists("ffprobe"));
    const hasYtdlp = await checkYtDlpExists();
    const redisConnected = isQueueReady();
    const queueMode = process.env.QUEUE_MODE || "redis";
    let pythonServiceReachable = false;
    try {
      const response = await metadataClient.get("/health", { timeout: 1500 });
      pythonServiceReachable = response.status === 200 && response.data?.status === "ok";
    } catch {}
    res.json({ ffmpeg: hasFfmpeg, ffprobe: hasFfprobe, ytdlp: hasYtdlp, redisConnected, queueMode, pythonServiceReachable });
  } catch (err) {
    console.error(`[Health Check Error] ${err.message}`);
    res.status(500).json({ error: "Failed to perform system health check" });
  }
});

function getNodeVersion() {
  return new Promise((resolve) => exec("node -v", { timeout: 5000 }, (error, stdout) => resolve(!error && stdout ? stdout.trim() : null)));
}

function getYtdlpVersion() {
  return new Promise((resolve) => exec(`${PYTHON} -m yt_dlp --version`, { timeout: 10000 }, (error, stdout) => resolve(!error && stdout ? stdout.trim() : null)));
}

function checkJsRuntimesSupport() {
  return new Promise((resolve) => exec(`${PYTHON} -m yt_dlp --js-runtimes node --version`, { timeout: 10000 }, (error) => resolve(!error)));
}

router.get("/youtube", async (req, res) => {
  try {
    const ytdlpVersion = await getYtdlpVersion();
    const nodeVersion = await getNodeVersion();
    const jsRuntimesSupported = await checkJsRuntimesSupport();
    const cookiesPath = getYoutubeCookiesPath();
    res.json({ ytdlpInstalled: !!ytdlpVersion, ytdlpVersion: ytdlpVersion || null, nodeAvailable: !!nodeVersion, nodeVersion: nodeVersion || null, jsRuntimesSupported, cookiesConfigured: !!cookiesPath, cookiesFileExists: !!cookiesPath && fs.existsSync(cookiesPath) });
  } catch (err) {
    res.status(500).json({ error: "Failed to check YouTube status" });
  }
});

router.get("/cookies", (req, res) => {
  const envCookies = process.env.YOUTUBE_COOKIES;
  const cookiesPath = getYoutubeCookiesPath();
  res.json({ envExists: !!(envCookies && envCookies.trim() !== ""), cookiesPath: cookiesPath || "null", fileExists: !!cookiesPath && fs.existsSync(cookiesPath) });
});

router.get("/sources", (_req, res) => {
  res.json(getSourceProviderStatus());
});

router.get("/source/:videoId", async (req, res) => {
  try {
    const response = await metadataClient.get(`/song/${req.params.videoId}`);
    const source = await resolveAudioSource(response.data);
    if (!source) return res.status(404).json({ error: "No independent audio source matched", providers: getSourceProviderStatus() });
    return res.json({ ...source, streamUrl: undefined });
  } catch (error) {
    return res.status(502).json({ error: "Source resolution failed", details: error.message });
  }
});

export default router;
