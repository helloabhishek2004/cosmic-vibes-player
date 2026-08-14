import axios from "axios";

// Discovery must not depend on a single public proxy. Piped documents a public
// instance pool and recommends keeping it current; these are current public
// instances with a second provider (Invidious) as a failure boundary.
const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.leptons.xyz",
  "https://pipedapi.nosebs.ru",
  "https://pipedapi-libre.kavin.rocks",
  "https://piped-api.privacy.com.de",
  "https://pipedapi.adminforge.de",
  "https://api.piped.yt",
  "https://pipedapi.drgns.space",
  "https://pipedapi.owo.si",
  "https://pipedapi.ducks.party",
];

const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://yt.chocolatemoo53.com",
  "https://invidious.tiekoetter.com",
];

// Public proxy instances are frequently slow or offline. Keep fallback
// discovery inside the browser's request budget instead of serially waiting
// on every dead instance.
const TIMEOUT_MS = Number(process.env.PIPED_TIMEOUT_MS || 800);
const MAX_PROVIDER_INSTANCES = Math.max(1, Number(process.env.PIPED_MAX_INSTANCES || 4));
const MAX_LIMIT = 20;
const CIRCUIT_COOLDOWN_MS = 60_000;
const failures = new Map();

function normalize(value = "") {
  return String(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function parseVideoId(value = "") {
  const text = String(value || "");
  const match = text.match(/[?&]v=([a-zA-Z0-9_-]{11})/) || text.match(/\/watch(?:\.php)?\/([a-zA-Z0-9_-]{11})/);
  return match?.[1] || null;
}

function parseDuration(seconds) {
  const total = Number(seconds) || 0;
  if (!total) return "0:00";
  return `${Math.floor(total / 60)}:${String(Math.floor(total % 60)).padStart(2, "0")}`;
}

function limitValue(limit) {
  return Math.max(1, Math.min(Number(limit) || MAX_LIMIT, MAX_LIMIT));
}

async function requestFromPool(instances, path, params = {}, label = "Provider") {
  let lastError = null;
  for (const base of instances.slice(0, MAX_PROVIDER_INSTANCES)) {
    const blockedUntil = failures.get(base) || 0;
    if (blockedUntil > Date.now()) continue;
    try {
      const response = await axios.get(`${base}${path}`, {
        params,
        timeout: TIMEOUT_MS,
        headers: { Accept: "application/json", "User-Agent": "CosmicVibes/1.0" },
      });
      failures.delete(base);
      return { data: response.data, base };
    } catch (error) {
      lastError = error;
      failures.set(base, Date.now() + CIRCUIT_COOLDOWN_MS);
      console.warn(`[${label}] ${base} failed for ${path}: ${error.response?.status || error.code || error.message}`);
    }
  }
  throw lastError || new Error(`No ${label} instance available`);
}

function asArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.videos)) return data.videos;
  return [];
}

function mapSearchItem(item) {
  const videoId = parseVideoId(item?.url) || item?.id || item?.videoId;
  if (!videoId) return null;
  const duration = Number(item.duration ?? item.lengthSeconds) || 0;
  const thumbnail = item.thumbnail || item.thumbnailUrl || item.videoThumbnails?.find((t) => t?.quality === "medium")?.url || item.videoThumbnails?.[0]?.url || "";
  return {
    videoId,
    title: item.title || "Unknown Title",
    artist: item.uploaderName || item.uploader || item.author || "Unknown Artist",
    album: "Single",
    duration: parseDuration(duration),
    thumbnail,
    year: item.uploadDate ? Number(String(item.uploadDate).slice(0, 4)) || null : null,
  };
}

function hasUsefulResults(data) {
  return asArray(data).some((item) => parseVideoId(item?.url) || item?.id || item?.videoId);
}

export function isPipedConfigured() {
  return PIPED_INSTANCES.length > 0;
}

async function searchInvidious(query, limit) {
  const response = await requestFromPool(INVIDIOUS_INSTANCES, "/api/v1/search", {
    q: query,
    type: "video",
    region: "IN",
  }, "Invidious");
  return asArray(response.data).map(mapSearchItem).filter(Boolean).slice(0, limitValue(limit));
}

export async function searchPiped(query, limit = MAX_LIMIT) {
  const normalized = normalize(query);
  if (!normalized) return [];
  const capped = limitValue(limit);

  // Prefer music results, but fall back to the general Piped search because
  // some instances temporarily disable or mishandle the music_songs filter.
  try {
    const response = await requestFromPool(PIPED_INSTANCES, "/search", {
      q: normalized,
      filter: "music_songs",
    }, "Piped");
    const musicResults = asArray(response.data).map(mapSearchItem).filter(Boolean).slice(0, capped);
    if (musicResults.length) return musicResults;
  } catch (error) {
    console.warn(`[Piped] music search unavailable: ${error.message}`);
  }

  try {
    const response = await requestFromPool(PIPED_INSTANCES, "/search", {
      q: normalized,
      filter: "all",
    }, "Piped");
    const results = asArray(response.data).map(mapSearchItem).filter(Boolean).slice(0, capped);
    if (results.length) return results;
  } catch (error) {
    console.warn(`[Piped] general search unavailable: ${error.message}`);
  }

  // Independent provider fallback. Search remains functional even if every
  // Piped instance is blocked/down from Render's egress IP.
  return searchInvidious(normalized, capped);
}

export async function requestPipedTrending(region = "IN", limit = MAX_LIMIT) {
  const capped = limitValue(limit);

  try {
    const response = await requestFromPool(PIPED_INSTANCES, "/trending", {
      region: String(region || "IN").toUpperCase(),
    }, "Piped");
    const results = asArray(response.data).map(mapSearchItem).filter(Boolean).slice(0, capped);
    if (results.length) return results;
  } catch (error) {
    console.warn(`[Piped] trending unavailable: ${error.message}`);
  }

  // Invidious trending is the independent fallback for the home page.
  const response = await requestFromPool(INVIDIOUS_INSTANCES, "/api/v1/trending", {
    region: String(region || "IN").toUpperCase(),
  }, "Invidious");
  return asArray(response.data).map(mapSearchItem).filter(Boolean).slice(0, capped);
}

export async function getPipedMetadata(videoId) {
  const id = String(videoId || "").trim();
  if (!id) return null;
  const response = await requestFromPool(PIPED_INSTANCES, `/streams/${encodeURIComponent(id)}`, {}, "Piped");
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
  const response = await requestFromPool(PIPED_INSTANCES, `/streams/${encodeURIComponent(id)}`, {}, "Piped");
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
    bitrate: Number(best.bitrate) || null,
    expiresAt: best.expiresInSeconds ? new Date(Date.now() + Number(best.expiresInSeconds) * 1000).toISOString() : null,
    streamUrl: best.url,
    downloadable: true,
    license: null,
    matchScore: 1,
    sourceUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`,
  };
}
