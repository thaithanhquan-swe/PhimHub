import { Bookmark, Calendar, Compass, Home, Search, X } from "lucide-react";
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
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

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
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex h-[66px] items-center gap-4 lg:gap-6 px-4 text-white transition-all duration-300 sm:px-[4.5%] lg:h-[72px]",
        scrolled
          ? "bg-[#121212]/95 backdrop-blur-md shadow-xl border-b border-white/5"
          : "bg-gradient-to-b from-black/90 via-black/50 to-transparent",
      )}
    >
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

      {/* Elongated Search Bar + Real-time Provider Status Badge */}
      <div className="ml-auto flex items-center gap-2 sm:gap-3 flex-1 max-w-[280px] sm:max-w-[420px] md:max-w-[540px] lg:max-w-[650px] xl:max-w-[720px] justify-end">
        <ProviderStatusBadge className="shrink-0" />

        <form onSubmit={submitSearch} className="flex-1 min-w-[130px]">
          <div className="relative flex h-10 w-full items-center gap-2.5 rounded-full border border-white/20 bg-black/50 px-3.5 sm:px-4 backdrop-blur-md transition-all duration-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25 focus-within:bg-black/80">
            <Search className="size-4 shrink-0 text-white/70" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm phim, diễn viên..."
              aria-label="Tìm phim"
              className="w-full bg-transparent text-xs sm:text-sm outline-none placeholder:text-white/45 text-white pr-2"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="grid size-5 place-items-center rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Xóa từ khóa"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-white/10 bg-[#121212]/95 backdrop-blur-lg py-2 lg:hidden shadow-2xl"
        aria-label="Điều hướng di động"
      >
        {[
          { id: "home", label: "Trang chủ", to: "/", icon: Home },
          { id: "schedule", label: "Lịch chiếu", to: "/schedule", icon: Calendar },
          { id: "search", label: "Khám phá", to: "/search", icon: Compass },
          { id: "saved", label: "Đã lưu", to: "/?list=saved", icon: Bookmark },
        ].map(({ id, label, to, icon: Icon }) => {
          const active = isItemActive(id);
          return (
            <Link
              key={id}
              to={to}
              className={cn(
                "flex flex-col items-center gap-1 py-1 text-[11px] font-medium transition-colors",
                active ? "text-primary font-bold" : "text-white/60 hover:text-white",
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
