import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Download, Loader2, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { Starfield } from "@/components/Starfield";
import { DownloadModal } from "@/components/DownloadModal";
import { stop as stopAudio, toggleTrack, usePlayback, useAudioProgress, seek } from "@/lib/audio-player";
import { type Song } from "@/types/song";
import client from "@/api/client";
import { streamUrl } from "@/lib/api-base";

const SELECTED_SONG_KEY = "dua.mp3:selected-song";
const PLACEHOLDER = "/placeholder.svg";

function getRememberedSong(id: string): Song | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SELECTED_SONG_KEY);
    if (!raw) return null;
    const song = JSON.parse(raw) as Song;
    return song?.id === id ? song : null;
  } catch { return null; }
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00";
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

export const Route = createFileRoute("/song/$id")({
  loader: async ({ params }) => {
    const remembered = getRememberedSong(params.id);
    try {
      const response = await client.get(`/api/song/${params.id}`);
      const data = response.data;
      if (!data) throw notFound();
      const id = data.videoId || params.id;
      return {
        id,
        title: data.title || remembered?.title || "Unknown Title",
        artist: data.artist || remembered?.artist || "Unknown Artist",
        album: data.album || remembered?.album || "Single",
        duration: data.duration || remembered?.duration || "0:00",
        year: data.year || remembered?.year || new Date().getFullYear(),
        genre: remembered?.genre?.length ? remembered.genre : ["Music"],
        thumbnailUrl: data.thumbnail || remembered?.thumbnailUrl || PLACEHOLDER,
        previewUrl: streamUrl(id),
      } satisfies Song;
    } catch (err: any) {
      console.error("Failed to load song metadata from API:", err);
      if (err.response?.status === 404 && !remembered) throw notFound();
      if (remembered) return remembered;
      throw err;
    }
  },
  head: ({ loaderData }) => ({ meta: [
    { title: loaderData ? `${loaderData.title} — ${loaderData.artist} | dua.mp3` : "dua.mp3" },
    { name: "description", content: loaderData ? `Download ${loaderData.title} by ${loaderData.artist}` : "" },
  ] }),
  component: SongPage,
  notFoundComponent: () => <div className="min-h-dvh flex items-center justify-center text-muted-foreground">Song not found</div>,
  errorComponent: () => <div className="min-h-dvh flex flex-col items-center justify-center text-muted-foreground gap-4"><p>Song details are temporarily unavailable.</p><Link to="/" className="text-purple-400 hover:underline">Return to Home</Link></div>,
});

function SongPage() {
  const song = Route.useLoaderData();
  const [open, setOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState(song.thumbnailUrl || PLACEHOLDER);
  const { active, status, errorDetails } = usePlayback(song.id);
  const { currentTime, duration } = useAudioProgress();
  useEffect(() => () => stopAudio(), []);
  const progress = active && duration > 0 ? (currentTime / duration) * 100 : 0;
  const isPlaying = active && status === "playing";
  const isLoading = active && status === "loading";

  return (
    <>
      <Starfield />
      <div aria-hidden className="fixed inset-0 -z-10" style={{ backgroundImage: `url(${imageSrc})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(60px) saturate(120%)", opacity: 0.35 }} />
      <div aria-hidden className="fixed inset-0 -z-10 bg-black/60" />
      <main className="min-h-dvh px-4 py-8 pb-32"><div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-sm hover:bg-white/10 transition"><ArrowLeft size={16} /> Back</Link>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="glass rounded-3xl p-6 md:p-10 mt-8 grid md:grid-cols-[280px_1fr] gap-8 items-center">
          <img src={imageSrc} onError={() => setImageSrc(PLACEHOLDER)} alt={`${song.album} cover`} className="w-full rounded-2xl shadow-2xl aspect-square object-cover" />
          <div>
            <p className="text-sm uppercase tracking-widest text-muted-foreground">{song.album}</p>
            <h1 className="text-4xl md:text-5xl font-extrabold mt-2">{song.title}</h1>
            <p className="text-xl text-muted-foreground mt-2">{song.artist}</p>
            <div className="flex flex-wrap gap-2 mt-5">{song.genre.map((g) => <span key={g} className="text-xs glass rounded-full px-3 py-1">{g}</span>)}</div>
            <div className="flex gap-6 mt-5 text-sm text-muted-foreground"><span>{song.duration}</span><span>{song.year}</span></div>
            <div className="mt-6 glass rounded-2xl p-4 flex items-center gap-4">
              <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} onClick={() => toggleTrack(song)} aria-label={isPlaying ? `Pause ${song.title}` : `Play ${song.title}`} className="w-12 h-12 shrink-0 rounded-full gradient-bg flex items-center justify-center shadow-lg">
                {isLoading ? <Loader2 size={20} className="text-white animate-spin" /> : isPlaying ? <Pause size={20} fill="white" className="text-white" /> : <Play size={20} fill="white" className="text-white ml-0.5" />}
              </motion.button>
              <div className="flex-1 min-w-0"><input type="range" min={0} max={duration || 100} step={0.1} value={active ? currentTime : 0} onChange={(e) => seek(Number(e.target.value))} aria-label="Seek" className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500" disabled={!active || duration === 0} style={{ background: duration ? `linear-gradient(to right, rgb(168, 85, 247) 0%, rgb(168, 85, 247) ${progress}%, rgba(255,255,255,.2) ${progress}%, rgba(255,255,255,.2) 100%)` : undefined }} /><div className="flex justify-between text-xs text-muted-foreground mt-1 tabular-nums"><span>{formatTime(active ? currentTime : 0)}</span><span>{formatTime(duration)}</span></div></div>
            </div>
            {active && status === "error" && <p className="mt-3 text-sm text-red-300">{errorDetails?.message || "Playback failed. Tap play to retry."}</p>}
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={() => setOpen(true)} aria-label={`Download ${song.title}`} className="mt-5 h-14 px-8 rounded-full gradient-bg text-white font-semibold inline-flex items-center gap-3 shadow-[0_10px_40px_-10px_rgba(123,111,240,0.8)]"><Download size={20} /> Download MP3</motion.button>
          </div>
        </motion.div>
      </div></main>
      <DownloadModal open={open} onClose={() => setOpen(false)} songTitle={`${song.title} — ${song.artist}`} videoId={song.id} />
    </>
  );
}
