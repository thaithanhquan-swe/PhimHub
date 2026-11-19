import {
  Bookmark,
  Calendar,
  Clapperboard,
  Film,
  HardDrive,
  Home,
  Star,
  Tv,
} from "lucide-react";

export const PRIMARY_NAV_ITEMS = [
  { id: "home", label: "Trang chủ", to: "/" },
  { id: "tv", label: "Phim bộ", to: "/?type=tv" },
  { id: "movie", label: "Phim lẻ", to: "/?type=movie" },
  { id: "top-imdb", label: "Top IMDb", to: "/?imdb=7.0" },
  { id: "hoat-hinh", label: "Hoạt hình", to: "/?type=hoat-hinh" },
  { id: "schedule", label: "Lịch chiếu", to: "/schedule" },
  { id: "downloads", label: "Phim đã tải", to: "/downloads" },
];

export const MOBILE_DRAWER_NAV_ITEMS = [
  { id: "home", label: "Trang chủ", to: "/", icon: Home },
  { id: "downloads", label: "Phim đã tải (Offline)", to: "/downloads", icon: HardDrive },
  { id: "top-imdb", label: "Top IMDb Điểm Cao", to: "/?imdb=7.0", icon: Star },
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
