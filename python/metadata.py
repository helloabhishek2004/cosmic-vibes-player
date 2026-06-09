import logging
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from ytmusicapi import YTMusic

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("metadata_service")

app = FastAPI(title="dua.mp3 Python Metadata Microservice")

# Enable CORS for communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize YTMusic without authentication (suitable for search/public data)
try:
    yt = YTMusic()
    logger.info("YTMusic initialized successfully.")
except Exception as e:
    logger.error(f"Failed to initialize YTMusic: {e}")
    yt = None

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
    artist_name = ", ".join([a.get("name", "") for a in artists_list if a.get("name")])

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
            logger.warning(f"Failed to parse item: {parse_error}")
    return mapped[:limit]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/search")
def search(q: str = Query(..., min_length=1)):
    if not yt:
        raise HTTPException(status_code=503, detail="YTMusic client not initialized")

    try:
        logger.info(f"Searching for: {q}")
        results = yt.search(q, filter="songs", limit=20)
        return map_search_results(results or [], 20)
    except Exception as e:
        logger.error(f"Search API error: {e}")
        return []


@app.get("/trending")
def trending(country: str = Query("US", min_length=2, max_length=2)):
    if not yt:
        raise HTTPException(status_code=503, detail="YTMusic client not initialized")

    try:
        logger.info(f"Fetching trending charts for: {country}")
        charts = yt.get_charts(country)
        video_charts = charts.get("videos") or []
        if not video_charts:
            return []

        playlist_id = video_charts[0].get("playlistId")
        if not playlist_id:
            return []

        playlist = yt.get_playlist(playlist_id, limit=20)
        tracks = playlist.get("tracks") or []
        return map_search_results(tracks, 20)
    except Exception as e:
        logger.error(f"Trending API error: {e}")
        return []

@app.get("/song/{video_id}")
def get_song(video_id: str):
    if not yt:
        raise HTTPException(status_code=503, detail="YTMusic client not initialized")
        
    try:
        logger.info(f"Fetching watch playlist/song details for: {video_id}")
        track_info = None
        
        # Method 1: Try get_watch_playlist to get album, year, and duration
        try:
            playlist = yt.get_watch_playlist(videoId=video_id)
            if playlist and playlist.get("tracks"):
                track_info = playlist["tracks"][0]
        except Exception as playlist_err:
            logger.warning(f"get_watch_playlist failed for {video_id}: {playlist_err}")

        # Method 2: Try get_song as fallback or supplement if tracks is empty
        song_details = None
        try:
            song_details = yt.get_song(videoId=video_id)
        except Exception as song_err:
            logger.warning(f"get_song failed for {video_id}: {song_err}")

        if not track_info and not song_details:
            raise HTTPException(status_code=404, detail="Song not found")

        # Map metadata using whichever method succeeded
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
                artist = ", ".join([a.get("name", "") for a in artists_list if a.get("name")])
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

        # Fallback fields from get_song videoDetails
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

        return {
            "videoId": video_id,
            "title": title,
            "artist": artist,
            "album": album,
            "duration": duration,
            "thumbnail": thumbnail_url,
            "year": year
        }

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error fetching song {video_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8001))
    env_name = os.environ.get("ENV", "development").lower()
    reload = env_name != "production"
    logger.info(f"Starting uvicorn server in {env_name} mode on port {port}...")
    uvicorn.run("metadata:app", host="0.0.0.0", port=port, reload=reload)
