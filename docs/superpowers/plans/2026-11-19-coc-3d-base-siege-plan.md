# CoC-Style 3D Base, Scouting, Siege, Field Ambush & Base Defense Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển đổi trải nghiệm chơi *Lam Sơn* sang mô hình Zoom In/Out giữa bản đồ chiến lược 2D (`WorldMap.tsx`) và bản đồ khu vực 3D (Three.js Diorama 24×24), bổ sung xây dựng/nâng cấp căn cứ, do thám 3D, công thành CoC-style, phá vây ngoài đồng (Phương án B + C), và phòng thủ căn cứ (di dời khi thua hoặc Game Over).

**Architecture:** Tái sử dụng một engine Three.js Diorama 24×24 thống nhất (`Region3DCanvas` & các renderer mở rộng) dựa trên `BufferGeometryUtils.mergeGeometries` và quy chuẩn hiệu năng `GEMINI.md` (1 mặt phẳng raycast duy nhất $O(1)$, không gắn listener/blur lên từng ô). State khu vực được quản lý tập trung qua `regionSlice` trong `useGameStore`, liên kết trực tiếp với `armySlice` (tạo quân/cấp lính), `citySlice` (`relocateBase`), `militarySlice` (tài nguyên) và `uiStore` (`activeRegion3D`).

**Tech Stack:** React 19, TypeScript 6, Zustand 5, Three.js (`^0.187.0`), Leaflet, Tailwind CSS, oxlint.

**Spec:** [2026-11-19-coc-3d-base-siege-design.md](file:///d:/Lam%20S%C6%A1n/docs/superpowers/specs/2026-11-19-coc-3d-base-siege-design.md)

## Global Constraints
- Tuân thủ `GEMINI.md`: Không gắn event listener hay tooltip lên từng ô lưới; dùng 1 mặt phẳng raycast $O(1)$ + 1 khung preview nổi duy nhất; không dùng CSS filter/blur trên phần tử lặp lại.
- Giữ nguyên cơ chế tạo quân và cấp lính hiện có trong `armySlice.ts` và `TacticalFormationModal.tsx`.
- Mọi thay đổi trước khi bàn giao phải pass: `npm run lint` (0 warnings, 0 errors), `npx tsc -b` (0 errors), `npm run build` (< 2s).

---

## Phase 1: Data Model & Store (`RegionLayout` + `regionSlice`)

**Files:**
- Create: `src/types/region.ts`
- Modify: `src/types/index.ts` (re-export region types)
- Create: `src/data/regionBuildings.ts` (catalog 11 loại công trình: chi phí, kích thước `spanCols × spanRows`, HP, cấp tối đa, mô tả)
- Create: `src/utils/regionLayoutGenerator.ts` (sinh layout mặc định cho căn cứ Lam Sơn và sinh layout thành trì Minh theo cấp thành/quân số)
- Create: `src/store/slices/regionSlice.ts`
- Modify: `src/store/slices/types.ts`, `src/store/gameStore.ts`, `src/store/slices/saveSlice.ts`
- Modify: `src/store/uiStore.ts` (thêm `activeRegion3D`, `setActiveRegion3D`)

**Tasks:**
- [ ] **1.1:** Định nghĩa `BaseBuildingType`, `BaseBuilding`, `RegionLayout`, `SiegeState`, `AmbushBattleState`, `DefenseState` trong `src/types/region.ts`.
- [ ] **1.2:** Tạo catalog `BASE_BUILDING_CATALOG` trong `src/data/regionBuildings.ts` cho 11 loại công trình:
  - Kinh tế/Hậu cần: `main_hall` (3×3), `farm` (3×3), `forge` (2×2), `food_storage` (2×2), `armory` (2×2), `house` (2×2)
  - Quân sự: `barracks` (3×3 — mở giao diện tạo quân & cấp lính)
  - Phòng thủ: `wall` (1×1), `gate` (2×1), `watchtower` (2×2), `spike_trap` (1×1)
- [ ] **1.3:** Viết `generateLamSonStarterLayout()` và `generateEnemyCityLayout(city)` trong `src/utils/regionLayoutGenerator.ts` (đặt `main_hall` ở trung tâm, bao quanh bởi tường/cổng/chòi canh và các nhà kinh tế).
- [ ] **1.4:** Tạo `regionSlice.ts` với các action: `initRegions`, `placeBaseBuilding`, `upgradeBaseBuilding`, `moveBaseBuilding`, `demolishBaseBuilding`, `tickRegionConstruction`, `markRegionScouted`, `applySiegeDamageToRegion`. Tích hợp vào `gameStore.ts` và `saveSlice.ts`.
- [ ] **1.5:** Thêm `activeRegion3D: { cityId: string; mode: 'base_build' | 'scout_view' } | null` vào `uiStore.ts`.
- [ ] **1.6:** Chạy `npm run lint`, `npx tsc -b`, `npm run build` để verify Phase 1.

---

## Phase 2: `Region3DCanvas` (Three.js Diorama) & Zoom In/Out

**Files:**
- Create: `src/utils/region3DModels.ts` (cache `BufferGeometryUtils.mergeGeometries` cho 11 loại công trình theo cấp, cây cối, đá, nền đảo diorama)
- Create: `src/components/region/Region3DCanvas.tsx` (Three.js scene, `OrbitControls` góc chéo CoC + giới hạn nghiêng, raycast 1 mặt phẳng $O(1)$, 1 khung preview đặt nhà duy nhất)
- Create: `src/components/region/RegionBuildHUD.tsx` (thanh chọn công trình xây dựng, thông tin nhà đang chọn, nút nâng cấp / di chuyển / hủy, nút mở `barracks` -> `TacticalFormationModal` / `ArmyRosterModal`, nút "Thu nhỏ ra bản đồ")
- Create: `src/components/region/Region3DOverlay.tsx` (container gắn HUD + `Region3DCanvas` khi `activeRegion3D !== null`)
- Modify: `src/components/map/WorldMap.tsx` (zoom listener vượt ngưỡng vào tâm căn cứ/thành đã do thám -> mở `activeRegion3D`)
- Modify: `src/components/layout/panel/BaseDetailContent.tsx` & `DistrictDetailPanel.tsx` (thêm nút "Vào khu vực 3D")
- Modify: `src/App.tsx` (render `Region3DOverlay` khi `activeRegion3D !== null`)

**Tasks:**
- [ ] **2.1:** Xây `region3DModels.ts` dựng mesh low-poly sạch, màu ấm kiểu `mate`, tối ưu bằng geometry cache.
- [ ] **2.2:** Xây `Region3DCanvas.tsx` hỗ trợ: xem, click chọn công trình, kéo/đặt công trình mới với 1 ghost wireframe box, di chuyển công trình, zoom out quá ngưỡng gọi `onZoomOut()`.
- [ ] **2.3:** Xây `RegionBuildHUD.tsx` & `Region3DOverlay.tsx`, nối click vào `barracks` để mở modal tạo quân/đội hình hiện tại.
- [ ] **2.4:** Nối Zoom In từ `WorldMap.tsx` và nút "Vào khu vực 3D" từ panel.
- [ ] **2.5:** Chạy `npm run lint`, `npx tsc -b`, `npm run build` để verify Phase 2.

---

## Phase 3: Do thám 3D

**Files:**
- Modify: `src/store/slices/militarySlice.ts` (hoặc nơi hoàn tất nhiệm vụ do thám — gọi `markRegionScouted(cityId)` khi trinh sát xong)
- Modify: `src/components/map/WorldMap.tsx` & `src/components/layout/panel/DistrictDetailPanel.tsx` (cho phép zoom in / bấm "Xem do thám 3D" với thành đã do thám)
- Modify: `src/components/region/RegionBuildHUD.tsx` (hiển thị badge "Đang do thám — Chỉ xem" và tổng quan phòng thủ địch khi `mode === 'scout_view'`)

**Tasks:**
- [ ] **3.1:** Khi nhiệm vụ trinh sát hoàn thành, tự động sinh/cập nhật `RegionLayout` của thành địch và lưu vào `scoutedRegions`.
- [ ] **3.2:** Cho phép zoom in hoặc bấm nút từ `DistrictDetailPanel` để mở `Region3DCanvas` ở `scout_view`.
- [ ] **3.3:** Chạy `npm run lint`, `npx tsc -b`, `npm run build` để verify Phase 3.

---

## Phase 4: Công thành 3D (CoC-style) & Phục kích ngoài đồng (Phương án B + C)

**Files:**
- Create: `src/utils/siegeCombatEngine.ts` (engine mô phỏng công thành trên lưới 24×24: thả quân rìa thành, AI tìm mục tiêu ưu tiên, chòi canh bắn trả, bẫy chông, tính % phá hủy & chiến lợi phẩm)
- Create: `src/components/region/Siege3DModal.tsx` (UI thả từng cánh quân từ `ArmyFormation`, thanh % phá hủy, kết quả chiếm/cướp thành)
- Create: `src/utils/ambushCombatEngine.ts` (engine phá vây 3D trên lưới 24×24: đường mòn rừng/đèo, quân Minh mai phục 2 bên sườn, điều khiển cánh quân di chuyển/đánh phá vây tới cửa thoát)
- Create: `src/components/region/Ambush3DModal.tsx` (UI chọn cánh quân & click chỉ điểm di chuyển/tấn công trên `Region3DCanvas`)
- Modify: `src/store/slices/armySlice.ts` & `src/utils/worldMapCombatEngine.ts` (phân loại chạm trán trên đường hành quân: toán nhỏ -> giải quyết nhanh [Phương án C], đại quân/phục kích lớn -> mở `Ambush3DModal` [Phương án B]; đến thành đích -> mở `Siege3DModal`)

**Tasks:**
- [ ] **4.1:** Xây `siegeCombatEngine.ts` & `Siege3DModal.tsx` dùng `Region3DCanvas` ở chế độ công thành (thả quân ở rìa, AI tự đánh, cướp tài nguyên, hạ `main_hall` -> chiếm thành).
- [ ] **4.2:** Xây `ambushCombatEngine.ts` & `Ambush3DModal.tsx` dùng `Region3DCanvas` ở chế độ phá vây ngoài đồng (click chọn đơn vị + click ô đích).
- [ ] **4.3:** Nối luồng hành quân trên `WorldMap`: chạm trán nhỏ giải quyết nhanh (hoặc tùy chọn đánh tay), phục kích lớn mở `Ambush3DModal`, tới thành địch mở `Siege3DModal`.
- [ ] **4.4:** Chạy `npm run lint`, `npx tsc -b`, `npm run build` để verify Phase 4.

---

## Phase 5: Phòng thủ Căn cứ (`Defense3D`) & Di dời / Game Over

**Files:**
- Create: `src/utils/defenseCombatEngine.ts` (quân Minh tấn công vào `RegionLayout` căn cứ người chơi; chòi canh/tường/bẫy & quân đồn trú chống trả; người chơi có thể thả quân dự bị)
- Create: `src/components/region/Defense3DModal.tsx`
- Modify: `src/store/slices/citySlice.ts` & `src/store/slices/saveSlice.ts` (xử lý khi `main_hall` bị phá: phá hủy căn cứ, nếu còn căn cứ hoặc đủ điều kiện -> bật `baseRelocateMode` bắt buộc di dời; nếu là căn cứ duy nhất -> Game Over `EndgameModal`)

**Tasks:**
- [ ] **5.1:** Xây `defenseCombatEngine.ts` & `Defense3DModal.tsx` tái sử dụng `Region3DCanvas`.
- [ ] **5.2:** Nối sự kiện quân Minh đánh căn cứ vào `Defense3DModal`.
- [ ] **5.3:** Xử lý hậu quả thua trận: mất căn cứ -> kích hoạt `baseRelocateMode` (ép chọn nơi mới) hoặc `GameOver`.
- [ ] **5.4:** Chạy full kiểm thử `npm run lint`, `npx tsc -b`, `npm run build`.
