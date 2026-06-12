import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { c as client } from "./router-CeS5Xnvr.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { A as AnimatePresence, m as motion } from "../_libs/framer-motion.mjs";
import { X, L as LoaderCircle, C as CircleAlert, R as RefreshCw } from "../_libs/lucide-react.mjs";
function Starfield() {
  const canvasRef = reactExports.useRef(null);
  const mouseRef = reactExports.useRef({ x: 0, y: 0 });
  reactExports.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let stars = [];
    let w = 0, h = 0;
    let raf = 0;
    let last = performance.now();
    const layers = [
      { count: 700, size: 1, duration: 50 },
      { count: 200, size: 2, duration: 100 },
      { count: 100, size: 3, duration: 150 }
    ];
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = canvas.width = Math.max(1, window.innerWidth * dpr);
      h = canvas.height = Math.max(1, window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      stars = [];
      for (let li = 0; li < layers.length; li++) {
        const layer = layers[li];
        const count = Math.round(
          layer.count * Math.min(1, window.innerWidth * window.innerHeight / (1280 * 720))
        );
        for (let i = 0; i < count; i++) {
          const z = Math.random() * 0.8 + 0.2;
          const vy = -(2e3 / (layer.duration * 1e3) * (0.8 + Math.random() * 0.4));
          stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            z,
            size: layer.size,
            vy,
            layer: li
          });
        }
      }
    };
    const onMouse = (e) => {
      mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const draw = (now = performance.now()) => {
      const dpr = window.devicePixelRatio || 1;
      const dt = Math.min(50, now - last);
      last = now;
      ctx.clearRect(0, 0, w, h);
      const oxBase = mouseRef.current.x * 16 * dpr;
      const oyBase = mouseRef.current.y * 16 * dpr;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      for (const s of stars) {
        if (!reduced) {
          s.y += s.vy * dt;
          if (s.y < -50) s.y = h + 50;
          else if (s.y > h + 50) s.y = -50;
        }
        const depth = 0.4 + s.z;
        const ox = oxBase * depth * ((3 - s.layer) * 0.18);
        const oy = oyBase * depth * ((3 - s.layer) * 0.18) + scrollY * 0.02 * (s.layer + 1);
        const px = s.x + ox;
        const py = s.y + oy;
      
        const size = Math.max(1, Math.round(s.size * dpr));
        const alpha = 0.18 + s.z * 0.7;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fillRect(px, py, size, size);
      }
      raf = requestAnimationFrame(draw);
    };
    resize();
    draw();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouse);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "canvas",
    {
      ref: canvasRef,
      "aria-hidden": "true",
      className: "fixed inset-0 z-0 pointer-events-none",
      style: { background: "radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%)" }
    }
  );
}
function DownloadModal({
  open,
  onClose,
  songTitle,
  videoId
}) {
  const [stage, setStage] = reactExports.useState("queued");
  const [progress, setProgress] = reactExports.useState(0);
  const [errorMsg, setErrorMsg] = reactExports.useState("");
  const intervalRef = reactExports.useRef(null);
  const startDownload = async () => {
    if (!videoId) return;
    setStage("queued");
    setProgress(0);
    setErrorMsg("");
    try {
      console.log(`[Frontend] Requesting download for ${videoId}`);
      const response = await client.post("/api/download", {
        videoId,
        title: songTitle
      });
      const { jobId } = response.data;
      if (!jobId) {
        throw new Error("No Job ID returned from server.");
      }
      pollStatus(jobId);
    } catch (err) {
      console.error("[Frontend] Download request failed:", err);
      const errorObj = err;
      const message = errorObj.response?.data?.error || "Download service unavailable. Make sure Redis and backend are running.";
      handleFailure(message);
    }
  };
  const pollStatus = (jobId) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(async () => {
      try {
        const response = await client.get(`/api/status/${jobId}`);
        const { status, progress: jobProgress, error } = response.data;
        if (status === "queued") {
          setStage("queued");
          setProgress(0);
        } else if (status === "processing") {
          setStage("processing");
          setProgress(jobProgress || 0);
        } else if (status === "done") {
          setStage("done");
          setProgress(100);
          cleanupPoll();
          triggerFileDownload(jobId);
        } else if (status === "failed") {
          cleanupPoll();
          handleFailure(error || "Conversion failed.");
        }
      } catch (err) {
        console.error("[Frontend] Polling status failed:", err);
      }
    }, 1500);
  };
  const triggerFileDownload = async (jobId) => {
    try {
      console.log(`[Frontend] Triggering file transmission for job: ${jobId}`);
      const res = await client.get(`/api/file/${jobId}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      const headers = res.headers;
      const rawContentType = headers?.["content-type"] ?? headers?.["Content-Type"];
      const contentType = typeof rawContentType === "string" ? rawContentType : String(rawContentType ?? "");
      const ext = contentType.includes("webm") ? ".webm" : ".m4a";
      a.download = `${songTitle}${ext}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[Frontend] File streaming failed:", err);
      toast.error("Failed to stream audio file from server.");
    }
  };
  const handleFailure = (message) => {
    setStage("failed");
    setErrorMsg(message);
    toast.error(message, {
      duration: 8e3,
      action: {
        label: "Retry",
        onClick: () => {
          startDownload();
        }
      }
    });
  };
  const cleanupPoll = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
  reactExports.useEffect(() => {
    if (open) {
      startDownload();
    } else {
      cleanupPoll();
    }
    return () => cleanupPoll();
  }, [open, videoId]);
  reactExports.useEffect(() => {
    if (stage === "done") {
      const t = setTimeout(onClose, 2400);
      return () => {
        clearTimeout(t);
        cleanupPoll();
      };
    }
  }, [stage, onClose]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: open && /* @__PURE__ */ jsxRuntimeExports.jsxs(
    motion.div,
    {
      className: "fixed inset-0 z-50 flex items-center justify-center p-4",
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "Download progress",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "absolute inset-0 bg-black/60 backdrop-blur-md",
            onClick: stage === "done" || stage === "failed" ? onClose : void 0
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          motion.div,
          {
            className: "glass relative rounded-3xl p-8 w-full max-w-md text-center",
            initial: { scale: 0.9, y: 20 },
            animate: { scale: 1, y: 0 },
            exit: { scale: 0.9, y: 20 },
            transition: { type: "spring", damping: 20, stiffness: 280 },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: onClose,
                  "aria-label": "Close modal",
                  className: "absolute top-4 right-4 p-2 rounded-full glass hover:bg-white/10 transition",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 18 })
                }
              ),
              stage === "queued" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  LoaderCircle,
                  {
                    className: "mx-auto mb-4 animate-spin text-[color:var(--violet)]",
                    size: 40
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold mb-2", children: "Preparing Download" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground text-sm mb-6 truncate", children: songTitle }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground italic", children: "Getting your song ready..." })
              ] }),
              stage === "processing" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold mb-2", children: "Downloading" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground text-sm mb-6 truncate", children: songTitle }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-between text-xs uppercase tracking-wider mb-3 text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white font-medium", children: "Processing" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-2 rounded-full bg-white/5 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  motion.div,
                  {
                    className: "h-full gradient-bg",
                    animate: { width: `${progress}%` },
                    transition: { ease: "easeOut" }
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-4 text-sm text-muted-foreground", children: [
                  Math.floor(progress),
                  "%"
                ] })
              ] }),
              stage === "failed" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "mx-auto mb-4 text-red-500", size: 40 }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold mb-2 text-red-400", children: "Download Failed" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground text-sm mb-4 truncate", children: songTitle }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "glass rounded-xl p-3 bg-red-950/20 border border-red-500/20 text-xs text-red-300 mb-6 max-h-24 overflow-y-auto", children: errorMsg }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    onClick: startDownload,
                    className: "w-full py-3 rounded-full bg-white/10 hover:bg-white/20 font-medium inline-flex items-center justify-center gap-2 transition",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { size: 16 }),
                      " Retry Download"
                    ]
                  }
                )
              ] }),
              stage === "done" && /* @__PURE__ */ jsxRuntimeExports.jsx(SuccessView, { title: songTitle })
            ]
          }
        ),
        stage === "done" && /* @__PURE__ */ jsxRuntimeExports.jsx(Confetti, {})
      ]
    }
  ) });
}
function SuccessView({ title }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, className: "py-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      motion.svg,
      {
        width: "80",
        height: "80",
        viewBox: "0 0 80 80",
        className: "mx-auto mb-4",
        "aria-hidden": "true",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            motion.circle,
            {
              cx: "40",
              cy: "40",
              r: "36",
              fill: "none",
              stroke: "url(#g1)",
              strokeWidth: "3",
              initial: { pathLength: 0 },
              animate: { pathLength: 1 },
              transition: { duration: 0.6 }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            motion.path,
            {
              d: "M25 41 L36 52 L56 30",
              fill: "none",
              stroke: "url(#g1)",
              strokeWidth: "4",
              strokeLinecap: "round",
              strokeLinejoin: "round",
              initial: { pathLength: 0 },
              animate: { pathLength: 1 },
              transition: { duration: 0.5, delay: 0.4 }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("defs", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("linearGradient", { id: "g1", x1: "0", x2: "1", y1: "0", y2: "1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("stop", { offset: "0%", stopColor: "#7B6FF0" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("stop", { offset: "100%", stopColor: "#00D4FF" })
          ] }) })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold mb-1", children: "Downloaded! 🎵" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground text-sm truncate", children: title })
  ] });
}
function Confetti() {
  const pieces = Array.from({ length: 40 });
  const colors = ["#7B6FF0", "#00D4FF", "#ffffff", "#b794f4"];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute inset-0 pointer-events-none overflow-hidden", "aria-hidden": "true", children: [
    pieces.map((_, i) => {
      const angle = (Math.random() - 0.5) * 120;
      const dist = 200 + Math.random() * 250;
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        motion.span,
        {
          className: "absolute top-1/2 left-1/2 w-2 h-3 rounded-sm",
          style: { background: colors[i % colors.length] },
          initial: { x: 0, y: 0, opacity: 1, rotate: 0 },
          animate: {
            x: Math.cos(angle * Math.PI / 180) * dist,
            y: Math.sin(angle * Math.PI / 180) * dist + 200,
            rotate: Math.random() * 720,
            opacity: 0
          },
          transition: { duration: 1.6, ease: "easeOut" }
        },
        i
      );
    }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("style", { children: `@media (prefers-reduced-motion: reduce){span{display:none}}` })
  ] });
}
export {
  DownloadModal as D,
  Starfield as S
};
