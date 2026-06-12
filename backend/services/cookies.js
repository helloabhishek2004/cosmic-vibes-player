/**
 * cookies.js — YouTube cookie management for yt-dlp
 *
 * Supports two methods (priority order):
 *   1. YOUTUBE_COOKIES env var  → written to COOKIE_TMP_PATH at startup
 *   2. Manual cookies.txt file  → placed at COOKIE_FILE_PATH
 *
 * Security rules:
 *   - Cookie values are NEVER logged
 *   - Cookie values are NEVER returned via API
 *   - Cookie files are excluded from git via .gitignore
 */

import fs from "fs";
import path from "path";

// Where we write the temp cookie file when using the env-var method
export const COOKIE_TMP_PATH = "/tmp/youtube-cookies.txt";

// Alternative: manually placed cookie file beside the server
export const COOKIE_FILE_PATH = path.resolve(process.cwd(), "cookies.txt");

/**
 * Called once at server startup.
 * If YOUTUBE_COOKIES is set, writes it to COOKIE_TMP_PATH.
 * Logs status without exposing any cookie values.
 */
export function initCookies() {
  const envCookies = process.env.YOUTUBE_COOKIES;

  if (envCookies && envCookies.trim() !== "") {
    try {
      fs.writeFileSync(COOKIE_TMP_PATH, envCookies, { mode: 0o600 });
      console.log(
        `[yt-dlp] Cookies loaded from YOUTUBE_COOKIES env var → ${COOKIE_TMP_PATH}`,
      );
    } catch (err) {
      console.error(`[yt-dlp] Failed to write cookie file: ${err.message}`);
    }
    return;
  }

  if (fs.existsSync(COOKIE_FILE_PATH)) {
    console.log(`[yt-dlp] Cookies loaded from file → ${COOKIE_FILE_PATH}`);
    return;
  }

  console.log("[yt-dlp] No cookies configured — YouTube bot-check errors may occur");
}

/**
 * Returns the active cookie file path, or null if none is configured.
 * Priority: YOUTUBE_COOKIES (tmp file) → manual cookies.txt → none
 */
export function getActiveCookiePath() {
  // Method A: env-var written to tmp
  if (fs.existsSync(COOKIE_TMP_PATH)) {
    return COOKIE_TMP_PATH;
  }

  // Method B: manually placed cookies.txt
  if (fs.existsSync(COOKIE_FILE_PATH)) {
    return COOKIE_FILE_PATH;
  }

  return null;
}

/**
 * Returns a status object suitable for the /api/system/youtube endpoint.
 * Never includes cookie values.
 */
export function getCookieStatus() {
  const envConfigured =
    typeof process.env.YOUTUBE_COOKIES === "string" &&
    process.env.YOUTUBE_COOKIES.trim() !== "";
  const tmpExists = fs.existsSync(COOKIE_TMP_PATH);
  const manualExists = fs.existsSync(COOKIE_FILE_PATH);

  return {
    cookiesConfigured: envConfigured || manualExists,
    cookiesFileExists: tmpExists || manualExists,
    cookieSource: tmpExists ? "env_var" : manualExists ? "manual_file" : "none",
  };
}
