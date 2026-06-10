# Use a slim Debian-based Node.js image
FROM node:20-bullseye-slim

# Install system dependencies: python3, python3-pip, and ffmpeg
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp globally (upgrade to latest stable)
RUN python3 -m pip install --no-cache-dir -U yt-dlp
# Verify dependencies during build - fails build if any are missing
RUN ffmpeg -version && ffprobe -version && python3 -m yt_dlp --version

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
# Install yt-dlp globally
RUN python3 -m pip install --no-cache-dir -U yt-dlp

# Verify dependencies
RUN ffmpeg -version && \
    ffprobe -version && \
    python3 -m yt_dlp --version