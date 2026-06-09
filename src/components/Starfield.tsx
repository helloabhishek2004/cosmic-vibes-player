import { useEffect, useRef } from "react";

type Star = { x: number; y: number; z: number; size: number; vy: number; layer: number };

export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let stars: Star[] = [];
    let w = 0,
      h = 0;
    let raf = 0;
    let last = performance.now();

    const layers = [
      { count: 700, size: 1, duration: 50 },
      { count: 200, size: 2, duration: 100 },
      { count: 100, size: 3, duration: 150 },
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
          layer.count * Math.min(1, (window.innerWidth * window.innerHeight) / (1280 * 720)),
        );
        for (let i = 0; i < count; i++) {
          const z = Math.random() * 0.8 + 0.2;
          const vy = -((2000 / (layer.duration * 1000)) * (0.8 + Math.random() * 0.4));
          stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            z,
            size: layer.size,
            vy,
            layer: li,
          });
        }
      }
    };

    const onMouse = (e: MouseEvent) => {
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

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: "radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%)" }}
    />
  );
}
