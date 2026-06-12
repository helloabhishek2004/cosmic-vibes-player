const PRODUCTION_API = "https://cosmic-vibes-backend.onrender.com";

/** Shared API base URL (same logic as src/api/client.ts). */
export function getApiBaseUrl(): string {
  const envUrl: string | undefined = import.meta.env.VITE_API_URL;
  const devHost: string | undefined = import.meta.env.VITE_DEV_HOST;
  const isProd: boolean = import.meta.env.PROD === true;

  if (envUrl && envUrl.trim() !== "") return envUrl.trim();
  if (isProd) return PRODUCTION_API;
  if (devHost && devHost.trim() !== "") return `http://${devHost.trim()}:3001`;
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ) {
    return `http://${window.location.hostname}:3001`;
  }
  return PRODUCTION_API;
}

export function streamUrl(videoId: string): string {
  return `${getApiBaseUrl()}/api/stream/${encodeURIComponent(videoId)}`;
}
