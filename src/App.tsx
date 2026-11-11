import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";

import { Navbar } from "@/components/Navbar";
import { WatchHistoryProvider } from "@/context/WatchHistoryContext";
import { WatchlistProvider } from "@/context/WatchlistContext";
import { HomePage } from "@/pages/HomePage";
import { MovieDetailPage } from "@/pages/MovieDetailPage";
import { SchedulePage } from "@/pages/SchedulePage";
import { SearchPage } from "@/pages/SearchPage";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/movie/:id" element={<MovieDetailPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route
          path="*"
          element={
            <main className="grid min-h-screen place-items-center pt-16">
              <div className="text-center">
                <p className="text-6xl font-bold text-primary">404</p>
                <p className="mt-3 text-white/70">Không tìm thấy trang này.</p>
              </div>
            </main>
          }
        />
      </Routes>
      <footer className="border-t border-white/10 px-4 pt-6 pb-24 lg:pb-6 text-center text-[11px] text-white/45 sm:px-[4.5%]">
        Dữ liệu phim từ PhimAPI & NguonC. PhimHub — Nền tảng xem phim trực tuyến đa nguồn tốc độ cao.
      </footer>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <WatchlistProvider>
        <WatchHistoryProvider>
          <ScrollToTop />
          <AppRoutes />
        </WatchHistoryProvider>
      </WatchlistProvider>
    </BrowserRouter>
  );
}
