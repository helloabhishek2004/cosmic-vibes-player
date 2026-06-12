/** Shared API base URL (same logic as src/api/client.ts). */
export function getApiBaseUrl(): string {
  const envUrl: string | undefined = import.meta.env.VITE_API_URL;
  return (
    envUrl && envUrl.trim() !== ""
      ? envUrl.trim()
      : typeof window !== "undefined"
        ? `http://${window.location.hostname}:3001`
        : "http://localhost:3001"
  );
}

export function streamUrl(videoId: string): string {
  return `${getApiBaseUrl()}/api/stream/${encodeURIComponent(videoId)}`;
}
