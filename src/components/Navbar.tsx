import { Bookmark, Compass, Home, Search, Tv, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

import { cn } from "@/lib/utils";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

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

  const NAV_ITEMS = [
    { label: "Trang chủ", path: "/" },
    { label: "Phim bộ", path: "/?type=tv" },
    { label: "Phim lẻ", path: "/?type=movie" },
    { label: "Hoạt hình", path: "/?type=hoat-hinh" },
    { label: "Khám phá", path: "/search" },
    { label: "Danh sách của tôi", path: "/?list=saved" },
  ];

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex h-[66px] items-center gap-6 px-4 text-white transition-all duration-300 sm:px-[4.5%] lg:h-[72px]",
        scrolled
          ? "bg-[#121212]/95 backdrop-blur-md shadow-xl border-b border-white/5"
          : "bg-gradient-to-b from-black/90 via-black/50 to-transparent",
      )}
    >
      <Link
        to="/"
        className="shrink-0 font-display text-2xl sm:text-[26px] font-black text-primary tracking-tight transition-transform hover:scale-105"
      >
        PhimHub
      </Link>

      {/* Desktop Navigation with larger, more legible typography */}
      <nav className="hidden items-center gap-6 lg:flex xl:gap-8" aria-label="Điều hướng chính">
        {NAV_ITEMS.map(({ label, path }) => (
          <NavLink
            key={label}
            to={path}
            end={path === "/"}
            className={({ isActive }) =>
              cn(
                "relative py-1 text-sm sm:text-[15px] font-medium tracking-wide transition-all",
                isActive
                  ? "font-bold text-white after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:rounded-full after:bg-primary"
                  : "text-white/75 hover:text-white",
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Search & Profile */}
      <form onSubmit={submitSearch} className="ml-auto flex items-center gap-3">
        <div className="flex h-10 items-center gap-2.5 rounded-full border border-white/25 bg-black/40 px-3.5 backdrop-blur-md transition-all focus-within:border-white focus-within:bg-black/60 sm:w-[220px]">
          <Search className="size-4 shrink-0 text-white/70" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm tên phim, diễn viên..."
            aria-label="Tìm phim"
            className="w-full bg-transparent text-xs sm:text-sm outline-none placeholder:text-white/50"
          />
        </div>
        <Link
          to="/auth"
          aria-label="Đăng nhập"
          className="grid size-9 place-items-center rounded-full bg-white/10 hover:bg-white/20 transition-all hover:scale-105"
        >
          <UserRound className="size-4 text-white" />
        </Link>
      </form>

      {/* Mobile Bottom Navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-white/10 bg-[#121212]/95 backdrop-blur-lg py-2 lg:hidden shadow-2xl"
        aria-label="Điều hướng di động"
      >
        {[
          { label: "Trang chủ", to: "/", icon: Home },
          { label: "Khám phá", to: "/search", icon: Compass },
          { label: "Phim bộ", to: "/?type=tv", icon: Tv },
          { label: "Đã lưu", to: "/?list=saved", icon: Bookmark },
        ].map(({ label, to, icon: Icon }) => (
          <NavLink
            key={label}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 py-1 text-[11px] font-medium transition-colors",
                isActive ? "text-primary font-bold" : "text-white/60 hover:text-white",
              )
            }
          >
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
