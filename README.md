# PhimHub

Giao diện web khám phá và xem phim phong cách Netflix, được xây dựng bằng React, Vite, TypeScript, Tailwind CSS và React Router.

Ứng dụng tích hợp trực tiếp với API của **phim.nguonc.com**:
- **Không cần API key**: Dữ liệu công khai, cập nhật liên tục từ kho phim lớn.
- **Xem phim trực tuyến**: Hỗ trợ player nhúng streaming, chọn server (Vietsub, Thuyết minh...) và danh sách tập phim đầy đủ.
- **Khám phá phong phú**: Phim mới cập nhật, phim bộ, phim lẻ, phim hoạt hình / anime, tìm kiếm theo tên và lọc theo thể loại / quốc gia.
- **Danh sách của tôi**: Lưu phim yêu thích ngay trên trình duyệt (localStorage).

## Cấu trúc thư mục

```text
src/
  components/       Navbar, Hero, MovieCard, MovieRow, LoadingSkeleton, RequestState
  components/ui/    Các primitive UI (dialog, button, input, badge)
  context/          WatchlistContext (quản lý phim đã lưu)
  data/             Kiểu dữ liệu Movie, MovieDetails, EpisodeServer và helper ảnh
  pages/            HomePage, MovieDetailPage, SearchPage, AuthPage
  services/         movieApi (tích hợp API phim.nguonc.com, caching, endpoint mappings)
  lib/              Tiện ích utils (cn)
```

## Chạy dự án

```bash
npm install
npm run dev
```

Mở trình duyệt tại địa chỉ hiển thị trong terminal (thường là `http://localhost:5173`).

## Build production

```bash
npm run build
npm run preview
```
