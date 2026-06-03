import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { spawnYtDlp } from "./services/ytdlpSpawn.js";

// Load environment variables
dotenv.config();

// Verify yt-dlp installation at server startup
function checkYtdlp() {
  console.log("[System Check] Checking if yt-dlp is installed...");
  const child = spawnYtDlp(["--version"]);
  
  child.stdout.on("data", (data) => {
    console.log(`[System Check] yt-dlp is installed. Version: ${data.toString().trim()}`);
  });
  
  child.on("error", (err) => {
    console.error("[System ERROR] yt-dlp not available via Python. Download features will fail.");
    console.error("Please run: python -m pip install yt-dlp");
  });
  
  // Try running update check as a background non-blocking check
  const updateChild = spawnYtDlp(["-U"]);
  updateChild.stdout.on("data", (data) => {
    console.log(`[System Check] yt-dlp update status: ${data.toString().trim()}`);
  });
}

// Start up the Express Server
const app = express();
const PORT = process.env.PORT || 3001;

// Allow localhost and LAN IPs (phone on same Wi‑Fi uses e.g. http://10.x.x.x:5173)
function isAllowedDevOrigin(origin) {
  if (!origin) return true;
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "http:" && protocol !== "https:") return false;
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  } catch {
    return false;
  }
  return false;
}

// Allow cross-origin <audio> / fetch from the Vite dev server (different port).
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(compression());
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedDevOrigin(origin)) {
        callback(null, origin ?? true);
      } else {
        callback(null, false);
      }
    },
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  }),
);
app.use(morgan("dev"));
app.use(express.json());

// Global Rate Limiting: 20 requests/15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per `window`
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: "Too many requests from this IP, please try again after 15 minutes." }
});
app.use("/api/download", apiLimiter);
app.use("/api/file", apiLimiter);

// Import Queue and worker to boot up the worker processes
import { downloadQueue } from "./services/queue.js";
import { DOWNLOAD_DIR } from "./workers/worker.js";
import { startCleanupInterval } from "./services/cleanup.js";

// Mount API Routes
import searchRouter from "./routes/search.js";
import songRouter from "./routes/song.js";
import downloadRouter from "./routes/download.js";
import statusRouter from "./routes/status.js";
import fileRouter from "./routes/file.js";
import streamRouter from "./routes/stream.js";
import trendingRouter from "./routes/trending.js";

app.use("/api/search", searchRouter);
app.use("/api/trending", trendingRouter);
app.use("/api/song", songRouter);
app.use("/api/download", downloadRouter);
app.use("/api/status", statusRouter);
app.use("/api/file", fileRouter);
app.use("/api/stream", streamRouter);

// Basic health check route
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Start checking yt-dlp and setting up directory cleanup
checkYtdlp();
startCleanupInterval(DOWNLOAD_DIR);

// Start server
const server = app.listen(PORT, () => {
  console.log(`[Server] Express API server listening on port ${PORT}`);
});

// Graceful Shutdown
async function gracefulShutdown(signal) {
  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
  
  // Stop receiving requests
  server.close(() => {
    console.log("[Server] HTTP server closed.");
  });

  // Close queue connections
  if (downloadQueue) {
    try {
      console.log("[Queue] Closing Bull queue client connections...");
      await downloadQueue.close();
      console.log("[Queue] Bull queue connections closed successfully.");
    } catch (err) {
      console.error("[Queue] Error while closing Bull queue:", err);
    }
  }

  console.log("[Server] Graceful shutdown completed. Exiting process.");
  process.exit(0);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
