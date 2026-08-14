import asyncio
import os
import re
from urllib.parse import quote
import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import StreamingResponse
from resolver import ResolvedAudio, resolve_audio
from search import search_songs

FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")
FILENAME_RE = re.compile(r"[^A-Za-z0-9 ._()\-]+")
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=[FRONTEND_ORIGIN], allow_methods=["GET"], allow_headers=["Range", "Content-Type"])


@app.get("/search")
async def search(q: str):
    query = q.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query is required")
    try:
        return await asyncio.to_thread(search_songs, query)
    except Exception:
        raise HTTPException(status_code=502, detail="YouTube Music search failed") from None


async def _resolve(video_id: str) -> ResolvedAudio:
    try:
        return await resolve_audio(video_id)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except TimeoutError:
        raise HTTPException(status_code=504, detail="Audio resolution timed out") from None
    except Exception:
        raise HTTPException(status_code=502, detail="Audio resolution failed") from None


async def _audio_response(request: Request, audio: ResolvedAudio, *, download: bool):
    requested_range = None if download else request.headers.get("range")
    upstream_headers = dict(audio.headers)
    if requested_range:
        upstream_headers["Range"] = requested_range
    client = httpx.AsyncClient(timeout=httpx.Timeout(connect=15, read=30, write=15, pool=15), follow_redirects=True)
    try:
        upstream = await client.send(client.build_request("GET", audio.url, headers=upstream_headers), stream=True)
        upstream.raise_for_status()
    except httpx.HTTPError:
        await client.aclose()
        raise HTTPException(status_code=502, detail="Audio stream failed") from None
    response_headers = {"Accept-Ranges": "bytes", "Content-Type": audio.content_type}
    for name in ("content-length", "content-range"):
        if value := upstream.headers.get(name):
            response_headers[name.title()] = value
    if download:
        filename = FILENAME_RE.sub("_", audio.title).strip(" ._") or "audio"
        response_headers["Content-Disposition"] = f"attachment; filename*=UTF-8''{quote(filename)}.{audio.extension}"
    else:
        response_headers["Content-Disposition"] = "inline"
    async def body():
        try:
            async for chunk in upstream.aiter_bytes(64 * 1024):
                if await request.is_disconnected():
                    break
                yield chunk
        finally:
            await upstream.aclose()
            await client.aclose()
    status_code = 206 if requested_range and upstream.status_code == 206 else 200
    return StreamingResponse(body(), status_code=status_code, headers=response_headers, media_type=audio.content_type)


@app.get("/stream/{video_id}")
async def stream(video_id: str, request: Request):
    return await _audio_response(request, await _resolve(video_id), download=False)


@app.get("/download/{video_id}")
async def download(video_id: str, request: Request):
    return await _audio_response(request, await _resolve(video_id), download=True)
