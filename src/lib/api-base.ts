/** Shared API base URL (same logic as src/api/client.ts). */
export function getApiBaseUrl(): string {
  return (
    import.meta.env.VITE_API_URL ??
    (typeof window !== "undefined"
      ? `http://${window.location.hostname}:3001`
      : "http://localhost:3001")
  );
}

export function streamUrl(videoId: string): string {
  return `${getApiBaseUrl()}/api/stream/${encodeURIComponent(videoId)}`;
}
