import express from "express";
import { body, validationResult } from "express-validator";
import jobManager from "../services/jobManager.js";

const router = express.Router();

router.post(
  "/",
  [
    body("videoId")
      .trim()
      .notEmpty()
      .withMessage("videoId is required")
      .matches(/^[a-zA-Z0-9_-]{11}$/)
      .withMessage("Invalid videoId format"),
    body("title").trim().notEmpty().withMessage("title is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { videoId, title } = req.body;

    try {
      const { jobId } = await jobManager.createJob(videoId, title);
      return res.json({ jobId });
    } catch (err) {
      console.error(`Error adding download job: ${err.message}`);
      return res.status(500).json({ error: "Failed to queue download job" });
    }
  },
);

export default router;
