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
  const result = await resolveAudioSourceDetailed(metadata, { requireDownload });
  return result.source;
}

export async function resolveAudioSourceDetailed(metadata, { requireDownload = false } = {}) {
  const song = toCanonicalSong(metadata);
  const providers = [];
  const diagnostics = [];

  // Audius is the first-class independent playback source. It is matched by
  // title/artist rather than assuming the YouTube video ID exists in Audius.
  if (isAudiusConfigured()) {
    providers.push({
      name: "audius",
      resolve: () => resolveAudiusSource(song, { requireDownload }),
    });
  }

  // Piped remains a secondary exact-video resolver. It is intentionally
  // optional because public instances can disappear or rate-limit Render.
  if (isPipedConfigured() && song.id) {
    providers.push({
      name: "piped",
      resolve: () => resolvePipedSource(song.id),
    });
  }

  for (const provider of providers) {
    try {
      const source = await provider.resolve();
      if (source && (!requireDownload || source.downloadable)) {
        source.sourceType = source.provider === "audius" ? "audius" : "proxy";
        source.diagnostics = { providersTried: [...diagnostics.map((item) => item.provider), provider.name], matchScore: source.matchScore || null };
        return { source, providersTried: [...diagnostics.map((item) => item.provider), provider.name], diagnostics };
      }
      diagnostics.push({ provider: provider.name, status: "no_match" });
    } catch (error) {
      diagnostics.push({ provider: provider.name, status: "error", message: error.message });
      console.warn(`[SourceResolver] ${provider.name} failed: ${error.message}`);
    }
  }

  return { source: null, providersTried: providers.map((provider) => provider.name), diagnostics };
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
