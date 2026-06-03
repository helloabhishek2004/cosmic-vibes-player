import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, Search } from "lucide-react";
import { Starfield } from "@/components/Starfield";
import { Meteors } from "@/components/Meteors";
import { Doodles } from "@/components/Doodles";
import { SongCard } from "@/components/SongCard";
import { SongCardSkeleton } from "@/components/SongCardSkeleton";
import { DownloadModal } from "@/components/DownloadModal";
import { stop as stopAudio } from "@/lib/audio-player";
import { songs, type Song } from "@/data/songs";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "dua.mp3 — Search. Discover. Download." },
      { name: "description", content: "Search, discover, and download your favorite tracks instantly." },
      { property: "og:title", content: "dua.mp3" },
      { property: "og:description", content: "Search. Discover. Download." },
    ],
  }),
  component: Home,
});

function Home() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [downloadFor, setDownloadFor] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => () => stopAudio(), []);

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.album.toLowerCase().includes(q) ||
        s.genre.some((g) => g.toLowerCase().includes(q))
    );
  }, [query]);


  const suggestions = useMemo(() => matches.slice(0, 5), [matches]);
  const results = query.trim() ? matches : songs;

  return (
    <>
      <Starfield />
      <main className="min-h-dvh px-4 py-12 md:py-20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <h1 className="font-display text-6xl md:text-8xl font-extrabold gradient-text tracking-tight">
              dua.mp3
            </h1>
            <p className="mt-4 text-lg md:text-xl text-muted-foreground">
              Search. Discover. Download.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="relative max-w-2xl mx-auto"
          >
            <div
              className="glass rounded-full flex items-center px-5 py-3 transition-shadow"
              style={focused ? { boxShadow: "0 0 0 2px #7B6FF0, var(--glow-violet)" } : undefined}
            >
              <Search size={20} className="text-muted-foreground shrink-0" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 150)}
                placeholder="Search for songs, artists, albums…"
                aria-label="Search songs"
                className="flex-1 bg-transparent outline-none px-4 text-base placeholder:text-muted-foreground"
              />
              <button
                aria-label="Voice search"
                className="p-2 rounded-full hover:bg-white/10 transition"
              >
                <Mic size={18} />
              </button>
            </div>

            <AnimatePresence>
              {focused && suggestions.length > 0 && (
                <motion.ul
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute left-0 right-0 mt-2 glass rounded-2xl overflow-hidden z-20"
                  role="listbox"
                >
                  {suggestions.map((s) => (
                    <li key={s.id}>
                      <button
                        onMouseDown={() => setQuery(s.title)}
                        className="w-full text-left px-5 py-3 hover:bg-white/10 flex items-center gap-3 transition"
                      >
                        <img src={s.thumbnailUrl} alt="" className="w-9 h-9 rounded-lg object-cover" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{s.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{s.artist}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-14"
            aria-label="Search results"
          >
            <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-5">
              {query.trim() ? `Results for "${query}"` : "Trending now"}
            </h2>
            {results.length === 0 ? (
              <div className="glass rounded-3xl p-10 text-center text-muted-foreground">
                No tracks found. Try a different search.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {results.map((song) => (
                  <SongCard key={song.id} song={song} onDownload={setDownloadFor} />
                ))}
              </div>
            )}
          </motion.section>
        </div>
      </main>
      <DownloadModal
        open={!!downloadFor}
        onClose={() => setDownloadFor(null)}
        songTitle={downloadFor ? `${downloadFor.title} — ${downloadFor.artist}` : ""}
      />
    </>
  );
}
