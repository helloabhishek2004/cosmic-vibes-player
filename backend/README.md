# Cosmic Vibes backend

One FastAPI service provides `GET /search`, `GET /stream/{video_id}`, and
`GET /download/{video_id}`. It uses `ytmusicapi` for song search and `yt-dlp`
for resolving the exact YouTube video ID. Audio is proxied directly to the
client; nothing is queued, cached, transcoded, or written to disk.

Set `FRONTEND_ORIGIN` to the deployed Vercel origin before deploying. The
Docker image starts the local bgutil PoToken provider and Uvicorn together.
