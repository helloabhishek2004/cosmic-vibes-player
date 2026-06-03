import Queue from "bull";
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let isRedisConnected = false;
let downloadQueue = null;

// Standalone client to monitor connection status and auto-recover if Redis is restarted
const testClient = new Redis(REDIS_URL, {
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

let lastWarned = 0;
function staticLogWarning() {
  const now = Date.now();
  if (now - lastWarned > 60000) { // Log once per minute max
    console.error("Redis not found at localhost:6379 — install Redis or use redis-windows");
    lastWarned = now;
  }
}

// Immediately run the warning check once on startup
setTimeout(() => {
  if (!isRedisConnected) {
    staticLogWarning();
  }
}, 2000);

try {
  downloadQueue = new Queue("download-queue", REDIS_URL, {
    settings: {
      maxStalledCount: 1,
    }
  });

  // Crucial: Register error listener on the queue to catch redis client disconnect exceptions
  downloadQueue.on("error", (err) => {
    // Prevent unhandled promise rejection/crashes
    staticLogWarning();
  });
} catch (err) {
  console.error("Failed to create Bull queue:", err);
}

export function isQueueReady() {
  return isRedisConnected && downloadQueue !== null;
}

export { downloadQueue };
