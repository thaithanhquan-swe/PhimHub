import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";

import { Navbar } from "@/components/Navbar";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { WatchHistoryProvider } from "@/context/WatchHistoryContext";
import { WatchlistProvider } from "@/context/WatchlistContext";
import { NotFoundPage } from "@/pages/NotFoundPage";

const HomePage = lazy(() => import("@/pages/HomePage").then(({ HomePage }) => ({ default: HomePage })));
const MovieDetailPage = lazy(() =>
  import("@/pages/MovieDetailPage").then(({ MovieDetailPage }) => ({ default: MovieDetailPage })),
);
const SchedulePage = lazy(() =>
  import("@/pages/SchedulePage").then(({ SchedulePage }) => ({ default: SchedulePage })),
);
const SearchPage = lazy(() => import("@/pages/SearchPage").then(({ SearchPage }) => ({ default: SearchPage })));

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
      <Suspense fallback={<div className="min-h-screen pt-20"><LoadingSkeleton rows={1} /></div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/movie/:id" element={<MovieDetailPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <footer className="border-t border-white/10 px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] lg:pb-6 text-center text-[11px] text-white/45 sm:px-[4.5%]">
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
