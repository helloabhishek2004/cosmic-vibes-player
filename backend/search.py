from ytmusicapi import YTMusic


def search_songs(query: str) -> list[dict[str, str]]:
    """Search YouTube Music for songs and return only the UI contract."""
    results = YTMusic().search(query, filter="songs")
    songs: list[dict[str, str]] = []
    for result in results:
        video_id = result.get("videoId")
        if not video_id:
            continue
        artists = result.get("artists") or []
        artist = ", ".join(item.get("name", "") for item in artists if item.get("name"))
        thumbnails = result.get("thumbnails") or []
        thumbnail = thumbnails[-1].get("url", "") if thumbnails else ""
        songs.append({"videoId": video_id, "title": result.get("title", "Unknown title"), "artist": artist or "Unknown artist", "duration": result.get("duration", ""), "thumbnail": thumbnail})
    return songs
