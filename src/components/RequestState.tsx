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
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 min-h-[38px] text-xs font-bold text-white shadow-md active:scale-95 transition-all"
        >
          <RefreshCw className="size-3.5" /> Thử lại
        </button>
      )}
    </div>
  );
}

export function DemoNotice() {
  return null;
}
