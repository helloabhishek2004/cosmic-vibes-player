export function SongCardSkeleton() {
  return (
    <div className="glass rounded-3xl p-4" aria-hidden>
      <div className="aspect-square rounded-2xl shimmer mb-4" />
      <div className="h-4 w-3/4 rounded shimmer mb-2" />
      <div className="h-3 w-1/2 rounded shimmer mb-3" />
      <div className="h-9 w-full rounded-full shimmer" />
    </div>
  );
}
