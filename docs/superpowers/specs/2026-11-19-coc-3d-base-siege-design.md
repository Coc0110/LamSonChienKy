# Thiết kế: Chuyển đổi Cơ chế Bản đồ 3D kiểu Clash of Clans & 3 Chế độ Chiến đấu

**Ngày:** 2026-11-19  
**Trạng thái:** Đã thống nhất hướng triển khai  
**Mục tiêu:** Nâng cấp trải nghiệm chơi của *Lam Sơn* theo hướng *Clash of Clans* kết hợp *Ta làm tông sư trong tiên môn*: zoom vào khu vực để xây dựng/do thám bản đồ 3D, giữ nguyên hệ thống tạo quân & cấp lính, tách rõ 3 cơ chế chiến đấu (Phục kích ngoài đồng, Công thành 3D, Phòng thủ căn cứ), và xử lý hậu quả mất căn cứ (Di dời hoặc Game Over).

---

## 1. Tổng quan Kiến trúc & Chuyển cảnh (Zoom In / Zoom Out)

### 1.1. Hai tầng bản đồ
- **Tầng Chiến lược (`WorldMap.tsx` - Leaflet 2D):** Hiển thị toàn cảnh các huyện, căn cứ Lam Sơn, thành trì nhà Minh, các đạo quân đang hành quân và điểm giao tranh.
- **Tầng Khu vực 3D (`Region3DCanvas.tsx` - Three.js Diorama):** Hiển thị chi tiết một căn cứ hoặc huyện thành trên lưới **24×24 ô** dưới dạng mô hình 3D low-poly ánh sáng ấm (tham khảo phong cách diorama của `mate/internal/dashboard/ui/city/city.js` và kỹ thuật `BufferGeometryUtils.mergeGeometries` của `Battlefield3DCanvas.tsx`).

### 1.2. Cơ chế Zoom In / Zoom Out
- **Vào khu vực 3D (Zoom In):**
  - Khi người chơi zoom Leaflet trên bản đồ vượt ngưỡng (ví dụ `zoom >= 3.5`) vào vùng tâm của một **căn cứ Lam Sơn** hoặc một **huyện thành đã do thám**, hoặc bấm nút **"Vào khu vực 3D"** trên panel chi tiết:
  - `uiStore` cập nhật `activeRegion3D: { cityId, mode: 'base_build' | 'scout_view' }`.
  - Mount `Region3DCanvas` phủ toàn màn hình và tạm ẩn/ngưng tương tác `WorldMap` để đảm bảo 60–144 FPS.
- **Quay lại bản đồ lớn (Zoom Out):**
  - Khi người chơi cuộn chuột zoom out vượt ngưỡng tối đa của `OrbitControls` trong `Region3DCanvas`, hoặc bấm nút **"Thu nhỏ ra bản đồ"**:
  - Reset `activeRegion3D = null` để quay lại `WorldMap.tsx` mượt mà.

### 1.3. Quy chuẩn Hiệu năng 3D & Lưới (Tuân thủ `GEMINI.md`)
- Không gắn event listener hay tooltip lên từng ô riêng lẻ của lưới 24×24.
- Dùng **1 mặt phẳng raycast duy nhất** cho toàn bộ sàn lưới 3D và tính tọa độ ô tức thời $O(1)$:
  `col = Math.floor((hitX + halfWidth) / cellSize)`, `row = Math.floor((hitZ + halfDepth) / cellSize)`.
- Phản hồi đặt/chọn công trình bằng **1 khung preview nổi duy nhất** (vector wireframe/box màu phẳng, không dùng blur shadow nặng).
- Toàn bộ geometry của công trình và lính được cache 1 lần qua `BufferGeometryUtils.mergeGeometries`.

---

## 2. Hệ thống Dữ liệu Khu vực 3D (`RegionLayout`)

Mỗi căn cứ hoặc huyện thành (`CityNode`) sở hữu một `RegionLayout` trên lưới 24×24:

```ts
export type BaseBuildingType =
  | 'main_hall'     // Căn cứ chính (nâng cấp mở khóa cấp nhà & giới hạn công trình)
  | 'farm'          // Ruộng (sản xuất lương thảo)
  | 'forge'         // Lò rèn (chế tạo vũ khí)
  | 'food_storage'  // Kho lương (tăng trần chứa lương)
  | 'armory'        // Kho vũ khí (tăng trần chứa vũ khí)
  | 'house'         // Nhà dân (tăng nhân lực/dân số)
  | 'barracks'      // Trại luyện binh (liên kết tạo quân & cấp lính trong armySlice)
  | 'wall'          // Tường rào / Lũy tre (chặn đường quân địch)
  | 'gate'          // Cổng thành (cho quân nhà đi qua, chặn địch)
  | 'watchtower'    // Chòi canh cung (bắn tầm xa khi thủ thành)
  | 'spike_trap';   // Bẫy chông (gây sát thương khi địch giẫm phải)

export interface BaseBuilding {
  id: string;
  type: BaseBuildingType;
  level: number;
  col: number;
  row: number;
  spanCols: number;
  spanRows: number;
  hp: number;
  maxHp: number;
  status: 'building' | 'active' | 'upgrading' | 'destroyed';
  buildDaysRemaining?: number;
}

export interface RegionLayout {
  cityId: string;
  gridSize: number; // Mặc định 24
  terrainSeed: number;
  buildings: BaseBuilding[];
  lastScoutedDay?: number;
}
```

- **Tạo quân & Cấp lính:** Giữ nguyên cơ chế trong `armySlice.ts` và `TacticalFormationModal.tsx`. Công trình `barracks` (Trại luyện binh) trong 3D khi bấm vào sẽ mở giao diện huấn luyện/quản lý quân đội, cấp của `barracks` quyết định tốc độ luyện quân hoặc cấp lính tối đa mở khóa.
- **Đồng bộ tài nguyên:** Tổng sức chứa lương/vũ khí phụ thuộc vào số lượng & cấp của `food_storage` và `armory`; sản lượng ngày phụ thuộc vào `farm`, `forge`, `house`.

---

## 3. Cơ chế Do thám 3D

- Khi trinh sát hoàn thành nhiệm vụ do thám một huyện thành địch:
  - Hệ thống sinh (hoặc cập nhật) `RegionLayout` 3D cho huyện thành đó dựa trên cấp thành, số quân đồn trú và địa hình.
  - Đánh dấu thành đó đã được do thám (`scoutedRegions[cityId]`).
- Người chơi có thể **zoom in vào thành địch** (hoặc bấm "Xem do thám 3D") để mở `Region3DCanvas` ở chế độ `scout_view` (chỉ xem, không xây dựng), quan sát trước vị trí chòi canh, cổng thành, kho lương để lên kế hoạch tấn công.

---

## 4. Ba Cơ chế Chiến đấu Tách biệt

### 4.1. Hành quân & Phục kích / Chặn đầu ngoài đồng (Phương án B + C)
- Người chơi chọn toán quân (`ArmyFormation`) và chỉ định tấn công 1 thành trì địch trên `WorldMap.tsx`.
- Trong lúc hành quân qua các huyện, nếu chạm trán quân Minh tuần tra / phục kích / chặn đầu:
  - **Toán tuần tra nhỏ (Phương án C):** Cho phép **Giải quyết nhanh** ngay trên bản đồ (hoặc tùy chọn tự chỉ huy 3D) để không làm đứt nhịp công thành.
  - **Đại quân chặn đầu / Ổ phục kích lớn (Phương án B):** Mở trận **Phá vây 3D (RTS mini)** trên cùng engine **Three.js Diorama 24×24** (`Region3DCanvas`), địa hình đường mòn xuyên rừng/đèo hẹp, quân Minh phục kích từ hai bên sườn. Người chơi click chọn cánh quân & chỉ điểm di chuyển/tấn công để phá vây tới cửa thoát hoặc tiêu diệt hết quân chặn đầu.
  - Nếu thắng/thoát vây: toán quân (với số quân còn lại) tiếp tục hành quân tới thành trì mục tiêu.
  - Nếu thua/rút lui: toán quân quay về căn cứ hoặc bị tiêu diệt.

### 4.2. Công thành 3D (CoC-style Siege)
- Khi toán quân hành quân tới được thành trì mục tiêu → mở **`Siege3DModal` / `Siege3DCanvas`**:
  - Tải đúng `RegionLayout` 3D của thành địch.
  - **Thả quân:** Người chơi chọn từng cánh quân/loại lính trong toán quân mang theo và click thả vào **vùng rìa ngoài vòng thành** (deploy zone).
  - **AI tự đánh:** Quân sau khi thả sẽ tự di chuyển, tự chọn mục tiêu theo ưu tiên (ví dụ: kỵ/bộ binh ưu tiên phá chòi canh/cổng, cung thủ bắn từ xa qua tường).
  - **Thắng / Thua & Chiến lợi phẩm:**
    - Tính **% Phá hủy** và trạng thái `main_hall` của thành địch.
    - Phá hủy các kho (`food_storage`, `armory`) cướp trực tiếp lương thảo, vũ khí, vàng.
    - Đánh sập `main_hall` hoặc đạt mốc phá hủy quy định → chiếm/triệt hạ thành trì.

### 4.3. Phòng thủ Căn cứ (Base Defense) & Di dời / Game Over
- Khi quân Minh tiến đánh vào căn cứ của người chơi → mở **`Defense3DModal` / `Defense3DCanvas`**:
  - Tải chính `RegionLayout` 3D mà người chơi đã xây dựng.
  - Quân Minh tràn vào từ các hướng rìa bản đồ; các công trình phòng thủ (`watchtower`, `wall`, `spike_trap`) và lực lượng đồn trú tại căn cứ tự động chiến đấu chống trả. Người chơi có thể thả thêm quân dự bị từ `barracks` vào các điểm đang bị xuyên thủng.
- **Kết quả khi thất bại (Căn cứ chính `main_hall` bị đánh nát):**
  - Căn cứ hiện tại bị phá hủy hoàn toàn (mất các công trình kinh tế và phần lớn tài nguyên tích trữ tại đó).
  - **Cơ chế Di dời bắt buộc:** Nếu người chơi vẫn còn căn cứ khác hoặc đủ điều kiện lập căn cứ mới, game tự động chuyển sang chế độ `baseRelocateMode` trên `WorldMap.tsx` (tận dụng action `relocateBase` trong `citySlice.ts`) bắt buộc chọn vùng đất mới để dựng lại cờ khởi nghĩa.
  - **Game Over:** Nếu đây là **căn cứ duy nhất** và không còn lực lượng/điều kiện tái lập → kích hoạt màn hình **Game Over** (`EndgameModal.tsx`).

---

## 5. Lộ trình Triển khai (Phases)

1. **Phase 1 – Data & Store:** Thêm types `RegionLayout`, `BaseBuilding`, tạo `regionSlice.ts` (lưu trữ layout căn cứ Lam Sơn mặc định + hàm sinh layout thành địch), tích hợp save/load.
2. **Phase 2 – `Region3DCanvas` & Xây dựng Căn cứ:** Dựng engine Three.js Diorama 24×24, model 3D cho 11 loại công trình (theo level), panel xây/nâng cấp/di chuyển công trình, và cơ chế Zoom In/Out từ `WorldMap.tsx`.
3. **Phase 3 – Do thám 3D:** Nối luồng trinh sát với `RegionLayout` thành địch để zoom in xem trước bố phòng 3D.
4. **Phase 4 – Công thành 3D (`Siege3D`):** Xây dựng engine mô phỏng thả quân CoC-style trên `RegionLayout`, thanh % phá hủy, cướp tài nguyên, và nối với luồng Hành quân → Phục kích (`BattlefieldModal`) → Công thành (`Siege3DModal`).
5. **Phase 5 – Phòng thủ Căn cứ (`Defense3D`) & Di dời / Game Over:** Xây dựng luồng quân Minh đánh căn cứ, AI tấn công layout người chơi, xử lý phá hủy căn cứ → ép di dời hoặc Game Over.
