import { Download, HardDrive, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { Logo } from "@/components/Logo";
import { ProviderStatusBadge } from "@/components/ProviderStatusBadge";
import { PwaInstallModal } from "@/components/PwaInstallModal";
import { useOfflineDownloads } from "@/hooks/useOfflineDownloads";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { cn } from "@/lib/utils";
import {
  MobileBottomNav,
  MobileNavDrawer,
  PRIMARY_NAV_ITEMS,
  SearchAutocomplete,
} from "@/components/navbar/index";

export function Navbar() {
  const { isInstalled, isIOS, showGuide, setShowGuide, triggerInstall } = usePwaInstall();
  const { downloads } = useOfflineDownloads();
  const completedDownloadsCount = downloads.filter((d) => d.status === "completed").length;
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Track window scroll for glassmorphism header
  useEffect(() => {
    let frame = 0;
    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        setScrolled(window.scrollY > 20);
        frame = 0;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // Determine active navigation item based on path and query parameters
  const currentPath = location.pathname;
  const currentType = searchParams.get("type");
  const currentGenre = searchParams.get("genre");
  const currentCountry = searchParams.get("country");
  const currentYear = searchParams.get("year");
  const currentImdb = searchParams.get("imdb");
  const isSavedList = searchParams.get("list") === "saved";

  function isItemActive(id: string): boolean {
    if (id === "home") {
      return (
        currentPath === "/" &&
        !currentType &&
        !currentGenre &&
        !currentCountry &&
        !currentYear &&
        !currentImdb &&
        !isSavedList
      );
    }
    if (id === "top-imdb") return currentPath === "/" && Boolean(currentImdb);
    if (id === "tv") return currentPath === "/" && currentType === "tv" && !currentImdb;
    if (id === "movie") return currentPath === "/" && currentType === "movie" && !currentImdb;
    if (id === "hoat-hinh") return currentPath === "/" && currentType === "hoat-hinh";
    if (id === "schedule") return currentPath === "/schedule";
    if (id === "downloads") return currentPath === "/downloads";
    if (id === "search") return currentPath === "/search";
    if (id === "saved") return isSavedList;
    return false;
  }

  function handleNavbarFilter(key: "genre" | "country" | "year" | "imdb", val: string) {
    const next = new URLSearchParams(searchParams);
    if (val === "all") {
      next.delete(key);
    } else {
      next.set(key, val);
    }
    next.delete("page");
    navigate(`/?${next.toString()}`);
  }

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 flex h-[62px] sm:h-[66px] lg:h-[72px] items-center gap-2 sm:gap-4 lg:gap-6 px-3 sm:px-[4.5%] text-white transition-all duration-300 pt-[env(safe-area-inset-top,0px)]",
          scrolled
            ? "bg-[#121212]/95 backdrop-blur-md shadow-xl border-b border-white/5"
            : "bg-gradient-to-b from-black/90 via-black/50 to-transparent",
        )}
      >
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="grid size-9 place-items-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 active:scale-95 lg:hidden shrink-0"
          aria-label="Mở menu danh mục"
        >
          <Menu className="size-5" />
        </button>

        <Link to="/" className="group shrink-0 flex items-center" aria-label="PhimHub - Trang chủ">
          <Logo />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-3 lg:flex xl:gap-5 shrink-0" aria-label="Điều hướng chính">
          {PRIMARY_NAV_ITEMS.map(({ id, label, to }) => {
            const active = isItemActive(id);
            return (
              <Link
                key={id}
                to={to}
                className={cn(
                  "relative py-1 text-sm sm:text-[15px] font-medium tracking-wide transition-colors whitespace-nowrap",
                  active
                    ? "font-bold text-white after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:rounded-full after:bg-primary shadow-sm"
                    : "text-white/70 hover:text-white",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Responsive Search Bar + Provider Status Badge + PWA Download */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5 flex-1 max-w-[280px] sm:max-w-[460px] md:max-w-[580px] lg:max-w-[680px] xl:max-w-[760px] justify-end min-w-0">
          <ProviderStatusBadge className="shrink-0 hidden sm:inline-flex" />

          {/* Offline Downloads Link */}
          <Link
            to="/downloads"
            className={cn(
              "relative flex items-center justify-center gap-1.5 rounded-xl sm:rounded-full h-9 px-2.5 sm:px-3 text-xs font-semibold transition-all active:scale-95 shrink-0 shadow-sm border",
              currentPath === "/downloads"
                ? "border-primary/60 bg-primary/20 text-white shadow-sm ring-1 ring-primary/40"
                : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white",
            )}
            title="Kho phim đã tải (Xem ngoại tuyến)"
            aria-label="Kho phim đã tải ngoại tuyến"
          >
            <div className="relative flex items-center justify-center">
              <HardDrive
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  currentPath === "/downloads" ? "text-primary" : "text-white/80",
                )}
              />
              {completedDownloadsCount > 0 && (
                <span className="absolute -top-2 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-black text-black shadow-md ring-2 ring-[#121212] leading-none">
                  {completedDownloadsCount > 99 ? "99+" : completedDownloadsCount}
                </span>
              )}
            </div>
            <span className="hidden sm:inline text-xs font-medium">Phim đã tải</span>
          </Link>

          {/* PWA Download / Install App Button (Desktop & Tablet) */}
          {!isInstalled && (
            <button
              type="button"
              onClick={triggerInstall}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/20 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary transition-all active:scale-95 shrink-0 group shadow-sm"
              title="Tải ứng dụng PhimHub (PWA)"
              aria-label="Cài đặt ứng dụng PhimHub"
            >
              <Download className="size-3.5 sm:size-4 text-primary group-hover:text-white transition-colors" />
              <span className="hidden min-[450px]:inline text-[11px] sm:text-xs">Tải App</span>
            </button>
          )}

          <SearchAutocomplete />
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      <MobileNavDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        isItemActive={isItemActive}
        currentGenre={currentGenre}
        currentCountry={currentCountry}
        currentImdb={currentImdb}
        onFilterChange={handleNavbarFilter}
        onInstall={triggerInstall}
      />

      {/* Mobile Bottom Navigation (5 tabs) */}
      <MobileBottomNav isItemActive={isItemActive} />

      {/* PWA Install Guide Modal */}
      <PwaInstallModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
        isIOS={isIOS}
        isInstalled={isInstalled}
        onInstall={triggerInstall}
      />
    </>
  );
}
