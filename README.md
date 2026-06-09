# Cosmic Vibes Player (dua.mp3)

A cosmic-themed music search and download app. Search YouTube Music, preview tracks, and queue MP3 downloads through a React frontend, Express API, and Python metadata service.

## What runs where

| Service                          | Port             | Purpose                      |
| -------------------------------- | ---------------- | ---------------------------- |
| Frontend (Vite + TanStack Start) | `5173` (default) | Web UI                       |
| Express API                      | `3001`           | Search, downloads, streaming |
| Python metadata (FastAPI)        | `8001`           | YouTube Music metadata       |
| Redis                            | `6379`           | Download job queue           |

The frontend talks to the API at `http://<your-host>:3001`. On the same machine that is usually `http://localhost:3001`. When you open the app from another device on your Wi‑Fi, it uses your PC’s LAN IP automatically.

## Prerequisites

Install these before you start:

- **Node.js** 18+ (20+ recommended)
- **Python** 3.10+
- **Redis** — required for download jobs ([Memurai](https://www.memurai.com/) on Windows, or Redis via WSL/Docker)
- **yt-dlp** — extracts audio from YouTube
- **ffmpeg** — required for converting audio to MP3 and embedding metadata/cover art

```bash
pip install yt-dlp
```

On Windows, install ffmpeg and make sure it is available on your PATH so yt-dlp can embed metadata and album artwork into the downloaded file.

If ffmpeg is installed in a non-standard location, add this to your `backend/.env`:

```env
FFMPEG_LOCATION=C:\path\to\ffmpeg
```

Confirm yt-dlp is installed (either command works):

```bash
python -m yt_dlp --version
# or, if Python Scripts is on your PATH:
yt-dlp --version
```

On Windows, if `yt-dlp` is not found but `python -m yt_dlp` works, the backend still runs downloads using the Python module. To fix the `yt-dlp` command in terminals, add this folder to your user **Path** and **fully quit and reopen Cursor** (not just the terminal):

`%APPDATA%\Python\Python314\Scripts`

## Quick start

### 1. Clone and install frontend dependencies

From the project root:

```bash
npm install
```

You can use [Bun](https://bun.sh/) instead (`bun install`) if you prefer; the repo includes a `bun.lock`.

### 2. Set up the backend

```bash
cd backend
npm install
copy .env.example .env
```

On macOS/Linux, use `cp .env.example .env` instead of `copy`.

Edit `backend/.env` if your Redis URL or ports differ from the defaults.

### 3. Install Python dependencies

```bash
cd ../python
pip install -r requirements.txt
```

### 4. Start Redis

Make sure Redis is listening on `localhost:6379` (or whatever you set in `REDIS_URL`).

### 5. Start backend services

**Option A — PM2 (both services in the background)**

```bash
cd backend
npm install -g pm2
pm2 start ecosystem.config.cjs
```

**Option B — Two terminals**

Terminal 1 — metadata service:

```bash
cd python
python -m uvicorn metadata:app --port 8001
pm2 restart dua-mp3-backend dua-mp3-metadata
```

Terminal 2 — API (includes the download worker):

```bash
cd backend
npm run dev
```

For production-style runs without file watching, use `npm start` instead of `npm run dev`.

### 6. Start the frontend

From the project root:

```bash
npm run dev
```

Open the URL Vite prints (usually **http://localhost:5173**). The `--host` flag is already set so you can also open the app from your phone using `http://<your-pc-ip>:5173`.

## Environment variables

### Backend (`backend/.env`)

| Variable              | Default                  | Description              |
| --------------------- | ------------------------ | ------------------------ |
| `PORT`                | `3001`                   | Express API port         |
| `PYTHON_SERVICE_URL`  | `http://localhost:8001`  | Metadata microservice    |
| `REDIS_URL`           | `redis://localhost:6379` | Bull queue / Redis       |
| `DOWNLOAD_DIR`        | `downloads`              | Folder for finished MP3s |
| `MAX_CONCURRENT_JOBS` | `3`                      | Parallel yt-dlp jobs     |
| `NODE_ENV`            | `development`            | Node environment         |

### Frontend (optional)

Create a `.env` in the project root only if you need to override the API URL:

```env
VITE_API_URL=http://localhost:3001
```

Use this when the API is not on the same host as the page (e.g. a remote backend).

## Other scripts

| Command           | Description                      |
| ----------------- | -------------------------------- |
| `npm run build`   | Production build of the frontend |
| `npm run preview` | Preview the production build     |
| `npm run lint`    | Run ESLint                       |
| `npm run format`  | Format with Prettier             |

## Project layout

```
cosmic-vibes-player/
├── src/              # TanStack Start + React UI
├── backend/          # Express API, download queue, yt-dlp
├── python/           # FastAPI metadata service (ytmusicapi)
└── README.md         # This file
```

## Codebase overview

### What this project does

`cosmic-vibes-player` is a music discovery and download app.

- The frontend provides a search UI and an immersive cosmic theme.
- The Express backend handles search requests, download job queuing, progress tracking, and file downloads.
- The Python service fetches YouTube Music metadata for search results, trending charts, and song detail resolution.
- yt-dlp is used to extract audio from YouTube and convert it to MP3.
- Redis is used as a queue backend for download jobs, with an in-memory fallback when Redis is unavailable.

### Frontend (`src/`)

- `src/routes/__root.tsx` — application shell, HTML layout, error boundary, and shared `QueryClient` provider.
- `src/routes/index.tsx` — home page with search input, trending list, debounced queries, live suggestions, and download modal trigger.
- `src/routes/song.$id.tsx` — song detail page that loads metadata from the API, shows album artwork, and renders an audio preview player.
- `src/router.tsx` and `src/routeTree.gen.ts` — TanStack router configuration and generated route tree used by the app.

- `src/api/client.ts` — Axios client that calls the backend API using `VITE_API_URL` or the current host.
- `src/lib/api-base.ts` — helper for backend base URL construction and streaming preview URLs.
- `src/lib/map-song.ts` — maps backend API track objects into the app’s normalized `Song` shape.
- `src/data/songs.ts` — local `Song` type definition and sample preview songs used as placeholders.
- `src/lib/player-store.ts` — audio playback store that manages a shared `HTMLAudioElement`, queue state, event listeners, play/pause/seek controls, and React hooks.
- `src/lib/audio-player.ts` — compatibility export wrapper for playback helper functions.

- `src/components/BottomPlayer.tsx` — sticky footer audio player with play/pause, next/previous, and current track display.
- `src/components/LazySongGrid.tsx` — grid component that lazy-loads `SongCard` items using the Intersection Observer API.
- `src/components/DownloadModal.tsx` — modal that starts downloads, polls `/api/status`, displays progress, and fetches the final MP3 file from `/api/file`.
- `src/components/SongCard.tsx`, `SongCardSkeleton.tsx` — song tiles and loading skeletons (UI for listing tracks).
- `src/components/Starfield.tsx`, `Meteors.tsx`, `Doodles.tsx` — decorative cosmic background visuals.

### Backend (`backend/`)

- `backend/server.js` — main Express app setup.
  - enables `helmet`, `compression`, `cors`, `morgan`, and JSON body parsing.
  - defines a development-friendly CORS policy for `localhost` and LAN IPs.
  - applies rate limiting to download and file routes.
  - mounts API routes and starts graceful shutdown handlers.
  - initializes yt-dlp availability and cleanup interval.

- Routes:
  - `backend/routes/search.js` — validates `q`, checks cache, forwards search queries to Python metadata service, and caches results.
  - `backend/routes/trending.js` — returns trending songs from the Python service and caches them for 10 minutes.
  - `backend/routes/song.js` — fetches detailed song metadata for a specific `videoId`.
  - `backend/routes/download.js` — enqueues download jobs in Bull or falls back to `services/localJobs.js` when Redis is unavailable.
  - `backend/routes/status.js` — returns job state for queued downloads and maps Bull states to `queued`, `processing`, `done`, and `failed`.
  - `backend/routes/file.js` — streams completed audio files to the browser and removes temp files after download.
  - `backend/routes/stream.js` — streams real-time audio from YouTube through yt-dlp for preview playback.

- Services:
  - `backend/services/queue.js` — Bull queue wrapper and Redis connection monitoring.
  - `backend/services/metadataClient.js` — Axios client for the Python metadata service.
  - `backend/services/cache.js` — in-memory caching using `node-cache`.
  - `backend/services/ytdlpSpawn.js` — spawns `python -m yt_dlp` safely on Windows.
  - `backend/services/ytdlp.js` — constructs yt-dlp arguments, downloads audio, and resolves final file paths.
  - `backend/services/localJobs.js` — fallback in-memory job runner for local development when Redis is unavailable.
  - `backend/services/cleanup.js` — periodically removes stale files older than 10 minutes from the downloads folder.

- Worker:
  - `backend/workers/worker.js` — registers Bull job processing, fetches song metadata for tags, downloads audio via `downloadAudio()`, reports progress, and returns the final MP3 path.

- Config:
  - `backend/.env` — backend runtime configuration for ports, Redis URL, download directory, queue concurrency, and Python service URL.
  - `backend/ecosystem.config.cjs` — PM2 process manager configuration for running backend services in production.

### Python metadata service (`python/`)

- `python/metadata.py` — FastAPI service exposing:
  - `GET /search?q=...` — searches YouTube Music for songs, maps data to a normalized response shape.
  - `GET /trending?country=US` — returns top trending songs via YouTube Music charts.
  - `GET /song/{video_id}` — resolves detailed metadata and enriches it with album, year, and duration.
- Uses `ytmusicapi` to talk to YouTube Music without requiring authentication.
- Includes helper functions `parse_duration_seconds`, `map_track_item`, and `map_search_results` to normalize API results.
- Enables CORS for frontend-to-backend communication.

### Tech stack

- Frontend: React 19, TanStack Router, TanStack React Query, Vite, Tailwind CSS, Radix UI, Framer Motion, Axios.
- Backend: Node.js, Express, Bull, Redis, ioredis, Axios, Helmet, CORS, dotenv, morgan, express-rate-limit, express-validator.
- Python service: Python 3.10+, FastAPI, Uvicorn, ytmusicapi, Pydantic.
- Media extraction: yt-dlp, ffmpeg (optional for metadata embedding), and YouTube Music metadata.

### Key methods and functions

- `backend/services/ytdlp.js` — `downloadAudio(videoId, outputDir, onProgress, metadata)` downloads audio, converts to MP3, and embeds metadata.
- `backend/services/localJobs.js` — `startLocalJob(videoId, title)` runs fallback downloads without Redis.
- `backend/routes/download.js` — enqueues jobs and returns `jobId` to the frontend.
- `backend/routes/status.js` — polls job status for frontend progress updates.
- `backend/routes/file.js` — streams completed files using `res.download()`.
- `src/lib/player-store.ts` — manages audio state, playback queue, and hooks like `usePlayback`, `useAudioProgress`, and `seek()`.
- `src/components/DownloadModal.tsx` — handles download lifecycle, status polling, retry logic, and file saving on the client.
- `src/lib/map-song.ts` — normalizes backend items into UI-ready `Song` objects.

More backend detail (Windows Redis notes, PM2 commands): see [backend/README.md](backend/README.md).

## Troubleshooting

- **Downloads never start** — Redis must be running and reachable at `REDIS_URL`. Check the backend terminal for `[Redis]` messages.
- **Search fails** — Ensure the Python service is up on port `8001` (`python -m uvicorn metadata:app --port 8001`).
- **Download errors** — Install or update yt-dlp: `pip install -U yt-dlp`.
- **Frontend can’t reach API** — Confirm Express is on port `3001` and set `VITE_API_URL` if needed.

## License

Private project — add a license here if you plan to share it.
