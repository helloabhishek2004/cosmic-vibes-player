import express from "express";
import fs from "fs";
import axios from "axios";
import { param, validationResult } from "express-validator";
import metadataClient from "../services/metadataClient.js";
import { resolveAudioSourceDetailed } from "../services/sourceResolver.js";
import { getCached } from "../services/cache.js";
import { spawnYtDlp } from "../services/ytdlpSpawn.js";
import { getYoutubeCookiesPath } from "../services/cookieManager.js";

const router = express.Router();

function buildYoutubeStreamArgs(videoUrl, cookiesPath, useCookies) {
  const args = ["-f", "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best", "--no-playlist", "--no-check-certificates", "--js-runtimes", "node", "--remote-components", "ejs:github", "-o", "-"];
  if (useCookies && cookiesPath) args.push("--cookies", cookiesPath, "--extractor-args", "youtube:player_client=web");
  else args.push("--extractor-args", "youtube:player_client=android");
  args.push(videoUrl);
  return args;
}

async function proxyExternalAudio(source, req, res) {
  const headers = {};
  if (req.headers.range) headers.Range = req.headers.range;
  const response = await axios.get(source.streamUrl, { responseType: "stream", headers, timeout: 15000, validateStatus: (status) => status >= 200 && status < 400 });
  res.status(response.status);
  res.setHeader("Content-Type", source.mimeType || response.headers["content-type"] || "audio/mpeg");
  for (const name of ["content-length", "content-range", "accept-ranges", "cache-control", "etag", "last-modified"]) if (response.headers[name]) res.setHeader(name, response.headers[name]);
  res.setHeader("Access-Control-Allow-Origin", "*");
  response.data.pipe(res);
  req.on("close", () => { if (!res.writableEnded) response.data.destroy(); });
}

router.get("/:videoId", [param("videoId").trim().notEmpty().withMessage("Video ID is required")], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { videoId } = req.params;
  const providersTried = ["audius", "piped", "yt-dlp"];

  try {
    let metadata;
    try {
      metadata = (await metadataClient.get(`/song/${videoId}`, { timeout: 2000 })).data;
    } catch {
      metadata = getCached(`song:${videoId}`);
    }
    const result = await resolveAudioSourceDetailed(metadata || { videoId });
    const source = result.source;
    if (source?.streamUrl) {
      console.log(`[Playback] ${source.provider === "audius" ? "Audius success" : "Secondary provider success"} for ${videoId}`);
      return await proxyExternalAudio(source, req, res);
    }
  } catch (error) {
    console.warn(`[Playback] Independent source resolution failed for ${videoId}: ${error.message}`);
  }

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const cookiesPath = getYoutubeCookiesPath();
  const cookiesAvailable = !!(cookiesPath && fs.existsSync(cookiesPath));
  console.log(`[Playback] Falling back to yt-dlp for ${videoId}; cookiesAvailable=${cookiesAvailable}`);

  let child = null;
  let firstChunkReceived = false;
  let contentTypeSet = false;
  let extractionError = "";
  let retriedWithoutCookies = false;

  const setContentType = (line) => {
    if (contentTypeSet || res.headersSent) return;
    const formatMatch = line.match(/Downloading 1 format\(s\):\s*(\d+)/i);
    if (formatMatch && ["139", "140"].includes(formatMatch[1])) { res.setHeader("Content-Type", "audio/mp4"); contentTypeSet = true; }
    else if (formatMatch && ["249", "250", "251", "171"].includes(formatMatch[1])) { res.setHeader("Content-Type", "audio/webm"); contentTypeSet = true; }
    else if (/\.m4a|audio.?mp4/i.test(line)) { res.setHeader("Content-Type", "audio/mp4"); contentTypeSet = true; }
    else if (/\.webm|audio.?webm/i.test(line)) { res.setHeader("Content-Type", "audio/webm"); contentTypeSet = true; }
  };

  const start = (useCookies) => {
    child = spawnYtDlp(buildYoutubeStreamArgs(videoUrl, cookiesPath, useCookies));
    extractionError = "";
    firstChunkReceived = false;
    child.stderr.on("data", (data) => { const text = data.toString(); extractionError += text; console.error(`[Audio Stream stderr] ${text.trim()}`); setContentType(text); });
    child.stdout.on("data", (data) => {
      if (!firstChunkReceived) { firstChunkReceived = true; console.log(`[Audio Stream] First YouTube fallback chunk: ${data.length} bytes`); }
      if (!contentTypeSet && !res.headersSent) { res.setHeader("Content-Type", "audio/mp4"); contentTypeSet = true; }
      res.write(data);
    });
    child.on("close", (code) => {
      const authFailure = /sign in to confirm|cookies? (are )?(no longer )?valid|authentication needs to be refreshed|not a bot|bot check/i.test(extractionError);
      if (!firstChunkReceived && !res.headersSent && cookiesAvailable && !retriedWithoutCookies && authFailure) { retriedWithoutCookies = true; console.warn(`[Audio Stream] Authenticated YouTube extraction failed; retrying without cookies.`); return start(false); }
      if (!firstChunkReceived && !res.headersSent) return res.status(503).json({
        success: false,
        reason: "NO_PLAYABLE_SOURCE",
        providersTried,
        diagnostics: { authenticationRequired: authFailure, extractionExitCode: code },
        error: "Playback unavailable for this track.",
      });
      if (!res.writableEnded) res.end();
      console.log(`[Audio Stream] YouTube fallback exited ${code}; firstChunk=${firstChunkReceived}`);
    });
    child.on("error", (err) => { console.error(`[Playback] yt-dlp spawn error: ${err.message}`); if (!res.headersSent) res.status(503).json({ success: false, reason: "NO_PLAYABLE_SOURCE", providersTried, error: "Playback unavailable for this track." }); });
  };

  start(cookiesAvailable);
  req.on("close", () => { try { if (child && !child.killed) child.kill(); } catch {} });
});

export default router;
