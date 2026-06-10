import { isQueueReady, downloadQueue } from "./queue.js";
import {
  isLocalJob,
  startLocalJob,
  getLocalJobStatus,
  getLocalJobFile,
  deleteLocalJob,
} from "./localJobs.js";

const QUEUE_MODE = (process.env.QUEUE_MODE || "redis").toLowerCase();

export class JobManager {
  async createJob(videoId, title) {
    if (QUEUE_MODE === "local" || !isQueueReady()) {
      console.log(
        `[JobManager] Queue is not ready or local mode is active. Queueing job locally for ${videoId}`,
      );
      const jobId = startLocalJob(videoId, title);
      return { jobId };
    }

    console.log(`[JobManager] Queueing job in Bull queue for ${videoId}`);
    const job = await downloadQueue.add(
      { videoId, title },
      {
        attempts: 1,
        removeOnComplete: false,
        removeOnFail: false,
      },
    );
    return { jobId: job.id };
  }

  async getJobStatus(jobId) {
    if (isLocalJob(jobId)) {
      const status = getLocalJobStatus(jobId);
      if (status) {
        const fileInfo = getLocalJobFile(jobId);
        return {
          jobId: status.jobId,
          status: status.status,
          progress: status.progress,
          error: status.error,
          title: status.title,
          filePath: fileInfo ? fileInfo.filePath : null,
        };
      }
      return null;
    }

    if (isQueueReady()) {
      try {
        const job = await downloadQueue.getJob(jobId);
        if (job) {
          const state = await job.getState();
          let status = "queued";
          if (state === "active") {
            status = "processing";
          } else if (state === "completed") {
            status = "done";
          } else if (state === "failed") {
            status = "failed";
          }

          let progress = 0;
          try {
            progress = await job.progress();
          } catch (err) {
            progress = job._progress || 0;
          }

          return {
            jobId: job.id,
            status,
            progress,
            error: job.failedReason || null,
            title: job.data.title,
            filePath: job.returnvalue || null,
          };
        }
      } catch (err) {
        console.error(`[JobManager] Error getting job status from Bull queue:`, err);
      }
    }

    // Fallback: If redis was temporarily down but is now back, or if a local job wasn't matched properly,
    // let's check local job mapping if jobId starts with "local-"
    if (String(jobId).startsWith("local-")) {
      const status = getLocalJobStatus(jobId);
      if (status) {
        const fileInfo = getLocalJobFile(jobId);
        return {
          jobId: status.jobId,
          status: status.status,
          progress: status.progress,
          error: status.error,
          title: status.title,
          filePath: fileInfo ? fileInfo.filePath : null,
        };
      }
    }

    return null;
  }

  async cleanupJob(jobId) {
    if (isLocalJob(jobId) || String(jobId).startsWith("local-")) {
      deleteLocalJob(jobId);
      return;
    }

    if (isQueueReady()) {
      try {
        const job = await downloadQueue.getJob(jobId);
        if (job) {
          await job.remove();
        }
      } catch (err) {
        console.error(`[JobManager] Error cleaning up job ${jobId} from Bull queue:`, err);
      }
    }
  }
}

export default new JobManager();
