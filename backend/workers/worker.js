import { downloadQueue } from "../services/queue.js";
import { downloadAudio } from "../services/ytdlp.js";
import metadataClient from "../services/metadataClient.js";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function fetchTags(videoId) {
  try {
    const response = await metadataClient.get(`/song/${videoId}`);
    return response.data;
  } catch (err) {
    console.warn(`[Worker] Metadata fetch failed for ${videoId}: ${err.message}`);
    return null;
  }
}

// Determine downloads folder absolute path (making sure to use path.join for Windows compatibility)
const rawDownloadDir = process.env.DOWNLOAD_DIR || "downloads";
const DOWNLOAD_DIR = path.isAbsolute(rawDownloadDir)
  ? rawDownloadDir
  : path.join(process.cwd(), rawDownloadDir);

const MAX_CONCURRENT_JOBS = parseInt(process.env.MAX_CONCURRENT_JOBS || "3", 10);

console.log(`[Worker] Initializing download worker. Max concurrency: ${MAX_CONCURRENT_JOBS}`);
console.log(`[Worker] Target downloads directory: ${DOWNLOAD_DIR}`);

if (downloadQueue) {
  downloadQueue.process(MAX_CONCURRENT_JOBS, async (job) => {
    const { videoId, title } = job.data;
    console.log(`[Worker] Starting job ${job.id} for: ${title} (${videoId})`);

    try {
      const metadata = await fetchTags(videoId);
      // Call the yt-dlp downloader helper with explicit metadata tags.
      const finalPath = await downloadAudio(
        videoId,
        DOWNLOAD_DIR,
        (progress) => {
          job.progress(progress);
        },
        metadata,
      );

      console.log(`[Worker] Completed job ${job.id}. File saved to: ${finalPath}`);
      return finalPath;
    } catch (err) {
      console.error(`[Worker] Error processing job ${job.id}: ${err.message}`);
      throw err;
    }
  });
} else {
  console.error("[Worker] Download queue is not initialized. Worker cannot start.");
}

export { DOWNLOAD_DIR };
