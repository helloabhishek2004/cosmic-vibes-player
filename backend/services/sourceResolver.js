import { resolveAudiusSource, isAudiusConfigured } from "./providers/audius.js";
import { resolvePipedSource, isPipedConfigured } from "./providers/piped.js";

function parseDuration(value) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const parts = String(value).split(":").map(Number);
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

export function toCanonicalSong(metadata = {}) {
  return {
    id: metadata.videoId || metadata.id || "",
    title: metadata.title || "",
    artist: metadata.artist || "",
    album: metadata.album || "",
    duration: metadata.duration || "",
    durationSeconds: parseDuration(metadata.durationSeconds ?? metadata.duration),
    year: metadata.year || "",
    genre: Array.isArray(metadata.genre) ? metadata.genre : [],
    thumbnailUrl: metadata.thumbnailUrl || metadata.thumbnail || "",
    previewUrl: metadata.previewUrl || "",
  };
}

export async function resolveAudioSource(metadata, { requireDownload = false } = {}) {
  const song = toCanonicalSong(metadata);
  const providers = [];

  // Piped resolves the exact YouTube video through a public proxy and does not
  // depend on browser cookies from the Render datacenter. This is the primary
  // production path for YouTube-backed songs.
  if (isPipedConfigured() && song.id) {
    providers.push({
      name: "piped",
      resolve: () => resolvePipedSource(song.id),
    });
  }

  // Audius is a genuinely independent open-audio catalog. Prefer it when the
  // metadata matches strongly enough, especially for downloadable releases.
  if (isAudiusConfigured()) {
    providers.push({
      name: "audius",
      resolve: () => resolveAudiusSource(song, { requireDownload }),
    });
  }

  for (const provider of providers) {
    try {
      const source = await provider.resolve();
      if (source && (!requireDownload || source.downloadable)) return source;
    } catch (error) {
      console.warn(`[SourceResolver] ${provider.name} failed: ${error.message}`);
    }
  }

  return null;
}

export function getSourceProviderStatus() {
  return {
    piped: {
      configured: isPipedConfigured(),
    },
    audius: {
      configured: isAudiusConfigured(),
    },
  };
}
