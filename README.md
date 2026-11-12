# PhimHub

Website khám phá và xem phim phong cách Netflix, xây dựng bằng React, TypeScript, Vite, Tailwind CSS và React Router.

![Giao diện PhimHub trên desktop](./public/demo-home.png)

## Tính năng

- Trang chủ có hero banner, carousel phim vuốt ngang và trailer tự phát tắt tiếng khi Cinemeta có trailer.
- Tìm kiếm có debounce, gợi ý phim và điều hướng bằng bàn phím.
- Lọc danh mục theo thể loại, quốc gia và năm; bộ lọc được lưu trong URL.
- Trang chi tiết có mô tả, đạo diễn, diễn viên, danh sách tập, phim cùng thể loại và hỗ trợ tiếp tục xem.
- Danh sách yêu thích, lịch sử xem và tiến độ xem được lưu trên thiết bị bằng `localStorage`.
- Điểm IMDb được lấy từ Cinemeta; kết quả tìm theo tên chỉ được dùng khi tên và năm phát hành khớp.
- Hỗ trợ PhimAPI và NguonC, tự chuyển nguồn khi API gặp lỗi.
- Skeleton, trạng thái lỗi có thể thử lại, trạng thái rỗng và trang 404 có điều hướng.
- Route được lazy-load; ảnh poster tải lười; giao diện hỗ trợ mobile, vuốt carousel và thao tác player bằng bàn phím.
- TanStack Query cache kết quả API, hủy request khi không còn cần thiết và tự retry khi lỗi.
- PWA có thể cài đặt và lưu app shell cơ bản để mở trang khi offline; dữ liệu phim và video không được cache offline.
- Open Graph và Twitter Card dùng metadata mặc định trong HTML tĩnh để các bot mạng xã hội đọc được.

## Công nghệ

- React 19, TypeScript, Vite 6
- React Router 7, TanStack Query 5
- Tailwind CSS 4, Lucide, HLS.js
- Vitest, Testing Library

## Demo và Open Graph

Website đã triển khai tại: [https://phimhub-kappa.vercel.app](https://phimhub-kappa.vercel.app)
Ảnh demo: [`public/demo-home.png`](./public/demo-home.png).

Để ảnh Open Graph hoạt động với bot mạng xã hội trên website đã deploy, cấu hình URL gốc HTTPS của website trong biến môi trường build:

```env
VITE_SITE_URL=https://phimhub-kappa.vercel.app
```

Khi chưa cấu hình `VITE_SITE_URL`, thẻ OG vẫn được render trong HTML nhưng URL ảnh là đường dẫn tương đối. Thay thế tên miền mẫu bằng domain thực trước khi deploy.

## Chạy dự án

```bash
npm install
npm run dev
```

Mở URL được in trong terminal (thường là `http://localhost:5173`).

## Build và preview production

```bash
npm run build
npm run preview
```

Để kiểm tra PWA/service worker, cần chạy bản production qua HTTPS hoặc `localhost`.

## Lighthouse

Chạy Lighthouse trên bản production local:

```bash
npm run build
npm run preview
npx lighthouse http://localhost:4173/ --view
```

Lần đo local gần nhất (Lighthouse mobile simulation): Performance 78, Accessibility 100, Best Practices 96, SEO 100; LCP 4.9 giây, TBT 230 ms, CLS 0. Điểm Performance chưa đạt mục tiêu 90. LCP phụ thuộc API phim và ảnh hero từ máy chủ bên ngoài, nên có thể thay đổi theo mạng, thiết bị và dữ liệu nguồn; cần chạy lại sau khi deploy trên domain thực.

## Kiểm thử

```bash
npm test
```
