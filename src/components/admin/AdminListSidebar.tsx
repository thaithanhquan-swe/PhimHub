import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Search,
  Users,
} from "lucide-react";
import type { FormEvent } from "react";
import type { AdminUser, VisitorSummary } from "./types";

interface AdminListSidebarProps {
  listMode: "users" | "visitors";
  onSwitchMode: (mode: "users" | "visitors") => void;
  users: AdminUser[];
  visitors: VisitorSummary[];
  selectedUserId: string;
  selectedVisitorHash: string;
  onSelectUser: (userId: string) => void;
  onSelectVisitor: (hash: string) => void;
  queryInput: string;
  onQueryInputChange: (val: string) => void;
  onSubmitSearch: (event: FormEvent<HTMLFormElement>) => void;
  listLoading: boolean;
  listError: string;
  page: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export function AdminListSidebar({
  listMode,
  onSwitchMode,
  users,
  visitors,
  selectedUserId,
  selectedVisitorHash,
  onSelectUser,
  onSelectVisitor,
  queryInput,
  onQueryInputChange,
  onSubmitSearch,
  listLoading,
  listError,
  page,
  totalPages,
  onPrevPage,
  onNextPage,
}: AdminListSidebarProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/10 bg-[#1b1b1b]">
      <div className="border-b border-white/10 p-4">
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-black/25 p-1">
          <button
            type="button"
            onClick={() => onSwitchMode("users")}
            className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
              listMode === "users" ? "bg-white/10 text-white" : "text-white/45 hover:text-white"
            }`}
          >
            Tài khoản
          </button>
          <button
            type="button"
            onClick={() => onSwitchMode("visitors")}
            className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
              listMode === "visitors" ? "bg-white/10 text-white" : "text-white/45 hover:text-white"
            }`}
          >
            Khách theo mã IP
          </button>
        </div>
        <h2 className="mb-4 flex items-center gap-2 font-semibold">
          <Users className="size-4 text-primary" />
          {listMode === "users" ? "Tài khoản" : "Khách truy cập"}
        </h2>
        <form onSubmit={onSubmitSearch} className="flex gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 focus-within:border-primary/70">
            <Search className="size-4 shrink-0 text-white/40" />
            <input
              value={queryInput}
              onChange={(event) => onQueryInputChange(event.target.value)}
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
              onClick={() => onSelectUser(user._id)}
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
              onClick={() => onSelectVisitor(visitor.visitorHash)}
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
            onClick={onPrevPage}
            className="grid size-8 place-items-center rounded-md hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Trang sau"
            disabled={page >= totalPages || listLoading}
            onClick={onNextPage}
            className="grid size-8 place-items-center rounded-md hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
