import express from "express";
import { param, validationResult } from "express-validator";
import { spawnYtDlp } from "../services/ytdlpSpawn.js";
import { getYoutubeCookiesPath } from "../services/cookieManager.js";

const router = express.Router();

router.get(
  "/:videoId",
  [param("videoId").trim().notEmpty().withMessage("Video ID is required")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { videoId } = req.params;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const cookiesPath = getYoutubeCookiesPath();

    console.log(`[Audio Stream] Streaming real-time audio for video: ${videoId}`);
    console.log(`[Audio Stream] Cookies enabled: ${!!cookiesPath}`);
    console.log(`[Audio Stream] Cookie file used: ${cookiesPath}`);

    if (cookiesPath && fs.existsSync(cookiesPath)) {
      console.log(`[Audio Stream] Cookie file size: ${fs.statSync(cookiesPath).size}`);
    }

    // Prefer m4a for broader browser support; fall back to webm opus.
    const args = [
      "-f",
      "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best",
      "--no-playlist",
      "-o",
      "-",
      videoUrl,
    ];

    if (cookiesPath) {
      args.push("--cookies", cookiesPath);
    } else {
      args.push("--extractor-args", "youtube:player_client=android");
    }

    console.log(`[Audio Stream] Spawning yt-dlp with args: ${args.join(" ")}`);
    const child = spawnYtDlp(args);
    let contentTypeSet = false;
    let firstChunkReceived = false;

    const setContentType = (line) => {
      if (contentTypeSet) return;
      
      // Map common YouTube format IDs to proper MIME types
      const formatMatch = line.match(/Downloading 1 format\(s\):\s*(\d+)/i);
      if (formatMatch) {
        const formatId = formatMatch[1];
        if (["139", "140"].includes(formatId)) {
          res.setHeader("Content-Type", "audio/mp4");
          contentTypeSet = true;
          console.log(`[Audio Stream] Detected format ID ${formatId}. Set Content-Type to audio/mp4`);
          return;
        } else if (["249", "250", "251", "171"].includes(formatId)) {
          res.setHeader("Content-Type", "audio/webm");
          contentTypeSet = true;
          console.log(`[Audio Stream] Detected format ID ${formatId}. Set Content-Type to audio/webm`);
          return;
        }
      }

      if (/\.m4a|audio.?mp4/i.test(line)) {
        res.setHeader("Content-Type", "audio/mp4");
        contentTypeSet = true;
        console.log(`[Audio Stream] Pattern match: Set Content-Type to audio/mp4`);
      } else if (/\.webm|audio.?webm/i.test(line)) {
        res.setHeader("Content-Type", "audio/webm");
        contentTypeSet = true;
        console.log(`[Audio Stream] Pattern match: Set Content-Type to audio/webm`);
      }
    };

    child.stderr.on("data", (data) => {
      const text = data.toString();
      console.error(`[Audio Stream stderr] ${text.trim()}`);
      setContentType(text);
    });

    child.stdout.on("data", (data) => {
      if (!firstChunkReceived) {
        firstChunkReceived = true;
        console.log(`[Audio Stream] First audio chunk received (${data.length} bytes)`);
      }
      
      if (!contentTypeSet && !res.headersSent) {
        // Fallback to audio/mp4 since m4a is the first priority format
        res.setHeader("Content-Type", "audio/mp4");
        contentTypeSet = true;
        console.log("[Audio Stream] Fallback: Set Content-Type to audio/mp4");
      }
    });

    child.stdout.pipe(res);

    child.on("close", (code) => {
      console.log(
        `[Audio Stream] yt-dlp exited with code ${code} for video: ${videoId}`,
      );
      res.end();
    });

    child.on("error", (err) => {
      console.error(`[Audio Stream] Error spawning yt-dlp:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to stream audio" });
      }
    });

    // If user stops playing or closes the tab, kill the child process to save CPU/Network
    req.on("close", () => {
      console.log(
        `[Audio Stream] Connection closed by client. Killing process for video: ${videoId}`,
      );
      try {
        child.kill();
      } catch (err) {
        // Process might already be dead
      }
    });
  },
);

export default router;
