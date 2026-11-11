import { useEffect, useState } from "react";

import {
  getActiveProvider,
  type ApiProviderId,
  subscribeProviderChange,
} from "@/services/movieApi";
import { cn } from "@/lib/utils";

export function ProviderStatusBadge({ className }: { className?: string }) {
  const [active, setActive] = useState<ApiProviderId>(getActiveProvider());

  useEffect(() => {
    return subscribeProviderChange((currentProvider) => {
      setActive(currentProvider);
    });
  }, []);

  const isPhimApi = active === "phimapi";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white/85 select-none shadow-sm backdrop-blur-md",
        className,
      )}
      title={`Nguồn phát tự động: ${isPhimApi ? "PhimAPI (Chính)" : "NguonC (Dự phòng)"}`}
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      <span className="text-white/90">
        Nguồn: <strong className="text-white font-semibold">{isPhimApi ? "PhimAPI" : "NguonC"}</strong>
      </span>
      <span className="rounded bg-white/10 px-1.5 py-0.2 text-[9px] text-white/50 font-normal">
        Tự động
      </span>
    </div>
  );
}
