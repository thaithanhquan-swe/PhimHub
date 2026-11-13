import { Download, Share, Smartphone, X, Check } from "lucide-react";

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
  isInstalled: boolean;
  onInstall: () => void;
}

export function PwaInstallModal({
  isOpen,
  onClose,
  isIOS,
  isInstalled,
  onInstall,
}: PwaInstallModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] grid place-items-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-white/15 bg-[#181818] p-5 sm:p-6 text-white shadow-2xl animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3.5 top-3.5 grid size-8 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Đóng"
        >
          <X className="size-4.5" />
        </button>

        <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-primary/20 text-primary border border-primary/30">
          <Download className="size-6" />
        </div>

        <h3 className="text-center text-base font-bold text-white">
          {isInstalled ? "Ứng dụng PhimHub đã được cài đặt" : "Cài đặt PhimHub (PWA)"}
        </h3>
        <p className="mt-1 text-center text-xs text-white/65 leading-relaxed">
          {isInstalled
            ? "Bạn đã có PhimHub trên thiết bị. Mở ứng dụng từ màn hình chính để trải nghiệm toàn màn hình mượt mà."
            : "Xem phim toàn màn hình, tốc độ cao, không cần App Store và tiết kiệm dung lượng."}
        </p>

        {isInstalled ? (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 p-3 text-xs text-emerald-400 font-semibold">
            <Check className="size-4" />
            <span>Đã cài đặt thành công</span>
          </div>
        ) : isIOS ? (
          <div className="mt-4 space-y-2.5 rounded-xl bg-white/5 border border-white/10 p-3.5 text-xs text-white/80">
            <p className="font-bold text-white text-[11px] uppercase tracking-wider text-primary">
              Hướng dẫn cài đặt trên iPhone / iPad:
            </p>
            <div className="flex items-start gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/15 text-[11px] font-bold text-white">
                1
              </span>
              <span>
                Nhấn vào nút <strong className="text-white">Chia sẻ</strong> (
                <Share className="inline size-3.5 mx-0.5 text-primary" />) ở thanh dưới Safari.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/15 text-[11px] font-bold text-white">
                2
              </span>
              <span>
                Cuộn xuống và chọn <strong className="text-white">"Thêm vào MH chính"</strong> (Add to Home Screen).
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/15 text-[11px] font-bold text-white">
                3
              </span>
              <span>
                Nhấn <strong className="text-white">"Thêm"</strong> ở góc trên bên phải để hoàn tất!
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3 text-xs text-white/80">
              <Smartphone className="size-5 text-primary shrink-0" />
              <span>Cài đặt ứng dụng trực tiếp từ trình duyệt chỉ với 1 chạm.</span>
            </div>
            <button
              type="button"
              onClick={onInstall}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/30 hover:bg-primary/90 active:scale-98 transition-all"
            >
              <Download className="size-4" />
              <span>Cài đặt ứng dụng ngay</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-3.5 w-full rounded-xl py-2 text-center text-xs font-semibold text-white/50 hover:text-white transition-colors"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
