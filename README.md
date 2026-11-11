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

## Backend cá nhân hóa và quản trị

Các model và Express router ở `models/`, `middleware/` và `routes/` cung cấp lịch sử xem, lịch sử tìm kiếm và API quản trị. Cần cấu hình `MONGODB_URI`, `JWT_SECRET` và `IP_HASH_SECRET` trong môi trường Node.js. `IP_HASH_SECRET` phải là chuỗi ngẫu nhiên tối thiểu 32 ký tự, chỉ được giữ ở backend và dùng để tạo HMAC-SHA-256 từ địa chỉ IP; địa chỉ IP gốc không được ghi vào MongoDB. Mã HMAC là định danh giả danh ổn định, không phải dữ liệu ẩn danh hoàn toàn. JWT phải được ký bằng HS256 và chứa claim `sub` bằng MongoDB ObjectId của tài khoản; quyền Admin được đọc từ tài khoản hiện tại trong MongoDB chứ không được tin cậy từ claim của token.

Trang Admin Dashboard nằm tại `/admin`. Trang có danh sách tài khoản đã đăng ký và tab khách truy cập được nhận diện bằng mã HMAC; mã này không tiết lộ IP gốc và không suy ra tên thật. Trang hỗ trợ xem lịch sử xem/tìm kiếm cho từng tài khoản hoặc khách. Các API admin yêu cầu token của tài khoản có role `admin`. Telemetry từ frontend không yêu cầu khách đăng nhập; nếu Express đứng sau proxy, chỉ cấu hình `trust proxy` cho các proxy tin cậy để `request.ip` không bị giả mạo.

Mount các router trong Express sau khi kết nối MongoDB và bật middleware JSON:

```js
import express from "express";

import adminRouter from "./routes/admin.js";
import telemetryRouter from "./routes/telemetry.js";

const app = express();
app.use(express.json({ limit: "16kb" }));
app.use("/api/telemetry", telemetryRouter);
app.use("/api/admin", adminRouter);
```

Tạo tài khoản quản trị bằng một quy trình provisioning được bảo vệ và đặt `role` thành `admin`; không cho phép client tự chọn quyền trong quá trình đăng ký. Tài khoản nên được tạo qua `User.create(...)` để mật khẩu được băm bằng scrypt trước khi lưu. `GET /api/admin/users/:userId/details` yêu cầu Bearer token của tài khoản quản trị và không trả về trường mật khẩu.

Frontend gửi telemetry khách mà không cần đăng nhập. Backend dùng HMAC IP ổn định để nhóm các lượt xem/tìm kiếm từ cùng một địa chỉ mạng; nhiều người dùng chung mạng có thể bị gộp, còn IP động/VPN có thể tạo mã khác. Cách này không xác định tên người dùng thật. Đặt `VITE_BACKEND_API_BASE` thành origin backend (ví dụ `http://localhost:3000`); để trống nếu frontend và backend dùng chung origin. Tiến trình xem được gửi tối đa mỗi 15 giây trong lúc phát video.

Nếu database đã tạo unique index cũ cho lịch sử xem theo `userId` và `movieId`, phải thay index đó bằng index partial mới một lần trước khi triển khai telemetry khách:

```javascript
db.watchhistories.dropIndex("userId_1_movieId_1")
```
