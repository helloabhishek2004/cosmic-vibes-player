# dua.mp3 Backend System

This is the production-ready backend service for **dua.mp3** consisting of an Express.js API server and a Python FastAPI metadata microservice.

---

## Windows Prerequisites & Installation

### Step 1: Install Redis on Windows
The download job queue relies on Redis.
1. Download the Redis `.msi` or `.zip` archive for Windows:
   - [Microsoft Archive Redis Releases](https://github.com/microsoftarchive/redis/releases) (v3.0.504 or newer)
   - Alternatively, use Memurai or WSL to run Redis if preferred.
2. Install and launch the Redis server (defaults to port `6379`).

### Step 2: Install yt-dlp
`yt-dlp` extracts audio from YouTube.
```bash
pip install yt-dlp
```
Make sure `yt-dlp` is added to your Windows system PATH environment variable so it can be invoked globally.

### Step 3: Install Python Dependencies
Navigate to the `/python` directory and install the required modules:
```bash
cd python
pip install -r requirements.txt
```

### Step 4: Install Node.js Backend Dependencies
Navigate to the `/backend` directory and install the packages:
```bash
cd ../backend
npm install
```

### Step 5: Install PM2 (Process Manager) Globally
To run both backend servers easily in the background:
```bash
npm install -g pm2
```

---

## Running the Services

### Run via PM2 (Recommended)
From the `/backend` folder, start both the Express backend and Python microservice concurrently:
```bash
pm2 start ecosystem.config.cjs
```
To monitor, view logs, or stop:
- Check status: `pm2 status`
- Monitor logs: `pm2 logs`
- Stop apps: `pm2 stop all`

### Run Individually
If you prefer running them in separate terminal windows:

1. **Python Metadata Service**:
   ```bash
   cd python
   python -m uvicorn metadata:app --port 8001
   ```

2. **Express API Server**:
   ```bash
   cd backend
   npm run start
   ```

---

## Running the Frontend
Return to the project root directory and run the TanStack Start development server:
```bash
cd ..
npm run dev
```
The site will be running at `http://localhost:3000` (or `http://localhost:5173`).
