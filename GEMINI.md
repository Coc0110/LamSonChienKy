# QUY CHUẨN KỸ THUẬT & HIỆU NĂNG DỰ ÁN LAM SƠN

Tài liệu này ghi nhớ các bài học tối ưu hóa hiệu năng (60–144 FPS) và kiến trúc giao diện cho dự án. Mọi tác vụ phát triển trong tương lai phải tuân thủ nghiêm ngặt các quy tắc này.

---

## 1. QUY TẮC THIẾT KẾ GIAO DIỆN MẬT ĐỘ CAO (HIGH-DENSITY GRID & MATRIX)

Áp dụng cho mọi giao diện có số lượng phần tử lớn ($\ge 64$ ô, ví dụ: Sa Bàn 32×32 = 1.024 ô, Lưới Địa Hình, Bản Đồ, Kho Quân Trang):

### 1.1. Bắt sự kiện tập trung ở Container (Container Event Delegation)
- **CẤM:** Gắn `onMouseEnter`, `onMouseMove`, `onMouseDown`, `onDragOver`, `onDrop` lên từng ô con trong ma trận. Việc này tạo ra hàng nghìn synthetic event listeners trong React và ép trình duyệt phải dispatch event tree-walk liên tục khi di chuột.
- **BẮT BUỘC:** Lắng nghe sự kiện chuột/con trỏ (`onPointerMove`, `onPointerDown`, `onDragOver`, `onDrop`) tại thẻ bao bọc (Container) duy nhất.
- **Thuật toán tọa độ $O(1)$:** Tính tọa độ ô bằng phép tính hình học tức thời ($~0.0001\text{ ms}$):
  $$c = \left\lfloor \frac{x}{\text{cellSize} + \text{gap}} \right\rfloor, \quad r = \left\lfloor \frac{y}{\text{cellSize} + \text{gap}} \right\rfloor$$

### 1.2. Lớp hiển thị tĩnh triệt để (`pointer-events-none`)
- Toàn bộ các ô và phần tử con (`<img>`, `<span>`, `<div>`) bên trong ma trận phải được gán `pointer-events-none`.
- Trình duyệt sẽ coi toàn bộ lưới là một lớp đồ họa tĩnh duy nhất (Static Layer), loại bỏ 100% chi phí tính toán hit-testing DOM khi chuột lướt nhanh qua hàng trăm ô.

### 1.3. Cấm lồng CSS GPU Filter trên các phần tử lặp lại
- **CẤM:** Dùng `:hover:brightness-*`, `:hover:contrast-*`, `backdrop-blur-*` hoặc lồng CSS `filter: drop-shadow()` trên các ô lặp lại.
  - *Lý do:* Trên Windows Chromium / GPU rasterizer, CSS filter khi hover buộc trình duyệt phải cấp phát texture bộ nhớ mới, chạy shader rasterization rồi hủy texture mỗi mili-giây, gây sụt FPS và delay con trỏ chuột.
- **BẮT BUỘC:** 
  - Chỉ dùng màu nền phẳng (`bg-red-600/20`) và đường viền (`border`, `ring`) cho các ô.
  - Phản hồi vị trí chuột bằng một **Hộp Preview Nổi Duy Nhất (Single Floating Ghost Box)** nằm đè lên lưới với tọa độ tính theo `left` / `top`.
  - Hộp Preview Nổi không dùng `box-shadow` có Gaussian blur lớn (như `shadow-[0_0_12px]`); chỉ dùng viền vector sắc nét (`border-2`, `ring-1`).

### 1.4. Cấm dùng thuộc tính `title` HTML trên ma trận lớn
- **CẤM:** Gắn thuộc tính `title="..."` lên từng ô của lưới $\ge 64$ ô. Việc này gây ra tình trạng Windows OS Tooltip IPC Thrashing (Chromium liên tục gửi thông điệp kiểm tra vị trí tooltip tới desktop window manager).
- **BẮT BUỘC:** Hiển thị thông tin ô đang trỏ chuột qua một thanh trạng thái tức thì (**Inspector Bar**) với độ trễ 0ms, hoặc một Tooltip nổi duy nhất.

### 1.5. Tách biệt Memoization Component (Decoupled Memo)
- Component lưới ma trận (ví dụ: `TacticalGridBoard`) phải được bọc `React.memo` và **không được nhận bất kỳ prop hover hoặc callback di chuột nào**.
- Khi con trỏ chuột di chuyển trên sa bàn, ma trận 1.024 ô phải **KHÔNG BAO GIỜ RE-RENDER**. Chỉ duy nhất hộp preview nổi (`hoveredFootprint`) và thanh trạng thái (`hoveredCellInfo`) được cập nhật.

### 1.6. Phân lớp Memoization theo Hàng (Row-Level Memoization)
- Khi người chơi kéo đặt hoặc kéo hủy quân hàng loạt, ma trận 32×32 phải được cấu trúc thành các hàng `TacticalGridRow` bọc `React.memo` so sánh `prev.rowArr === next.rowArr`.
- **CẤM:** Clone toàn bộ 32 hàng mảng 2D (`target.grid.map(rArr => [...rArr])`) khi chỉ thay đổi 1 ô.
- **BẮT BUỘC:** Chỉ clone đúng hàng (hoặc các hàng span) bị ảnh hưởng; 31 hàng còn lại giữ nguyên tham chiếu đối tượng trong bộ nhớ. React sẽ bỏ qua 992 ô không đổi (giảm 97% chi phí DOM reconciliation).

### 1.7. Đọc Store Trực Tiếp trong Thao Tác Kéo Chuột (No Stale Closures)
- Trong các hàm kéo rê chuột (`executePlaceAt`, `executeRemoveAt`), đọc trạng thái trực tiếp bằng `useGameStore.getState()` thay vì phụ thuộc vào dependencies trong `useCallback`.
- Điều này loại bỏ hoàn toàn việc tạo lại reference hàm liên tục và tái gán event listener trên Container khi đang kéo chuột nhanh.

---

## 2. QUY CHUẨN TỐC ĐỘ THỜI GIAN & HÀNH QUÂN
- **Chế độ Bình Thường (Chiến Lược):** Đếm theo Ngày (`day/month/year`), dùng các mức tốc độ `0x, 1x, 2x, 5x, 10x`.
- **Chế độ Chiến Sự (Chiến Đấu/Hành Quân):** Thay thế nút 50x bằng icon Kiếm Thương (`war_mode_sword_spear.png`). Khi có đạo quân xuất trận hoặc người chơi bật Chế độ Chiến Sự:
  - Thời gian chuyển sang đếm từng **Canh Giờ** (1 ngày = 12 canh giờ).
  - Tốc độ di chuyển và tiêu hao lương thảo được đồng bộ theo từng canh.
  - Ban đêm (từ 23:00 đến 05:00 / 3 Canh nửa đêm: Tý, Sửu, Dần), nghĩa quân tạm hạ trại nghỉ ngơi (`⛺ Nghỉ đêm`) để giữ gìn sĩ khí và thể lực, bắt đầu hành quân lại vào 05:00 (Giờ Mão).

---

## 3. TIÊU CHUẨN KIỂM THỬ MÃ NGUỒN TRƯỚC KHI BÀN GIAO
Mọi thay đổi mã nguồn trước khi kết thúc tác vụ bắt buộc phải chạy và vượt qua:
1. `npm run lint` (`oxlint`): 0 warnings, 0 errors.
2. `npx tsc -b`: 0 errors.
3. `npm run build`: hoàn tất thành công trong < 2 giây.
