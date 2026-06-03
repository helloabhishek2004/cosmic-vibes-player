import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

type Stage = "fetching" | "converting" | "ready" | "done";

export function DownloadModal({
  open,
  onClose,
  songTitle,
}: {
  open: boolean;
  onClose: () => void;
  songTitle: string;
}) {
  const [stage, setStage] = useState<Stage>("fetching");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) return;
    setStage("fetching");
    setProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 12 + 4;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setProgress(100);
        setStage("ready");
        setTimeout(() => setStage("done"), 600);
      } else {
        setProgress(p);
        if (p > 60) setStage("converting");
      }
    }, 220);
    return () => clearInterval(interval);
  }, [open]);

  useEffect(() => {
    if (stage === "done") {
      const t = setTimeout(onClose, 2400);
      return () => clearTimeout(t);
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
            onClick={stage === "done" ? onClose : undefined}
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

            {stage !== "done" ? (
              <>
                <h2 className="text-2xl font-bold mb-2">Downloading</h2>
                <p className="text-muted-foreground text-sm mb-6 truncate">{songTitle}</p>

                <div className="flex justify-between text-xs uppercase tracking-wider mb-3 text-muted-foreground">
                  <span className={stage === "fetching" ? "text-white" : ""}>Fetching</span>
                  <span className={stage === "converting" ? "text-white" : ""}>Converting</span>
                  <span className={stage === "ready" ? "text-white" : ""}>Ready</span>
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
            ) : (
              <SuccessView title={songTitle} />
            )}
          </motion.div>
          {stage === "done" && <Confetti />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SuccessView({ title }: { title: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-4"
    >
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
