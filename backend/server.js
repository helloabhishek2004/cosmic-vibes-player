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
import { getFFmpegLocation } from "./services/ytdlp.js";
import { spawn, exec } from "child_process";
import metadataClient from "./services/metadataClient.js";
import { PYTHON } from "./services/pythonConfig.js";

// Load environment variables
dotenv.config();

// Validate Environment Variables before starting
function validateEnv() {
  console.log("[System Check] Performing startup environment validation...");
  const errors = [];

  // 1. Validate PORT
  const portVal = process.env.PORT || 3001;
  const parsedPort = parseInt(portVal, 10);
  if (isNaN(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
    errors.push(`PORT must be a valid number between 1 and 65535. Got: "${process.env.PORT}"`);
  }

  // 2. Validate PYTHON_SERVICE_URL
  const pythonUrlVal = process.env.PYTHON_SERVICE_URL || "http://localhost:8001";
  try {
    const url = new URL(pythonUrlVal);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      errors.push(`PYTHON_SERVICE_URL protocol must be http or https. Got: "${pythonUrlVal}"`);
    }
  } catch {
    errors.push(`PYTHON_SERVICE_URL is not a valid URL. Got: "${pythonUrlVal}"`);
  }

  // 3. Validate DOWNLOAD_DIR
  const rawDownloadDir = process.env.DOWNLOAD_DIR || "downloads";
  const downloadPath = path.isAbsolute(rawDownloadDir)
    ? rawDownloadDir
    : path.resolve(process.cwd(), rawDownloadDir);

  try {
    if (!fs.existsSync(downloadPath)) {
      console.log(`[System Check] DOWNLOAD_DIR "${downloadPath}" does not exist. Creating it...`);
      fs.mkdirSync(downloadPath, { recursive: true });
    } else {
      // Check write permissions by writing a temporary file
      const testFile = path.join(downloadPath, `.write-test-${Date.now()}`);
      fs.writeFileSync(testFile, "test");
      fs.unlinkSync(testFile);
    }
  } catch (err) {
    errors.push(`DOWNLOAD_DIR "${downloadPath}" is not writable/creatable. Error: ${err.message}`);
  }

  // 4. Validate QUEUE_MODE
  const queueModeVal = process.env.QUEUE_MODE || "redis";
  if (!["redis", "local"].includes(queueModeVal.toLowerCase())) {
    errors.push(`QUEUE_MODE must be either "redis" or "local". Got: "${process.env.QUEUE_MODE}"`);
  }

  if (errors.length > 0) {
    console.error("\n=============================================");
    console.error("[CRITICAL ERROR] Startup Validation FAILED:");
    errors.forEach((err) => console.error(` - ${err}`));
    console.error("=============================================\n");
    process.exit(1);
  }

  console.log("[System Check] Startup environment validation successful.");
  console.log(` - PORT: ${portVal}`);
  console.log(` - PYTHON_SERVICE_URL: ${pythonUrlVal}`);
  console.log(` - DOWNLOAD_DIR: ${downloadPath}`);
  console.log(` - QUEUE_MODE: ${queueModeVal}`);

  // 5. Detect FFmpeg / FFprobe presence
  const resolvedDir = getFFmpegLocation();
  const isWindows = process.platform === "win32";
  const ffmpegName = isWindows ? "ffmpeg.exe" : "ffmpeg";
  const ffprobeName = isWindows ? "ffprobe.exe" : "ffprobe";

  if (resolvedDir) {
    const ffmpegPath = path.join(resolvedDir, ffmpegName);
    const ffprobePath = path.join(resolvedDir, ffprobeName);
    console.log(`[Startup] ffmpeg detected: ${path.resolve(ffmpegPath)}`);
    console.log(`[Startup] ffprobe detected: ${path.resolve(ffprobePath)}`);
  } else {
    // If resolvedDir is null, check system PATH asynchronously
    checkFfmpegGlobal();
  }
}

function checkFfmpegGlobal() {
  const child = spawn("ffmpeg", ["-version"], { shell: true, stdio: "ignore" });

  child.on("error", () => {
    console.error("[Startup] ffmpeg missing");
    console.error("[Startup] ffprobe missing");
  });

  child.on("close", (code) => {
    if (code === 0) {
      console.log("[Startup] ffmpeg detected (global in PATH)");
      console.log("[Startup] ffprobe detected (global in PATH)");
    } else {
      console.error("[Startup] ffmpeg missing");
      console.error("[Startup] ffprobe missing");
    }
  });
}

validateEnv();
initYoutubeCookies();

// Verify yt-dlp installation at server startup
function checkYtdlp() {
  const child = spawnYtDlp(["--version"]);

  child.stdout.on("data", (data) => {
    console.log(`[Startup] yt-dlp version: ${data.toString().trim()}`);
  });

  child.on("error", (err) => {
    console.error("[Startup] yt-dlp missing");
    console.error("Please install yt-dlp via: python -m pip install -U yt-dlp");
  });
}

// Start up the Express Server
const app = express();
const PORT = process.env.PORT || 3001;

// Parse allowed origins from environment
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim().toLowerCase())
  : [];

if (process.env.FRONTEND_URL) {
  ALLOWED_ORIGINS.push(process.env.FRONTEND_URL.trim().toLowerCase());
}

// Allow localhost and LAN IPs in dev, and configured domains in production
function isAllowedOrigin(origin) {
  if (!origin) return true;

  const originLower = origin.toLowerCase();

  // Check against explicitly configured production origins
  if (
    ALLOWED_ORIGINS.some(
      (allowed) => originLower === allowed || originLower.startsWith(allowed + "/"),
    )
  ) {
    return true;
  }

  // Fallback to local dev origins in non-production environments
  if (process.env.NODE_ENV !== "production") {
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
      if (isAllowedOrigin(origin)) {
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
  message: { error: "Too many requests from this IP, please try again after 15 minutes." },
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
import systemRouter from "./routes/system.js";

app.use("/api/search", searchRouter);
app.use("/api/trending", trendingRouter);
app.use("/api/song", songRouter);
app.use("/api/download", downloadRouter);
app.use("/api/status", statusRouter);
app.use("/api/file", fileRouter);
app.use("/api/stream", streamRouter);
app.use("/api/system", systemRouter);

// Basic health check route
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Helper to check if a CLI tool exists in the PATH
function checkCommandExists(cmd) {
  return new Promise((resolve) => {
    exec(`${cmd} -version`, { timeout: 1500 }, (error) => {
      resolve(!error);
    });
  });
}

// Helper to check if yt-dlp is available via Python
function checkYtDlpExists() {
  return new Promise((resolve) => {
    exec(`${PYTHON} -m yt_dlp --version`, { timeout: 10000 }, (error) => {
      resolve(!error);
    });
  });
}

// Diagnostics Test Suite
async function runStartupTestSuite() {
  console.log("\n=============================================");
  console.log("[Test Suite] Running Startup Diagnostics...");
  console.log("=============================================");

  const resolvedFFmpegDir = getFFmpegLocation();
  const isWindows = process.platform === "win32";
  const ffmpegName = isWindows ? "ffmpeg.exe" : "ffmpeg";
  const ffprobeName = isWindows ? "ffprobe.exe" : "ffprobe";

  let ffmpegOk = false;
  let ffprobeOk = false;
  if (resolvedFFmpegDir) {
    ffmpegOk = fs.existsSync(path.join(resolvedFFmpegDir, ffmpegName));
    ffprobeOk = fs.existsSync(path.join(resolvedFFmpegDir, ffprobeName));
  } else {
    ffmpegOk = await checkCommandExists("ffmpeg");
    ffprobeOk = await checkCommandExists("ffprobe");
  }
  console.log(`[Test Suite] 1. FFmpeg executable: ${ffmpegOk ? "PASS" : "FAIL"}`);
  console.log(`[Test Suite] 2. FFprobe executable: ${ffprobeOk ? "PASS" : "FAIL"}`);

  const ytdlpOk = await checkYtDlpExists();
  console.log(`[Test Suite] 3. yt-dlp executable: ${ytdlpOk ? "PASS" : "FAIL"}`);

  let ytdlpMetadataOk = false;
  if (ytdlpOk) {
    ytdlpMetadataOk = await new Promise((resolve) => {
      exec(
        `${PYTHON} -m yt_dlp --dump-json --playlist-items 1 "https://www.youtube.com/watch?v=jNQXAC9IVRw"`,
        { timeout: 20000 },
        (error, stdout) => {
          if (!error && stdout) {
            try {
              const parsed = JSON.parse(stdout);
              if (parsed && parsed.id === "jNQXAC9IVRw") {
                resolve(true);
                return;
              }
            } catch {}
          }
          resolve(false);
        },
      );
    });
  }
  console.log(`[Test Suite] 4. yt-dlp metadata fetch: ${ytdlpMetadataOk ? "PASS" : "FAIL"}`);

  let pythonReachable = false;
  try {
    const response = await metadataClient.get("/health", { timeout: 2000 });
    if (response.status === 200 && response.data?.status === "ok") {
      pythonReachable = true;
    }
  } catch {}
  console.log(
    `[Test Suite] 5. Python metadata service reachable: ${pythonReachable ? "PASS" : "FAIL"}`,
  );

  let dirWritable = false;
  const rawDownloadDir = process.env.DOWNLOAD_DIR || "downloads";
  const downloadPath = path.isAbsolute(rawDownloadDir)
    ? rawDownloadDir
    : path.resolve(process.cwd(), rawDownloadDir);
  try {
    const testFile = path.join(downloadPath, `.test-suite-${Date.now()}`);
    fs.writeFileSync(testFile, "write-test");
    fs.unlinkSync(testFile);
    dirWritable = true;
  } catch {}
  console.log(`[Test Suite] 6. Download directory writable: ${dirWritable ? "PASS" : "FAIL"}`);
  console.log("=============================================\n");
}

// Start checking yt-dlp and setting up directory cleanup
checkYtdlp();
startCleanupInterval(DOWNLOAD_DIR);

// Start server
const server = app.listen(PORT, () => {
  console.log(`[Server] Express API server listening on port ${PORT}`);
  runStartupTestSuite();
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
GTERM", () => gracefulShutdown("SIGTERM"));
