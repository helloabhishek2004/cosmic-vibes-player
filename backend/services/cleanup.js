import fs from "fs";
import path from "path";

/**
 * Starts a periodic interval to clean up files older than 10 minutes.
 * @param {string} downloadDir - Absolute path to download directory
 * @param {number} intervalMs - Frequency of checks (default 5 minutes)
 * @param {number} maxAgeMs - Max age of files to keep (default 10 minutes)
 */
export function startCleanupInterval(
  downloadDir,
  intervalMs = 5 * 60 * 1000,
  maxAgeMs = 10 * 60 * 1000,
) {
  console.log(
    `Starting cleanup interval for directory: ${downloadDir} (every ${intervalMs / 1000}s)`,
  );

  setInterval(() => {
    try {
      if (!fs.existsSync(downloadDir)) {
        return;
      }

      const files = fs.readdirSync(downloadDir);
      const now = Date.now();

      files.forEach((file) => {
        const filePath = path.join(downloadDir, file);
        try {
          const stat = fs.statSync(filePath);
          if (stat.isFile()) {
            const fileAge = now - stat.mtimeMs;
            if (fileAge > maxAgeMs) {
              fs.unlinkSync(filePath);
              console.log(`[Cleanup] Deleted file older than 10 minutes: ${file}`);
            }
          }
        } catch (fileErr) {
          console.error(`[Cleanup] Error checking file ${filePath}:`, fileErr);
        }
      });
    } catch (err) {
      console.error("[Cleanup] Error running folder cleanup:", err);
    }
  }, intervalMs);
}
