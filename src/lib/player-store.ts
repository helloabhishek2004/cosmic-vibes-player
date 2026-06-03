import { useEffect, useState } from "react";
import type { Song } from "@/data/songs";

export type PlaybackStatus = "loading" | "playing" | "idle";

type StoreListener = () => void;

let audio: HTMLAudioElement | null = null;
let queue: Song[] = [];
let queueIndex = -1;
let status: PlaybackStatus = "idle";
const listeners = new Set<StoreListener>();

function currentTrack(): Song | null {
  return queueIndex >= 0 && queueIndex < queue.length ? queue[queueIndex]! : null;
}

function emit() {
  listeners.forEach((l) => l());
}

function ensureAudio() {
  if (!audio && typeof window !== "undefined") {
    audio = new Audio();
    audio.preload = "none";
    audio.addEventListener("playing", () => {
      status = "playing";
      emit();
    });
    audio.addEventListener("waiting", () => {
      status = "loading";
      emit();
    });
    audio.addEventListener("ended", () => {
      if (queueIndex < queue.length - 1) {
        playIndex(queueIndex + 1);
      } else {
        status = "idle";
        emit();
      }
    });
    audio.addEventListener("pause", () => {
      if (status !== "loading") {
        status = "idle";
        emit();
      }
    });
    audio.addEventListener("error", () => {
      console.error("[Player] Playback failed for", audio?.src);
      status = "idle";
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
  status = "loading";
  emit();
  a.play().catch((err) => {
    console.error("[Player] play() rejected:", err);
    status = "idle";
    emit();
  });
}

export function setQueue(tracks: Song[], startIndex = 0) {
  queue = tracks;
  if (tracks.length === 0) {
    stop();
    return;
  }
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
  if (currentTrack()?.id === track.id && status !== "idle") {
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

  if (status === "playing") {
    a.pause();
    status = "idle";
    emit();
    return;
  }

  if (status === "idle" && a.src) {
    status = "loading";
    emit();
    a.play().catch(() => {
      status = "idle";
      emit();
    });
    return;
  }

  playIndex(queueIndex);
}

export function playNext() {
  if (queueIndex < queue.length - 1) {
    playIndex(queueIndex + 1);
  }
}

export function playPrev() {
  const a = ensureAudio();
  if (a.currentTime > 3 && status === "playing") {
    a.currentTime = 0;
    return;
  }
  if (queueIndex > 0) {
    playIndex(queueIndex - 1);
  }
}

export function stop() {
  if (audio) audio.pause();
  queueIndex = -1;
  status = "idle";
  emit();
}

export function getPlayerSnapshot() {
  return {
    track: currentTrack(),
    status,
    queueIndex,
    queueLength: queue.length,
    hasNext: queueIndex >= 0 && queueIndex < queue.length - 1,
    hasPrev: queueIndex > 0,
  };
}

export function usePlayer() {
  const [, tick] = useState(0);
  useEffect(() => {
    const l = () => tick((n) => n + 1);
    listeners.add(l);
    return () => listeners.delete(l);
  }, []);
  return getPlayerSnapshot();
}

/** @deprecated Use toggleTrack / usePlayer */
export function toggle(id: string, src: string) {
  const track = queue.find((t) => t.id === id) ?? {
    id,
    title: "",
    artist: "",
    album: "",
    duration: "",
    year: 0,
    genre: [],
    thumbnailUrl: "",
    previewUrl: src,
  };
  toggleTrack(track);
}

export function usePlayback(id: string) {
  const { track, status: s } = usePlayer();
  return {
    active: track?.id === id,
    status: track?.id === id ? s : ("idle" as PlaybackStatus),
  };
}
