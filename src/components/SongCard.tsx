import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Download, Loader2, Pause, Play } from "lucide-react";
import { useState } from "react";
import type { Song } from "@/data/songs";
import { toggleTrack, usePlayback } from "@/lib/audio-player";

export function SongCard({
  song,
  onDownload,
  playlist,
}: {
  song: Song;
  onDownload: (s: Song) => void;
  playlist?: Song[];
}) {
  const { active, status } = usePlayback(song.id);
  const [loaded, setLoaded] = useState(false);

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    toggleTrack(song, playlist);
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`glass rounded-3xl p-4 group transition-shadow ${
        active && status === "playing"
          ? "shadow-[0_20px_60px_-20px_rgba(0,212,255,0.7)]"
          : "hover:shadow-[0_20px_50px_-20px_rgba(123,111,240,0.5)]"
      }`}
    >
      <Link
        to="/song/$id"
        params={{ id: song.id }}
        className="block"
        aria-label={`View ${song.title} by ${song.artist}`}
      >
        <div className="relative aspect-square rounded-2xl overflow-hidden mb-4">
          {!loaded && <div className="absolute inset-0 shimmer" aria-hidden />}
          <img
            src={song.thumbnailUrl}
            alt={`${song.album} cover`}
            className={`w-full h-full object-cover transition-opacity duration-500 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
          />
          {active && status === "playing" && (
            <div className="absolute inset-0 ring-2 ring-[color:var(--cyan)]/60 rounded-2xl pointer-events-none" />
          )}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label={
              active && status === "playing"
                ? `Pause preview of ${song.title}`
                : `Play preview of ${song.title}`
            }
            onClick={handlePlay}
            className={`absolute bottom-3 right-3 w-12 h-12 rounded-full gradient-bg flex items-center justify-center shadow-lg transition-opacity ${
              active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            {status === "loading" ? (
              <Loader2 size={18} className="text-white animate-spin" />
            ) : active && status === "playing" ? (
              <Pause size={18} fill="white" className="text-white" />
            ) : (
              <Play size={18} fill="white" className="text-white ml-0.5" />
            )}
          </motion.button>
          {active && status === "playing" && (
            <div className="absolute bottom-3 left-3 flex items-end gap-0.5 h-6" aria-hidden>
              <span className="eq-bar" style={{ animationDelay: "0s" }} />
              <span className="eq-bar" style={{ animationDelay: "0.2s" }} />
              <span className="eq-bar" style={{ animationDelay: "0.4s" }} />
              <span className="eq-bar" style={{ animationDelay: "0.1s" }} />
            </div>
          )}
        </div>
        <h3 className="font-display font-semibold truncate">{song.title}</h3>
        <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
        <p className="text-xs text-muted-foreground mt-1">{song.duration}</p>
      </Link>
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => onDownload(song)}
        aria-label={`Download ${song.title}`}
        className="mt-3 w-full py-2.5 rounded-full glass hover:bg-white/10 flex items-center justify-center gap-2 text-sm font-medium transition"
      >
        <Download size={16} /> Download
      </motion.button>
    </motion.div>
  );
}
