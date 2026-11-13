import { Shield, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  AdminActivityDetails,
  AdminListSidebar,
  getApiBaseUrl,
  getErrorMessage,
  PAGE_SIZE,
  readAccessToken,
  type AdminUser,
  type DisplayDetails,
  type UserDetails,
  type UserListResponse,
  type VisitorDetails,
  type VisitorListResponse,
  type VisitorSummary,
} from "@/components/admin";

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
  const displayDetails: DisplayDetails | null = listMode === "users"
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
          <AdminListSidebar
            listMode={listMode}
            onSwitchMode={(mode) => {
              setListMode(mode);
              setPage(1);
              setQuery("");
              setQueryInput("");
            }}
            users={users}
            visitors={visitors}
            selectedUserId={selectedUserId}
            selectedVisitorHash={selectedVisitorHash}
            onSelectUser={selectUser}
            onSelectVisitor={selectVisitor}
            queryInput={queryInput}
            onQueryInputChange={setQueryInput}
            onSubmitSearch={submitSearch}
            listLoading={listLoading}
            listError={listError}
            page={page}
            totalPages={totalPages}
            onPrevPage={() => setPage((val) => val - 1)}
            onNextPage={() => setPage((val) => val + 1)}
          />

          <AdminActivityDetails
            listMode={listMode}
            detailsLoading={detailsLoading}
            detailsError={detailsError}
            listError={listError}
            displayDetails={displayDetails}
          />
        </div>
      </div>
    </main>
  );
}
