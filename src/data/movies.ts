export type Movie = {
  id: string;
  title: string;
  year: number;
  rating: string;
  genre: string;
  kind: "Phim lẻ" | "Series" | "Tài liệu";
  badge?: string;
  image: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  description: string;
  runtime: string;
};

export const movies: Movie[] = [
  {
    id: "beyond-horizon",
    title: "Beyond the Horizon",
    year: 2025,
    rating: "8.9",
    genre: "Phiêu lưu",
    kind: "Phim lẻ",
    badge: "NỔI BẬT",
    image: "photo-1462331940025-496dfbfc7564",
    description:
      "Khi ranh giới giữa thực tại và những vì sao dần tan biến, một phi hành gia phải lựa chọn giữa hành trình trở về và bí mật có thể thay đổi cả nhân loại.",
    runtime: "2 giờ 18 phút",
  },
  {
    id: "the-last-light",
    title: "The Last Light",
    year: 2025,
    rating: "9.1",
    genre: "Tâm lý",
    kind: "Series",
    badge: "MỚI",
    image: "photo-1470252649378-9c29740c9fa8",
    description:
      "Sau nhiều năm xa cách, một gia đình trở về thị trấn ven biển nơi những ký ức cũ và bí mật chưa từng được kể đang chờ họ.",
    runtime: "8 tập",
  },
  {
    id: "wild-unknown",
    title: "Into the Wild Unknown",
    year: 2024,
    rating: "8.7",
    genre: "Phiêu lưu",
    kind: "Phim lẻ",
    badge: "TOP 10",
    image: "photo-1472396961693-142e6e269027",
    description:
      "Một nhà sinh vật học trẻ dấn thân vào vùng đất chưa được khám phá để tìm lời giải cho sự biến mất bí ẩn của những loài động vật hoang dã.",
    runtime: "1 giờ 54 phút",
  },
  {
    id: "city-of-dreams",
    title: "City of Dreams",
    year: 2025,
    rating: "8.5",
    genre: "Tâm lý",
    kind: "Series",
    badge: "MỚI",
    image: "photo-1519608487953-e999c86e7455",
    description:
      "Giữa thành phố không bao giờ ngủ, ba con người xa lạ cùng theo đuổi một giấc mơ và tìm thấy những điều họ không ngờ tới.",
    runtime: "10 tập",
  },
  {
    id: "blue-depth",
    title: "The Blue Depth",
    year: 2024,
    rating: "8.8",
    genre: "Tài liệu",
    kind: "Tài liệu",
    badge: "ĐÁNH GIÁ CAO",
    image: "photo-1518837695005-2083093ee35b",
    description:
      "Bộ phim tài liệu đưa bạn xuống những vùng biển sâu nhất, nơi các nhà khoa học khám phá một thế giới kỳ diệu vẫn còn nhiều bí ẩn.",
    runtime: "1 giờ 42 phút",
  },
  {
    id: "parallel",
    title: "Parallel",
    year: 2025,
    rating: "8.6",
    genre: "Hành động",
    kind: "Phim lẻ",
    badge: "MỚI",
    image: "photo-1518709268805-4e9042af9f23",
    description:
      "Một quyết định nhỏ tạo ra hai dòng thời gian song song. Đặc vụ Linh phải chạy đua với chính mình để cứu lấy cả hai thế giới.",
    runtime: "2 giờ 06 phút",
  },
  {
    id: "golden-hour",
    title: "The Golden Hour",
    year: 2024,
    rating: "8.4",
    genre: "Tâm lý",
    kind: "Phim lẻ",
    badge: "ĐÁNG XEM",
    image: "photo-1470770841072-f978cf4d019e",
    description:
      "Một nhiếp ảnh gia trở về quê nhà và tìm thấy vẻ đẹp trong những khoảnh khắc bình dị tưởng chừng đã bỏ lỡ.",
    runtime: "1 giờ 49 phút",
  },
  {
    id: "edge-of-earth",
    title: "Edge of the Earth",
    year: 2025,
    rating: "9.0",
    genre: "Phiêu lưu",
    kind: "Series",
    badge: "TOP 10",
    image: "photo-1464822759023-fed622ff2c3b",
    description:
      "Bốn nhà thám hiểm đặt chân đến những nơi xa xôi nhất trên Trái Đất, khám phá thiên nhiên hùng vĩ và sức mạnh của con người.",
    runtime: "6 tập",
  },
  {
    id: "after-the-rain",
    title: "After the Rain",
    year: 2024,
    rating: "8.2",
    genre: "Tâm lý",
    kind: "Phim lẻ",
    image: "photo-1433086966358-54859d0ed716",
    description:
      "Một cuộc gặp gỡ tình cờ sau cơn mưa khiến hai người xa lạ nhìn lại những lựa chọn đã đưa họ đến hiện tại.",
    runtime: "1 giờ 38 phút",
  },
  {
    id: "wild-world",
    title: "A Wilder World",
    year: 2025,
    rating: "8.9",
    genre: "Tài liệu",
    kind: "Tài liệu",
    badge: "MỚI",
    image: "photo-1500530855697-b586d89ba3ee",
    description:
      "Một góc nhìn đầy cảm hứng về sự sống nơi hoang dã và những nỗ lực nhỏ bé đang tạo nên khác biệt lớn.",
    runtime: "5 tập",
  },
  {
    id: "red-line",
    title: "The Red Line",
    year: 2025,
    rating: "8.3",
    genre: "Hành động",
    kind: "Phim lẻ",
    image: "photo-1519608487953-e999c86e7455",
    description:
      "Một chuyến tàu đêm, một nhân chứng quan trọng và cuộc truy đuổi nghẹt thở xuyên qua thành phố.",
    runtime: "1 giờ 56 phút",
  },
  {
    id: "mountain-between-us",
    title: "The Mountain Between Us",
    year: 2024,
    rating: "8.1",
    genre: "Phiêu lưu",
    kind: "Phim lẻ",
    image: "photo-1464278533981-50106e6176b1",
    description:
      "Sau một tai nạn trên núi, hai người xa lạ phải tin tưởng lẫn nhau để tìm đường trở về qua mùa đông khắc nghiệt.",
    runtime: "1 giờ 47 phút",
  },
  {
    id: "weekend-plans",
    title: "Weekend Plans",
    year: 2025,
    rating: "7.9",
    genre: "Hài",
    kind: "Phim lẻ",
    badge: "MỚI",
    image: "photo-1514525253161-7a46d19cd819",
    description:
      "Một chuyến đi cuối tuần tưởng như bình thường bỗng biến thành chuỗi tình huống dở khóc dở cười.",
    runtime: "1 giờ 42 phút",
  },
];

export const genres = ["Tất cả", "Phiêu lưu", "Tâm lý", "Hành động", "Tài liệu"];

export function getMovieImage(image: string, width = 360) {
  return `https://images.unsplash.com/${image}?auto=format&fit=crop&w=${width}&q=68`;
}

export function getPosterUrl(movie: Movie, size = "w342") {
  if (movie.posterPath) {
    return `https://image.tmdb.org/t/p/${size}${movie.posterPath}`;
  }
  return getMovieImage(movie.image, size === "w780" ? 1280 : 360);
}

export function getBackdropUrl(movie: Movie, size = "w1280") {
  if (movie.backdropPath) {
    return `https://image.tmdb.org/t/p/${size}${movie.backdropPath}`;
  }
  return getMovieImage(movie.image, size === "w780" ? 1000 : 1440);
}
