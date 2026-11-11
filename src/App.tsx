import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";

import { Navbar } from "@/components/Navbar";
import { AuthPage } from "@/pages/AuthPage";
import { HomePage } from "@/pages/HomePage";
import { MovieDetailPage } from "@/pages/MovieDetailPage";
import { SearchPage } from "@/pages/SearchPage";
import { WatchlistProvider } from "@/context/WatchlistContext";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

function AppRoutes() {
  const { pathname } = useLocation();
  const isAuthPage = pathname === "/auth";

  return (
    <>
      {!isAuthPage && <Navbar />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/movie/:id" element={<MovieDetailPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/auth" element={<AuthPage />} />
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
      {!isAuthPage && (
        <footer className="border-t border-white/10 px-4 py-6 text-center text-[11px] text-white/45 sm:px-[4.5%]">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </footer>
      )}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <WatchlistProvider>
        <ScrollToTop />
        <AppRoutes />
      </WatchlistProvider>
    </BrowserRouter>
  );
}
