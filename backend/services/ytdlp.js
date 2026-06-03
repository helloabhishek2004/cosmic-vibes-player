import path from "path";
import fs from "fs";
import { spawnYtDlp } from "./ytdlpSpawn.js";

function findDownloadedFile(outputDir, videoId) {
  const prefix = `${videoId}.`;
  const match = fs
    .readdirSync(outputDir)
    .find((name) => name.startsWith(prefix) && !name.endsWith(".part"));
  return match ? path.join(outputDir, match) : null;
}

/**
 * Downloads audio from YouTube (native best audio — no ffmpeg required).
 * @returns {Promise<string>} Path to the downloaded audio file
 */
export function downloadAudio(videoId, outputDir, onProgress) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputTemplate = path.join(outputDir, `${videoId}.%(ext)s`);
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const args = [
      "-f",
      "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best",
      "--no-playlist",
      "-o",
      outputTemplate,
      videoUrl,
    ];

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
            new Error(
              `Download finished but no audio file found for ${videoId} in ${outputDir}`,
            ),
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
