import { ArrowLeftRight } from "lucide-react";
import { useEffect, useState } from "react";

import {
  getActiveProvider,
  getProvidersStatus,
  setActiveProvider,
  subscribeProviderChange,
} from "@/services/movieApi";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

export function ProviderStatusBadge({ className }: { className?: string }) {
  const [provider, setProvider] = useState(() => {
    const active = getActiveProvider();
    return getProvidersStatus().find((item) => item.id === active)!;
  });

  useEffect(() => {
    return subscribeProviderChange((active, providers) => {
      setProvider(providers[active]);
    });
  }, []);

  function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = provider.id === "phimapi" ? "nguonc" : "phimapi";
    setActiveProvider(next);
    void queryClient.invalidateQueries();
  }

  const isPhimApi = provider.id === "phimapi";
  const statusLabel = {
    unknown: "Chưa kiểm tra",
    online: "API phản hồi tốt",
    degraded: "API lỗi gần đây",
    offline: "API không phản hồi",
  }[provider.status];
  const statusClass = {
    unknown: "bg-white/35",
    online: "bg-emerald-500",
    degraded: "bg-amber-400",
    offline: "bg-red-500",
  }[provider.status];

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white/85 select-none shadow-sm backdrop-blur-md hover:border-primary/50 hover:bg-white/10 active:scale-95 transition-all cursor-pointer",
        className,
      )}
      title={`Nguồn API: ${provider.name} (${statusLabel}). Bấm để đổi sang ${isPhimApi ? "NguonC" : "PhimAPI"}.`}
      aria-label={`Đổi nguồn phim, hiện tại là ${provider.name}`}
    >
      <span className="relative flex size-2 shrink-0">
        {provider.status === "online" && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
        <span className={`relative inline-flex size-2 rounded-full ${statusClass}`} />
      </span>
      <span className="text-white/90 flex items-center gap-1 text-[10px] sm:text-[11px]">
        <span className="hidden sm:inline text-white/60">API:</span>
        <strong className="text-white font-semibold">{isPhimApi ? "PhimAPI" : "NguonC"}</strong>
      </span>
      <span className="hidden md:inline rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-white/60 font-normal">
        {statusLabel}
      </span>
      <ArrowLeftRight className="size-3 text-white/40 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 hidden sm:inline" />
    </button>
  );
}
