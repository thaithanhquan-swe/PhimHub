# PhimHub

Giao diện web khám phá phim phong cách Netflix, làm bằng React, Vite, TypeScript, Tailwind CSS và React Router. Ứng dụng lấy danh sách, tìm kiếm, thông tin phim, diễn viên, trailer và phim tương tự từ TMDB; không có chức năng streaming thật.

## Cấu trúc thư mục

```text
src/
  components/       Navbar, Hero, MovieCard, MovieRow, loading/error states
  components/ui/    Các primitive theo phong cách shadcn/ui
  data/             Kiểu dữ liệu và ảnh phim
  pages/            Trang chủ, tìm kiếm, chi tiết phim, đăng nhập/đăng ký
  services/         Client API TMDB và chuyển đổi dữ liệu
  lib/              Tiện ích className
```

## Chạy local

```bash
npm install
cp .env.example .env
```

Thêm TMDB API key của bạn vào `.env`:

```env
VITE_TMDB_API_KEY=your_tmdb_api_key
```

Sau đó chạy:

```bash
npm run dev
```

Không có key thì app tự dùng dữ liệu demo để có thể xem giao diện. Tìm kiếm có debounce; API request được hủy khi đổi trang hoặc từ khóa. Nếu TMDB trả lỗi, trang hiển thị thông báo và nút thử lại.
Danh sách yêu thích được lưu cục bộ trên trình duyệt; trang đăng nhập/đăng ký chỉ là giao diện demo.

## Bảo mật API key

Biến `VITE_*` được nhúng vào mã frontend và người dùng có thể xem trong trình duyệt. Chỉ dùng TMDB key phù hợp cho ứng dụng public; không đặt secret/backend credential trong biến này. `.env` đã được ignore bởi Git.

## Build production

```bash
npm run build
npm run preview
```
