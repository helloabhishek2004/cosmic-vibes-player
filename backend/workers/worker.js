import { downloadQueue } from "../services/queue.js";
import { downloadAudio } from "../services/ytdlp.js";
import { downloadResolvedSource } from "../services/sourceDownloader.js";
import metadataClient from "../services/metadataClient.js";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function fetchTags(videoId) {
  try { return (await metadataClient.get(`/song/${videoId}`)).data; }
  catch (err) { console.warn(`[Worker] Metadata fetch failed for ${videoId}: ${err.message}`); return null; }
}

const rawDownloadDir = process.env.DOWNLOAD_DIR || "downloads";
const DOWNLOAD_DIR = path.isAbsolute(rawDownloadDir) ? rawDownloadDir : path.join(process.cwd(), rawDownloadDir);
const MAX_CONCURRENT_JOBS = parseInt(process.env.MAX_CONCURRENT_JOBS || "1", 10);

console.log(`[Worker] Initializing download worker. Max concurrency: ${MAX_CONCURRENT_JOBS}`);
console.log(`[Worker] Target downloads directory: ${DOWNLOAD_DIR}`);

if (downloadQueue) {
  downloadQueue.process(MAX_CONCURRENT_JOBS, async (job) => {
    const { videoId, title } = job.data;
    console.log(`[Worker] Starting job ${job.id} for: ${title} (${videoId})`);
    try {
      const metadata = await fetchTags(videoId);
      let result = await downloadResolvedSource(metadata || { videoId, title }, DOWNLOAD_DIR, (p) => job.progress(p));
      let finalPath = result?.filePath;
      if (!finalPath) finalPath = await downloadAudio(videoId, DOWNLOAD_DIR, (p) => job.progress(p), metadata);
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
