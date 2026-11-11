export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-8 px-4 sm:px-[4.5%]" aria-label="Đang tải phim">
      {Array.from({ length: rows }, (_, row) => (
        <section key={row}>
          <div className="mb-3 h-5 w-40 animate-pulse rounded bg-white/10" />
          <div className="grid grid-flow-col auto-cols-[38vw] gap-2 overflow-hidden sm:auto-cols-[19vw] sm:gap-3 lg:auto-cols-[15vw] xl:auto-cols-[12.5vw]">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="aspect-[2/3] animate-pulse rounded-sm bg-white/[0.08]"
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
