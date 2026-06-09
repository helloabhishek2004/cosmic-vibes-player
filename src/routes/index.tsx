import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Search } from "lucide-react";
import { Starfield } from "@/components/Starfield";
import { Doodles } from "@/components/Doodles";
import { DownloadModal } from "@/components/DownloadModal";
import { LazySongGrid } from "@/components/LazySongGrid";
import { stop } from "@/lib/audio-player";
import { type Song } from "@/data/songs";
import client from "@/api/client";
import { mapApiTracks } from "@/lib/map-song";

const SEARCH_DEBOUNCE_MS = 280;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "dua.mp3 — Search. Discover. Download." },
      {
        name: "description",
        content: "Search, discover, and download your favorite tracks instantly.",
      },
      { property: "og:title", content: "dua.mp3" },
      { property: "og:description", content: "Search. Discover. Download." },
    ],
  }),
  component: Home,
});

function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Song[]>([]);
  const [trending, setTrending] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [focused, setFocused] = useState(false);
  const [downloadFor, setDownloadFor] = useState<Song | null>(null);
  const searchAbort = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSearching = query.trim().length >= 2;
  const displayResults = isSearching ? results : trending;
  const displayLoading = isSearching ? loading : trendingLoading;

  useEffect(() => () => stop(), []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await client.get("/api/trending");
        if (active) setTrending(mapApiTracks(response.data));
      } catch (err) {
        console.error("Trending API failed:", err);
      } finally {
        if (active) setTrendingLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    searchAbort.current?.abort();
    const controller = new AbortController();
    searchAbort.current = controller;
    setLoading(true);

    try {
      const response = await client.get(`/api/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      });
      setResults(mapApiTracks(response.data));
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      console.error("Search API failed:", err);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  const scheduleSearch = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const trimmed = q.trim();
      if (trimmed.length < 2) {
        setResults([]);
        setLoading(false);
        searchAbort.current?.abort();
        return;
      }
      setLoading(true);
      debounceRef.current = setTimeout(() => runSearch(q), SEARCH_DEBOUNCE_MS);
    },
    [runSearch],
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
    scheduleSearch(value);
  };

  const submitSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    void runSearch(query);
  };

  const suggestions = isSearching && !loading ? results.slice(0, 6) : [];

  return (
    <>
      <Starfield />
      <Doodles />
      <main className="min-h-dvh px-4 py-12 md:py-20 pb-32">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <h1 className="title-glow font-display text-6xl md:text-8xl font-extrabold text-white tracking-tight inline-block">
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
            <form
              className="glass rounded-full flex items-center px-5 py-3 transition-shadow"
              style={focused ? { boxShadow: "0 0 0 2px #7B6FF0, var(--glow-violet)" } : undefined}
              onSubmit={(e) => {
                e.preventDefault();
                submitSearch();
              }}
            >
              <Search size={20} className="text-muted-foreground shrink-0" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 150)}
                placeholder="Search for songs, artists, albums…"
                aria-label="Search songs"
                className="flex-1 bg-transparent outline-none px-4 text-base placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                aria-label="Search"
                className="p-2.5 rounded-full gradient-bg hover:opacity-90 transition shadow-md"
              >
                <ArrowRight size={18} className="text-white" />
              </button>
            </form>

            <AnimatePresence>
              {focused && suggestions.length > 0 && (
                <motion.ul
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute left-0 right-0 mt-2 glass rounded-2xl overflow-hidden z-20 max-h-72 overflow-y-auto"
                  role="listbox"
                >
                  {suggestions.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onMouseDown={() => {
                          setQuery(s.title);
                          void runSearch(s.title);
                        }}
                        className="w-full text-left px-5 py-3 hover:bg-white/10 flex items-center gap-3 transition"
                      >
                        <img
                          src={s.thumbnailUrl}
                          alt=""
                          className="w-9 h-9 rounded-lg object-cover"
                          loading="lazy"
                        />
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
              {isSearching ? `Results for "${query.trim()}"` : "Trending on YouTube"}
            </h2>
            <LazySongGrid
              songs={displayResults}
              loading={displayLoading}
              onDownload={setDownloadFor}
              playlist={displayResults}
            />
          </motion.section>
        </div>
      </main>

      <DownloadModal
        open={!!downloadFor}
        onClose={() => setDownloadFor(null)}
        songTitle={downloadFor ? `${downloadFor.title} — ${downloadFor.artist}` : ""}
        videoId={downloadFor ? downloadFor.id : ""}
      />
    </>
  );
}
