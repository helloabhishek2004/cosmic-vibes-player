import express from "express";
import { query, validationResult } from "express-validator";
import metadataClient from "../services/metadataClient.js";
import cache from "../services/cache.js";

const router = express.Router();

router.get(
  "/",
  [
    query("q")
      .trim()
      .isLength({ min: 2 })
      .withMessage("Search query must be at least 2 characters long"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const queryStr = req.query.q;
    const cacheKey = `search:${queryStr.toLowerCase()}`;

    // Check cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log(`[Cache Hit] Returning cached results for: ${queryStr}`);
      return res.json(cachedData);
    }

    try {
      console.log(`[API Call] Searching Python service for: ${queryStr}`);
      const response = await metadataClient.get("/search", {
        params: { q: queryStr },
      });

      const data = response.data || [];
      
      // Store in cache
      cache.set(cacheKey, data);
      
      return res.json(data);
    } catch (err) {
      console.error(`Search error calling Python service: ${err.message}`);
      return res.status(500).json({ error: "Failed to search songs. Python microservice error." });
    }
  }
);

export default router;
