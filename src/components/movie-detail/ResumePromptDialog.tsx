import { History } from "lucide-react";

interface ResumePromptDialogProps {
  resumePrompt: { currentTime: number; duration: number } | null;
  onResume: () => void;
  onRestart: () => void;
}

export function ResumePromptDialog({
  resumePrompt,
  onResume,
  onRestart,
}: ResumePromptDialogProps) {
  if (!resumePrompt) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-dialog-title"
      className="absolute inset-0 z-40 grid place-items-center rounded-md bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-xl border border-white/15 bg-[#181818] p-5 text-center text-white shadow-2xl">
        <History className="mx-auto mb-2 size-6 text-primary" />
        <h3 id="resume-dialog-title" className="text-sm font-semibold">Bạn đang xem dở</h3>
        <p className="mt-1 text-xs text-white/65">
          Đã xem đến {Math.floor(resumePrompt.currentTime / 60)}:
          {String(Math.floor(resumePrompt.currentTime % 60)).padStart(2, "0")}.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <button
            type="button"
            onClick={onResume}
            className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/80"
          >
            Xem tiếp
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="rounded-md bg-white/10 px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/20"
          >
            Xem từ đầu
          </button>
        </div>
      </div>
    </div>
  );
}
