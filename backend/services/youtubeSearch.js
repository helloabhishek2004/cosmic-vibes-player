import { spawnYtDlp } from "./ytdlpSpawn.js";
import fs from "fs";
import { getYoutubeCookiesPath } from "./cookieManager.js";

const SEARCH_TIMEOUT_MS = Number(process.env.YTDLP_SEARCH_TIMEOUT_MS || 20000);
const MAX_RESULTS = Number(process.env.YTDLP_SEARCH_LIMIT || 20);

function cookiesArgs() {
  const cookiesPath = getYoutubeCookiesPath();
  if (!cookiesPath || !fs.existsSync(cookiesPath)) return [];
  return ["--cookies", cookiesPath, "--extractor-args", "youtube:player_client=web"];
}

function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    const child = spawnYtDlp([
      "--no-warnings",
      "--no-check-certificates",
      "--js-runtimes", "node",
      "--remote-components", "ejs:github",
      ...args,
    ]);
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      try { child.kill("SIGTERM"); } catch {}
      reject(new Error("yt-dlp metadata/search request timed out"));
    }, SEARCH_TIMEOUT_MS);

    child.stdout.on("data", (data) => { stdout += data.toString(); });
    child.stderr.on("data", (data) => { stderr += data.toString(); });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`yt-dlp exited with code ${code}: ${stderr.slice(-1200)}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error("yt-dlp returned invalid JSON"));
      }
    });
  });
}

function mapEntry(entry) {
  if (!entry?.id) return null;
  const duration = Number(entry.duration) || 0;
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  return {
    videoId: entry.id,
    title: entry.title || "Unknown Title",
    artist: entry.uploader || entry.channel || "Unknown Artist",
    album: "Single",
    duration: duration ? `${minutes}:${String(seconds).padStart(2, "0")}` : "0:00",
    thumbnail: entry.thumbnail || "",
    year: entry.upload_date ? Number(String(entry.upload_date).slice(0, 4)) || null : null,
  };
}

export async function searchYouTube(query, limit = MAX_RESULTS) {
  const normalized = String(query || "").trim();
  if (!normalized) return [];
  const count = Math.max(1, Math.min(Number(limit) || 20, 20));
  const searchArgs = [
    "--flat-playlist",
    "--dump-single-json",
    "--playlist-end", String(count),
    ...cookiesArgs(),
    `ytsearch${count}:${normalized}`,
  ];

  try {
    const result = await runYtDlp(searchArgs);
    return (result?.entries || []).map(mapEntry).filter(Boolean).slice(0, count);
  } catch (firstError) {
    // Cookie failures should not take search down. Retry without cookies.
    if (cookiesArgs().length) {
      console.warn(`[yt-dlp search] Authenticated search failed; retrying without cookies: ${firstError.message}`);
      try {
        const result = await runYtDlp([
          "--flat-playlist",
          "--dump-single-json",
          "--playlist-end", String(count),
          `ytsearch${count}:${normalized}`,
        ]);
        return (result?.entries || []).map(mapEntry).filter(Boolean).slice(0, count);
      } catch (fallbackError) {
        console.warn(`[yt-dlp search] Cookie-less fallback failed: ${fallbackError.message}`);
      }
    }
    throw firstError;
  }
}

export async function getYouTubeMetadata(videoId) {
  const id = String(videoId || "").trim();
  if (!id) return null;
  const url = `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
  const base = ["--dump-single-json", "--skip-download", "--no-playlist"];

  try {
    const result = await runYtDlp([...base, ...cookiesArgs(), url]);
    return mapEntry(result);
  } catch (firstError) {
    if (cookiesArgs().length) {
      console.warn(`[yt-dlp metadata] Authenticated metadata failed for ${id}; retrying without cookies.`);
      try {
        const result = await runYtDlp([...base, url]);
        return mapEntry(result);
      } catch (fallbackError) {
        console.warn(`[yt-dlp metadata] Cookie-less fallback failed for ${id}: ${fallbackError.message}`);
      }
    }
    throw firstError;
  }
}
