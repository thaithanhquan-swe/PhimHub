import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  History,
  LoaderCircle,
  Search,
  Shield,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

const TOKEN_STORAGE_KEY = "phimhub_access_token";
const PAGE_SIZE = 20;

type AdminUser = {
  _id: string;
  username: string;
  email: string;
  role: "user" | "admin";
  createdAt: string;
};

type WatchHistoryItem = {
  _id: string;
  movieId: string;
  movieTitle: string;
  progress: number;
  totalDuration: number;
  timestamp: string;
};

type SearchLogItem = {
  _id: string;
  query: string;
  timestamp: string;
};

type UserDetails = {
  user: AdminUser;
  watchHistory: WatchHistoryItem[];
  searchLogs: SearchLogItem[];
};

type VisitorSummary = {
  visitorHash: string;
  firstSeenAt: string;
  lastSeenAt: string;
  watchEvents: number;
  searchEvents: number;
};

type VisitorDetails = {
  visitor: VisitorSummary;
  watchHistory: WatchHistoryItem[];
  searchLogs: SearchLogItem[];
};

type UserListResponse = {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
};

type VisitorListResponse = {
  visitors: VisitorSummary[];
  total: number;
  page: number;
  pageSize: number;
};

function getApiBaseUrl(): string {
  return import.meta.env.VITE_BACKEND_API_BASE?.replace(/\/+$/, "") ?? "";
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Không rõ" : date.toLocaleString("vi-VN");
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const twoDigits = (value: number) => value.toString().padStart(2, "0");

  return hours > 0
    ? `${hours}:${twoDigits(minutes)}:${twoDigits(remainingSeconds)}`
    : `${twoDigits(minutes)}:${twoDigits(remainingSeconds)}`;
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown };
    if (typeof body.message === "string") return body.message;
  } catch {
    return `Yêu cầu thất bại (HTTP ${response.status}).`;
  }

  return `Yêu cầu thất bại (HTTP ${response.status}).`;
}

function readAccessToken(): { token: string | null; error: string | null } {
  try {
    return { token: window.localStorage.getItem(TOKEN_STORAGE_KEY), error: null };
  } catch {
    return { token: null, error: "Không thể đọc token đăng nhập từ trình duyệt." };
  }
}

export function AdminPage() {
  const [access] = useState(readAccessToken);
  const [listMode, setListMode] = useState<"users" | "visitors">("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [visitors, setVisitors] = useState<VisitorSummary[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [page, setPage] = useState(1);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(access.error ?? "");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [visitorDetails, setVisitorDetails] = useState<VisitorDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const selectedUserIdRef = useRef("");
  const selectedVisitorHashRef = useRef("");
  const [selectedVisitorHash, setSelectedVisitorHash] = useState("");

  function selectUser(userId: string) {
    selectedUserIdRef.current = userId;
    setSelectedUserId(userId);
  }

  function selectVisitor(visitorHash: string) {
    selectedVisitorHashRef.current = visitorHash;
    setSelectedVisitorHash(visitorHash);
  }

  useEffect(() => {
    if (listMode !== "users") return;

    if (!access.token) {
      if (!access.error) {
        setListError("Vui lòng đăng nhập bằng tài khoản quản trị để sử dụng trang này.");
      }
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (query) params.set("q", query);

    setListLoading(true);
    setListError("");

    fetch(`${getApiBaseUrl()}/api/admin/users?${params.toString()}`, {
      headers: { Authorization: `Bearer ${access.token}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(await getErrorMessage(response));
        return (await response.json()) as UserListResponse;
      })
      .then((result) => {
        setUsers(result.users);
        setTotalEntries(result.total);
        if (result.users.length === 0) {
          selectUser("");
          setDetails(null);
        } else if (!result.users.some((user) => user._id === selectedUserIdRef.current)) {
          selectUser(result.users[0]._id);
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setListError(reason instanceof Error ? reason.message : "Không thể tải danh sách tài khoản.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setListLoading(false);
      });

    return () => controller.abort();
  }, [access, listMode, page, query]);

  useEffect(() => {
    if (listMode !== "visitors") return;

    if (!access.token) {
      if (!access.error) {
        setListError("Vui lòng đăng nhập bằng tài khoản quản trị để sử dụng trang này.");
      }
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (query) params.set("q", query);

    setListLoading(true);
    setListError("");

    fetch(`${getApiBaseUrl()}/api/admin/visitors?${params.toString()}`, {
      headers: { Authorization: `Bearer ${access.token}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(await getErrorMessage(response));
        return (await response.json()) as VisitorListResponse;
      })
      .then((result) => {
        setVisitors(result.visitors);
        setTotalEntries(result.total);
        if (result.visitors.length === 0) {
          selectVisitor("");
          setVisitorDetails(null);
        } else if (
          !result.visitors.some((visitor) => visitor.visitorHash === selectedVisitorHashRef.current)
        ) {
          selectVisitor(result.visitors[0].visitorHash);
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setListError(reason instanceof Error ? reason.message : "Không thể tải danh sách khách.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setListLoading(false);
      });

    return () => controller.abort();
  }, [access, listMode, page, query]);

  useEffect(() => {
    if (listMode !== "users" || !access.token || !selectedUserId) {
      setDetails(null);
      if (listMode === "users") setDetailsError("");
      return;
    }

    const controller = new AbortController();
    setDetailsLoading(true);
    setDetailsError("");

    fetch(`${getApiBaseUrl()}/api/admin/users/${encodeURIComponent(selectedUserId)}/details`, {
      headers: { Authorization: `Bearer ${access.token}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(await getErrorMessage(response));
        return (await response.json()) as UserDetails;
      })
      .then(setDetails)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setDetailsError(reason instanceof Error ? reason.message : "Không thể tải hồ sơ tài khoản.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailsLoading(false);
      });

    return () => controller.abort();
  }, [access.token, listMode, selectedUserId]);

  useEffect(() => {
    if (listMode !== "visitors" || !access.token || !selectedVisitorHash) {
      setVisitorDetails(null);
      if (listMode === "visitors") setDetailsError("");
      return;
    }

    const controller = new AbortController();
    setDetailsLoading(true);
    setDetailsError("");

    fetch(
      `${getApiBaseUrl()}/api/admin/visitors/${encodeURIComponent(selectedVisitorHash)}/details`,
      {
        headers: { Authorization: `Bearer ${access.token}` },
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error(await getErrorMessage(response));
        return (await response.json()) as VisitorDetails;
      })
      .then(setVisitorDetails)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setDetailsError(reason instanceof Error ? reason.message : "Không thể tải hồ sơ khách.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailsLoading(false);
      });

    return () => controller.abort();
  }, [access.token, listMode, selectedVisitorHash]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQuery(queryInput.trim());
  }

  const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));
  const displayDetails = listMode === "users"
    ? details
      ? {
          title: details.user.username,
          subtitle: details.user.email,
          badge: details.user.role,
          identifierLabel: "User ID",
          identifier: details.user._id,
          createdLabel: "Ngày tạo tài khoản",
          createdAt: details.user.createdAt,
          watchHistory: details.watchHistory,
          searchLogs: details.searchLogs,
        }
      : null
    : visitorDetails
      ? {
          title: `Khách ${visitorDetails.visitor.visitorHash.slice(0, 8)}`,
          subtitle: "Định danh giả danh từ HMAC IP; không lưu địa chỉ IP gốc",
          badge: "khách",
          identifierLabel: "Mã khách HMAC",
          identifier: visitorDetails.visitor.visitorHash,
          createdLabel: "Lần đầu ghi nhận",
          createdAt: visitorDetails.visitor.firstSeenAt,
          watchHistory: visitorDetails.watchHistory,
          searchLogs: visitorDetails.searchLogs,
        }
      : null;

  return (
    <main className="min-h-screen bg-[#141414] px-4 pb-28 pt-24 text-white sm:px-[4.5%] lg:pb-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              <Shield className="size-4" />
              PhimHub
            </p>
            <h1 className="text-3xl font-bold sm:text-4xl">Admin Dashboard</h1>
            <p className="mt-2 text-sm text-white/55">
              Quản lý tài khoản và xem lịch sử hoạt động của người dùng.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
            <Users className="size-4 text-primary" />
            <span>
              {totalEntries.toLocaleString("vi-VN")}{" "}
              {listMode === "users" ? "tài khoản" : "khách"}
            </span>
          </div>
        </header>

        {listError && (
          <div
            className="mb-6 rounded-lg border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
            role="alert"
          >
            {listError}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.8fr)]">
          <section className="overflow-hidden rounded-xl border border-white/10 bg-[#1b1b1b]">
            <div className="border-b border-white/10 p-4">
              <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-black/25 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setListMode("users");
                    setPage(1);
                    setQuery("");
                    setQueryInput("");
                  }}
                  className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                    listMode === "users" ? "bg-white/10 text-white" : "text-white/45 hover:text-white"
                  }`}
                >
                  Tài khoản
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setListMode("visitors");
                    setPage(1);
                    setQuery("");
                    setQueryInput("");
                  }}
                  className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                    listMode === "visitors"
                      ? "bg-white/10 text-white"
                      : "text-white/45 hover:text-white"
                  }`}
                >
                  Khách theo mã IP
                </button>
              </div>
              <h2 className="mb-4 flex items-center gap-2 font-semibold">
                <Users className="size-4 text-primary" />
                {listMode === "users" ? "Tài khoản" : "Khách truy cập"}
              </h2>
              <form onSubmit={submitSearch} className="flex gap-2">
                <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 focus-within:border-primary/70">
                  <Search className="size-4 shrink-0 text-white/40" />
                  <input
                    value={queryInput}
                    onChange={(event) => setQueryInput(event.target.value)}
                    placeholder={listMode === "users" ? "Tìm tên hoặc email" : "Tìm theo mã khách"}
                    aria-label={
                      listMode === "users"
                        ? "Tìm tài khoản theo tên hoặc email"
                        : "Tìm khách theo mã HMAC"
                    }
                    className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/35"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 text-sm font-semibold text-black transition-opacity hover:opacity-85"
                >
                  Tìm
                </button>
              </form>
            </div>

            <div className="min-h-72 divide-y divide-white/[0.06]">
              {listLoading && (
                <div className="flex items-center justify-center gap-2 p-8 text-sm text-white/50">
                  <LoaderCircle className="size-4 animate-spin" />
                  {listMode === "users" ? "Đang tải tài khoản..." : "Đang tải khách..."}
                </div>
              )}
              {!listLoading &&
                listMode === "users" &&
                users.length === 0 &&
                !listError && (
                  <p className="p-8 text-center text-sm text-white/45">Không tìm thấy tài khoản.</p>
                )}
              {!listLoading &&
                listMode === "users" &&
                users.map((user) => (
                  <button
                    key={user._id}
                    type="button"
                    onClick={() => selectUser(user._id)}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-white/[0.05] ${
                      selectedUserId === user._id ? "bg-primary/[0.08]" : ""
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-sm font-semibold">{user.username}</span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          user.role === "admin"
                            ? "bg-primary/15 text-primary"
                            : "bg-white/10 text-white/55"
                        }`}
                      >
                        {user.role}
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-xs text-white/45">{user.email}</span>
                    <span className="mt-1 block truncate font-mono text-[10px] text-white/25">
                      {user._id}
                    </span>
                  </button>
                ))}
              {!listLoading && listMode === "visitors" && visitors.length === 0 && !listError && (
                <p className="p-8 text-center text-sm text-white/45">
                  Chưa có khách truy cập được ghi nhận.
                </p>
              )}
              {!listLoading &&
                listMode === "visitors" &&
                visitors.map((visitor) => (
                  <button
                    key={visitor.visitorHash}
                    type="button"
                    onClick={() => selectVisitor(visitor.visitorHash)}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-white/[0.05] ${
                      selectedVisitorHash === visitor.visitorHash ? "bg-primary/[0.08]" : ""
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-sm font-semibold">
                        Khách {visitor.visitorHash.slice(0, 8)}
                      </span>
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                        khách
                      </span>
                    </span>
                    <span className="mt-1 block truncate font-mono text-[10px] text-white/35">
                      HMAC {visitor.visitorHash.slice(0, 16)}…
                    </span>
                    <span className="mt-1 block text-[11px] text-white/40">
                      {visitor.watchEvents} lượt xem · {visitor.searchEvents} lượt tìm
                    </span>
                  </button>
                ))}
            </div>

            <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-xs text-white/50">
              <span>
                Trang {page} / {totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label="Trang trước"
                  disabled={page <= 1 || listLoading}
                  onClick={() => setPage((value) => value - 1)}
                  className="grid size-8 place-items-center rounded-md hover:bg-white/10 disabled:opacity-30"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Trang sau"
                  disabled={page >= totalPages || listLoading}
                  onClick={() => setPage((value) => value + 1)}
                  className="grid size-8 place-items-center rounded-md hover:bg-white/10 disabled:opacity-30"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </section>

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
        </div>
      </div>
    </main>
  );
}
