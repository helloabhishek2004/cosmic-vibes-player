import express from "express";
import { param, validationResult } from "express-validator";
import { downloadQueue, isQueueReady } from "../services/queue.js";
import { getLocalJobStatus, isLocalJob } from "../services/localJobs.js";

const router = express.Router();

router.get(
  "/:jobId",
  [
    param("jobId")
      .trim()
      .notEmpty()
      .withMessage("jobId is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { jobId } = req.params;

    if (isLocalJob(jobId)) {
      const local = getLocalJobStatus(jobId);
      if (!local) {
        return res.status(404).json({ error: "Job not found" });
      }
      return res.json(local);
    }

    if (!isQueueReady()) {
      return res.status(503).json({ error: "Download service unavailable" });
    }

    try {
      const job = await downloadQueue.getJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      const state = await job.getState();
      const progress = job.progress();

      // Map Bull states to api states: "queued" | "processing" | "done" | "failed"
      let status = "queued";
      if (state === "active") {
        status = "processing";
      } else if (state === "completed") {
        status = "done";
      } else if (state === "failed") {
        status = "failed";
      }

      return res.json({
        jobId: job.id,
        status,
        progress: progress || 0,
        error: state === "failed" ? (job.failedReason || "Unknown job failure") : null,
      });
    } catch (err) {
      console.error(`Error fetching job status for ${jobId}: ${err.message}`);
      return res.status(500).json({ error: "Failed to get job status" });
    }
  }
);

export default router;
