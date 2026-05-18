function SkeletonCard({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-2xl border border-border ${className}`} />;
}

export default function Loading() {
  return (
    <main className="flex flex-1 flex-col gap-6 pt-2">
      <header className="space-y-2">
        <SkeletonCard className="h-3 w-20 rounded-md" />
        <SkeletonCard className="h-9 w-44 rounded-xl" />
        <SkeletonCard className="h-4 w-64 rounded-md" />
      </header>

      <section className="rounded-2xl border border-border bg-card p-5">
        <SkeletonCard className="h-4 w-32 rounded-md" />
        <div className="mt-4 grid grid-cols-3 gap-2">
          <SkeletonCard className="h-10" />
          <SkeletonCard className="h-10" />
          <SkeletonCard className="h-10" />
        </div>
      </section>

      <section className="space-y-3">
        <SkeletonCard className="h-20" />
        <SkeletonCard className="h-20" />
        <SkeletonCard className="h-20" />
      </section>
    </main>
  );
}
