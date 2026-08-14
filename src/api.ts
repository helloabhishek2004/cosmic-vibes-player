export type Song = { videoId: string; title: string; artist: string; duration: string; thumbnail: string };
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
export async function search(query: string): Promise<Song[]> {
  const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error("Search failed");
  return response.json();
}
export const streamUrl = (videoId: string) => `${API_URL}/stream/${encodeURIComponent(videoId)}`;
export const downloadUrl = (videoId: string) => `${API_URL}/download/${encodeURIComponent(videoId)}`;
