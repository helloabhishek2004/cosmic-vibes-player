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

More backend detail (Windows Redis notes, PM2 commands): see [backend/README.md](backend/README.md).

## Troubleshooting

- **Downloads never start** — Redis must be running and reachable at `REDIS_URL`. Check the backend terminal for `[Redis]` messages.
- **Search fails** — Ensure the Python service is up on port `8001` (`python -m uvicorn metadata:app --port 8001`).
- **Download errors** — Install or update yt-dlp: `pip install -U yt-dlp`.
- **Frontend can’t reach API** — Confirm Express is on port `3001` and set `VITE_API_URL` if needed.

## License

Private project — add a license here if you plan to share it.
