import { Q as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { Q as QueryClientProvider } from "../_libs/tanstack__react-query.mjs";
import { c as createRouter, a as createRootRouteWithContext, u as useRouter, L as Link, O as Outlet, H as HeadContent, S as Scripts, b as createFileRoute, l as lazyRouteComponent } from "../_libs/tanstack__react-router.mjs";
import { Q as notFound } from "../_libs/tanstack__router-core.mjs";
import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { a as axios } from "../_libs/axios.mjs";
import { A as AnimatePresence, m as motion } from "../_libs/framer-motion.mjs";
import { S as SkipBack, L as LoaderCircle, P as Pause, a as Play, b as SkipForward } from "../_libs/lucide-react.mjs";
import "../_libs/react-dom.mjs";
import "async_hooks";
import "util";
import "crypto";
import "stream";
import "node:stream";
import "../_libs/isbot.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
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
const appCss = "/assets/styles-Dn44OooP.css";
let audio = null;
let queue = [];
let queueIndex = -1;
let status = "idle";
const listeners = /* @__PURE__ */ new Set();
function currentTrack() {
  return queueIndex >= 0 && queueIndex < queue.length ? queue[queueIndex] : null;
}
function emit() {
  listeners.forEach((l) => l());
}
function ensureAudio() {
  if (!audio && typeof window !== "undefined") {
    audio = new Audio();
    audio.preload = "none";
    audio.addEventListener("playing", () => {
      status = "playing";
      emit();
    });
    audio.addEventListener("waiting", () => {
      status = "loading";
      emit();
    });
    audio.addEventListener("ended", () => {
      if (queueIndex < queue.length - 1) {
        playIndex(queueIndex + 1);
      } else {
        status = "idle";
        emit();
      }
    });
    audio.addEventListener("pause", () => {
      if (status !== "loading") {
        status = "idle";
        emit();
      }
    });
    audio.addEventListener("seeking", () => {
      emit();
    });
    audio.addEventListener("seeked", () => {
      emit();
    });
    audio.addEventListener("error", () => {
      console.error("[Player] Playback failed for", audio?.src);
      status = "idle";
      emit();
    });
  }
  return audio;
}
function playIndex(index) {
  if (index < 0 || index >= queue.length) return;
  const track = queue[index];
  const a = ensureAudio();
  a.pause();
  a.src = track.previewUrl;
  queueIndex = index;
  status = "loading";
  emit();
  a.play().catch((err) => {
    console.error("[Player] play() rejected:", err);
    status = "idle";
    emit();
  });
}
function playTrack(track, tracks) {
  const list = tracks && tracks.length > 0 ? tracks : queue.length > 0 ? queue : [track];
  const index = list.findIndex((t) => t.id === track.id);
  queue = list;
  playIndex(index >= 0 ? index : 0);
}
function toggleTrack(track, tracks) {
  const a = ensureAudio();
  if (currentTrack()?.id === track.id && status !== "idle") {
    a.pause();
    status = "idle";
    emit();
    return;
  }
  playTrack(track, tracks);
}
function togglePlayPause() {
  const a = ensureAudio();
  const track = currentTrack();
  if (!track) return;
  if (status === "playing") {
    a.pause();
    status = "idle";
    emit();
    return;
  }
  if (status === "idle" && a.src) {
    status = "loading";
    emit();
    a.play().catch(() => {
      status = "idle";
      emit();
    });
    return;
  }
  playIndex(queueIndex);
}
function playNext() {
  if (queueIndex < queue.length - 1) {
    playIndex(queueIndex + 1);
  }
}
function playPrev() {
  const a = ensureAudio();
  if (a.currentTime > 3 && status === "playing") {
    a.currentTime = 0;
    return;
  }
  if (queueIndex > 0) {
    playIndex(queueIndex - 1);
  }
}
function stop() {
  if (audio) audio.pause();
  queueIndex = -1;
  status = "idle";
  emit();
}
function useAudioProgress() {
  const [state, setState] = reactExports.useState({ currentTime: 0, duration: 0 });
  reactExports.useEffect(() => {
    const a = ensureAudio();
    let raf = 0;
    const loop = () => {
      setState({
        currentTime: a.currentTime || 0,
        duration: Number.isFinite(a.duration) ? a.duration : 0
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return state;
}
function getPlayerSnapshot() {
  return {
    track: currentTrack(),
    status,
    queueIndex,
    queueLength: queue.length,
    hasNext: queueIndex >= 0 && queueIndex < queue.length - 1,
    hasPrev: queueIndex > 0
  };
}
function usePlayer() {
  const [, tick] = reactExports.useState(0);
  reactExports.useEffect(() => {
    const l = () => tick((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return getPlayerSnapshot();
}
function usePlayback(id) {
  const { track, status: s } = usePlayer();
  return {
    active: track?.id === id,
    status: track?.id === id ? s : "idle"
  };
}
function seek(time) {
  const a = ensureAudio();
  if (!isNaN(time) && isFinite(time)) {
    a.currentTime = time;
    emit();
  }
}
function BottomPlayer() {
  const { track, status: status2, hasNext, hasPrev } = usePlayer();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: track && /* @__PURE__ */ jsxRuntimeExports.jsx(
    motion.footer,
    {
      initial: { y: 80, opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: 80, opacity: 0 },
      className: "fixed bottom-0 inset-x-0 z-40 px-3 pb-3 pt-2 pointer-events-none",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-6xl mx-auto glass rounded-2xl px-4 py-3 flex items-center gap-4 shadow-[0_-8px_40px_rgba(0,0,0,0.45)] pointer-events-auto", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Link,
          {
            to: "/song/$id",
            params: { id: track.id },
            className: "flex items-center gap-3 min-w-0 flex-1",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "img",
                {
                  src: track.thumbnailUrl,
                  alt: "",
                  className: "w-12 h-12 rounded-xl object-cover shrink-0"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 text-left", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium text-sm truncate", children: track.title }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground truncate", children: track.artist })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: playPrev,
              disabled: !hasPrev,
              "aria-label": "Previous track",
              className: "p-2 rounded-full hover:bg-white/10 disabled:opacity-30 transition",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(SkipBack, { size: 20 })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: togglePlayPause,
              "aria-label": status2 === "playing" ? "Pause" : "Play",
              className: "w-11 h-11 rounded-full gradient-bg flex items-center justify-center shadow-lg",
              children: status2 === "loading" ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 20, className: "animate-spin text-white" }) : status2 === "playing" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Pause, { size: 20, fill: "white", className: "text-white" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { size: 20, fill: "white", className: "text-white ml-0.5" })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: playNext,
              disabled: !hasNext,
              "aria-label": "Next track",
              className: "p-2 rounded-full hover:bg-white/10 disabled:opacity-30 transition",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(SkipForward, { size: 20 })
            }
          )
        ] })
      ] })
    }
  ) });
}
function reportLovableError(error, context = {}) {
  if (typeof window === "undefined") return;
  window.__lovableEvents?.captureException?.(
    error,
    {
      source: "react_error_boundary",
      route: window.location.pathname,
      ...context
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error"
    }
  );
}
function NotFoundComponent() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-md text-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-7xl font-bold text-foreground", children: "404" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-4 text-xl font-semibold text-foreground", children: "Page not found" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "The page you're looking for doesn't exist or has been moved." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      Link,
      {
        to: "/",
        className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
        children: "Go home"
      }
    ) })
  ] }) });
}
function ErrorComponent({ error, reset }) {
  console.error(error);
  const router2 = useRouter();
  reactExports.useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-md text-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-semibold tracking-tight text-foreground", children: "This page didn't load" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "Something went wrong on our end. You can try refreshing or head back home." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 flex flex-wrap justify-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => {
            router2.invalidate();
            reset();
          },
          className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
          children: "Try again"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "a",
        {
          href: "/",
          className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
          children: "Go home"
        }
      )
    ] })
  ] }) });
}
const Route$2 = createRootRouteWithContext()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lovable App" },
      { name: "description", content: "Lovable Generated Project" },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Lovable App" },
      { property: "og:description", content: "Lovable Generated Project" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" }
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss
      },
      {
        rel: "icon",
        type: "image/jpeg",
        href: "/favicon.ico"
      }
    ]
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent
});
function RootShell({ children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("head", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(HeadContent, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("body", { children: [
      children,
      /* @__PURE__ */ jsxRuntimeExports.jsx(Scripts, {})
    ] })
  ] });
}
function RootComponent() {
  const { queryClient } = Route$2.useRouteContext();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(QueryClientProvider, { client: queryClient, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Outlet, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(BottomPlayer, {})
  ] });
}
const $$splitComponentImporter$1 = () => import("./index-DEKO3S4y.mjs");
const Route$1 = createFileRoute("/")({
  head: () => ({
    meta: [{
      title: "dua.mp3 — Search. Discover. Download."
    }, {
      name: "description",
      content: "Search, discover, and download your favorite tracks instantly."
    }, {
      property: "og:title",
      content: "dua.mp3"
    }, {
      property: "og:description",
      content: "Search. Discover. Download."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
const apiHost = typeof window !== "undefined" ? `http://${window.location.hostname}:3001` : "http://localhost:3001";
const client = axios.create({
  baseURL: apiHost,
  timeout: 15e3
});
function getApiBaseUrl() {
  return typeof window !== "undefined" ? `http://${window.location.hostname}:3001` : "http://localhost:3001";
}
function streamUrl(videoId) {
  return `${getApiBaseUrl()}/api/stream/${encodeURIComponent(videoId)}`;
}
const $$splitNotFoundComponentImporter = () => import("./song._id-CKpDFwMx.mjs");
const $$splitComponentImporter = () => import("./song._id-DNQWmpnX.mjs");
const Route = createFileRoute("/song/$id")({
  loader: async ({
    params
  }) => {
    try {
      const response = await client.get(`/api/song/${params.id}`);
      const data = response.data;
      if (!data) throw notFound();
      const song = {
        id: data.videoId,
        title: data.title,
        artist: data.artist,
        album: data.album || "Single",
        duration: data.duration || "0:00",
        year: data.year || (/* @__PURE__ */ new Date()).getFullYear(),
        genre: ["Music"],
        thumbnailUrl: data.thumbnail || "https://picsum.photos/seed/music/600/600",
        previewUrl: streamUrl(data.videoId)
      };
      return song;
    } catch (err) {
      console.error("Failed to load song metadata from API:", err);
      throw notFound();
    }
  },
  head: ({
    loaderData
  }) => ({
    meta: [{
      title: loaderData ? `${loaderData.title} — ${loaderData.artist} | dua.mp3` : "dua.mp3"
    }, {
      name: "description",
      content: loaderData ? `Download ${loaderData.title} by ${loaderData.artist}` : ""
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter, "component"),
  notFoundComponent: lazyRouteComponent($$splitNotFoundComponentImporter, "notFoundComponent")
});
const IndexRoute = Route$1.update({
  id: "/",
  path: "/",
  getParentRoute: () => Route$2
});
const SongIdRoute = Route.update({
  id: "/song/$id",
  path: "/song/$id",
  getParentRoute: () => Route$2
});
const rootRouteChildren = {
  IndexRoute,
  SongIdRoute
};
const routeTree = Route$2._addFileChildren(rootRouteChildren)._addFileTypes();
const getRouter = () => {
  const queryClient = new QueryClient();
  const router2 = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0
  });
  return router2;
};
const router = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getRouter
}, Symbol.toStringTag, { value: "Module" }));
export {
  Route as R,
  stop as a,
  useAudioProgress as b,
  client as c,
  seek as d,
  router as r,
  streamUrl as s,
  toggleTrack as t,
  usePlayback as u
};
