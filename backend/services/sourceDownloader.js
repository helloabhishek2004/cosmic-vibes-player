import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import axios from "axios";
import { getFFmpegLocation } from "./ytdlp.js";
import { resolveAudioSource } from "./sourceResolver.js";

function safeMetadata(value = "") {
  return String(value).replace(/[\r\n]/g, " ").trim();
}

function ffmpegBinary() {
  const dir = getFFmpegLocation();
  return dir ? path.join(dir, process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg") : "ffmpeg";
}

async function downloadThumbnail(url, target) {
  if (!url) return null;
  try {
    const response = await axios.get(url, { responseType: "arraybuffer", timeout: 10000 });
    fs.writeFileSync(target, response.data);
    return target;
  } catch (error) {
    console.warn(`[SourceDownloader] Thumbnail download failed: ${error.message}`);
    return null;
  }
}

function runFfmpeg(args, durationSeconds, onProgress) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegBinary(), args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stdout.on("data", (data) => {
      const text = data.toString();
      const match = text.match(/out_time_ms=(\d+)/);
      if (match && durationSeconds > 0 && onProgress) {
        onProgress(Math.min(99, (Number(match[1]) / 1000000 / durationSeconds) * 100));
      }
    });
    child.stderr.on("data", (data) => { stderr += data.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-1500)}`));
    });
  });
}

export async function downloadResolvedSource(metadata, outputDir, onProgress) {
  const source = await resolveAudioSource(metadata, { requireDownload: true });
  if (!source) return null;

  fs.mkdirSync(outputDir, { recursive: true });
  const videoId = metadata.videoId || metadata.id;
  const outputPath = path.join(outputDir, `${videoId}.mp3`);
  const thumbPath = path.join(outputDir, `.${videoId}-thumb.jpg`);
  const thumb = await downloadThumbnail(source.thumbnailUrl || metadata.thumbnailUrl || metadata.thumbnail, thumbPath);
  const durationSeconds = Number(source.durationSeconds || 0);

  const args = ["-y", "-hide_banner", "-loglevel", "error", "-progress", "pipe:1", "-i", source.streamUrl];
  if (thumb) {
    args.push("-i", thumb, "-map", "0:a:0", "-map", "1:v:0", "-c:v", "mjpeg", "-disposition:v", "attached_pic");
  } else {
    args.push("-map", "0:a:0");
  }
  args.push("-c:a", "libmp3lame", "-q:a", "0", "-id3v2_version", "3");
  if (source.title || metadata.title) args.push("-metadata", `title=${safeMetadata(source.title || metadata.title)}`);
  if (source.artist || metadata.artist) args.push("-metadata", `artist=${safeMetadata(source.artist || metadata.artist)}`);
  if (source.album || metadata.album) args.push("-metadata", `album=${safeMetadata(source.album || metadata.album)}`);
  if (metadata.year) args.push("-metadata", `date=${safeMetadata(metadata.year)}`);
  args.push(outputPath);

  try {
    await runFfmpeg(args, durationSeconds, onProgress);
    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) throw new Error("FFmpeg produced an empty file");
    if (onProgress) onProgress(100);
    return { filePath: outputPath, source };
  } finally {
    try { if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath); } catch {}
  }
}
