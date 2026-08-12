import axios from "axios";

// Public Piped instances are interchangeable API/proxy frontends. We keep a
// small ordered pool so one unhealthy instance does not take playback down.
// The pool is intentionally easy to extend when an instance disappears.
const INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.leptons.xyz",
  "https://pipedapi.nosebs.ru",
  "https://pipedapi-libre.kavin.rocks",
  "https://piped-api.privacy.com.de",
  "https://pipedapi.adminforge.de",
  "https://api.piped.yt",
];

const TIMEOUT_MS = Number(process.env.PIPED_TIMEOUT_MS || 7000);

function normalize(value = "") {
  return String(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function parseVideoId(value = "") {
  const text = String(value || "");
  const match = text.match(/[?&]v=([a-zA-Z0-9_-]{11})/) || text.match(/\/watch\/([a-zA-Z0-9_-]{11})/);
  return match?.[1] || null;
}

function parseDuration(seconds) {
  const total = Number(seconds) || 0;
  if (!total) return "0:00";
  return `${Math.floor(total / 60)}:${String(Math.floor(total % 60)).padStart(2, "0")}`;
}

async function request(path, params = {}) {
  let lastError = null;
  for (const base of INSTANCES) {
    try {
      const response = await axios.get(`${base}${path}`, {
        params,
        timeout: TIMEOUT_MS,
        headers: { Accept: "application/json" },
      });
      return { data: response.data, base };
    } catch (error) {
      lastError = error;
      console.warn(`[Piped] ${base} failed for ${path}: ${error.response?.status || error.code || error.message}`);
    }
  }
  throw lastError || new Error("No Piped instance available");
}

function mapSearchItem(item) {
  const videoId = parseVideoId(item?.url) || item?.id;
  if (!videoId) return null;
  const duration = Number(item.duration) || 0;
  return {
    videoId,
    title: item.title || "Unknown Title",
    artist: item.uploaderName || item.uploader || "Unknown Artist",
    album: "Single",
    duration: parseDuration(duration),
    thumbnail: item.thumbnail || item.thumbnailUrl || "",
    year: item.uploadDate ? Number(String(item.uploadDate).slice(0, 4)) || null : null,
  };
}

export function isPipedConfigured() {
  return INSTANCES.length > 0;
}

export async function searchPiped(query, limit = 20) {
  const normalized = normalize(query);
  if (!normalized) return [];
  const response = await request("/search", {
    q: normalized,
    filter: "music_songs",
  });
  return (Array.isArray(response.data) ? response.data : [])
    .map(mapSearchItem)
    .filter(Boolean)
    .slice(0, Math.max(1, Math.min(Number(limit) || 20, 20)));
}

export async function getPipedMetadata(videoId) {
  const id = String(videoId || "").trim();
  if (!id) return null;
  const response = await request(`/streams/${encodeURIComponent(id)}`);
  const data = response.data || {};
  return {
    videoId: id,
    title: data.title || "Unknown Title",
    artist: data.uploader || "Unknown Artist",
    album: "Single",
    duration: parseDuration(data.duration),
    thumbnail: data.thumbnailUrl || "",
    year: data.uploadDate ? Number(String(data.uploadDate).slice(0, 4)) || null : null,
  };
}

export async function resolvePipedSource(videoId) {
  const id = String(videoId || "").trim();
  if (!id) return null;
  const response = await request(`/streams/${encodeURIComponent(id)}`);
  const data = response.data || {};
  const streams = Array.isArray(data.audioStreams) ? data.audioStreams : [];
  const candidates = streams
    .filter((stream) => stream?.url && stream?.videoOnly === false)
    .sort((a, b) => {
      const aM4a = String(a.format || "").toUpperCase() === "M4A" ? 1 : 0;
      const bM4a = String(b.format || "").toUpperCase() === "M4A" ? 1 : 0;
      if (aM4a !== bM4a) return bM4a - aM4a;
      return (Number(b.bitrate) || 0) - (Number(a.bitrate) || 0);
    });
  const best = candidates[0];
  if (!best) return null;

  return {
    provider: "piped",
    providerId: id,
    title: data.title || "Unknown Title",
    artist: data.uploader || "Unknown Artist",
    album: "Single",
    durationSeconds: Number(data.duration) || 0,
    thumbnailUrl: data.thumbnailUrl || "",
    mimeType: best.mimeType || (String(best.format).toUpperCase() === "M4A" ? "audio/mp4" : "audio/webm"),
    streamUrl: best.url,
    downloadable: true,
    license: null,
    matchScore: 1,
    sourceUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`,
  };
}
