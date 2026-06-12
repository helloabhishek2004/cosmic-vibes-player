import axios from "axios";

// On phone/LAN: uses the same host as the page (e.g. 10.x.x.x). Override with VITE_API_URL.
const envUrl: string | undefined = import.meta.env.VITE_API_URL;

const apiHost =
  envUrl && envUrl.trim() !== ""
    ? envUrl.trim()
    : typeof window !== "undefined"
      ? `http://${window.location.hostname}:3001`
      : "http://localhost:3001";

// TODO: remove this log once VITE_API_URL is confirmed in production.
console.log("[cosmic-vibes] API URL:", apiHost, "| VITE_API_URL env:", import.meta.env.VITE_API_URL);

const client = axios.create({
  baseURL: apiHost,
  timeout: 15000,
});

export default client;
