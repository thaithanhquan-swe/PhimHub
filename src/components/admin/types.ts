export const TOKEN_STORAGE_KEY = "phimhub_access_token";
export const PAGE_SIZE = 20;

export type AdminUser = {
  _id: string;
  username: string;
  email: string;
  role: "user" | "admin";
  createdAt: string;
};

export type WatchHistoryItem = {
  _id: string;
  movieId: string;
  movieTitle: string;
  progress: number;
  totalDuration: number;
  timestamp: string;
};

export type SearchLogItem = {
  _id: string;
  query: string;
  timestamp: string;
};

export type UserDetails = {
  user: AdminUser;
  watchHistory: WatchHistoryItem[];
  searchLogs: SearchLogItem[];
};

export type VisitorSummary = {
  visitorHash: string;
  firstSeenAt: string;
  lastSeenAt: string;
  watchEvents: number;
  searchEvents: number;
};

export type VisitorDetails = {
  visitor: VisitorSummary;
  watchHistory: WatchHistoryItem[];
  searchLogs: SearchLogItem[];
};

export type UserListResponse = {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
};

export type VisitorListResponse = {
  visitors: VisitorSummary[];
  total: number;
  page: number;
  pageSize: number;
};

export type DisplayDetails = {
  title: string;
  subtitle: string;
  badge: string;
  identifierLabel: string;
  identifier: string;
  createdLabel: string;
  createdAt: string;
  watchHistory: WatchHistoryItem[];
  searchLogs: SearchLogItem[];
};

export function getApiBaseUrl(): string {
  return import.meta.env.VITE_BACKEND_API_BASE?.replace(/\/+$/, "") ?? "";
}

export function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Không rõ" : date.toLocaleString("vi-VN");
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const twoDigits = (value: number) => value.toString().padStart(2, "0");

  return hours > 0
    ? `${hours}:${twoDigits(minutes)}:${twoDigits(remainingSeconds)}`
    : `${twoDigits(minutes)}:${twoDigits(remainingSeconds)}`;
}

export async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown };
    if (typeof body.message === "string") return body.message;
  } catch {
    return `Yêu cầu thất bại (HTTP ${response.status}).`;
  }

  return `Yêu cầu thất bại (HTTP ${response.status}).`;
}

export function readAccessToken(): { token: string | null; error: string | null } {
  try {
    return { token: window.localStorage.getItem(TOKEN_STORAGE_KEY), error: null };
  } catch {
    return { token: null, error: "Không thể đọc token đăng nhập từ trình duyệt." };
  }
}
