import type { Song } from "@/types/song";

const STORAGE_KEY = "dua.mp3:play-history";
export type HistoryEntry = Song & {
  playCount: number;
  completedPlays: number;
  skips: number;
  liked: boolean;
  lastPlayedAt: number;
  position: number;
};

function read(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function write(entries: HistoryEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 50)));
  window.dispatchEvent(new Event("dua:history"));
}

export function recordPlayback(song: Song, event: "play" | "complete" | "skip", position = 0) {
  const entries = read();
  const existing = entries.find((item) => item.id === song.id);
  const item: HistoryEntry = existing || { ...song, playCount: 0, completedPlays: 0, skips: 0, liked: false, lastPlayedAt: 0, position: 0 };
  Object.assign(item, song, { lastPlayedAt: Date.now(), position });
  if (event === "play") item.playCount += 1;
  if (event === "complete") item.completedPlays += 1;
  if (event === "skip") item.skips += 1;
  write([item, ...entries.filter((entry) => entry.id !== song.id)]);
}

export function getRecentlyPlayed(): HistoryEntry[] { return read().sort((a, b) => b.lastPlayedAt - a.lastPlayedAt); }

export function rankLocalRecommendations(candidates: Song[]): Song[] {
  const history = read();
  const scores = new Map(history.map((item) => [item.artist.toLowerCase(), item.playCount * 3 + (item.liked ? 5 : 0) + item.completedPlays * 2 - item.skips * 3]));
  return [...candidates].sort((a, b) => (scores.get(b.artist.toLowerCase()) || 0) - (scores.get(a.artist.toLowerCase()) || 0));
}
