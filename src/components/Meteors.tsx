import { useMemo } from "react";

export function Meteors({ count = 12 }: { count?: number }) {
  const meteors = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        top: Math.random() * 60,
        left: Math.random() * 100,
        delay: Math.random() * 8,
        duration: 4 + Math.random() * 5,
      })),
    [count]
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {meteors.map((m) => (
        <span
          key={m.id}
          className="meteor"
          style={{
            top: `${m.top}%`,
            left: `${m.left}%`,
            animationDelay: `${m.delay}s`,
            animationDuration: `${m.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
