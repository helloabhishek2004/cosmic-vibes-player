# Use a slim Debian-based Node.js image
FROM node:20-bookworm-slim

# Install system dependencies: Python 3.11, pip, and FFmpeg.
# Node 20 is also used by yt-dlp as its JavaScript runtime for YouTube EJS challenges.
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp with its default extras, including yt-dlp-ejs.
# YouTube now requires an external JavaScript runtime for full extraction support.
RUN python3 -m pip install --no-cache-dir --break-system-packages -U "yt-dlp[default]"

# Verify the critical media/extraction dependencies during the image build.
RUN ffmpeg -version && \
    ffprobe -version && \
    node --version && \
    python3 --version && \
    python3 -m yt_dlp --version && \
    python3 -m yt_dlp --js-runtimes node --version

# Pre-fetch EJS challenge solver component for yt-dlp
RUN python3 -m yt_dlp --js-runtimes node --remote-components ejs:github --version

# Set working directory
WORKDIR /usr/src/app

# Copy package manifests
COPY package*.json ./

# Install npm dependencies (production only)
RUN npm ci --omit=dev

# Copy the rest of the application files
COPY . .

# Create the downloads directory
RUN mkdir -p downloads && chmod 777 downloads

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV DOWNLOAD_DIR=downloads

# Expose the API port
EXPOSE 3001

# Run the server
CMD ["node", "server.js"]
