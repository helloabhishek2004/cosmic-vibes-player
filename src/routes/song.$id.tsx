import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Download } from "lucide-react";
import { useState } from "react";
import { Starfield } from "@/components/Starfield";
import { DownloadModal } from "@/components/DownloadModal";
import { songs } from "@/data/songs";

export const Route = createFileRoute("/song/$id")({
  loader: ({ params }) => {
    const song = songs.find((s) => s.id === params.id);
    if (!song) throw notFound();
    return song;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.title} — ${loaderData.artist} | dua.mp3` : "dua.mp3" },
      { name: "description", content: loaderData ? `Download ${loaderData.title} by ${loaderData.artist}` : "" },
    ],
  }),
  component: SongPage,
  notFoundComponent: () => (
    <div className="min-h-dvh flex items-center justify-center text-muted-foreground">Song not found</div>
  ),
});

function SongPage() {
  const song = Route.useLoaderData();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Starfield />
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: `url(${song.thumbnailUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(60px) saturate(120%)",
          opacity: 0.35,
        }}
      />
      <div aria-hidden className="fixed inset-0 -z-10 bg-black/60" />

      <main className="min-h-dvh px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-sm hover:bg-white/10 transition"
            aria-label="Back to search"
          >
            <ArrowLeft size={16} /> Back
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass rounded-3xl p-6 md:p-10 mt-8 grid md:grid-cols-[280px_1fr] gap-8 items-center"
          >
            <img
              src={song.thumbnailUrl}
              alt={`${song.album} cover`}
              className="w-full rounded-2xl shadow-2xl aspect-square object-cover"
            />
            <div>
              <p className="text-sm uppercase tracking-widest text-muted-foreground">{song.album}</p>
              <h1 className="text-4xl md:text-5xl font-extrabold mt-2">{song.title}</h1>
              <p className="text-xl text-muted-foreground mt-2">{song.artist}</p>

              <div className="flex flex-wrap gap-2 mt-5">
                {song.genre.map((g) => (
                  <span key={g} className="text-xs glass rounded-full px-3 py-1">{g}</span>
                ))}
              </div>

              <div className="flex gap-6 mt-5 text-sm text-muted-foreground">
                <span>{song.duration}</span>
                <span>{song.year}</span>
              </div>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setOpen(true)}
                aria-label={`Download ${song.title}`}
                className="mt-7 h-14 px-8 rounded-full gradient-bg text-white font-semibold inline-flex items-center gap-3 shadow-[0_10px_40px_-10px_rgba(123,111,240,0.8)]"
              >
                <Download size={20} /> Download MP3
              </motion.button>
            </div>
          </motion.div>
        </div>
      </main>

      <DownloadModal
        open={open}
        onClose={() => setOpen(false)}
        songTitle={`${song.title} — ${song.artist}`}
      />
    </>
  );
}
