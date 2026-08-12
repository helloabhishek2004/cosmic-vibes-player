const PRODUCTION_API = "https://cosmic-vibes-backend.onrender.com";

/** Shared API base URL (same logic as src/api/client.ts). */
export function getApiBaseUrl(): string {
  const envUrl: string | undefined = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() !== "") return envUrl.trim();
  return PRODUCTION_API;
}

export function streamUrl(videoId: string): string {
  return `${getApiBaseUrl()}/api/stream/${encodeURIComponent(videoId)}`;
}
