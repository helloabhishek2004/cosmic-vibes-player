import { spawnYtDlp } from "./ytdlpSpawn.js";

const SEARCH_TIMEOUT_MS = Number(process.env.YTDLP_SEARCH_TIMEOUT_MS || 20000);
const MAX_RESULTS = Number(process.env.YTDLP_SEARCH_LIMIT || 20);

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

function searchArgs(count) {
  return [
    "--flat-playlist",
    "--dump-single-json",
    "--playlist-end", String(count),
    "--extractor-args", "youtube:player_client=android",
  ];
}

export async function searchYouTube(query, limit = MAX_RESULTS) {
  const normalized = String(query || "").trim();
  if (!normalized) return [];
  const count = Math.max(1, Math.min(Number(limit) || 20, 20));

  // Keep search independent from YOUTUBE_COOKIES. Render datacenter requests
  // with browser cookies are more likely to trigger YouTube's bot challenge.
  const result = await runYtDlp([
    ...searchArgs(count),
    `ytsearch${count}:${normalized}`,
  ]);

  return (result?.entries || []).map(mapEntry).filter(Boolean).slice(0, count);
}

export async function getYouTubeMetadata(videoId) {
  const id = String(videoId || "").trim();
  if (!id) return null;
  const url = `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
  const result = await runYtDlp([
    "--dump-single-json",
    "--skip-download",
    "--no-playlist",
    "--extractor-args", "youtube:player_client=android",
    url,
  ]);
  return mapEntry(result);
}
