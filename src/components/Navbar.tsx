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
        setScrolled(window.scrollY > 24);
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

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 flex h-[62px] items-center gap-5 px-4 text-white transition-colors duration-200 sm:px-[4.5%] lg:h-[68px]",
        scrolled ? "bg-[#141414]/95 backdrop-blur-md shadow-md" : "bg-gradient-to-b from-black/80 to-transparent",
      )}
    >
      <Link to="/" className="shrink-0 font-display text-2xl font-black text-primary tracking-tight">
        PhimHub
      </Link>
      <nav className="hidden items-center gap-5 text-[13px] lg:flex" aria-label="Điều hướng chính">
        {[
          ["Trang chủ", "/"],
          ["Phim bộ", "/?type=tv"],
          ["Phim lẻ", "/?type=movie"],
          ["Hoạt hình", "/?type=hoat-hinh"],
          ["Khám phá", "/search"],
          ["Danh sách của tôi", "/?list=saved"],
        ].map(([label, path]) => (
          <NavLink
            key={label}
            to={path}
            end={path === "/"}
            className={({ isActive }) =>
              cn(
                "whitespace-nowrap transition-colors hover:text-white",
                isActive ? "font-semibold text-white" : "text-white/70",
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <form onSubmit={submitSearch} className="ml-auto flex items-center gap-2">
        <div className="flex h-9 items-center gap-2 rounded-sm border border-white/20 bg-black/40 px-2.5 focus-within:border-white transition-colors">
          <Search className="size-4 shrink-0 text-white/70" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm phim..."
            aria-label="Tìm phim"
            className="w-[110px] bg-transparent text-xs outline-none placeholder:text-white/50 sm:w-[160px]"
          />
        </div>
        <Link
          to="/auth"
          aria-label="Đăng nhập"
          className="grid size-8 place-items-center rounded-sm bg-white/10 hover:bg-white/20 transition-colors"
        >
          <UserRound className="size-4" />
        </Link>
      </form>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-white/10 bg-[#141414]/95 backdrop-blur-md py-2 lg:hidden"
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
                "flex flex-col items-center gap-1 py-1 text-[9px] text-white/55 transition-colors",
                isActive && "text-white font-semibold",
              )
            }
          >
            <Icon className="size-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
