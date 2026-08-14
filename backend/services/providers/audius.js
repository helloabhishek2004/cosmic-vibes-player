import axios from "axios";

const API_BASE = "https://api.audius.co/v1";
const API_KEY = process.env.AUDIUS_API_KEY || "";
const BEARER_TOKEN = process.env.AUDIUS_BEARER_TOKEN || "";
const TIMEOUT_MS = 8000;

function authHeaders() {
  return BEARER_TOKEN ? { Authorization: `Bearer ${BEARER_TOKEN}` } : {};
}

function normalize(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenSimilarity(a, b) {
  const aa = new Set(normalize(a).split(/\s+/).filter(Boolean));
  const bb = new Set(normalize(b).split(/\s+/).filter(Boolean));
  if (!aa.size || !bb.size) return 0;
  let intersection = 0;
  for (const token of aa) if (bb.has(token)) intersection++;
  return intersection / Math.max(aa.size, bb.size);
}

function stringSimilarity(a, b) {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.9;
  return tokenSimilarity(left, right);
}

function durationSimilarity(a, b) {
  const left = Number(a) || 0;
  const right = Number(b) || 0;
  if (!left || !right) return 0.5;
  const delta = Math.abs(left - right);
  if (delta <= 2) return 1;
  if (delta <= 5) return 0.9;
  if (delta <= 10) return 0.7;
  if (delta <= 20) return 0.4;
  return 0;
}

export function isAudiusConfigured() {
  // Audius currently allows read-only catalog access without credentials.
  // An API key/bearer token can be added later for higher limits/authenticated use.
  return true;
}

export function scoreAudiusCandidate(song, track) {
  const artist = track?.user?.name || "";
  const titleScore = stringSimilarity(song.title, track?.title);
  const artistScore = stringSimilarity(song.artist, artist);
  const durationScore = durationSimilarity(song.durationSeconds, track?.duration);
  const downloadableScore = track?.downloadable ? 1 : 0;
  const streamableScore = track?.isStreamable !== false ? 1 : 0;

  return (
    titleScore * 0.45 +
    artistScore * 0.30 +
    durationScore * 0.15 +
    downloadableScore * 0.05 +
    streamableScore * 0.05
  );
}

export async function searchAudiusTracks(song, { limit = 10, downloadableOnly = false } = {}) {
  const query = [song.title, song.artist].filter(Boolean).join(" ").trim();
  if (!query) return [];

  const params = {
    query,
    limit,
    sort_method: "relevant",
  };
  if (downloadableOnly) params.only_downloadable = "true";
  if (API_KEY) params.api_key = API_KEY;

  try {
    const response = await axios.get(`${API_BASE}/tracks/search`, {
      params,
      headers: authHeaders(),
      timeout: TIMEOUT_MS,
    });
    return Array.isArray(response.data?.data) ? response.data.data : [];
  } catch (error) {
    console.warn(`[Audius] Search failed: ${error.response?.status || error.message}`);
    return [];
  }
}

export async function resolveAudiusSource(song, { requireDownload = false } = {}) {
  const tracks = await searchAudiusTracks(song, {
    limit: 10,
    downloadableOnly: requireDownload,
  });

  const candidates = tracks
    .filter((track) => track?.id && track?.title)
    .map((track) => ({ track, score: scoreAudiusCandidate(song, track) }))
    .sort((a, b) => b.score - a.score);

  const best = candidates[0];
  if (!best || best.score < 0.78) return null;
  if (best.track.isStreamable === false) return null;
  if (requireDownload && !best.track.downloadable) return null;

  const artist = best.track.user?.name || song.artist || "Unknown Artist";
  return {
    provider: "audius",
    providerId: String(best.track.id),
    title: best.track.title,
    artist,
    album: song.album || "",
    durationSeconds: Number(best.track.duration) || song.durationSeconds || 0,
    thumbnailUrl:
      best.track.artwork?._480x480 ||
      best.track.artwork?._1000x1000 ||
      song.thumbnailUrl ||
      "",
    mimeType: "audio/mpeg",
    bitrate: Number(best.track.bitrate) || null,
    expiresAt: null,
    streamUrl: `${API_BASE}/tracks/${encodeURIComponent(best.track.id)}/stream${API_KEY ? `?api_key=${encodeURIComponent(API_KEY)}` : ""}`,
    downloadable: Boolean(best.track.downloadable),
    license: best.track.license || null,
    matchScore: Number(best.score.toFixed(3)),
    sourceUrl: best.track.permalink ? `https://audius.co${best.track.permalink}` : null,
  };
}

export async function getAudiusTrackStreamUrl(trackId) {
  if (!trackId) return null;
  return `${API_BASE}/tracks/${encodeURIComponent(trackId)}/stream${API_KEY ? `?api_key=${encodeURIComponent(API_KEY)}` : ""}`;
}
