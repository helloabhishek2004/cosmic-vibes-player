import axios from "axios";

// On phone/LAN: uses the same host as the page (e.g. 10.x.x.x). Override with VITE_API_URL.
const apiHost =
  import.meta.env.VITE_API_URL ??
  (typeof window !== "undefined"
    ? `http://${window.location.hostname}:3001`
    : "http://localhost:3001");

const client = axios.create({
  baseURL: apiHost,
  timeout: 15000,
});

export default client;
