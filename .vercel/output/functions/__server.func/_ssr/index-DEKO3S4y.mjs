import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { S as Starfield, D as DownloadModal } from "./DownloadModal-BxddW1n2.mjs";
import { L as Link } from "../_libs/tanstack__react-router.mjs";
import { a as stop, c as client, s as streamUrl, u as usePlayback, t as toggleTrack } from "./router-CeS5Xnvr.mjs";
import "../_libs/sonner.mjs";
import { m as motion, A as AnimatePresence } from "../_libs/framer-motion.mjs";
import { c as Search, A as ArrowRight, L as LoaderCircle, P as Pause, a as Play, D as Download } from "../_libs/lucide-react.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/react-dom.mjs";
import "async_hooks";
import "util";
import "crypto";
import "stream";
import "../_libs/isbot.mjs";
import "../_libs/tanstack__query-core.mjs";
import "../_libs/tanstack__react-query.mjs";
import "../_libs/axios.mjs";
import "../_libs/form-data.mjs";
import "fs";
import "../_libs/combined-stream.mjs";
import "../_libs/delayed-stream.mjs";
import "path";
import "http";
import "https";
import "url";
import "../_libs/mime-types.mjs";
import "../_libs/mime-db.mjs";
import "../_libs/asynckit.mjs";
import "../_libs/es-set-tostringtag.mjs";
import "../_libs/get-intrinsic.mjs";
import "../_libs/es-object-atoms.mjs";
import "../_libs/es-errors.mjs";
import "../_libs/math-intrinsics.mjs";
import "../_libs/gopd.mjs";
import "../_libs/es-define-property.mjs";
import "../_libs/has-symbols.mjs";
import "../_libs/get-proto.mjs";
import "../_libs/dunder-proto.mjs";
import "../_libs/call-bind-apply-helpers.mjs";
import "../_libs/function-bind.mjs";
import "../_libs/hasown.mjs";
import "../_libs/has-tostringtag.mjs";
import "../_libs/proxy-from-env.mjs";
import "../_libs/https-proxy-agent.mjs";
import "net";
import "tls";
import "assert";
import "../_libs/debug.mjs";
import "../_libs/ms.mjs";
import "tty";
import "../_libs/supports-color.mjs";
import "os";
import "../_libs/has-flag.mjs";
import "../_libs/agent-base.mjs";
import "events";
import "http2";
import "../_libs/follow-redirects.mjs";
import "zlib";
import "../_libs/motion-dom.mjs";
import "../_libs/motion-utils.mjs";
const float = (dur, delay = 0) => ({
  animate: { y: [0, -14, 0], rotate: [0, 6, 0] },
  transition: { duration: dur, repeat: Infinity, ease: "easeInOut", delay }
});
function Doodles() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "aria-hidden": true, className: "pointer-events-none fixed inset-0 z-0 overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      motion.svg,
      {
        ...float(7),
        className: "absolute top-[14%] left-[6%] opacity-[0.05]",
        width: "46",
        height: "46",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "#7B6FF0",
        strokeWidth: "1.4",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M9 18V5l12-2v13" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "6", cy: "18", r: "3" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "18", cy: "16", r: "3" })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      motion.svg,
      {
        ...float(9, 1),
        className: "absolute top-[68%] left-[10%] opacity-[0.04]",
        width: "38",
        height: "38",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "#00D4FF",
        strokeWidth: "1.4",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 2v20M6 8v8M18 8v8M2 11v2M22 11v2" })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      motion.svg,
      {
        ...float(8, 2),
        className: "absolute top-[20%] right-[8%] opacity-[0.05]",
        width: "42",
        height: "42",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "#00D4FF",
        strokeWidth: "1.4",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "12", cy: "12", r: "9" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "12", cy: "12", r: "3" })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      motion.svg,
      {
        ...float(10, 0.5),
        className: "absolute top-[75%] right-[12%] opacity-[0.04]",
        width: "44",
        height: "44",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "#7B6FF0",
        strokeWidth: "1.4",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 2l2.39 6.96H22l-6 4.36 2.3 7.18L12 16.9l-6.3 3.6L8 13.32 2 8.96h7.61z" })
      }
    )
  ] });
}
function SongCard({
  song,
  onDownload,
  playlist
}) {
  const { active, status } = usePlayback(song.id);
  const [loaded, setLoaded] = reactExports.useState(false);
  const handlePlay = (e) => {
    e.preventDefault();
    toggleTrack(song, playlist);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    motion.div,
    {
      whileHover: { y: -4 },
      transition: { type: "spring", stiffness: 300, damping: 20 },
      className: `glass rounded-3xl p-4 group transition-shadow ${active && status === "playing" ? "shadow-[0_20px_60px_-20px_rgba(0,212,255,0.7)]" : "hover:shadow-[0_20px_50px_-20px_rgba(123,111,240,0.5)]"}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Link,
          {
            to: "/song/$id",
            params: { id: song.id },
            className: "block",
            "aria-label": `View ${song.title} by ${song.artist}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative aspect-square rounded-2xl overflow-hidden mb-4", children: [
                !loaded && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 shimmer", "aria-hidden": true }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "img",
                  {
                    src: song.thumbnailUrl,
                    alt: `${song.album} cover`,
                    className: `w-full h-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`,
                    loading: "lazy",
                    decoding: "async",
                    onLoad: () => setLoaded(true)
                  }
                ),
                active && status === "playing" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 ring-2 ring-[color:var(--cyan)]/60 rounded-2xl pointer-events-none" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  motion.button,
                  {
                    whileHover: { scale: 1.1 },
                    whileTap: { scale: 0.95 },
                    "aria-label": active && status === "playing" ? `Pause preview of ${song.title}` : `Play preview of ${song.title}`,
                    onClick: handlePlay,
                    className: `absolute bottom-3 right-3 w-12 h-12 rounded-full gradient-bg flex items-center justify-center shadow-lg transition-opacity ${active ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`,
                    children: status === "loading" ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 18, className: "text-white animate-spin" }) : active && status === "playing" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Pause, { size: 18, fill: "white", className: "text-white" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { size: 18, fill: "white", className: "text-white ml-0.5" })
                  }
                ),
                active && status === "playing" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute bottom-3 left-3 flex items-end gap-0.5 h-6", "aria-hidden": true, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "eq-bar", style: { animationDelay: "0s" } }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "eq-bar", style: { animationDelay: "0.2s" } }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "eq-bar", style: { animationDelay: "0.4s" } }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "eq-bar", style: { animationDelay: "0.1s" } })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-display font-semibold truncate", children: song.title }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground truncate", children: song.artist }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mt-1", children: song.duration })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          motion.button,
          {
            whileHover: { scale: 1.04 },
            whileTap: { scale: 0.96 },
            onClick: () => onDownload(song),
            "aria-label": `Download ${song.title}`,
            className: "mt-3 w-full py-2.5 rounded-full glass hover:bg-white/10 flex items-center justify-center gap-2 text-sm font-medium transition",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 16 }),
              " Download"
            ]
          }
        )
      ]
    }
  );
}
function SongCardSkeleton() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass rounded-3xl p-4", "aria-hidden": true, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "aspect-square rounded-2xl shimmer mb-4" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-4 w-3/4 rounded shimmer mb-2" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-3 w-1/2 rounded shimmer mb-3" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-9 w-full rounded-full shimmer" })
  ] });
}
function LazySongCard({
  song,
  onDownload,
  playlist
}) {
  const ref = reactExports.useRef(null);
  const [visible, setVisible] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref, className: "min-h-[280px]", children: visible ? /* @__PURE__ */ jsxRuntimeExports.jsx(SongCard, { song, onDownload, playlist }) : /* @__PURE__ */ jsxRuntimeExports.jsx(SongCardSkeleton, {}) });
}
function LazySongGrid({
  songs,
  onDownload,
  playlist,
  loading,
  loadingCount = 8
}) {
  const queue = playlist ?? songs;
  if (loading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5", children: Array.from({ length: loadingCount }).map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(SongCardSkeleton, {}, i)) });
  }
  if (songs.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "glass rounded-3xl p-10 text-center text-muted-foreground", children: "No tracks found. Try a different search." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5", children: songs.map((song) => /* @__PURE__ */ jsxRuntimeExports.jsx(LazySongCard, { song, onDownload, playlist: queue }, song.id)) });
}
function mapApiTrackToSong(item) {
  return {
    id: item.videoId,
    title: item.title,
    artist: item.artist,
    album: item.album || "Single",
    duration: item.duration || "0:00",
    year: item.year || (/* @__PURE__ */ new Date()).getFullYear(),
    genre: ["Music"],
    thumbnailUrl: item.thumbnail || "https://picsum.photos/seed/music/600/600",
    previewUrl: streamUrl(item.videoId)
  };
}
function mapApiTracks(items) {
  return (items || []).map(mapApiTrackToSong);
}
const SEARCH_DEBOUNCE_MS = 280;
function Home() {
  const [query, setQuery] = reactExports.useState("");
  const [results, setResults] = reactExports.useState([]);
  const [trending, setTrending] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [trendingLoading, setTrendingLoading] = reactExports.useState(true);
  const [focused, setFocused] = reactExports.useState(false);
  const [downloadFor, setDownloadFor] = reactExports.useState(null);
  const searchAbort = reactExports.useRef(null);
  const debounceRef = reactExports.useRef(null);
  const isSearching = query.trim().length >= 2;
  const displayResults = isSearching ? results : trending;
  const displayLoading = isSearching ? loading : trendingLoading;
  reactExports.useEffect(() => () => stop(), []);
  reactExports.useEffect(() => {
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
  const runSearch = reactExports.useCallback(async (q) => {
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
        signal: controller.signal
      });
      setResults(mapApiTracks(response.data));
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error("Search API failed:", err);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);
  const scheduleSearch = reactExports.useCallback((q) => {
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
  }, [runSearch]);
  const handleQueryChange = (value) => {
    setQuery(value);
    scheduleSearch(value);
  };
  const submitSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    void runSearch(query);
  };
  const suggestions = isSearching && !loading ? results.slice(0, 6) : [];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Starfield, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Doodles, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "min-h-dvh px-4 py-12 md:py-20 pb-32", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-6xl mx-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, { initial: {
        opacity: 0,
        y: 20
      }, animate: {
        opacity: 1,
        y: 0
      }, transition: {
        duration: 0.6
      }, className: "text-center mb-10", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "title-glow font-display text-6xl md:text-8xl font-extrabold text-white tracking-tight inline-block", children: "dua.mp3" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 text-lg md:text-xl text-muted-foreground", children: "Search. Discover. Download." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, { initial: {
        opacity: 0,
        y: 10
      }, animate: {
        opacity: 1,
        y: 0
      }, transition: {
        delay: 0.2,
        duration: 0.6
      }, className: "relative max-w-2xl mx-auto", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { className: "glass rounded-full flex items-center px-5 py-3 transition-shadow", style: focused ? {
          boxShadow: "0 0 0 2px #7B6FF0, var(--glow-violet)"
        } : void 0, onSubmit: (e) => {
          e.preventDefault();
          submitSearch();
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { size: 20, className: "text-muted-foreground shrink-0", "aria-hidden": true }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "search", value: query, onChange: (e) => handleQueryChange(e.target.value), onFocus: () => setFocused(true), onBlur: () => setTimeout(() => setFocused(false), 150), placeholder: "Search for songs, artists, albums…", "aria-label": "Search songs", className: "flex-1 bg-transparent outline-none px-4 text-base placeholder:text-muted-foreground" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", "aria-label": "Search", className: "p-2.5 rounded-full gradient-bg hover:opacity-90 transition shadow-md", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 18, className: "text-white" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: focused && suggestions.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(motion.ul, { initial: {
          opacity: 0,
          y: -8
        }, animate: {
          opacity: 1,
          y: 0
        }, exit: {
          opacity: 0,
          y: -8
        }, className: "absolute left-0 right-0 mt-2 glass rounded-2xl overflow-hidden z-20 max-h-72 overflow-y-auto", role: "listbox", children: suggestions.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onMouseDown: () => {
          setQuery(s.title);
          void runSearch(s.title);
        }, className: "w-full text-left px-5 py-3 hover:bg-white/10 flex items-center gap-3 transition", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: s.thumbnailUrl, alt: "", className: "w-9 h-9 rounded-lg object-cover", loading: "lazy" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium truncate", children: s.title }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground truncate", children: s.artist })
          ] })
        ] }) }, s.id)) }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.section, { initial: {
        opacity: 0
      }, animate: {
        opacity: 1
      }, transition: {
        delay: 0.4
      }, className: "mt-14", "aria-label": "Search results", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm uppercase tracking-widest text-muted-foreground mb-5", children: isSearching ? `Results for "${query.trim()}"` : "Trending on YouTube" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(LazySongGrid, { songs: displayResults, loading: displayLoading, onDownload: setDownloadFor, playlist: displayResults })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(DownloadModal, { open: !!downloadFor, onClose: () => setDownloadFor(null), songTitle: downloadFor ? `${downloadFor.title} — ${downloadFor.artist}` : "", videoId: downloadFor ? downloadFor.id : "" })
  ] });
}
export {
  Home as component
};
