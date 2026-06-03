import express from "express";
import { body, validationResult } from "express-validator";
import { downloadQueue, isQueueReady } from "../services/queue.js";
import { startLocalJob } from "../services/localJobs.js";

const router = express.Router();

router.post(
  "/",
  [
    body("videoId")
      .trim()
      .notEmpty()
      .withMessage("videoId is required"),
    body("title")
      .trim()
      .notEmpty()
      .withMessage("title is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { videoId, title } = req.body;

    if (!isQueueReady()) {
      console.warn(
        "[Download Queue] Redis unavailable — using in-memory job (local dev).",
      );
      const jobId = startLocalJob(videoId, title);
      return res.json({ jobId });
    }

    try {
      console.log(`[Queue] Adding job for: ${title} (${videoId})`);
      const job = await downloadQueue.add(
        { videoId, title },
        {
          attempts: 1,
          backoff: 5000,
          removeOnComplete: false, // Keep it to fetch file name/results
          removeOnFail: false,
        }
      );

      return res.json({ jobId: job.id });
    } catch (err) {
      console.error(`Error adding job to queue: ${err.message}`);
      return res.status(500).json({ error: "Failed to queue download job" });
    }
  }
);

export default router;
