import { spawn } from "child_process";
import path from "path";
import fs from "fs";

/**
 * Downloads audio from YouTube and extracts it as MP3
 * @param {string} videoId - YouTube Video ID
 * @param {string} outputDir - Directory to save the download
 * @param {function} onProgress - Callback with percentage progress (0-100)
 * @returns {Promise<string>} - Resolves to the path of the final MP3 file
 */
export function downloadAudio(videoId, outputDir, onProgress) {
  return new Promise((resolve, reject) => {
    // Ensure the output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Set the output template format
    // yt-dlp will save to videoId.temp_extension and convert to videoId.mp3
    const outputTemplate = path.join(outputDir, `${videoId}.%(ext)s`);
    const finalMp3Path = path.join(outputDir, `${videoId}.mp3`);

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const args = [
      "-x",
      "--audio-format", "mp3",
      "--audio-quality", "0",
      "-o", outputTemplate,
      videoUrl
    ];

    console.log(`Spawning yt-dlp with arguments: ${args.join(" ")}`);
    // spawn with shell: true to resolve path on Windows
    const child = spawn("yt-dlp", args, { shell: true });

    let errorOutput = "";

    child.stdout.on("data", (data) => {
      const text = data.toString();
      // Match percentage in download line: e.g. [download]  10.0%
      const match = text.match(/\[download\]\s+([\d.]+)%/);
      if (match && onProgress) {
        const percentage = parseFloat(match[1]);
        if (!isNaN(percentage)) {
          // Send progress. Let's cap it at 99% until fully converted/completed.
          const progress = Math.min(percentage, 99);
          onProgress(progress);
        }
      }
    });

    child.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        // Double check if the MP3 file was created
        if (fs.existsSync(finalMp3Path)) {
          if (onProgress) {
            onProgress(100);
          }
          resolve(finalMp3Path);
        } else {
          reject(new Error(`Conversion complete, but expected MP3 file not found at ${finalMp3Path}`));
        }
      } else {
        reject(new Error(`yt-dlp exited with code ${code}. Error: ${errorOutput || "Unknown yt-dlp error"}`));
      }
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}
