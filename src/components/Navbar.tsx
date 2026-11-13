import { Download, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { DropdownFilter } from "@/components/DropdownFilter";
import { Logo } from "@/components/Logo";
import { ProviderStatusBadge } from "@/components/ProviderStatusBadge";
import { PwaInstallModal } from "@/components/PwaInstallModal";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { cn } from "@/lib/utils";
import { FILTER_OPTIONS } from "@/services/movieApi";
import {
  MobileBottomNav,
  MobileNavDrawer,
  PRIMARY_NAV_ITEMS,
  SearchAutocomplete,
} from "@/components/navbar/index";

export function Navbar() {
  const { isInstalled, isIOS, showGuide, setShowGuide, triggerInstall } = usePwaInstall();
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
  const isSavedList = searchParams.get("list") === "saved";

  function isItemActive(id: string): boolean {
    if (id === "home") {
      return (
        currentPath === "/" &&
        !currentType &&
        !currentGenre &&
        !currentCountry &&
        !currentYear &&
        !isSavedList
      );
    }
    if (id === "tv") return currentPath === "/" && currentType === "tv";
    if (id === "movie") return currentPath === "/" && currentType === "movie";
    if (id === "hoat-hinh") return currentPath === "/" && currentType === "hoat-hinh";
    if (id === "schedule") return currentPath === "/schedule";
    if (id === "search") return currentPath === "/search";
    if (id === "saved") return isSavedList;
    return false;
  }

  function handleNavbarFilter(key: "genre" | "country" | "year", val: string) {
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
        <nav className="hidden items-center gap-4 lg:flex xl:gap-6" aria-label="Điều hướng chính">
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

          {/* Minimalist Dropdowns: Thể loại ⌵   Quốc gia ⌵   Năm ⌵ */}
          <div className="flex items-center gap-1 xl:gap-2 border-l border-white/10 pl-3 xl:pl-4">
            <DropdownFilter
              label="Thể loại"
              value={currentGenre || "all"}
              options={FILTER_OPTIONS.genres}
              onChange={(g) => handleNavbarFilter("genre", g)}
              columns={4}
            />
            <DropdownFilter
              label="Quốc gia"
              value={currentCountry || "all"}
              options={FILTER_OPTIONS.countries}
              onChange={(c) => handleNavbarFilter("country", c)}
              columns={3}
            />
            <DropdownFilter
              label="Năm"
              value={currentYear || "all"}
              options={FILTER_OPTIONS.years}
              onChange={(y) => handleNavbarFilter("year", y)}
              columns={3}
            />
          </div>
        </nav>

        {/* Responsive Search Bar + Provider Status Badge + PWA Download */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5 flex-1 max-w-[240px] sm:max-w-[460px] md:max-w-[580px] lg:max-w-[680px] xl:max-w-[760px] justify-end">
          <ProviderStatusBadge className="shrink-0 hidden sm:inline-flex" />

          {/* PWA Download / Install App Button */}
          <button
            type="button"
            onClick={triggerInstall}
            className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/20 px-2 sm:px-3 py-1.5 text-xs font-bold text-white hover:bg-primary transition-all active:scale-95 shrink-0 group shadow-sm"
            title="Tải ứng dụng PhimHub (PWA)"
            aria-label="Cài đặt ứng dụng PhimHub"
          >
            <Download className="size-3.5 sm:size-4 text-primary group-hover:text-white transition-colors" />
            <span className="hidden min-[450px]:inline text-[11px] sm:text-xs">Tải App</span>
          </button>

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
