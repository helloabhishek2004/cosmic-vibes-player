import asyncio
import mimetypes
import re
from dataclasses import dataclass
import yt_dlp

VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")


@dataclass(frozen=True)
class ResolvedAudio:
    url: str
    headers: dict[str, str]
    content_type: str
    extension: str
    title: str


def _extract(video_id: str) -> ResolvedAudio:
    options = {"format": "bestaudio/best", "quiet": True, "no_warnings": True, "noplaylist": True, "extractor_args": {"youtubepot-bgutilhttp": {"base_url": ["http://127.0.0.1:4416"]}}}
    with yt_dlp.YoutubeDL(options) as ydl:
        info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
    if not info or not info.get("url"):
        raise RuntimeError("YouTube did not provide an audio stream")
    extension = info.get("ext") or "webm"
    mime_type = (info.get("mime_type") or "").split(";", 1)[0]
    content_type = mime_type if mime_type.startswith("audio/") else (mimetypes.guess_type(f"audio.{extension}")[0] or "application/octet-stream")
    return ResolvedAudio(info["url"], {str(k): str(v) for k, v in (info.get("http_headers") or {}).items()}, content_type, extension, info.get("title") or video_id)


async def resolve_audio(video_id: str) -> ResolvedAudio:
    if not VIDEO_ID_RE.fullmatch(video_id):
        raise ValueError("Invalid YouTube video ID")
    return await asyncio.wait_for(asyncio.to_thread(_extract, video_id), timeout=40)
