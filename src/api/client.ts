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

const apiHost: string =
  envUrl && envUrl.trim() !== ""
    ? envUrl.trim()
    : PRODUCTION_API;

console.log("[cosmic-vibes] API URL:", apiHost, "| VITE_API_URL:", import.meta.env.VITE_API_URL);

const client = axios.create({
  baseURL: apiHost,
  timeout: 15000,
});

export default client;
