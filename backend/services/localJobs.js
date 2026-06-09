import path from "path";
import fs from "fs";
import { downloadAudio } from "./ytdlp.js";
import metadataClient from "./metadataClient.js";

const rawDownloadDir = process.env.DOWNLOAD_DIR || "downloads";
const DOWNLOAD_DIR = path.isAbsolute(rawDownloadDir)
  ? rawDownloadDir
  : path.join(process.cwd(), rawDownloadDir);

const jobs = new Map();
const pendingJobs = [];
let activeJobsCount = 0;

// Maximum concurrent local jobs to prevent CPU/memory exhaustion on free tiers
const MAX_CONCURRENT_JOBS = parseInt(process.env.MAX_CONCURRENT_JOBS || "2", 10);
const MAX_VIDEO_DURATION_MINUTES = parseInt(process.env.MAX_VIDEO_DURATION_MINUTES || "20", 10);

async function fetchTags(videoId) {
  try {
    const response = await metadataClient.get(`/song/${videoId}`);
    return response.data;
  } catch (err) {
    console.warn(`[LocalJob] Metadata fetch failed for ${videoId}: ${err.message}`);
    return null;
  }
}

function parseDurationToSeconds(durationStr) {
  if (!durationStr) return 0;
  const parts = durationStr.split(":").map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]; // M:SS
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]; // H:MM:SS
  }
  return 0;
}

export function isLocalJob(jobId) {
  return jobs.has(String(jobId));
}

export function startLocalJob(videoId, title, initialMetadata = null) {
  const jobId = `local-${Date.now()}-${videoId}`;
  jobs.set(jobId, {
    videoId,
    title,
    status: "queued",
    progress: 0,
    error: null,
    filePath: null,
    metadata: initialMetadata,
  });

  pendingJobs.push(jobId);
  setImmediate(() => processLocalQueue());

  return jobId;
}

async function processLocalQueue() {
  if (activeJobsCount >= MAX_CONCURRENT_JOBS) {
    return;
  }
  if (pendingJobs.length === 0) {
    return;
  }

  const jobId = pendingJobs.shift();
  const job = jobs.get(jobId);
  if (!job) {
    // Job was deleted/cancelled before starting
    setImmediate(() => processLocalQueue());
    return;
  }

  activeJobsCount++;
  job.status = "processing";

  try {
    // 1. Fetch metadata if not already available
    let metadata = job.metadata;
    if (!metadata) {
      metadata = await fetchTags(job.videoId);
      if (metadata) {
        job.metadata = metadata;
        if (metadata.title) job.title = metadata.title;
      }
    }

    // 2. Validate duration limit
    if (metadata && metadata.duration) {
      const seconds = parseDurationToSeconds(metadata.duration);
      const limitSeconds = MAX_VIDEO_DURATION_MINUTES * 60;
      if (seconds > limitSeconds) {
        throw new Error(
          `Video exceeds maximum allowed length of ${MAX_VIDEO_DURATION_MINUTES} minutes.`,
        );
      }
    }

    // 3. Download the audio
    const filePath = await downloadAudio(
      job.videoId,
      DOWNLOAD_DIR,
      (p) => {
        job.progress = p;
      },
      metadata,
    );

    job.filePath = filePath;
    job.status = "done";
    job.progress = 100;
  } catch (err) {
    job.status = "failed";
    job.error = err.message || "Download failed";
    console.error(`[LocalJob ${jobId}]`, err);
  } finally {
    activeJobsCount--;
    // Trigger next job processing
    setImmediate(() => processLocalQueue());
  }
}

export function getLocalJobStatus(jobId) {
  const job = jobs.get(String(jobId));
  if (!job) return null;
  return {
    jobId,
    status: job.status,
    progress: job.progress || 0,
    error: job.error,
    title: job.title,
  };
}

export function getLocalJobFile(jobId) {
  const job = jobs.get(String(jobId));
  if (!job || job.status !== "done" || !job.filePath) return null;
  if (!fs.existsSync(job.filePath)) return null;
  return { filePath: job.filePath, title: job.title };
}

export function deleteLocalJob(jobId) {
  // If the job is in the pending queue, remove it
  const idx = pendingJobs.indexOf(String(jobId));
  if (idx !== -1) {
    pendingJobs.splice(idx, 1);
  }
  jobs.delete(String(jobId));
}
