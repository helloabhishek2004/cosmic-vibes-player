import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { spawnYtDlp } from "./ytdlpSpawn.js";
import { getYoutubeCookiesPath } from "./cookieManager.js";

dotenv.config();

/**
 * Dynamically resolves the directory containing FFmpeg and FFprobe binaries.
 * Checks environment overrides first, then searches common system paths,
 * and falls back to local bin/ folders.
 */
export function getFFmpegLocation() {
  if (process.env.FFMPEG_LOCATION) {
    const overridePath = path.resolve(process.env.FFMPEG_LOCATION);
    try {
      if (fs.existsSync(overridePath)) {
        const stats = fs.statSync(overridePath);
        if (stats.isDirectory()) return overridePath;
        if (stats.isFile()) return path.dirname(overridePath);
      }
    } catch (err) {
      console.warn(`[Startup] Failed to check FFMPEG_LOCATION override: ${err.message}`);
    }
  }

  const commonDirs = [
    "/usr/bin",
    "/usr/local/bin",
    "/usr/sbin",
    "/usr/local/sbin",
    "/opt/homebrew/bin",
  ];

  for (const dir of commonDirs) {
    const isWindows = process.platform === "win32";
    const ffmpegPath = path.join(dir, isWindows ? "ffmpeg.exe" : "ffmpeg");
    const ffprobePath = path.join(dir, isWindows ? "ffprobe.exe" : "ffprobe");
    if (fs.existsSync(ffmpegPath) && fs.existsSync(ffprobePath)) return dir;
  }

  const isWindows = process.platform === "win32";
  const binaryName = isWindows ? "ffmpeg.exe" : "ffmpeg";
  const localBinPath = path.join(process.cwd(), "bin");
  if (fs.existsSync(path.join(localBinPath, binaryName))) return localBinPath;

  const localBackendBinPath = path.join(process.cwd(), "backend", "bin");
  if (fs.existsSync(path.join(localBackendBinPath, binaryName))) return localBackendBinPath;

  return null;
}

const FFMPEG_LOCATION = getFFmpegLocation();

export function getFfmpegLocation() {
  return FFMPEG_LOCATION;
}

function findDownloadedFile(outputDir, videoId) {
  const prefix = `${videoId}.`;
  const match = fs.readdirSync(outputDir).find(
    (name) => name.startsWith(prefix) && !name.endsWith(".part"),
  );
  return match ? path.join(outputDir, match) : null;
}

function serializeMetadataValue(value = "") {
  return String(value)
    .replace(/[`$;|&<>]/g, "")
    .replace(/(["\\])/g, "\\$1");
}

function buildPostprocessorArgs(metadata) {
  if (!metadata) return null;

  const fields = [
    ["title", metadata.title],
    ["artist", metadata.artist],
    ["album", metadata.album],
    ["date", metadata.year],
  ];

  const metadataArgs = fields
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(([key, value]) => `-metadata ${key}="${serializeMetadataValue(value)}"`)
    .join(" ");

  return ["-id3v2_version", "3", metadataArgs].filter(Boolean).join(" ");
}

/**
 * Downloads audio from YouTube and converts it to mp3 with embedded metadata.
 */
export function downloadAudio(videoId, outputDir, onProgress, metadata) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const outputTemplate = path.join(outputDir, `${videoId}.%(ext)s`);
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const postprocessorArgs = buildPostprocessorArgs(metadata);
    const maxFileSize = process.env.MAX_FILE_SIZE || "100M";
    const maxDurationSec = parseInt(process.env.MAX_VIDEO_DURATION_SECONDS || "1200", 10);
    const limitRate = process.env.DOWNLOAD_RATE_LIMIT || "10M";
    const cookiesPath = getYoutubeCookiesPath();
    const args = [
      "-f",
      "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best",
      "--no-playlist",
      "--no-check-certificates",
      "--cache-dir",
      path.join(outputDir, ".cache"),
      "--no-live",
      "--extract-audio",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "0",
      "--embed-thumbnail",
      "--add-metadata",
      "--max-filesize",
      maxFileSize,
      "--match-filter",
      `duration <= ${maxDurationSec}`,
      "--limit-rate",
      limitRate,
      "--concurrent-fragments",
      "1",
      "--js-runtimes",
      "node",
      "--remote-components",
      "ejs:github",
    ];

    if (cookiesPath && fs.existsSync(cookiesPath)) {
      args.push("--cookies", cookiesPath);
      args.push("--extractor-args", "youtube:player_client=web");
    } else {
      args.push("--extractor-args", "youtube:player_client=android");
    }

    if (FFMPEG_LOCATION) args.push("--ffmpeg-location", FFMPEG_LOCATION);
    if (postprocessorArgs) args.push("--postprocessor-args", `ffmpeg:${postprocessorArgs}`);
    args.push("-o", outputTemplate, videoUrl);

    console.log(`[yt-dlp] Downloading: ${videoId}`);
    console.log(`[yt-dlp] Cookies enabled: ${!!cookiesPath}`);
    console.log(`[yt-dlp] JS runtime: node`);
    console.log(`[yt-dlp] Spawning with arguments: ${args.join(" ")}`);

    const child = spawnYtDlp(args);
    let errorOutput = "";

    child.stdout.on("data", (data) => {
      const text = data.toString();
      const match = text.match(/\[download\]\s+([\d.]+)%/);
      if (match && onProgress) onProgress(Math.min(parseFloat(match[1]), 99));
    });

    child.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        const filePath = findDownloadedFile(outputDir, videoId);
        if (filePath) {
          if (onProgress) onProgress(100);
          resolve(filePath);
        } else {
          reject(new Error(`Download finished but no audio file found for ${videoId} in ${outputDir}`));
        }
        return;
      }

      const lower = errorOutput.toLowerCase();
      if (lower.includes("sign in to confirm you're not a bot") || lower.includes("cookies expired")) {
        const authError = new Error("YouTube cookies may be expired or rejected");
        authError.code = "YOUTUBE_AUTH_REQUIRED";
        reject(authError);
      } else if (lower.includes("http error 403") || lower.includes("forbidden")) {
        const forbiddenError = new Error("YouTube access forbidden (403). Try refreshing cookies.");
        forbiddenError.code = "YOUTUBE_DOWNLOAD_FORBIDDEN";
        reject(forbiddenError);
      } else {
        reject(new Error(`yt-dlp exited with code ${code}. Error: ${errorOutput || "Unknown yt-dlp error"}`));
      }
    });

    child.on("error", reject);
  });
}
