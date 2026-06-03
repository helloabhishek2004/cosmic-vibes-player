import { useEffect, useRef, useState } from "react";
import { SongCard } from "@/components/SongCard";
import { SongCardSkeleton } from "@/components/SongCardSkeleton";
import type { Song } from "@/data/songs";

function LazySongCard({
  song,
  onDownload,
  playlist,
}: {
  song: Song;
  onDownload: (s: Song) => void;
  playlist: Song[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="min-h-[280px]">
      {visible ? (
        <SongCard song={song} onDownload={onDownload} playlist={playlist} />
      ) : (
        <SongCardSkeleton />
      )}
    </div>
  );
}

export function LazySongGrid({
  songs,
  onDownload,
  playlist,
  loading,
  loadingCount = 8,
}: {
  songs: Song[];
  onDownload: (s: Song) => void;
  playlist?: Song[];
  loading?: boolean;
  loadingCount?: number;
}) {
  const queue = playlist ?? songs;
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {Array.from({ length: loadingCount }).map((_, i) => (
          <SongCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="glass rounded-3xl p-10 text-center text-muted-foreground">
        No tracks found. Try a different search.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {songs.map((song) => (
        <LazySongCard key={song.id} song={song} onDownload={onDownload} playlist={queue} />
      ))}
    </div>
  );
}
