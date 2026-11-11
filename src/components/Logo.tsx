export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="relative flex size-8 sm:size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#E50914] to-[#FF3B4E] shadow-md shadow-primary/30 transition-transform group-hover:scale-105">
        <svg
          viewBox="0 0 24 24"
          className="size-4 sm:size-4.5 fill-white text-white ml-0.5"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M5 4.5v15l15-7.5L5 4.5z" />
        </svg>
      </div>
      <span className="font-display text-xl sm:text-2xl font-black tracking-tight text-white">
        Phim<span className="text-primary">Hub</span>
      </span>
    </div>
  );
}
