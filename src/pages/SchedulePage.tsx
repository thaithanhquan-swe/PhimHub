import {
  Calendar,
  Clapperboard,
  Clock,
  Film,
  Flame,
  Play,
  Sparkles,
  Tv,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { RequestError } from "@/components/RequestState";
import { getBackdropUrl, type Movie } from "@/data/movies";
import { cn } from "@/lib/utils";
import {
  getMoviesByCategory,
  getMoviesByGenre,
} from "@/services/movieApi";

const DAYS_OF_WEEK = [
  { id: 1, name: "Thứ Hai", short: "T2" },
  { id: 2, name: "Thứ Ba", short: "T3" },
  { id: 3, name: "Thứ Tư", short: "T4" },
  { id: 4, name: "Thứ Năm", short: "T5" },
  { id: 5, name: "Thứ Sáu", short: "T6" },
  { id: 6, name: "Thứ Bảy", short: "T7" },
  { id: 0, name: "Chủ Nhật", short: "CN" },
];

const SCHEDULE_HOURS = ["18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"];

function getDeterministicDayAndHour(slug: string): { dayId: number; hour: string } {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash << 5) - hash + slug.charCodeAt(i);
    hash |= 0;
  }
  const positive = Math.abs(hash);
  const dayId = positive % 7;
  const hour = SCHEDULE_HOURS[positive % SCHEDULE_HOURS.length];
  return { dayId, hour };
}

export function SchedulePage() {
  const todayDay = new Date().getDay(); // 0 is Sunday
  const [selectedDay, setSelectedDay] = useState<number>(todayDay);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [allSeries, setAllSeries] = useState<
    (Movie & { scheduleDay: number; scheduleHour: string })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    Promise.allSettled([
      getMoviesByCategory("phim-bo", 1, controller.signal),
      getMoviesByGenre("hoat-hinh", 1, controller.signal),
      getMoviesByCategory("tv-shows", 1, controller.signal),
    ])
      .then((results) => {
        const combined: Movie[] = [];
        results.forEach((res) => {
          if (res.status === "fulfilled") {
            combined.push(...res.value);
          }
        });

        // Deduplicate and assign deterministic broadcast schedule
        const seen = new Set<string>();
        const scheduled = combined
          .filter((m) => {
            if (seen.has(m.slug)) return false;
            seen.add(m.slug);
            return true;
          })
          .map((m) => {
            const { dayId, hour } = getDeterministicDayAndHour(m.slug);
            return {
              ...m,
              scheduleDay: dayId,
              scheduleHour: hour,
            };
          });

        setAllSeries(scheduled);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Không tải được lịch phát sóng.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const filteredMovies = useMemo(() => {
    return allSeries
      .filter((m) => m.scheduleDay === selectedDay)
      .filter((m) => {
        if (selectedCategory === "phim-bo") return m.kind === "Series";
        if (selectedCategory === "hoat-hinh")
          return m.genre.toLowerCase().includes("hoạt hình") || m.title.toLowerCase().includes("hoạt");
        return true;
      })
      .sort((a, b) => a.scheduleHour.localeCompare(b.scheduleHour));
  }, [allSeries, selectedDay, selectedCategory]);

  return (
    <main className="min-h-screen px-4 pb-20 pt-24 sm:px-[4.5%] sm:pt-28">
      {/* Header */}
      <div className="mb-8 max-w-3xl">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-primary/20 border border-primary/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            <Calendar className="size-3.5" /> Lịch phát sóng phim mới
          </span>
          <span className="flex items-center gap-1 text-xs text-white/50">
            <Clock className="size-3.5" /> Cập nhật liên tục
          </span>
        </div>
        <h1 className="font-display text-2xl font-black text-white sm:text-4xl">
          Lịch Chiếu Phim & Tập Mới Trong Tuần
        </h1>
        <p className="mt-2 text-xs text-white/70 sm:text-sm">
          Theo dõi khung giờ phát sóng của các bộ phim bộ, anime hoạt hình và gameshow truyền hình
          được cập nhật mới nhất mỗi ngày.
        </p>
      </div>

      {/* Day Selector Buttons */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {DAYS_OF_WEEK.map((day) => {
          const isSelected = selectedDay === day.id;
          const isToday = todayDay === day.id;

          return (
            <button
              key={day.id}
              type="button"
              onClick={() => setSelectedDay(day.id)}
              className={cn(
                "relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200",
                isSelected
                  ? "bg-primary text-white shadow-lg shadow-primary/30 scale-105"
                  : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white",
              )}
            >
              <span>{day.name}</span>
              {isToday && (
                <span className="rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  Hôm nay
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Category Sub-filter */}
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <span className="text-xs text-white/50 mr-1">Bộ lọc:</span>
        {[
          { id: "all", label: "Tất cả phim", icon: Sparkles },
          { id: "phim-bo", label: "Phim bộ", icon: Tv },
          { id: "hoat-hinh", label: "Hoạt hình & Anime", icon: Clapperboard },
        ].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              selectedCategory === cat.id
                ? "bg-white text-black font-bold"
                : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white",
            )}
          >
            <cat.icon className="size-3.5" />
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {loading && <LoadingSkeleton rows={2} />}
      {error && <RequestError message={error} />}

      {!loading && !error && filteredMovies.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#181818] p-12 text-center text-white/60">
          <Film className="mx-auto mb-3 size-12 text-white/30" />
          <p className="text-base font-semibold text-white/80">
            Chưa có lịch chiếu phim cho ngày này.
          </p>
          <p className="mt-1 text-xs text-white/40">
            Vui lòng chọn ngày khác trong tuần hoặc quay lại sau.
          </p>
        </div>
      )}

      {/* Schedule Grid */}
      {!loading && !error && filteredMovies.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredMovies.map((movie) => {
            const isToday = selectedDay === todayDay;

            return (
              <div
                key={movie.slug}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] transition-all duration-300 hover:border-white/30 hover:shadow-xl hover:-translate-y-1"
              >
                {/* Image Banner */}
                <div className="relative aspect-video w-full overflow-hidden bg-black">
                  <img
                    src={getBackdropUrl(movie)}
                    alt={movie.title}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                  {/* Airing Time Badge */}
                  <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-md bg-black/80 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md border border-white/15">
                    <Clock className="size-3 text-primary" />
                    <span>{movie.scheduleHour}</span>
                  </div>

                  {/* Hot/New Badge */}
                  {isToday ? (
                    <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow-md">
                      <Flame className="size-3 fill-current" /> Hôm nay
                    </span>
                  ) : (
                    <span className="absolute right-2.5 top-2.5 rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                      Sắp chiếu
                    </span>
                  )}

                  {/* Play on hover */}
                  <Link
                    to={`/movie/${movie.slug}?play=true`}
                    className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40"
                    aria-label={`Xem phim ${movie.title}`}
                  >
                    <span className="grid size-11 place-items-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-110">
                      <Play className="size-5 fill-current ml-0.5" />
                    </span>
                  </Link>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] text-white/60 mb-1.5">
                      <span className="font-semibold text-primary">
                        {movie.currentEpisode || "Tập mới"}
                      </span>
                      <span>·</span>
                      <span>{movie.quality || "HD"}</span>
                      <span>·</span>
                      <span>{movie.year}</span>
                    </div>

                    <Link
                      to={`/movie/${movie.slug}`}
                      className="font-display font-bold text-sm sm:text-base text-white hover:text-primary transition-colors line-clamp-1"
                    >
                      {movie.title}
                    </Link>

                    {movie.originalTitle && movie.originalTitle !== movie.title && (
                      <p className="text-xs text-white/50 line-clamp-1 mt-0.5">
                        {movie.originalTitle}
                      </p>
                    )}

                    <p className="mt-2 text-xs text-white/70 line-clamp-2 leading-relaxed">
                      {movie.description}
                    </p>
                  </div>

                  {/* Bottom Action */}
                  <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                    <span className="text-[11px] text-white/50">{movie.runtime}</span>
                    <Link
                      to={`/movie/${movie.slug}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      Xem chi tiết →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
