import { motion } from "framer-motion";

const float = (dur: number, delay = 0) => ({
  animate: { y: [0, -14, 0], rotate: [0, 6, 0] },
  transition: { duration: dur, repeat: Infinity, ease: "easeInOut" as const, delay },
});

export function Doodles() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <motion.svg
        {...float(7)}
        className="absolute top-[14%] left-[6%] opacity-[0.05]"
        width="46"
        height="46"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#7B6FF0"
        strokeWidth="1.4"
      >
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </motion.svg>
      <motion.svg
        {...float(9, 1)}
        className="absolute top-[68%] left-[10%] opacity-[0.04]"
        width="38"
        height="38"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#00D4FF"
        strokeWidth="1.4"
      >
        <path d="M12 2v20M6 8v8M18 8v8M2 11v2M22 11v2" />
      </motion.svg>
      <motion.svg
        {...float(8, 2)}
        className="absolute top-[20%] right-[8%] opacity-[0.05]"
        width="42"
        height="42"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#00D4FF"
        strokeWidth="1.4"
      >
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" />
      </motion.svg>
      <motion.svg
        {...float(10, 0.5)}
        className="absolute top-[75%] right-[12%] opacity-[0.04]"
        width="44"
        height="44"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#7B6FF0"
        strokeWidth="1.4"
      >
        <path d="M12 2l2.39 6.96H22l-6 4.36 2.3 7.18L12 16.9l-6.3 3.6L8 13.32 2 8.96h7.61z" />
      </motion.svg>
    </div>
  );
}
