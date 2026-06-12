import axios from "axios";

/**
 * IMPORTANT — Vite inlines import.meta.env.VITE_API_URL as a literal string
 * at *build time*, not at runtime. If the variable is absent from Vercel's
 * Environment Variables panel when the build runs, Vite replaces it with
 * `undefined` and the entire expression is removed from the bundle.
 *
 * Priority:
 *   1. VITE_API_URL  — set in Vercel dashboard (preferred for all envs)
 *   2. VITE_DEV_HOST — optional LAN override for mobile dev
 *   3. PRODUCTION_API — hard-coded production URL (safe fallback)
 *   4. localhost:3001  — only when running vite dev locally
 */
const PRODUCTION_API = "https://cosmic-vibes-backend.onrender.com";

const envUrl: string | undefined = import.meta.env.VITE_API_URL;
const devHost: string | undefined = import.meta.env.VITE_DEV_HOST;
const isProd: boolean = import.meta.env.PROD === true;

const apiHost: string =
  // 1. Explicit override always wins (Vercel env var)
  envUrl && envUrl.trim() !== ""
    ? envUrl.trim()
    // 2. Production fallback — if we are in a production build, stop here
    : isProd
      ? PRODUCTION_API
      // 3. LAN dev shortcut (e.g. VITE_DEV_HOST=192.168.1.x)
      : devHost && devHost.trim() !== ""
        ? `http://${devHost.trim()}:3001`
        // 4. Local vite dev server only — only on localhost/127.0.0.1
        : typeof window !== "undefined" &&
            (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
          ? `http://${window.location.hostname}:3001`
          // 5. Final fallback
          : PRODUCTION_API;

console.log("[cosmic-vibes] API URL:", apiHost, "| VITE_API_URL:", import.meta.env.VITE_API_URL);

const client = axios.create({
  baseURL: apiHost,
  timeout: 15000,
});

export default client;
