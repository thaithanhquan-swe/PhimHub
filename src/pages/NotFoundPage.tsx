import { useEffect } from "react";
import { ArrowLeft, Clapperboard, Home, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export function NotFoundPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "404 - Không tìm thấy trang | PhimHub";
  }, []);

  return (
    <main className="grid min-h-[calc(100dvh-8rem)] place-items-center px-4 pb-24 pt-24 text-center">
      <div className="max-w-lg">
        <Clapperboard className="mx-auto size-12 text-primary" aria-hidden="true" />
        <p className="mt-5 text-7xl font-black tracking-tight text-primary sm:text-8xl">404</p>
        <h1 className="mt-3 text-2xl font-bold text-white sm:text-3xl">Không tìm thấy cảnh này</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/60">
          Đường dẫn có thể đã thay đổi hoặc bộ phim không còn ở đây. Hãy quay lại khám phá nhé.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary/85"
          >
            <Home className="size-4" /> Trang chủ
          </Link>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10"
          >
            <ArrowLeft className="size-4" /> Quay lại
          </button>
          <Link
            to="/search"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10"
          >
            <Search className="size-4" /> Tìm phim
          </Link>
        </div>
      </div>
    </main>
  );
}
