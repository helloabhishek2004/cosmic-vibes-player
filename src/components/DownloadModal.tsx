import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { X, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import client from "@/api/client";
import { toast } from "sonner";

type Stage = "queued" | "processing" | "done" | "failed";

export function DownloadModal({
  open,
  onClose,
  songTitle,
  videoId,
}: {
  open: boolean;
  onClose: () => void;
  songTitle: string;
  videoId: string;
}) {
  const [stage, setStage] = useState<Stage>("queued");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startDownload = async () => {
    if (!videoId) return;

    setStage("queued");
    setProgress(0);
    setErrorMsg("");

    try {
      console.log(`[Frontend] Requesting download for ${videoId}`);
      const response = await client.post("/api/download", {
        videoId,
        title: songTitle,
      });

      const { jobId } = response.data;
      if (!jobId) {
        throw new Error("No Job ID returned from server.");
      }

      // Start Polling status
      pollStatus(jobId);
    } catch (err: any) {
      console.error("[Frontend] Download request failed:", err);
      const message =
        err.response?.data?.error ||
        "Download service unavailable. Make sure Redis and backend are running.";
      handleFailure(message);
    }
  };

  const pollStatus = (jobId: string) => {
    // Clear any existing poll first
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
      } catch (err: any) {
        console.error("[Frontend] Polling status failed:", err);
      }
    }, 1500);
  };

  const triggerFileDownload = async (jobId: string) => {
    try {
      console.log(`[Frontend] Triggering file transmission for job: ${jobId}`);
      const res = await client.get(`/api/file/${jobId}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      // Normalize header value to a string before using includes()
      // Axios may return a variety of header shapes; defensively coerce to string
      const rawContentType =
        (res.headers as any)["content-type"] ?? (res.headers as any).get?.("content-type");
      const contentType =
        typeof rawContentType === "string" ? rawContentType : String(rawContentType ?? "");
      const ext = contentType.includes("webm") ? ".webm" : ".m4a";
      a.download = `${songTitle}${ext}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("[Frontend] File streaming failed:", err);
      toast.error("Failed to stream audio file from server.");
    }
  };

  const handleFailure = (message: string) => {
    setStage("failed");
    setErrorMsg(message);

    // Trigger red toast notification with a retry button action
    toast.error(message, {
      duration: 8000,
      action: {
        label: "Retry",
        onClick: () => {
          startDownload();
        },
      },
    });
  };

  const cleanupPoll = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (open) {
      startDownload();
    } else {
      cleanupPoll();
    }
    return () => cleanupPoll();
  }, [open, videoId]);

  useEffect(() => {
    if (stage === "done") {
      const t = setTimeout(onClose, 2400);
      return () => {
        clearTimeout(t);
        cleanupPoll();
      };
    }
  }, [stage, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Download progress"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={stage === "done" || stage === "failed" ? onClose : undefined}
          />
          <motion.div
            className="glass relative rounded-3xl p-8 w-full max-w-md text-center"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 280 }}
          >
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="absolute top-4 right-4 p-2 rounded-full glass hover:bg-white/10 transition"
            >
              <X size={18} />
            </button>

            {stage === "queued" && (
              <>
                <Loader2
                  className="mx-auto mb-4 animate-spin text-[color:var(--violet)]"
                  size={40}
                />
                <h2 className="text-2xl font-bold mb-2">Preparing Download</h2>
                <p className="text-muted-foreground text-sm mb-6 truncate">{songTitle}</p>
                <p className="text-sm text-muted-foreground italic">Getting your song ready...</p>
              </>
            )}

            {stage === "processing" && (
              <>
                <h2 className="text-2xl font-bold mb-2">Downloading</h2>
                <p className="text-muted-foreground text-sm mb-6 truncate">{songTitle}</p>

                <div className="flex justify-between text-xs uppercase tracking-wider mb-3 text-muted-foreground">
                  <span className="text-white font-medium">Processing</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full gradient-bg"
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "easeOut" }}
                  />
                </div>
                <p className="mt-4 text-sm text-muted-foreground">{Math.floor(progress)}%</p>
              </>
            )}

            {stage === "failed" && (
              <>
                <AlertCircle className="mx-auto mb-4 text-red-500" size={40} />
                <h2 className="text-2xl font-bold mb-2 text-red-400">Download Failed</h2>
                <p className="text-muted-foreground text-sm mb-4 truncate">{songTitle}</p>
                <div className="glass rounded-xl p-3 bg-red-950/20 border border-red-500/20 text-xs text-red-300 mb-6 max-h-24 overflow-y-auto">
                  {errorMsg}
                </div>
                <button
                  onClick={startDownload}
                  className="w-full py-3 rounded-full bg-white/10 hover:bg-white/20 font-medium inline-flex items-center justify-center gap-2 transition"
                >
                  <RefreshCw size={16} /> Retry Download
                </button>
              </>
            )}

            {stage === "done" && <SuccessView title={songTitle} />}
          </motion.div>
          {stage === "done" && <Confetti />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SuccessView({ title }: { title: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="py-4">
      <motion.svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        className="mx-auto mb-4"
        aria-hidden="true"
      >
        <motion.circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke="url(#g1)"
          strokeWidth="3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6 }}
        />
        <motion.path
          d="M25 41 L36 52 L56 30"
          fill="none"
          stroke="url(#g1)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        />
        <defs>
          <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#7B6FF0" />
            <stop offset="100%" stopColor="#00D4FF" />
          </linearGradient>
        </defs>
      </motion.svg>
      <h2 className="text-2xl font-bold mb-1">Downloaded! 🎵</h2>
      <p className="text-muted-foreground text-sm truncate">{title}</p>
    </motion.div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 40 });
  const colors = ["#7B6FF0", "#00D4FF", "#ffffff", "#b794f4"];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {pieces.map((_, i) => {
        const left = 50 + (Math.random() - 0.5) * 20;
        const angle = (Math.random() - 0.5) * 120;
        const dist = 200 + Math.random() * 250;
        return (
          <motion.span
            key={i}
            className="absolute top-1/2 left-1/2 w-2 h-3 rounded-sm"
            style={{ background: colors[i % colors.length] }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{
              x: Math.cos((angle * Math.PI) / 180) * dist,
              y: Math.sin((angle * Math.PI) / 180) * dist + 200,
              rotate: Math.random() * 720,
              opacity: 0,
            }}
            transition={{ duration: 1.6, ease: "easeOut" }}
          />
        );
      })}
      <style>{`@media (prefers-reduced-motion: reduce){span{display:none}}`}</style>
    </div>
  );
}
