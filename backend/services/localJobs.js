import path from "path";
import fs from "fs";
import { downloadAudio } from "./ytdlp.js";

const rawDownloadDir = process.env.DOWNLOAD_DIR || "downloads";
const DOWNLOAD_DIR = path.isAbsolute(rawDownloadDir)
  ? rawDownloadDir
  : path.join(process.cwd(), rawDownloadDir);

/** In-memory download jobs when Redis is unavailable (local dev). */
const jobs = new Map();

export function isLocalJob(jobId) {
  return jobs.has(String(jobId));
}

export function startLocalJob(videoId, title) {
  const jobId = `local-${Date.now()}-${videoId}`;
  jobs.set(jobId, {
    videoId,
    title,
    status: "queued",
    progress: 0,
    error: null,
    filePath: null,
  });

  setImmediate(async () => {
    const job = jobs.get(jobId);
    if (!job) return;
    job.status = "processing";
    try {
      const filePath = await downloadAudio(videoId, DOWNLOAD_DIR, (p) => {
        job.progress = p;
      });
      job.filePath = filePath;
      job.status = "done";
      job.progress = 100;
    } catch (err) {
      job.status = "failed";
      job.error = err.message || "Download failed";
      console.error(`[LocalJob ${jobId}]`, err);
    }
  });

  return jobId;
}

export function getLocalJobStatus(jobId) {
  const job = jobs.get(String(jobId));
  if (!job) return null;
  return {
    jobId,
    status: job.status,
    progress: job.progress || 0,
    error: job.error,
  };
}

export function getLocalJobFile(jobId) {
  const job = jobs.get(String(jobId));
  if (!job || job.status !== "done" || !job.filePath) return null;
  if (!fs.existsSync(job.filePath)) return null;
  return { filePath: job.filePath, title: job.title };
}

export function deleteLocalJob(jobId) {
  jobs.delete(String(jobId));
}
