import json
import logging
import os
import threading
import time
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from ytmusicapi import YTMusic

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("metadata_service")

app = FastAPI(title="dua.mp3 Python Metadata Microservice")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# YouTube Music can aggressively rate-limit unauthenticated datacenter traffic.
# Prefer browser-authenticated YTMusic headers when configured. The JSON is kept
# in an environment variable and materialized only inside the container.
YTMUSIC_AUTH_ENV = "YTMUSIC_BROWSER_HEADERS"
YTMUSIC_AUTH_PATH = Path("/tmp/ytmusic-browser.json")


def initialize_ytmusic():
    raw_auth = os.environ.get(YTMUSIC_AUTH_ENV, "").strip()
    if raw_auth:
        try:
            parsed = json.loads(raw_auth)
            if not isinstance(parsed, dict):
                raise ValueError("browser auth must be a JSON object")
            YTMUSIC_AUTH_PATH.write_text(json.dumps(parsed), encoding="utf-8")
            logger.info("YTMusic initialized with browser authentication headers.")
            return YTMusic(str(YTMUSIC_AUTH_PATH))
        except Exception as e:
            logger.error("Failed to initialize authenticated YTMusic client: %s", e)

    try:
        logger.info("YTMusic initialized in unauthenticated mode.")
        return YTMusic()
    except Exception as e:
        logger.error("Failed to initialize YTMusic: %s", e)
        return None


# Single process-wide client and a small cache/circuit breaker. This avoids
# hammering YouTube Music when the frontend requests while a user is typing.
yt = initialize_ytmusic()
_cache = {}
_cache_lock = threading.Lock()
_CACHE_TTL = 300
_BACKOFF_SECONDS = 30
_rate_limited_until = 0.0
_rate_limit_lock = threading.Lock()


def cached_get(key):
    now = time.time()
    with _cache_lock:
        item = _cache.get(key)
        if item and item[0] > now:
            return item[1]
    return None


def cached_set(key, value, ttl=_CACHE_TTL):
    with _cache_lock:
        _cache[key] = (time.time() + ttl, value)


def check_rate_limit():
    with _rate_limit_lock:
        if time.time() < _rate_limited_until:
            return True
    return False


def mark_rate_limited():
    global _rate_limited_until
    with _rate_limit_lock:
        _rate_limited_until = time.time() + _BACKOFF_SECONDS


def parse_duration_seconds(seconds_str):
    try:
        total_seconds = int(seconds_str)
        minutes = total_seconds // 60
        seconds = total_seconds % 60
        return f"{minutes}:{seconds:02d}"
    except (ValueError, TypeError):
        return None


def map_track_item(item):
    video_id = item.get("videoId")
    if not video_id:
        return None

    artists_list = item.get("artists", [])
    artist_name = ", ".join(
        [a.get("name", "") for a in artists_list if a.get("name")]
    )

    album_info = item.get("album")
    album_name = album_info.get("name", "Single") if album_info else "Single"

    thumbnails = item.get("thumbnails", [])
    thumbnail_url = thumbnails[-1].get("url", "") if thumbnails else ""

    duration = item.get("duration")
    if not duration and item.get("duration_seconds"):
        duration = parse_duration_seconds(item.get("duration_seconds"))
    if not duration:
        duration = "0:00"

    return {
        "videoId": video_id,
        "title": item.get("title", "Unknown Title"),
        "artist": artist_name or "Unknown Artist",
        "album": album_name,
        "duration": duration,
        "thumbnail": thumbnail_url,
        "year": item.get("year"),
    }


def map_search_results(items, limit=20):
    mapped = []
    for item in items:
        try:
            row = map_track_item(item)
            if row:
                mapped.append(row)
        except Exception as parse_error:
            logger.warning("Failed to parse item: %s", parse_error)
    return mapped[:limit]


@app.get("/health")
def health():
    return {
        "status": "ok",
        "ytmusicInitialized": yt is not None,
        "browserAuthConfigured": bool(os.environ.get(YTMUSIC_AUTH_ENV, "").strip()),
        "rateLimited": check_rate_limit(),
    }


@app.get("/search")
def search(q: str = Query(..., min_length=1)):
    if not yt:
        raise HTTPException(status_code=503, detail="YTMusic client not initialized")

    normalized = " ".join(q.split()).strip()
    cache_key = f"search:{normalized.lower()}"
    cached = cached_get(cache_key)
    if cached is not None:
        return cached

    if check_rate_limit():
        raise HTTPException(status_code=429, detail="YouTube Music is rate limiting requests; retry shortly")

    try:
        logger.info("Searching for: %s", normalized)
        results = yt.search(normalized, filter="songs", limit=20)
        mapped = map_search_results(results or [], 20)
        cached_set(cache_key, mapped)
        return mapped
    except Exception as e:
        message = str(e)
        logger.error("Search API error: %s", message)
        if "429" in message or "Too Many Requests" in message:
            mark_rate_limited()
            raise HTTPException(status_code=429, detail="YouTube Music rate limit reached; retry shortly")
        return []


@app.get("/trending")
def trending(country: str = Query("US", min_length=2, max_length=2)):
    if not yt:
        raise HTTPException(status_code=503, detail="YTMusic client not initialized")

    normalized_country = country.upper()
    cache_key = f"trending:{normalized_country}"
    cached = cached_get(cache_key)
    if cached is not None:
        return cached

    if check_rate_limit():
        raise HTTPException(status_code=429, detail="YouTube Music is rate limiting requests; retry shortly")

    try:
        logger.info("Fetching trending charts for: %s", normalized_country)
        charts = yt.get_charts(normalized_country)
        video_charts = charts.get("videos") or []
        if not video_charts:
            return []

        playlist_id = video_charts[0].get("playlistId")
        if not playlist_id:
            return []

        playlist = yt.get_playlist(playlist_id, limit=20)
        tracks = playlist.get("tracks") or []
        mapped = map_search_results(tracks, 20)
        cached_set(cache_key, mapped, ttl=600)
        return mapped
    except Exception as e:
        message = str(e)
        logger.error("Trending API error: %s", message)
        if "429" in message or "Too Many Requests" in message:
            mark_rate_limited()
            raise HTTPException(status_code=429, detail="YouTube Music rate limit reached; retry shortly")
        return []


@app.get("/song/{video_id}")
def get_song(video_id: str):
    if not yt:
        raise HTTPException(status_code=503, detail="YTMusic client not initialized")

    cache_key = f"song:{video_id}"
    cached = cached_get(cache_key)
    if cached is not None:
        return cached

    if check_rate_limit():
        raise HTTPException(status_code=429, detail="YouTube Music is rate limiting requests; retry shortly")

    try:
        logger.info("Fetching song details for: %s", video_id)
        track_info = None

        try:
            playlist = yt.get_watch_playlist(videoId=video_id)
            if playlist and playlist.get("tracks"):
                track_info = playlist["tracks"][0]
        except Exception as playlist_err:
            logger.warning("get_watch_playlist failed for %s: %s", video_id, playlist_err)

        song_details = None
        try:
            song_details = yt.get_song(videoId=video_id)
        except Exception as song_err:
            logger.warning("get_song failed for %s: %s", video_id, song_err)

        if not track_info and not song_details:
            raise HTTPException(status_code=404, detail="Song not found")

        title = "Unknown Title"
        artist = "Unknown Artist"
        album = "Single"
        duration = "0:00"
        thumbnail_url = ""
        year = None

        if track_info:
            title = track_info.get("title", title)
            artists_list = track_info.get("artists", [])
            if artists_list:
                artist = ", ".join(
                    [a.get("name", "") for a in artists_list if a.get("name")]
                )
            elif track_info.get("byline"):
                artist = track_info.get("byline")

            album_info = track_info.get("album")
            if album_info and isinstance(album_info, dict):
                album = album_info.get("name", album)

            duration = track_info.get("length") or duration
            thumbnails = track_info.get("thumbnail", [])
            if thumbnails and isinstance(thumbnails, list):
                thumbnail_url = thumbnails[-1].get("url", "")
            year = track_info.get("year")

        if song_details and "videoDetails" in song_details:
            details = song_details["videoDetails"]
            if title == "Unknown Title":
                title = details.get("title", title)
            if artist == "Unknown Artist":
                artist = details.get("author", artist)
            if duration == "0:00":
                length_seconds = details.get("lengthSeconds")
                if length_seconds:
                    duration = parse_duration_seconds(length_seconds)
            if not thumbnail_url:
                thumbnail_dict = details.get("thumbnail", {})
                thumbnails_list = thumbnail_dict.get("thumbnails", [])
                if thumbnails_list:
                    thumbnail_url = thumbnails_list[-1].get("url", "")

        result = {
            "videoId": video_id,
            "title": title,
            "artist": artist,
            "album": album,
            "duration": duration,
            "thumbnail": thumbnail_url,
            "year": year,
        }
        cached_set(cache_key, result, ttl=900)
        return result

    except HTTPException:
        raise
    except Exception as e:
        message = str(e)
        logger.error("Error fetching song %s: %s", video_id, message)
        if "429" in message or "Too Many Requests" in message:
            mark_rate_limited()
            raise HTTPException(status_code=429, detail="YouTube Music rate limit reached; retry shortly")
        raise HTTPException(status_code=500, detail=message)


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8001))
    env_name = os.environ.get("ENV", "development").lower()
    reload = env_name != "production"
    logger.info("Starting uvicorn server in %s mode on port %s...", env_name, port)
    uvicorn.run("metadata:app", host="0.0.0.0", port=port, reload=reload)
