import { Check, ChevronDown, Radio, RefreshCw, Server } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  getActiveProvider,
  getProvidersStatus,
  type ApiProviderId,
  type ProviderStatus,
  setActiveProvider,
  subscribeProviderChange,
} from "@/services/movieApi";
import { cn } from "@/lib/utils";

export function ProviderStatusBadge({ className }: { className?: string }) {
  const [active, setActive] = useState<ApiProviderId>(getActiveProvider());
  const [providers, setProviders] = useState<ProviderStatus[]>(getProvidersStatus());
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return subscribeProviderChange((currentProvider) => {
      setActive(currentProvider);
      setProviders(getProvidersStatus());
    });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentInfo = providers.find((p) => p.id === active) || providers[0];

  function handleSwitch(id: ApiProviderId) {
    setActiveProvider(id);
    setIsOpen(false);
    // Reload or refresh data
    window.location.reload();
  }

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white/80 backdrop-blur-md transition-all hover:border-white/30 hover:bg-black/80 hover:text-white"
        aria-label="Chọn nguồn phát phim"
        title="Bấm để xem trạng thái hoặc đổi nguồn phát phim"
      >
        <span
          className={cn(
            "size-2 rounded-full",
            currentInfo.status === "online"
              ? "bg-emerald-500 shadow-sm shadow-emerald-500/50"
              : currentInfo.status === "degraded"
                ? "bg-amber-400 shadow-sm shadow-amber-400/50"
                : "bg-rose-500",
          )}
        />
        <span className="truncate max-w-[110px] sm:max-w-none">
          {active === "phimapi" ? "PhimAPI" : "NguonC"}
        </span>
        <ChevronDown className={cn("size-3 text-white/50 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-72 sm:w-80 rounded-xl border border-white/15 bg-[#181818]/95 p-3 shadow-2xl backdrop-blur-xl">
          <div className="mb-2.5 flex items-center justify-between border-b border-white/10 pb-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Server className="size-3.5 text-primary" />
              <span>Máy chủ & Nguồn phát</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-medium">Tự động luân phiên</span>
          </div>

          <p className="mb-3 text-[11px] text-white/60 leading-relaxed">
            Hệ thống tự động phát hiện và chuyển đổi nguồn phát khi một bên bị nghẽn mạng hoặc lỗi video.
          </p>

          <div className="space-y-1.5">
            {providers.map((p) => {
              const isSelected = p.id === active;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSwitch(p.id)}
                  className={cn(
                    "w-full text-left rounded-lg p-2.5 transition-all border flex items-start justify-between gap-2",
                    isSelected
                      ? "border-primary/50 bg-primary/10 text-white"
                      : "border-white/5 bg-white/5 text-white/80 hover:bg-white/10 hover:border-white/20",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "size-2 rounded-full shrink-0",
                          p.status === "online"
                            ? "bg-emerald-500"
                            : p.status === "degraded"
                              ? "bg-amber-400"
                              : "bg-rose-500",
                        )}
                      />
                      <span className="text-xs font-bold truncate">{p.name}</span>
                      {isSelected && (
                        <span className="rounded bg-primary px-1.5 py-0.2 text-[9px] font-bold text-white uppercase">
                          Đang dùng
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[10px] text-white/55 line-clamp-2">
                      {p.description}
                    </p>
                    {p.lastError && (
                      <p className="mt-1 text-[10px] text-amber-300/80 italic">
                        Cảnh báo: {p.lastError}
                      </p>
                    )}
                  </div>
                  {isSelected && <Check className="size-4 text-primary shrink-0 mt-0.5" />}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2 text-[10px] text-white/40">
            <span className="flex items-center gap-1">
              <Radio className="size-3 text-emerald-400" />
              <span>Failover tự động: Bật</span>
            </span>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <RefreshCw className="size-3" />
              <span>Tải lại</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
