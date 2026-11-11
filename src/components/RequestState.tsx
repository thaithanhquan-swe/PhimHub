import { AlertCircle, RefreshCw } from "lucide-react";

export function RequestError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="mx-4 my-8 flex flex-col items-start gap-3 rounded-md border border-white/10 bg-[#1d1d1d] p-5 text-sm text-white/80 sm:mx-[4.5%]"
    >
      <p className="flex items-center gap-2 font-semibold text-white">
        <AlertCircle className="size-4 text-primary" />
        Không thể tải nội dung
      </p>
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 text-white underline underline-offset-4 hover:text-white/75"
        >
          <RefreshCw className="size-3.5" /> Thử lại
        </button>
      )}
    </div>
  );
}

export function DemoNotice() {
  return (
    <p className="mx-4 my-3 text-xs text-white/55 sm:mx-[4.5%]">
      Đang dùng dữ liệu demo. Thêm <code>VITE_TMDB_API_KEY</code> trong file{" "}
      <code>.env</code> để kết nối TMDB.
    </p>
  );
}
