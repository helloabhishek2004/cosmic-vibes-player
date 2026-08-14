import { FormEvent, useState } from "react";
import { downloadUrl, search, streamUrl, type Song } from "./api";

export default function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError("");
    try { setResults(await search(query.trim())); } catch { setError("Search is unavailable. Please try again."); } finally { setLoading(false); }
  }
  return <main><header><p className="eyebrow">COSMIC VIBES</p><h1>Find a song. Play it. Keep it.</h1></header><form onSubmit={submit}><label htmlFor="query">Song or artist</label><div className="search"><input id="query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search YouTube Music" /><button disabled={loading}>{loading ? "Searching…" : "Search"}</button></div></form>{error && <p className="error" role="alert">{error}</p>}<section aria-live="polite">{results.map((song) => <article key={song.videoId}><img src={song.thumbnail} alt="" /><div className="details"><h2>{song.title}</h2><p>{song.artist}{song.duration && ` · ${song.duration}`}</p></div><div className="actions"><button onClick={() => setPlaying(playing === song.videoId ? null : song.videoId)}>{playing === song.videoId ? "Close player" : "Play"}</button><a href={downloadUrl(song.videoId)}>Download</a></div>{playing === song.videoId && <audio controls autoPlay src={streamUrl(song.videoId)}>Your browser does not support audio playback.</audio>}</article>)}</section></main>;
}
