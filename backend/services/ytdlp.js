import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { spawnYtDlp } from "./ytdlpSpawn.js";

dotenv.config();

const FFMPEG_LOCATION = process.env.FFMPEG_LOCATION;

function findDownloadedFile(outputDir, videoId) {
  const prefix = `${videoId}.`;
  const match = fs
    .readdirSync(outputDir)
    .find((name) => name.startsWith(prefix) && !name.endsWith(".part"));
  return match ? path.join(outputDir, match) : null;
}

function serializeMetadataValue(value = "") {
  return String(value).replace(/(["\\])/g, "\\$1");
}

function buildPostprocessorArgs(metadata) {
  if (!metadata) {
    return null;
  }

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
 * @returns {Promise<string>} Path to the downloaded audio file
 */
export function downloadAudio(videoId, outputDir, onProgress, metadata) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputTemplate = path.join(outputDir, `${videoId}.%(ext)s`);
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const postprocessorArgs = buildPostprocessorArgs(metadata);
    const args = [
      "-f",
      "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best",
      "--no-playlist",
      "--js-runtimes",
      "node",
      "--extract-audio",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "0",
      "--embed-thumbnail",
      "--add-metadata",
    ];

    if (FFMPEG_LOCATION) {
      args.push("--ffmpeg-location", FFMPEG_LOCATION);
    }

    if (postprocessorArgs) {
      args.push("--postprocessor-args", postprocessorArgs);
    }

    args.push("-o", outputTemplate, videoUrl);

    console.log(`Spawning yt-dlp with arguments: ${args.join(" ")}`);
    const child = spawnYtDlp(args);

    let errorOutput = "";

    child.stdout.on("data", (data) => {
      const text = data.toString();
      const match = text.match(/\[download\]\s+([\d.]+)%/);
      if (match && onProgress) {
        const percentage = parseFloat(match[1]);
        if (!isNaN(percentage)) {
          onProgress(Math.min(percentage, 99));
        }
      }
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
          reject(
            new Error(`Download finished but no audio file found for ${videoId} in ${outputDir}`),
          );
        }
      } else {
        reject(
          new Error(
            `yt-dlp exited with code ${code}. Error: ${errorOutput || "Unknown yt-dlp error"}`,
          ),
        );
      }
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}
