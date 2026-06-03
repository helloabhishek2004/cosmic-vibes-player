import type { Song } from "@/data/songs";
import { streamUrl } from "@/lib/api-base";

export type ApiTrack = {
  videoId: string;
  title: string;
  artist: string;
  album?: string;
  duration?: string;
  thumbnail?: string;
  year?: number;
};

export function mapApiTrackToSong(item: ApiTrack): Song {
  return {
    id: item.videoId,
    title: item.title,
    artist: item.artist,
    album: item.album || "Single",
    duration: item.duration || "0:00",
    year: item.year || new Date().getFullYear(),
    genre: ["Music"],
    thumbnailUrl: item.thumbnail || "https://picsum.photos/seed/music/600/600",
    previewUrl: streamUrl(item.videoId),
  };
}

export function mapApiTracks(items: ApiTrack[]): Song[] {
  return (items || []).map(mapApiTrackToSong);
}
