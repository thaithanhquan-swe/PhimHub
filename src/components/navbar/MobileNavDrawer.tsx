import { Download, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { ProviderStatusBadge } from "@/components/ProviderStatusBadge";
import { cn } from "@/lib/utils";
import { FILTER_OPTIONS } from "@/services/movieApi";
import { MOBILE_DRAWER_NAV_ITEMS } from "./navConfig";

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isItemActive: (id: string) => boolean;
  currentGenre: string | null;
  currentCountry: string | null;
  onFilterChange: (key: "genre" | "country", val: string) => void;
  onInstall?: () => void;
}

export function MobileNavDrawer({
  isOpen,
  onClose,
  isItemActive,
  currentGenre,
  currentCountry,
  onFilterChange,
  onInstall,
}: MobileNavDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col bg-[#141416] p-4 shadow-2xl border-r border-white/10 animate-in slide-in-from-left duration-250 overflow-y-auto">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <Link to="/" onClick={onClose}>
            <Logo />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-white/60 hover:text-white hover:bg-white/10"
            aria-label="Đóng menu"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Quick Navigation Links */}
        <div className="space-y-1 mb-6">
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-white/40 mb-2">
            Danh mục chính
          </p>
          {MOBILE_DRAWER_NAV_ITEMS.map(({ id, label, to, icon: Icon }) => {
            const active = isItemActive(id);
            return (
              <Link
                key={id}
                to={to}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-primary text-white shadow-md shadow-primary/30"
                    : "text-white/80 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon className="size-4" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>

        {/* Popular Genres shortcuts */}
        <div className="mb-6 border-t border-white/10 pt-4">
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-white/40 mb-2">
            Thể loại nổi bật
          </p>
          <div className="grid grid-cols-2 gap-1 px-1">
            {FILTER_OPTIONS.genres.slice(1, 9).map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => {
                  onFilterChange("genre", g.value);
                  onClose();
                }}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-xs text-left font-medium transition-colors line-clamp-1",
                  currentGenre === g.value
                    ? "bg-primary text-white font-bold"
                    : "text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Countries shortcuts */}
        <div className="mb-6 border-t border-white/10 pt-4">
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-white/40 mb-2">
            Quốc gia
          </p>
          <div className="grid grid-cols-2 gap-1 px-1">
            {FILTER_OPTIONS.countries.slice(1, 7).map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => {
                  onFilterChange("country", c.value);
                  onClose();
                }}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-xs text-left font-medium transition-colors line-clamp-1",
                  currentCountry === c.value
                    ? "bg-primary text-white font-bold"
                    : "text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* PWA Download Card in Drawer */}
        <div className="mb-4 rounded-xl border border-primary/30 bg-primary/10 p-3">
          <div className="flex items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary text-white shadow-md shadow-primary/30">
              <Download className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-white">Tải ứng dụng PhimHub</h4>
              <p className="mt-0.5 text-[11px] text-white/70">Xem phim toàn màn hình mượt mà, không quảng cáo.</p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onInstall?.();
                }}
                className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-md hover:bg-primary/90 transition-all active:scale-95"
              >
                <Download className="size-3.5" />
                <span>Cài đặt ứng dụng</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Status in Drawer */}
        <div className="mt-auto border-t border-white/10 pt-4 text-xs text-white/50">
          <p className="mb-2 text-[11px] font-semibold text-white/70">Hạ tầng phát video:</p>
          <ProviderStatusBadge />
        </div>
      </aside>
    </div>
  );
}
