import {
  Bookmark,
  Calendar,
  Clapperboard,
  Film,
  Home,
  Tv,
} from "lucide-react";

export const PRIMARY_NAV_ITEMS = [
  { id: "home", label: "Trang chủ", to: "/" },
  { id: "tv", label: "Phim bộ", to: "/?type=tv" },
  { id: "movie", label: "Phim lẻ", to: "/?type=movie" },
  { id: "hoat-hinh", label: "Hoạt hình", to: "/?type=hoat-hinh" },
  { id: "schedule", label: "Lịch chiếu", to: "/schedule" },
];

export const MOBILE_DRAWER_NAV_ITEMS = [
  { id: "home", label: "Trang chủ", to: "/", icon: Home },
  { id: "tv", label: "Phim bộ", to: "/?type=tv", icon: Tv },
  { id: "movie", label: "Phim lẻ", to: "/?type=movie", icon: Film },
  { id: "hoat-hinh", label: "Hoạt hình & Anime", to: "/?type=hoat-hinh", icon: Clapperboard },
  { id: "schedule", label: "Lịch chiếu phim", to: "/schedule", icon: Calendar },
  { id: "saved", label: "Phim đã lưu", to: "/?list=saved", icon: Bookmark },
];

export const MOBILE_BOTTOM_NAV_ITEMS = [
  { id: "home", label: "Trang chủ", to: "/", icon: Home },
  { id: "tv", label: "Phim bộ", to: "/?type=tv", icon: Tv },
  { id: "movie", label: "Phim lẻ", to: "/?type=movie", icon: Film },
  { id: "schedule", label: "Lịch chiếu", to: "/schedule", icon: Calendar },
  { id: "saved", label: "Đã lưu", to: "/?list=saved", icon: Bookmark },
];
