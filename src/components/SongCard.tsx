import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Download, Play } from "lucide-react";
import type { Song } from "@/data/songs";

export function SongCard({ song, onDownload }: { song: Song; onDownload: (s: Song) => void }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="glass rounded-3xl p-4 group hover:shadow-[0_20px_50px_-20px_rgba(123,111,240,0.5)] transition-shadow"
    >
      <Link
        to="/song/$id"
        params={{ id: song.id }}
        className="block"
        aria-label={`View ${song.title} by ${song.artist}`}
      >
        <div className="relative aspect-square rounded-2xl overflow-hidden mb-4">
          <img
            src={song.thumbnailUrl}
            alt={`${song.album} cover`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label={`Play preview of ${song.title}`}
            onClick={(e) => e.preventDefault()}
            className="absolute bottom-3 right-3 w-12 h-12 rounded-full gradient-bg flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Play size={18} fill="white" className="text-white ml-0.5" />
          </motion.button>
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
