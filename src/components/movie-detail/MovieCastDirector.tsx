interface MovieCastDirectorProps {
  director?: string;
  casts?: string;
}

export function MovieCastDirector({ director, casts }: MovieCastDirectorProps) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-6 rounded-md border border-white/10 bg-[#181818] p-5 sm:grid-cols-2">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">
          Đạo diễn
        </h4>
        <p className="mt-1 text-sm text-white/90 font-medium">
          {director || "Đang cập nhật"}
        </p>
      </div>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">
          Diễn viên
        </h4>
        <p className="mt-1 text-sm text-white/90 leading-6">
          {casts || "Đang cập nhật"}
        </p>
      </div>
    </div>
  );
}
