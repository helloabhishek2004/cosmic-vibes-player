import express from "express";
import fs from "fs";
import { param, validationResult } from "express-validator";
import { spawnYtDlp } from "../services/ytdlpSpawn.js";
import { getYoutubeCookiesPath } from "../services/cookieManager.js";

const router = express.Router();

function buildStreamArgs(videoUrl, cookiesPath, useCookies) {
  const args = [
    "-f", "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best",
    "--no-playlist",
    "--no-check-certificates",
    "--js-runtimes", "node",
    "--remote-components", "ejs:github",
    "-o", "-",
  ];

  if (useCookies && cookiesPath) {
    args.push("--cookies", cookiesPath);
    args.push("--extractor-args", "youtube:player_client=web");
  } else {
    args.push("--extractor-args", "youtube:player_client=android");
  }

  args.push(videoUrl);
  return args;
}

router.get(
  "/:videoId",
  [param("videoId").trim().notEmpty().withMessage("Video ID is required")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { videoId } = req.params;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const cookiesPath = getYoutubeCookiesPath();
    const cookiesAvailable = !!(cookiesPath && fs.existsSync(cookiesPath));

    console.log(`[Audio Stream] Starting ${videoId}; cookies=${cookiesAvailable}`);

    let child = null;
    let firstChunkReceived = false;
    let contentTypeSet = false;
    let extractionError = "";
    let retriedWithoutCookies = false;

    const setContentType = (line) => {
      if (contentTypeSet || res.headersSent) return;
      const formatMatch = line.match(/Downloading 1 format\(s\):\s*(\d+)/i);
      if (formatMatch && ["139", "140"].includes(formatMatch[1])) {
        res.setHeader("Content-Type", "audio/mp4");
        contentTypeSet = true;
      } else if (formatMatch && ["249", "250", "251", "171"].includes(formatMatch[1])) {
        res.setHeader("Content-Type", "audio/webm");
        contentTypeSet = true;
      } else if (/\.m4a|audio.?mp4/i.test(line)) {
        res.setHeader("Content-Type", "audio/mp4");
        contentTypeSet = true;
      } else if (/\.webm|audio.?webm/i.test(line)) {
        res.setHeader("Content-Type", "audio/webm");
        contentTypeSet = true;
      }
    };

    const start = (useCookies) => {
      const args = buildStreamArgs(videoUrl, cookiesPath, useCookies);
      console.log(`[Audio Stream] yt-dlp mode=${useCookies ? "authenticated-web" : "fallback-android"}`);
      child = spawnYtDlp(args);
      extractionError = "";
      firstChunkReceived = false;

      child.stderr.on("data", (data) => {
        const text = data.toString();
        extractionError += text;
        console.error(`[Audio Stream stderr] ${text.trim()}`);
        setContentType(text);
      });

      child.stdout.on("data", (data) => {
        if (!firstChunkReceived) {
          firstChunkReceived = true;
          console.log(`[Audio Stream] First audio chunk: ${data.length} bytes`);
        }
        if (!contentTypeSet && !res.headersSent) {
          res.setHeader("Content-Type", "audio/mp4");
          contentTypeSet = true;
        }
        res.write(data);
      });

      child.on("close", (code) => {
        const authFailure = /sign in to confirm|cookies? (are )?(no longer )?valid|authentication needs to be refreshed|not a bot/i.test(extractionError);
        console.log(`[Audio Stream] yt-dlp exited ${code}; firstChunk=${firstChunkReceived}; authFailure=${authFailure}`);

        // A stale Render cookie must never permanently break playback. If the
        // authenticated web client fails before producing bytes, retry once with
        // the cookie-less Android client, which often works without authentication.
        if (!firstChunkReceived && !res.headersSent && cookiesAvailable && !retriedWithoutCookies && authFailure) {
          retriedWithoutCookies = true;
          console.warn(`[Audio Stream] Authenticated extraction failed; retrying ${videoId} without cookies.`);
          return start(false);
        }

        if (!firstChunkReceived && !res.headersSent) {
          return res.status(502).json({
            error: authFailure
              ? "YouTube authentication failed and the fallback client could not provide an audio stream."
              : "YouTube could not provide an audio stream.",
          });
        }
        if (!res.writableEnded) res.end();
      });

      child.on("error", (err) => {
        console.error(`[Audio Stream] yt-dlp spawn error: ${err.message}`);
        if (!res.headersSent) res.status(500).json({ error: "Failed to stream audio" });
      });
    };

    start(cookiesAvailable);

    req.on("close", () => {
      try {
        if (child && !child.killed) child.kill();
      } catch {}
    });
  },
);

export default router;
