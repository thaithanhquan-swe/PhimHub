import { Clock3, History, LoaderCircle, UserRound } from "lucide-react";
import { formatDate, formatDuration, type DisplayDetails } from "./types";

interface AdminActivityDetailsProps {
  listMode: "users" | "visitors";
  detailsLoading: boolean;
  detailsError: string;
  listError: string;
  displayDetails: DisplayDetails | null;
}

export function AdminActivityDetails({
  listMode,
  detailsLoading,
  detailsError,
  listError,
  displayDetails,
}: AdminActivityDetailsProps) {
  return (
    <section className="min-w-0 space-y-6">
      {detailsError && (
        <div
          className="rounded-lg border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
          role="alert"
        >
          {detailsError}
        </div>
      )}

      {detailsLoading && (
        <div className="flex min-h-56 items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#1b1b1b] text-sm text-white/50">
          <LoaderCircle className="size-4 animate-spin" />
          Đang tải hồ sơ...
        </div>
      )}

      {!detailsLoading && displayDetails && (
        <>
          <section className="rounded-xl border border-white/10 bg-[#1b1b1b] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="grid size-12 place-items-center rounded-full bg-primary/15 text-primary">
                  <UserRound className="size-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{displayDetails.title}</h2>
                  <p className="mt-1 text-sm text-white/55">{displayDetails.subtitle}</p>
                </div>
              </div>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold uppercase text-primary">
                {displayDetails.badge}
              </span>
            </div>
            <dl className="mt-6 grid gap-4 border-t border-white/10 pt-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-white/40">{displayDetails.identifierLabel}</dt>
                <dd className="mt-1 break-all font-mono text-xs text-white/75">
                  {displayDetails.identifier}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-white/40">{displayDetails.createdLabel}</dt>
                <dd className="mt-1 text-white/75">{formatDate(displayDetails.createdAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-white/10 bg-[#1b1b1b]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="flex items-center gap-2 font-semibold">
                <History className="size-4 text-primary" />
                Lịch sử xem
              </h2>
              <span className="text-xs text-white/45">
                {displayDetails.watchHistory.length} phim
              </span>
            </div>
            {displayDetails.watchHistory.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-white/40">
                Chưa có lịch sử xem.
              </p>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {displayDetails.watchHistory.map((item) => {
                  const percent =
                    item.totalDuration > 0
                      ? Math.min(100, Math.max(0, (item.progress / item.totalDuration) * 100))
                      : 0;
                  return (
                    <article key={item._id} className="px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="font-medium">{item.movieTitle}</h3>
                        <span className="text-[11px] text-white/40">
                          {formatDate(item.timestamp)}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div
                          className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"
                          role="progressbar"
                          aria-label={`Tiến trình xem ${item.movieTitle}`}
                          aria-valuenow={Math.round(percent)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-xs tabular-nums text-white/55">
                          {formatDuration(item.progress)} / {formatDuration(item.totalDuration)}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-white/10 bg-[#1b1b1b]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="flex items-center gap-2 font-semibold">
                <Clock3 className="size-4 text-primary" />
                Lịch sử tìm kiếm
              </h2>
              <span className="text-xs text-white/45">
                {displayDetails.searchLogs.length} lượt tìm
              </span>
            </div>
            {displayDetails.searchLogs.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-white/40">
                Chưa có lịch sử tìm kiếm.
              </p>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {displayDetails.searchLogs.map((item) => (
                  <article
                    key={item._id}
                    className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"
                  >
                    <span className="text-sm text-white/85">{item.query}</span>
                    <time className="text-[11px] text-white/40">{formatDate(item.timestamp)}</time>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {!detailsLoading && !displayDetails && !detailsError && !listError && (
        <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-6 text-center">
          <p className="text-sm text-white/45">
            Chọn một {listMode === "users" ? "tài khoản" : "khách"} để xem lịch sử hoạt động.
          </p>
        </div>
      )}
    </section>
  );
}
