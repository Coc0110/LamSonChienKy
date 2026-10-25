# Khởi Nghĩa Lam Sơn (1418 – 1427)

Dự án game chiến thuật lịch sử mô phỏng cuộc Khởi nghĩa Lam Sơn hào hùng do Bình Định Vương Lê Lợi lãnh đạo, kết hợp giữa phong cách sa bàn chiến thuật cổ điển và công nghệ web hiện đại.

## Công nghệ sử dụng

- **Frontend**: React 19, TypeScript
- **Bundler & Tooling**: Vite 8, Oxlint
- **Bản đồ**: Leaflet, CRS.Simple tile pyramid đa tầng, SVG overlays
- **Quản lý trạng thái**: Zustand
- **Giao diện**: Tailwind CSS v4, Lucide Icons
- **Đồ họa**: Phong cách sa bàn giấy da cừu (parchment), thẻ bài đồng phong hóa, thư pháp và Hán tự Việt hóa.

## Cấu trúc thư mục chính

```text
├── public/                 # Tài nguyên tĩnh (tiles bản đồ, font chữ, huy hiệu, chân dung tướng)
├── src/
│   ├── components/
│   │   ├── generals/       # Thẻ bài đồng danh tướng, modal danh sách tướng
│   │   ├── layout/         # TopBar tài nguyên, LeftPanel chiến thư và quân thư
│   │   ├── map/            # WorldMap sa bàn chiến lược và công cụ nắn ranh giới
│   │   └── modals/         # Các bảng thông tin chi tiết quân lực, quân nhu
│   ├── data/               # Dữ liệu cứ điểm, ranh giới huyện thành, danh tướng
│   ├── store/              # Zustand stores (gameStore, uiStore)
│   ├── types/              # Type definitions (Tướng, Cứ điểm, Tài nguyên, Địa hình)
│   └── utils/              # Các hàm tiện ích (tính toán tọa độ bản đồ...)
└── tools/                  # Script tiền xử lý và cắt tile bản đồ
```

## Hướng dẫn cài đặt & Chạy dự án

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Chạy môi trường phát triển (Dev)
```bash
npm run dev
# hoặc chạy file dev.bat trên Windows
```

### 3. Kiểm tra chất lượng mã (Lint)
```bash
npm run lint
```

### 4. Build sản phẩm (Production)
```bash
npm run build
# hoặc chạy file build.bat trên Windows
```
