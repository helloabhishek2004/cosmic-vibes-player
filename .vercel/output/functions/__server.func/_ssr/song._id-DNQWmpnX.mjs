import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { L as Link } from "../_libs/tanstack__react-router.mjs";
import { S as Starfield, D as DownloadModal } from "./DownloadModal-BxddW1n2.mjs";
import { R as Route, u as usePlayback, b as useAudioProgress, a as stop, t as toggleTrack, d as seek } from "./router-CeS5Xnvr.mjs";
import "../_libs/sonner.mjs";
import { d as ArrowLeft, L as LoaderCircle, P as Pause, a as Play, D as Download } from "../_libs/lucide-react.mjs";
import { m as motion } from "../_libs/framer-motion.mjs";
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
function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
function SongPage() {
  const song = Route.useLoaderData();
  const [open, setOpen] = reactExports.useState(false);
  const {
    active,
    status
  } = usePlayback(song.id);
  const {
    currentTime,
    duration
  } = useAudioProgress();
  reactExports.useEffect(() => () => stop(), []);
  const progress = active && duration > 0 ? currentTime / duration * 100 : 0;
  const isPlaying = active && status === "playing";
  const isLoading = active && status === "loading";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Starfield, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "aria-hidden": true, className: "fixed inset-0 -z-10", style: {
      backgroundImage: `url(${song.thumbnailUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      filter: "blur(60px) saturate(120%)",
      opacity: 0.35
    } }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "aria-hidden": true, className: "fixed inset-0 -z-10 bg-black/60" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "min-h-dvh px-4 py-8 pb-32", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-4xl mx-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/", className: "inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-sm hover:bg-white/10 transition", "aria-label": "Back to search", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { size: 16 }),
        " Back"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, { initial: {
        opacity: 0,
        y: 24
      }, animate: {
        opacity: 1,
        y: 0
      }, transition: {
        duration: 0.5
      }, className: "glass rounded-3xl p-6 md:p-10 mt-8 grid md:grid-cols-[280px_1fr] gap-8 items-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: song.thumbnailUrl, alt: `${song.album} cover`, className: "w-full rounded-2xl shadow-2xl aspect-square object-cover" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm uppercase tracking-widest text-muted-foreground", children: song.album }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-4xl md:text-5xl font-extrabold mt-2", children: song.title }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xl text-muted-foreground mt-2", children: song.artist }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-2 mt-5", children: song.genre.map((g) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs glass rounded-full px-3 py-1", children: g }, g)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-6 mt-5 text-sm text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: song.duration }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: song.year })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 glass rounded-2xl p-4 flex items-center gap-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(motion.button, { whileHover: {
              scale: 1.06
            }, whileTap: {
              scale: 0.94
            }, onClick: () => toggleTrack(song), "aria-label": isPlaying ? `Pause ${song.title}` : `Play ${song.title}`, className: "w-12 h-12 shrink-0 rounded-full gradient-bg flex items-center justify-center shadow-lg", children: isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 20, className: "text-white animate-spin" }) : isPlaying ? /* @__PURE__ */ jsxRuntimeExports.jsx(Pause, { size: 20, fill: "white", className: "text-white" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { size: 20, fill: "white", className: "text-white ml-0.5" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "range", min: 0, max: duration || 100, step: 0.1, value: active ? currentTime : 0, onChange: (e) => seek(Number(e.target.value)), "aria-label": "Seek", className: "w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500", style: {
                background: duration ? `linear-gradient(to right, rgb(168, 85, 247) 0%, rgb(168, 85, 247) ${progress}%, rgba(255, 255, 255, 0.2) ${progress}%, rgba(255, 255, 255, 0.2) 100%)` : "rgb(255, 255, 255, 0.2)"
              }, disabled: !active || duration === 0 }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-xs text-muted-foreground mt-1 tabular-nums", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: formatTime(active ? currentTime : 0) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: formatTime(duration) })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.button, { whileHover: {
            scale: 1.03
          }, whileTap: {
            scale: 0.96
          }, onClick: () => setOpen(true), "aria-label": `Download ${song.title}`, className: "mt-5 h-14 px-8 rounded-full gradient-bg text-white font-semibold inline-flex items-center gap-3 shadow-[0_10px_40px_-10px_rgba(123,111,240,0.8)]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 20 }),
            " Download MP3"
          ] })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(DownloadModal, { open, onClose: () => setOpen(false), songTitle: `${song.title} — ${song.artist}`, videoId: song.id })
  ] });
}
export {
  SongPage as component
};
