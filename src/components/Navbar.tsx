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
    if (value) navigate(`/search?q=${encodeURIComponent(value)}`);
  }

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 flex h-[62px] items-center gap-5 px-4 text-white transition-colors duration-200 sm:px-[4.5%] lg:h-[68px]",
        scrolled ? "bg-[#141414]" : "bg-gradient-to-b from-black/80 to-transparent",
      )}
    >
      <Link to="/" className="shrink-0 font-display text-2xl font-black text-primary">
        PhimHub
      </Link>
      <nav className="hidden items-center gap-5 text-[13px] lg:flex" aria-label="Điều hướng chính">
        {[
          ["Trang chủ", "/"],
          ["Phim bộ", "/?type=tv"],
          ["Phim lẻ", "/?type=movie"],
          ["Mới & phổ biến", "/search"],
          ["Danh sách của tôi", "/?list=saved"],
        ].map(([label, path]) => (
          <NavLink
            key={label}
            to={path}
            end={path === "/"}
            className={({ isActive }) =>
              cn(
                "whitespace-nowrap text-white/75 hover:text-white",
                isActive && "font-semibold text-white",
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <form onSubmit={submitSearch} className="ml-auto flex items-center gap-2">
        <div className="flex h-9 items-center gap-2 border border-white/35 bg-black/25 px-2.5 focus-within:border-white">
          <Search className="size-4 shrink-0" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm phim"
            aria-label="Tìm phim"
            className="w-[100px] bg-transparent text-xs outline-none placeholder:text-white/65 sm:w-[155px]"
          />
        </div>
        <Link
          to="/auth"
          aria-label="Đăng nhập"
          className="grid size-8 place-items-center rounded bg-[#333] hover:bg-[#444]"
        >
          <UserRound className="size-4" />
        </Link>
      </form>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-white/10 bg-[#141414] py-2 lg:hidden"
        aria-label="Điều hướng di động"
      >
        {[
          { label: "Trang chủ", to: "/", icon: Home },
          { label: "Khám phá", to: "/search", icon: Compass },
          { label: "Series", to: "/?type=tv", icon: Tv },
          { label: "Danh sách", to: "/?list=saved", icon: Bookmark },
        ].map(({ label, to, icon: Icon }) => (
          <NavLink
            key={label}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 py-1 text-[9px] text-white/55",
                isActive && "text-white",
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
