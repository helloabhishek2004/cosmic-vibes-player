import Queue from "bull";
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const QUEUE_MODE = (process.env.QUEUE_MODE || "redis").toLowerCase();
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let isRedisConnected = false;
let downloadQueue = null;
let testClient = null;

let lastWarned = 0;
function staticLogWarning() {
  const now = Date.now();
  if (now - lastWarned > 60000) {
    // Log once per minute max
    console.error("Redis not found at localhost:6379 — install Redis or use redis-windows");
    lastWarned = now;
  }
}

if (QUEUE_MODE === "local") {
  console.log("[Queue] QUEUE_MODE is set to 'local'. Skipping Redis/Bull queue connection setup.");
} else {
  try {
    // Standalone client to monitor connection status and auto-recover if Redis is restarted
    testClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        // Retry connection every 5 seconds
        return 5000;
      },
    });

    testClient.on("connect", () => {
      if (!isRedisConnected) {
        isRedisConnected = true;
        console.log("[Redis] Connected to Redis successfully.");
      }
    });

    testClient.on("error", (err) => {
      if (isRedisConnected) {
        isRedisConnected = false;
        console.error("[Redis] Lost connection to Redis.");
      }
      // Print clear troubleshooting instructions on first failure
      if (testClient.status === "reconnecting" || testClient.status === "connecting") {
        // Limit logging noise
        staticLogWarning();
      }
    });

    // Immediately run the warning check once on startup
    setTimeout(() => {
      if (!isRedisConnected) {
        staticLogWarning();
      }
    }, 2000);
  } catch (err) {
    console.error("[Redis] Error setting up Redis testClient:", err);
  }

  try {
    downloadQueue = new Queue("download-queue", REDIS_URL, {
      settings: {
        maxStalledCount: 1,
      },
    });

    // Crucial: Register error listener on the queue to catch redis client disconnect exceptions
    downloadQueue.on("error", (err) => {
      // Prevent unhandled promise rejection/crashes
      staticLogWarning();
    });
  } catch (err) {
    console.error("Failed to create Bull queue:", err);
  }
}

export function isQueueReady() {
  return isRedisConnected && downloadQueue !== null;
}

export { downloadQueue };
