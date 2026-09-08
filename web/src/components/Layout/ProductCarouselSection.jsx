export function ProductCarouselSection({ title, action, children }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-2xl">{title}</h2>
        {action}
      </div>
      <div className="scrollbar-thin flex gap-4 overflow-x-auto pb-2">{children}</div>
    </section>
  );
}

export function CardSkeleton() {
  return (
    <div className="w-44 shrink-0 animate-pulse sm:w-52">
      <div className="aspect-square rounded-md bg-line/50" />
      <div className="mt-2 h-3 w-3/4 rounded bg-line/50" />
      <div className="mt-2 h-3 w-1/2 rounded bg-line/50" />
    </div>
  );
}
