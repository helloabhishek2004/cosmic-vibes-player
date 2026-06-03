import { useEffect, useRef } from "react";

type Star = { x: number; y: number; z: number; r: number; vy: number; layer: number };

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

    // Layers roughly matching the original Sass: small, medium, big
    const layers = [
      { count: 700, duration: 50 },
      { count: 200, duration: 100 },
      { count: 100, duration: 150 },
    ];

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = (canvas.width = Math.max(1, window.innerWidth * dpr));
      h = (canvas.height = Math.max(1, window.innerHeight * dpr));
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";

      // populate stars by layer
      stars = [];
      for (let li = 0; li < layers.length; li++) {
        const layer = layers[li];
        const count = Math.round(layer.count * Math.min(1, (window.innerWidth * window.innerHeight) / (1280 * 720)));
        for (let i = 0; i < count; i++) {
          const z = Math.random() * 0.8 + 0.2; // depth factor for parallax
          const r = (Math.random() * (li === 0 ? 1.0 : li === 1 ? 1.8 : 3.0)) + 0.2; // size varies per layer
          const speedPxPerMs = 2000 / (layer.duration * 1000); // 2000px over duration
          const vy = -speedPxPerMs * (0.6 + Math.random() * 0.8);
          stars.push({ x: Math.random() * w, y: Math.random() * h, z, r, vy, layer: li });
        }
      }
    };

    const onMouse = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const draw = (now = performance.now()) => {
      const dpr = window.devicePixelRatio || 1;
      const dt = Math.min(50, now - last); // cap delta for stability
      last = now;

      ctx.clearRect(0, 0, w, h);

      // parallax offsets from mouse and scroll
      const oxBase = mouseRef.current.x * 10 * dpr;
      const oyBase = mouseRef.current.y * 10 * dpr;
      const scrollY = window.scrollY || window.pageYOffset || 0;

      for (const s of stars) {
        if (!reduced) {
          s.y += s.vy * dt;
          if (s.y < 0) s.y = h + (s.y % h);
          else if (s.y > h) s.y = s.y % h;
        }

        // layer depth affects parallax strength
        const layerDepth = 1 - s.z; // deeper stars move less
        const ox = oxBase * (0.2 + s.z * 1.2);
        const oy = oyBase * (0.2 + s.z * 1.2) + (scrollY * 0.02 * (s.layer + 1) * dpr);

        const px = s.x + ox * s.z;
        const py = s.y + oy * s.z;

        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.3, s.r) * dpr, 0, Math.PI * 2);
        const alpha = 0.25 + s.z * 0.6;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();
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
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ background: "radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%)" }}
    />
  );
}
