import { useEffect, useState } from "react";

type Listener = (id: string | null, state: "loading" | "playing" | "idle") => void;

let audio: HTMLAudioElement | null = null;
let currentId: string | null = null;
let currentState: "loading" | "playing" | "idle" = "idle";
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l(currentId, currentState));
}

function ensureAudio() {
  if (!audio && typeof window !== "undefined") {
    audio = new Audio();
    audio.preload = "none";
    audio.addEventListener("playing", () => {
      currentState = "playing";
      emit();
    });
    audio.addEventListener("waiting", () => {
      currentState = "loading";
      emit();
    });
    audio.addEventListener("ended", () => {
      currentId = null;
      currentState = "idle";
      emit();
    });
    audio.addEventListener("pause", () => {
      if (currentState !== "loading") {
        currentState = "idle";
        emit();
      }
    });
    audio.addEventListener("error", () => {
      currentId = null;
      currentState = "idle";
      emit();
    });
  }
  return audio!;
}

export function toggle(id: string, src: string) {
  const a = ensureAudio();
  if (currentId === id && currentState !== "idle") {
    a.pause();
    currentId = null;
    currentState = "idle";
    emit();
    return;
  }
  a.pause();
  a.src = src;
  currentId = id;
  currentState = "loading";
  emit();
  a.play().catch(() => {
    currentId = null;
    currentState = "idle";
    emit();
  });
}

export function stop() {
  if (audio) audio.pause();
  currentId = null;
  currentState = "idle";
  emit();
}

export function usePlayback(id: string) {
  const [state, setState] = useState<{ active: boolean; status: "loading" | "playing" | "idle" }>(
    () => ({ active: currentId === id, status: currentId === id ? currentState : "idle" })
  );
  useEffect(() => {
    const l: Listener = (cid, s) => {
      setState({ active: cid === id, status: cid === id ? s : "idle" });
    };
    listeners.add(l);
    l(currentId, currentState);
    return () => {
      listeners.delete(l);
    };
  }, [id]);
  return state;
}
