import fs from "fs";
import path from "path";
import os from "os";

const COOKIE_FILE_PATH = path.join(os.tmpdir(), "youtube-cookies.txt");
const LOCAL_COOKIE_FILE = path.join(process.cwd(), "cookies.txt");

/**
 * Initializes YouTube cookies from the YOUTUBE_COOKIES environment variable
 * or a local cookies.txt file.
 */
export function initYoutubeCookies() {
  const envCookies = process.env.YOUTUBE_COOKIES;

  if (envCookies && envCookies.trim() !== "") {
    try {
      fs.writeFileSync(COOKIE_FILE_PATH, envCookies.trim());
      console.log("[yt-dlp] Cookies loaded from environment variable (YOUTUBE_COOKIES)");
      return true;
    } catch (err) {
      console.error(`[yt-dlp] Failed to write environment cookies to ${COOKIE_FILE_PATH}: ${err.message}`);
    }
  }

  if (fs.existsSync(LOCAL_COOKIE_FILE)) {
    console.log("[yt-dlp] Cookies loaded from local cookies.txt");
    return true;
  }

  console.log("[yt-dlp] No cookies configured");
  return false;
}

/**
 * Returns the path to the cookies file if it exists, otherwise null.
 */
export function getYoutubeCookiesPath() {
  const envCookies = process.env.YOUTUBE_COOKIES;
  if (envCookies && envCookies.trim() !== "" && fs.existsSync(COOKIE_FILE_PATH)) {
    return COOKIE_FILE_PATH;
  }
  if (fs.existsSync(LOCAL_COOKIE_FILE)) {
    return LOCAL_COOKIE_FILE;
  }
  return null;
}
