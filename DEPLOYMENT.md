# cosmic-vibes-player Deployment Guide

This guide outlines how to deploy the **cosmic-vibes-player** application to production using **Vercel** (Frontend), **Render** (Backend API & Python Metadata Service), and **Upstash/Render Redis** (Queue).

---

## Architecture Overview

```
                      +-----------------------------+
                      |      Frontend (Vercel)      |
                      |   React + Tailwind + Vite   |
                      +--------------+--------------+
                                     |
                       HTTP API      |  Direct Audio Stream
                       Requests      |  (yt-dlp stdout)
                                     v
                      +-----------------------------+
                      |   Backend API (Render)      |
                      |  Express Node.js (Docker)   |
                      +-------+--------------+------+
                              |              |
           In-Process Workers |              | HTTP Requests
            or Redis / Bull   |              v
                              |     +-----------------------+
                              |     | Python Metadata (Fast)|
                              |     |   YTMusicAPI Micro    |
                              |     +-----------------------+
                              v
                  +------------------------+
                  |  Local downloads (Temp)|
                  |   or Cloud Storage     |
                  +------------------------+
```

---

## 1. Python Metadata Service Deployment (Render)

The Python Metadata Service is a FastAPI microservice that fetches search results, trending tracks, and track details from YTMusic.

### Setup Steps

1. Sign in to [Render](https://render.com/).
2. Click **New +** > **Web Service**.
3. Connect your Git repository.
4. Set the following options:
   - **Name**: `cosmic-vibes-metadata`
   - **Environment**: `Python`
   - **Root Directory**: `python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn metadata:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free`
5. Under **Advanced**, add the following environment variables:
   - `ENV`: `production`
6. Click **Deploy Web Service**.
7. Copy your service URL (e.g., `https://cosmic-vibes-metadata.onrender.com`). You will need this for the backend.

---

## 2. Backend API Deployment (Render)

The backend runs Express, handles download queues, runs the download worker (yt-dlp + ffmpeg), and streams files. We deploy it via **Docker** to ensure Node.js, Python 3, and FFMPEG are all pre-installed.

### Setup Steps

1. Sign in to [Render](https://render.com/).
2. Click **New +** > **Web Service**.
3. Connect your Git repository.
4. Set the following options:
   - **Name**: `cosmic-vibes-backend`
   - **Environment**: `Docker`
   - **Root Directory**: `backend`
   - **Plan**: `Free`
5. Under **Advanced**, add the following environment variables:
   - `PORT`: `3001`
   - `NODE_ENV`: `production`
   - `QUEUE_MODE`: `local` _(default for Free tier; automatically falls back if Redis is not configured)_
   - `DOWNLOAD_DIR`: `downloads`
   - `PYTHON_SERVICE_URL`: `https://cosmic-vibes-metadata.onrender.com` _(use your actual URL from Step 1)_
   - `FRONTEND_URL`: `https://cosmic-vibes-player.vercel.app` _(use your actual Vercel URL)_
   - `MAX_CONCURRENT_JOBS`: `2` _(limits concurrent downloads to prevent Free Tier Out-Of-Memory)_
   - `MAX_VIDEO_DURATION_MINUTES`: `20` _(prevents long downloads)_
   - `DOWNLOAD_RATE_LIMIT`: `10M` _(limits download speed to 10MB/s per stream)_
   - `REDIS_URL`: _(Leave blank to run in local-queue mode. Set to Upstash/Render Redis URL if QUEUE_MODE=redis)_
6. Click **Deploy Web Service**.
7. Copy your backend URL (e.g., `https://cosmic-vibes-backend.onrender.com`).

---

## 3. Frontend Deployment (Vercel)

The frontend is a React application built with Vite and Tailwind.

### Setup Steps

1. Sign in to [Vercel](https://vercel.com/).
2. Click **Add New** > **Project**.
3. Import your Git repository.
4. Set the following options:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (Root of the project)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add the following environment variable:
   - `VITE_API_URL`: `https://cosmic-vibes-backend.onrender.com` _(use your backend API URL from Step 2)_
6. Click **Deploy**.
7. Once deployed, take the frontend URL (e.g., `https://cosmic-vibes-player.vercel.app`) and update the `FRONTEND_URL` environment variable on your Render backend service, then trigger a redeploy of the backend.

---

## 4. Redis Queue Configuration (Optional)

To enable robust, persistent queues using Bull:

1. Provision a free Redis instance on [Upstash Redis](https://upstash.com/) or another provider.
2. Update the Render backend environment variables:
   - `QUEUE_MODE`: `redis`
   - `REDIS_URL`: `redis://default:YOUR_PASSWORD@YOUR_ENDPOINT:YOUR_PORT`
3. Save changes. The backend will automatically restart and start using Bull/Redis. If Redis ever goes down, the backend will fallback to `localJobs.js` in-memory queue without crashing.

---

## 5. Future Scaling Path

Here is how to scale this application from 5 concurrent users to 5000+ users:

### Step A: 5 Concurrent Users (Current Setup)

- **Cost**: $0 (Free Tiers)
- **Queue**: `local` mode (in-memory queue).
- **Storage**: Ephemeral local container storage. Files cleaned up after 10 minutes.
- **CPU/RAM Limit**: Express API server and workers run in the same container. Concurrency is limited to `2` to prevent memory crashes.

### Step B: 50 Concurrent Users

- **Cost**: ~$15 / month
- **Deployment**:
  - Backend API: Upgrade Render service to **Starter** ($7/mo, no sleeping, persistent disk).
  - Python Metadata: Remain on Free or upgrade to Starter.
- **Queue**: Upgrade `QUEUE_MODE` to `redis`. Use free-tier **Upstash Redis** (handles up to 10k commands/day).
- **Benefits**: Background worker runs in-process, but job states survive backend restarts.

### Step C: 500 Concurrent Users

- **Cost**: ~$60 - $80 / month
- **Deployment**:
  - **Separate Backend and Worker**: Deploy the same backend codebase as two separate services on Render:
    1. **API Web Service** (processes HTTP requests, does not run the worker code).
    2. **Background Worker Service** (runs `npm run start` but only executes the Bull processor: `backend/workers/worker.js`).
  - **Storage**: Attach a Render Persistent Disk (SSD) to the Background Worker to store downloads, or implement direct uploads to **Cloudflare R2 / AWS S3** with CDN distribution.
  - **Redis**: Upgrade Upstash to a paid plan ($5 - $10/mo) or Render Redis.

### Step D: 5,000+ Concurrent Users

- **Cost**: ~$200 - $500 / month
- **Deployment**:
  - **Kubernetes / Serverless Containers**: Migrate Node backend containers to **AWS ECS/Fargate** or **Kubernetes** to enable auto-scaling based on CPU/Memory usage.
  - **Cloudflare R2 / AWS S3**: Mandatory cloud storage. Instead of downloading to server disk, the worker uploads the final MP3 directly to R2/S3. The frontend receives a pre-signed download link, bypassing the API server for file streaming.
  - **Redis**: Multi-node Managed Redis Cluster.
  - **Metadata Cache**: Store frequently searched YTMusic tracks in Redis or a DB to avoid hitting YTMusic API rate-limits.
