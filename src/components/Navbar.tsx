import {
  Bookmark,
  Calendar,
  Clapperboard,
  Film,
  Home,
  Menu,
  Search,
  Tv,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { DropdownFilter } from "@/components/DropdownFilter";
import { Logo } from "@/components/Logo";
import { ProviderStatusBadge } from "@/components/ProviderStatusBadge";
import { cn } from "@/lib/utils";
import { FILTER_OPTIONS } from "@/services/movieApi";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState("");
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
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

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

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (value) {
      navigate(`/search?q=${encodeURIComponent(value)}`);
      setQuery("");
    }
  }

  // Accurately determine which nav link is active based on path and query parameters
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
    if (id === "tv") {
      return currentPath === "/" && currentType === "tv";
    }
    if (id === "movie") {
      return currentPath === "/" && currentType === "movie";
    }
    if (id === "hoat-hinh") {
      return currentPath === "/" && currentType === "hoat-hinh";
    }
    if (id === "schedule") {
      return currentPath === "/schedule";
    }
    if (id === "search") {
      return currentPath === "/search";
    }
    if (id === "saved") {
      return isSavedList;
    }
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

  const PRIMARY_NAV = [
    { id: "home", label: "Trang chủ", to: "/" },
    { id: "tv", label: "Phim bộ", to: "/?type=tv" },
    { id: "movie", label: "Phim lẻ", to: "/?type=movie" },
    { id: "hoat-hinh", label: "Hoạt hình", to: "/?type=hoat-hinh" },
    { id: "schedule", label: "Lịch chiếu", to: "/schedule" },
  ];

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 flex h-[62px] sm:h-[66px] lg:h-[72px] items-center gap-2 sm:gap-4 lg:gap-6 px-3 sm:px-[4.5%] text-white transition-all duration-300",
          scrolled
            ? "bg-[#121212]/95 backdrop-blur-md shadow-xl border-b border-white/5"
            : "bg-gradient-to-b from-black/90 via-black/50 to-transparent",
        )}
      >
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="grid size-9 place-items-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 lg:hidden shrink-0"
          aria-label="Mở menu danh mục"
        >
          <Menu className="size-5" />
        </button>

        <Link to="/" className="group shrink-0" aria-label="PhimHub - Trang chủ">
          <Logo />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-4 lg:flex xl:gap-6" aria-label="Điều hướng chính">
          {PRIMARY_NAV.map(({ id, label, to }) => {
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

          {/* Minimalist Dropdowns in Header: Thể loại ⌵   Quốc gia ⌵   Năm ⌵ */}
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

        {/* Responsive Search Bar + Real-time Provider Status Badge */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-3 flex-1 max-w-[220px] sm:max-w-[420px] md:max-w-[540px] lg:max-w-[650px] xl:max-w-[720px] justify-end">
          <ProviderStatusBadge className="shrink-0" />

          <form onSubmit={submitSearch} className="flex-1 min-w-[95px] sm:min-w-[140px]">
            <div className="relative flex h-9 sm:h-10 w-full items-center gap-2 rounded-full border border-white/20 bg-black/50 px-3 sm:px-4 backdrop-blur-md transition-all duration-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25 focus-within:bg-black/80">
              <Search className="size-3.5 sm:size-4 shrink-0 text-white/70" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm phim..."
                aria-label="Tìm phim"
                className="w-full bg-transparent text-xs sm:text-sm outline-none placeholder:text-white/45 text-white pr-1"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="grid size-5 place-items-center rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Xóa từ khóa"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </form>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col bg-[#141416] p-4 shadow-2xl border-r border-white/10 animate-in slide-in-from-left duration-250 overflow-y-auto">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                <Logo />
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
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
              {[
                { id: "home", label: "Trang chủ", to: "/", icon: Home },
                { id: "tv", label: "Phim bộ", to: "/?type=tv", icon: Tv },
                { id: "movie", label: "Phim lẻ", to: "/?type=movie", icon: Film },
                { id: "hoat-hinh", label: "Hoạt hình & Anime", to: "/?type=hoat-hinh", icon: Clapperboard },
                { id: "schedule", label: "Lịch chiếu phim", to: "/schedule", icon: Calendar },
                { id: "saved", label: "Phim đã lưu", to: "/?list=saved", icon: Bookmark },
              ].map(({ id, label, to, icon: Icon }) => {
                const active = isItemActive(id);
                return (
                  <Link
                    key={id}
                    to={to}
                    onClick={() => setMobileMenuOpen(false)}
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
                      handleNavbarFilter("genre", g.value);
                      setMobileMenuOpen(false);
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
                      handleNavbarFilter("country", c.value);
                      setMobileMenuOpen(false);
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

            {/* Footer Status in Drawer */}
            <div className="mt-auto border-t border-white/10 pt-4 text-xs text-white/50">
              <p className="mb-2 text-[11px] font-semibold text-white/70">Hạ tầng phát video:</p>
              <ProviderStatusBadge />
            </div>
          </aside>
        </div>
      )}

      {/* Mobile Bottom Navigation (5 tabs) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/10 bg-[#121212]/95 backdrop-blur-lg py-1.5 lg:hidden shadow-2xl"
        aria-label="Điều hướng di động"
      >
        {[
          { id: "home", label: "Trang chủ", to: "/", icon: Home },
          { id: "tv", label: "Phim bộ", to: "/?type=tv", icon: Tv },
          { id: "movie", label: "Phim lẻ", to: "/?type=movie", icon: Film },
          { id: "schedule", label: "Lịch chiếu", to: "/schedule", icon: Calendar },
          { id: "saved", label: "Đã lưu", to: "/?list=saved", icon: Bookmark },
        ].map(({ id, label, to, icon: Icon }) => {
          const active = isItemActive(id);
          return (
            <Link
              key={id}
              to={to}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium transition-colors",
                active ? "text-primary font-bold" : "text-white/60 hover:text-white",
              )}
            >
              <Icon className="size-4.5" />
              <span className="truncate max-w-[56px] text-center">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
