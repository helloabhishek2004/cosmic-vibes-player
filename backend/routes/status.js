import express from "express";
import { param, validationResult } from "express-validator";
import jobManager from "../services/jobManager.js";

const router = express.Router();

router.get(
  "/:jobId",
  [
    param("jobId")
      .trim()
      .notEmpty()
      .withMessage("jobId is required")
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage("Invalid jobId format"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { jobId } = req.params;

    try {
      const jobStatus = await jobManager.getJobStatus(jobId);
      if (!jobStatus) {
        return res.status(404).json({ error: "Job not found" });
      }

      return res.json({
        jobId: jobStatus.jobId,
        status: jobStatus.status,
        progress: jobStatus.progress || 0,
        error: jobStatus.error,
      });
    } catch (err) {
      console.error(`Error fetching job status for ${jobId}: ${err.message}`);
      return res.status(500).json({ error: "Failed to get job status" });
    }
  },
);

export default router;
