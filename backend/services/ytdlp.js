import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { spawnYtDlp } from "./ytdlpSpawn.js";
import { getYoutubeCookiesPath } from "./cookieManager.js";

dotenv.config();

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

  const commonDirs = ["/usr/bin", "/usr/local/bin", "/usr/sbin", "/usr/local/sbin", "/opt/homebrew/bin"];
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
export function getFfmpegLocation() { return FFMPEG_LOCATION; }

function findDownloadedFile(outputDir, videoId) {
  const prefix = `${videoId}.`;
  const match = fs.readdirSync(outputDir).find((name) => name.startsWith(prefix) && !name.endsWith(".part"));
  return match ? path.join(outputDir, match) : null;
}

function serializeMetadataValue(value = "") {
  return String(value).replace(/[`$;|&<>]/g, "").replace(/(["\\])/g, "\\$1");
}

function buildPostprocessorArgs(metadata) {
  if (!metadata) return null;
  const fields = [["title", metadata.title], ["artist", metadata.artist], ["album", metadata.album], ["date", metadata.year]];
  const metadataArgs = fields
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(([key, value]) => `-metadata ${key}="${serializeMetadataValue(value)}"`)
    .join(" ");
  return ["-id3v2_version", "3", metadataArgs].filter(Boolean).join(" ");
}

function isAuthFailure(text) {
  const lower = text.toLowerCase();
  return lower.includes("sign in to confirm you're not a bot") ||
    lower.includes("cookies are no longer valid") ||
    lower.includes("authentication needs to be refreshed");
}

function runDownload({ args, outputDir, videoId, onProgress, useCookies }) {
  return new Promise((resolve, reject) => {
    console.log(`[yt-dlp] Downloading ${videoId} (${useCookies ? "authenticated-web" : "fallback-android"})`);
    const child = spawnYtDlp(args);
    let errorOutput = "";

    child.stdout.on("data", (data) => {
      const text = data.toString();
      const match = text.match(/\[download\]\s+([\d.]+)%/);
      if (match && onProgress) onProgress(Math.min(parseFloat(match[1]), 99));
    });
    child.stderr.on("data", (data) => { errorOutput += data.toString(); });

    child.on("close", (code) => {
      if (code === 0) {
        const filePath = findDownloadedFile(outputDir, videoId);
        if (filePath) {
          if (onProgress) onProgress(100);
          return resolve(filePath);
        }
        return reject(new Error(`Download finished but no audio file found for ${videoId} in ${outputDir}`));
      }
      const error = new Error(`yt-dlp exited with code ${code}. Error: ${errorOutput || "Unknown yt-dlp error"}`);
      error.code = isAuthFailure(errorOutput) ? "YOUTUBE_AUTH_REQUIRED" : "YOUTUBE_DOWNLOAD_FAILED";
      error.details = errorOutput;
      reject(error);
    });
    child.on("error", reject);
  });
}

export function downloadAudio(videoId, outputDir, onProgress, metadata) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      const outputTemplate = path.join(outputDir, `${videoId}.%(ext)s`);
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const postprocessorArgs = buildPostprocessorArgs(metadata);
      const maxFileSize = process.env.MAX_FILE_SIZE || "100M";
      const maxDurationSec = parseInt(process.env.MAX_VIDEO_DURATION_SECONDS || "1200", 10);
      const limitRate = process.env.DOWNLOAD_RATE_LIMIT || "10M";
      const cookiesPath = getYoutubeCookiesPath();
      const cookiesAvailable = !!(cookiesPath && fs.existsSync(cookiesPath));

      const baseArgs = [
        "-f", "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best",
        "--no-playlist", "--no-check-certificates", "--cache-dir", path.join(outputDir, ".cache"),
        "--no-live", "--extract-audio", "--audio-format", "mp3", "--audio-quality", "0",
        "--embed-thumbnail", "--add-metadata", "--max-filesize", maxFileSize,
        "--match-filter", `duration <= ${maxDurationSec}`, "--limit-rate", limitRate,
        "--concurrent-fragments", "1", "--js-runtimes", "node", "--remote-components", "ejs:github",
      ];

      const makeArgs = (useCookies) => {
        const args = [...baseArgs];
        if (useCookies && cookiesPath) {
          args.push("--cookies", cookiesPath, "--extractor-args", "youtube:player_client=web");
        } else {
          args.push("--extractor-args", "youtube:player_client=android");
        }
        if (FFMPEG_LOCATION) args.push("--ffmpeg-location", FFMPEG_LOCATION);
        if (postprocessorArgs) args.push("--postprocessor-args", `ffmpeg:${postprocessorArgs}`);
        args.push("-o", outputTemplate, videoUrl);
        return args;
      };

      try {
        resolve(await runDownload({ args: makeArgs(cookiesAvailable), outputDir, videoId, onProgress, useCookies: cookiesAvailable }));
      } catch (firstError) {
        if (cookiesAvailable && firstError.code === "YOUTUBE_AUTH_REQUIRED") {
          console.warn(`[yt-dlp] Authenticated download failed for ${videoId}; retrying without cookies.`);
          try {
            resolve(await runDownload({ args: makeArgs(false), outputDir, videoId, onProgress, useCookies: false }));
            return;
          } catch (fallbackError) {
            fallbackError.code = fallbackError.code || "YOUTUBE_AUTH_REQUIRED";
            reject(fallbackError);
            return;
          }
        }
        reject(firstError);
      }
    } catch (err) {
      reject(err);
    }
  });
}
