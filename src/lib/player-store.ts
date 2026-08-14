import { useEffect, useState } from "react";
import type { Song } from "@/types/song";
import { recordPlayback } from "@/lib/recommendations";

export type PlaybackStatus = "loading" | "playing" | "idle" | "error";
type StoreListener = () => void;

let audio: HTMLAudioElement | null = null;
let queue: Song[] = [];
let queueIndex = -1;
let status: PlaybackStatus = "idle";
let errorDetails: { code: string; message: string; videoId: string } | null = null;
let sessionRecordedTrack = "";
const listeners = new Set<StoreListener>();

function currentTrack(): Song | null {
  return queueIndex >= 0 && queueIndex < queue.length ? queue[queueIndex]! : null;
}
function emit() { listeners.forEach((l) => l()); }

function ensureAudio() {
  if (!audio && typeof window !== "undefined") {
    audio = new Audio();
    audio.preload = "none";
    audio.addEventListener("playing", () => {
      status = "playing"; errorDetails = null;
      const track = currentTrack();
      if (track && sessionRecordedTrack !== track.id) { sessionRecordedTrack = track.id; recordPlayback(track, "play", audio?.currentTime || 0); }
      emit();
    });
    audio.addEventListener("waiting", () => { status = "loading"; emit(); });
    audio.addEventListener("ended", () => {
      const track = currentTrack();
      if (track) recordPlayback(track, "complete", audio?.duration || 0);
      if (queueIndex < queue.length - 1) playIndex(queueIndex + 1);
      else { status = "idle"; emit(); }
    });
    audio.addEventListener("pause", () => {
      if (status !== "loading" && status !== "error") {
        const track = currentTrack();
        if (track && (audio?.currentTime || 0) < 3 && (audio?.duration || 0) > 0) recordPlayback(track, "skip", audio?.currentTime || 0);
        status = "idle"; emit();
      }
    });
    audio.addEventListener("seeking", emit);
    audio.addEventListener("seeked", emit);
    audio.addEventListener("error", () => {
      const track = currentTrack();
      console.error("[Player] Playback failed for", audio?.src);
      status = "error";
      errorDetails = track ? {
        code: "MEDIA_ERR_SRC_NOT_SUPPORTED",
        message: "Playback unavailable for this track.",
        videoId: track.id,
      } : null;
      emit();
    });
  }
  return audio!;
}

function playIndex(index: number) {
  if (index < 0 || index >= queue.length) return;
  const track = queue[index]!;
  const a = ensureAudio();
  a.pause();
  a.src = track.previewUrl;
  queueIndex = index;
  sessionRecordedTrack = "";
  status = "loading";
  errorDetails = null;
  emit();
  a.play().catch((err) => {
    console.error("[Player] play() rejected:", err);
    status = "error";
    errorDetails = { code: "PLAYBACK_UNAVAILABLE", message: "Playback unavailable for this track.", videoId: track.id };
    emit();
  });
}

export function setQueue(tracks: Song[], startIndex = 0) {
  queue = tracks;
  if (tracks.length === 0) { stop(); return; }
  playIndex(Math.max(0, Math.min(startIndex, tracks.length - 1)));
}

export function playTrack(track: Song, tracks?: Song[]) {
  const list = tracks && tracks.length > 0 ? tracks : queue.length > 0 ? queue : [track];
  const index = list.findIndex((t) => t.id === track.id);
  queue = list;
  playIndex(index >= 0 ? index : 0);
}

export function toggleTrack(track: Song, tracks?: Song[]) {
  const a = ensureAudio();
  if (currentTrack()?.id === track.id && (status === "playing" || status === "loading")) {
    a.pause();
    status = "idle";
    emit();
    return;
  }
  playTrack(track, tracks);
}

export function togglePlayPause() {
  const a = ensureAudio();
  const track = currentTrack();
  if (!track) return;
  if (status === "playing") { a.pause(); status = "idle"; emit(); return; }
  if ((status === "idle" || status === "error") && a.src) {
    status = "loading";
    errorDetails = null;
    emit();
    a.play().catch((err) => {
      console.error("[Player] retry rejected:", err);
      status = "error";
      errorDetails = { code: "PLAYBACK_UNAVAILABLE", message: "Playback unavailable for this track.", videoId: track.id };
      emit();
    });
    return;
  }
  playIndex(queueIndex);
}

export function playNext() { if (queueIndex < queue.length - 1) playIndex(queueIndex + 1); }
export function playPrev() {
  const a = ensureAudio();
  if (a.currentTime > 3 && status === "playing") { a.currentTime = 0; return; }
  if (queueIndex > 0) playIndex(queueIndex - 1);
}
export function stop() { if (audio) audio.pause(); queueIndex = -1; status = "idle"; errorDetails = null; emit(); }

export function useAudioProgress() {
  const [state, setState] = useState({ currentTime: 0, duration: 0 });
  useEffect(() => {
    const a = ensureAudio();
    let raf = 0;
    const loop = () => {
      setState({ currentTime: a.currentTime || 0, duration: Number.isFinite(a.duration) ? a.duration : 0 });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return state;
}

export function getPlayerSnapshot() {
  return { track: currentTrack(), status, errorDetails, queueIndex, queueLength: queue.length, hasNext: queueIndex >= 0 && queueIndex < queue.length - 1, hasPrev: queueIndex > 0 };
}
export function usePlayer() {
  const [, tick] = useState(0);
  useEffect(() => { const l = () => tick((n) => n + 1); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  return getPlayerSnapshot();
}
export function toggle(id: string, src: string) {
  const track = queue.find((t) => t.id === id) ?? { id, title: "", artist: "", album: "", duration: "", year: 0, genre: [], thumbnailUrl: "", previewUrl: src };
  toggleTrack(track);
}
export function usePlayback(id: string) {
  const { track, status: s, errorDetails: err } = usePlayer();
  return { active: track?.id === id, status: track?.id === id ? s : ("idle" as PlaybackStatus), errorDetails: track?.id === id ? err : null };
}
export function seek(time: number) { const a = ensureAudio(); if (!isNaN(time) && isFinite(time)) { a.currentTime = time; emit(); } }
export function getPlaybackPosition() { return audio ? audio.currentTime : 0; }
export function getDuration() { return audio ? audio.duration : 0; }
export function usePlaybackPosition() {
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  useEffect(() => {
    const a = ensureAudio();
    const handleTimeUpdate = () => setPosition(a.currentTime);
    const handleLoadedMetadata = () => setDuration(a.duration);
    const handleDurationChange = () => setDuration(a.duration);
    a.addEventListener("timeupdate", handleTimeUpdate);
    a.addEventListener("loadedmetadata", handleLoadedMetadata);
    a.addEventListener("durationchange", handleDurationChange);
    return () => { a.removeEventListener("timeupdate", handleTimeUpdate); a.removeEventListener("loadedmetadata", handleLoadedMetadata); a.removeEventListener("durationchange", handleDurationChange); };
  }, []);
  return { position, duration };
}
