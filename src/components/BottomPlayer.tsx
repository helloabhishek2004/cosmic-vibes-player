import { Link } from "@tanstack/react-router";
import { Loader2, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { playNext, playPrev, togglePlayPause, usePlayer } from "@/lib/player-store";

export function BottomPlayer() {
  const { track, status, hasNext, hasPrev } = usePlayer();

  return (
    <AnimatePresence>
      {track && (
        <motion.footer
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-0 inset-x-0 z-40 px-3 pb-3 pt-2 pointer-events-none"
        >
          <div className="max-w-6xl mx-auto glass rounded-2xl px-4 py-3 flex items-center gap-4 shadow-[0_-8px_40px_rgba(0,0,0,0.45)] pointer-events-auto">
            <Link
              to="/song/$id"
              params={{ id: track.id }}
              className="flex items-center gap-3 min-w-0 flex-1"
            >
              <img
                src={track.thumbnailUrl}
                alt=""
                className="w-12 h-12 rounded-xl object-cover shrink-0"
              />
              <div className="min-w-0 text-left">
                <p className="font-medium text-sm truncate">{track.title}</p>
                <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
              </div>
            </Link>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={playPrev}
                disabled={!hasPrev}
                aria-label="Previous track"
                className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 transition"
              >
                <SkipBack size={20} />
              </button>
              <button
                type="button"
                onClick={togglePlayPause}
                aria-label={status === "playing" ? "Pause" : "Play"}
                className="w-11 h-11 rounded-full gradient-bg flex items-center justify-center shadow-lg"
              >
                {status === "loading" ? (
                  <Loader2 size={20} className="animate-spin text-white" />
                ) : status === "playing" ? (
                  <Pause size={20} fill="white" className="text-white" />
                ) : (
                  <Play size={20} fill="white" className="text-white ml-0.5" />
                )}
              </button>
              <button
                type="button"
                onClick={playNext}
                disabled={!hasNext}
                aria-label="Next track"
                className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 transition"
              >
                <SkipForward size={20} />
              </button>
            </div>
          </div>
        </motion.footer>
      )}
    </AnimatePresence>
  );
}
