# Hệ Thống Bàn Cờ Chiến Trận Địa Hình Ngang & Trọng Lượng Quân Cờ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Xây dựng hệ thống Bàn Cờ Chiến Trận Ngang 96×32 ô tích hợp cơ chế trích xuất địa hình thực tế từ bản đồ thế giới, bảo tồn 100% Sa Bàn 32×32 của người chơi và giải quyết tương quan lực lượng bất đối xứng ($1\times, 10\times, 100\times$) qua cơ chế Trọng Lượng Quân Cờ và Sĩ Khí.

**Architecture:** Bàn cờ chiến trận ngang (96 cột × 32 hàng = 3.072 ô) chia làm 3 phân khu ngang: Cột 0–31 (Quân Ta, ánh xạ $1:1$ từ Sa Bàn người chơi), Cột 32–63 (Chiến trường Trung gian với nút thắt địa hình đầm lầy, hẻm núi), Cột 64–95 (Quân Địch). Địa hình được trích xuất từ Bản Đồ Lớn quanh điểm đụng độ theo 3 tỷ lệ quét ($12\times 4$, $24\times 8$, $48\times 16$). Động cơ giao tranh tính toán sát thương 2 chiều dựa trên quân số thực (`soldiersCount`) và bề dày HP, kết thúc bằng Sớ Chiến Báo Cổ.

**Tech Stack:** React 19, TypeScript, Zustand, Tailwind CSS, Lucide icons (chỉ dùng cho UI điều khiển khung ngoài, không dùng trong sớ cổ), Vite.

**Spec:** `C:\Users\WIN\.gemini\antigravity\brain\3e373173-0c18-43cc-8f7c-28767f7defc4\tactical_battle_board_design.md`

## Global Constraints

- Tuân thủ quy chuẩn `GEMINI.md`: 0 lint errors/warnings (`npm run lint`), 0 TypeScript errors (`npx tsc -b`), build < 2s (`npm run build`).
- Ma trận mật độ cao 3.072 ô phải tuân thủ Container Event Delegation: cấm gắn event listener trên 3.072 ô con; gắn `pointer-events-none` trên toàn bộ ô tĩnh.
- Cấm lồng CSS GPU filter (`:hover:brightness`, `backdrop-blur`, `drop-shadow`) trên các ô con lặp lại; chỉ dùng màu nền phẳng và viền vector.
- Không dùng thuộc tính `title` HTML trên 3.072 ô; hiển thị thông tin ô qua Inspector Bar nổi.
- Giữ vững phong cách mỹ thuật giấy sớ cổ truyền, phông chữ Serif, văn phong công văn thời xưa cho toàn bộ báo cáo chiến sự.

## Review Focus

1. Người chơi có đội hình xếp xen kẽ (1 đao, 1 cung, 1 tướng) tại Sa Bàn $32\times 32$ phải được ánh xạ chính xác $100\%$ vào Cột 0–31 mà không bị xáo trộn vị trí.
2. Khi 10 lính Lam Sơn chiếm cứ điểm hẻm núi/bờ đầm lầy đối đầu 100 lính Minh, cơ chế địa hình và tầm bắn cung nỏ phải cho phép tiêu hao sinh lực địch trước khi giặc áp sát.
3. Khi chiến trường 3.072 ô hiển thị, FPS phải duy trì mượt mà không giật lag trên trình duyệt.
4. Tướng lĩnh chỉ huy phải tỏa Vòng Hào Quang (Command Aura) hỗ trợ sĩ khí và sức đánh cho các tiểu đội trong bán kính lân cận.
5. Sau khi kết thúc trận, thương vong thực tế phải được trừ chính xác vào quân số của đạo quân Lam Sơn và binh lực thành trì địch, không để xảy ra trường hợp quân số âm.

---

### Task 1: Module Trích Xuất & Phân Rã Địa Hình Ngang (`battlefieldTerrainGenerator.ts`)

**Files:**
- Create: `src/utils/battlefieldTerrainGenerator.ts`
- Create: `src/types/battlefield.ts`
- Test: `src/utils/__tests__/battlefieldTerrainGenerator.test.ts`

- [x] **Step 1: Khai báo types và interfaces cho Bàn Cờ Chiến Trận**
  Định nghĩa `BattlefieldTerrainType`, `BattlefieldCell`, `BattlefieldScaleLevel` ('1x' | '10x' | '100x'), `BattlefieldGrid` (96 cột x 32 hàng) trong `src/types/battlefield.ts`.
- [x] **Step 2: Viết test cho thuật toán trích xuất địa hình theo 3 cấp độ**
  Viết test kiểm tra kích thước đầu ra luôn là $96\times 32$, vùng quét bản đồ đúng tỷ lệ ($12\times 4$ cho 1x, $24\times 8$ cho 10x, $48\times 16$ cho 100x), và các thuộc tính cản đường (`isPassable`), giảm tốc độ (`speedPenalty`) được gán chính xác.
- [x] **Step 3: Hiện thực hóa hàm `generateBattlefieldTerrain`**
  Triển khai thuật toán lấy tâm $(col_0, row_0)$ từ bản đồ thế giới, lấy mẫu các ô địa hình lân cận, và phân rã thành cụm $8\times 8$, $4\times 4$ hoặc $2\times 2$ ô con với hẻm núi, đầm lầy, rừng rậm.
- [x] **Step 4: Chạy test và xác nhận kết quả**
  Chạy kiểm thử unit test đảm bảo ma trận $96\times 32$ được sinh ra chính xác.

---

### Task 2: Ánh Xạ Đội Hình & Trọng Lượng Quân Cờ (`battlefieldArmyMapper.ts`)

**Files:**
- Create: `src/utils/battlefieldArmyMapper.ts`
- Test: `src/utils/__tests__/battlefieldArmyMapper.test.ts`

- [x] **Step 1: Viết test ánh xạ Sa Bàn Lam Sơn $32\times 32$ vào Cột 0–31**
  Kiểm tra từng ô `TacticalPlacedUnit` của người chơi được chuyển thành `BattlefieldUnit` tại tọa độ $(col, row)$ tương ứng, bảo toàn `soldiersCount`, vũ khí, HP, và `generalId`.
- [x] **Step 2: Viết test sinh đội hình Quân Minh tại Cột 64–95**
  Kiểm tra thuật toán sinh đội hình giặc Minh theo quân số đối phương, gán quân số thực tế cấp $10\times$ (ví dụ: $100$ lính/ô) và thanh HP dày tương ứng.
- [x] **Step 3: Hiện thực hóa hàm `mapArmiesToBattlefield`**
  Triển khai logic ánh xạ quân Lam Sơn sang cánh trái (Cột 0–31), để trống dải chiến trường (Cột 32–63), và xếp quân Minh ở cánh phải (Cột 64–95).
- [x] **Step 4: Chạy test và xác nhận kết quả**
  Đảm bảo không ô nào bị trùng tọa độ hoặc mất mát dữ liệu quân lực.

---

### Task 3: Động Cơ Giao Tranh & Tính Toán Thương Vong Hai Chiều (`battlefieldCombatEngine.ts`)

**Files:**
- Create: `src/utils/battlefieldCombatEngine.ts`
- Test: `src/utils/__tests__/battlefieldCombatEngine.test.ts`

- [x] **Step 1: Viết test cho thuật toán tầm đánh và sát thương theo trọng lượng quân**
  Kiểm tra cung nỏ có tầm bắn 3–5 ô, giáo 2 ô, kiếm/kỵ 1 ô; tính toán sát thương dựa trên tương quan quân số thực, giáp trụ và địa hình phòng thủ.
- [x] **Step 2: Viết test cho cơ chế Sĩ Khí & Vỡ Trận Dây Chuyền**
  Kiểm tra khi một toán quân mất $>50\%$ số lính hoặc chủ tướng bị thương, sĩ khí sụt giảm; khi sĩ khí $<20\%$, đơn vị quay đầu tháo lui.
- [x] **Step 3: Hiện thực hóa `resolveBattlefieldTick` (1 nhịp giao tranh)**
  Triển khai thuật toán AI di chuyển đơn vị theo hướng đối mặt, ưu tiên chốt giữ địa thế hẹp, trao đổi đòn đánh và trừ HP/lính hai chiều.
- [x] **Step 4: Chạy test và xác nhận kết quả**
  Xác nhận quân Lam Sơn có thể thua trận nếu bị áp đảo trên đồng bằng, nhưng thắng lớn nếu bẫy giặc trong đầm lầy/hẻm đá.

---

### Task 4: Giao Diện Bàn Cờ Chiến Trận Ngang 96×32 (`BattlefieldModal.tsx`)

**Files:**
- Create: `src/components/battle/BattlefieldModal.tsx`
- Create: `src/components/battle/BattlefieldInspectorBar.tsx`
- Modify: `src/App.tsx` (gắn modal vào cây component chính)

- [x] **Step 1: Xây dựng khung modal ngang tỷ lệ 16:9**
  Tạo layout toàn màn hình với tỷ lệ khung hình ngang, nền giấy sớ cổ, thanh tiêu đề hiển thị tên địa danh giao tranh và tương quan binh lực 2 bên.
- [x] **Step 2: Hiện thực ma trận 96×32 tuân thủ nghiêm ngặt `GEMINI.md`**
  - Gắn Container Event Delegation cho toàn bộ ma trận (bắt tọa độ chuột $O(1)$).
  - Gán `pointer-events-none` cho toàn bộ 3.072 ô tĩnh.
  - Phân lớp Memoization theo hàng (`BattlefieldRow`).
  - Sử dụng Single Floating Ghost Box hiển thị vị trí trỏ chuột.
- [x] **Step 3: Tích hợp thanh Inspector Bar và bảng điều khiển chiến sự**
  Hiển thị thông tin ô đang trỏ (loại địa hình, quân số, binh chủng) qua Inspector Bar với độ trễ 0ms; nút bấm [Tạm Dừng / Tiếp Tục], [Tăng Tốc], [Thu Quân Rút Lui].
- [x] **Step 4: Kiểm thử visual và độ mượt**
  Đảm bảo thao tác rê chuột trên ma trận 3.072 ô đạt 60–144 FPS mượt mà.

---

### Task 5: Tích Hợp Vào Vòng Lặp Trò Chơi & Sớ Chiến Báo Cổ (`battleSlice.ts` & `BattleResultModal.tsx`)

**Files:**
- Create: `src/store/slices/battleSlice.ts`
- Create: `src/components/battle/BattleResultModal.tsx`
- Modify: `src/store/slices/armySlice.ts` (kích hoạt trận đánh khi hành quân chạm trán)
- Modify: `src/store/gameStore.ts` (kết hợp `battleSlice`)

- [x] **Step 1: Xây dựng `battleSlice.ts` quản lý trạng thái trận chiến**
  Lưu trữ `currentBattle: { id, location, scale, grid, units, turn, logs, isFinished, result }`.
- [x] **Step 2: Kích hoạt Bàn Cờ Chiến Trận từ `armySlice.ts`**
  Thay thế công thức trừ lính 1 chiều cũ: khi đạo quân Lam Sơn tiếp cận quân Minh hoặc tập kích cứ điểm, tạm dừng thời gian chiến lược và mở `BattlefieldModal`.
- [x] **Step 3: Xây dựng Sớ Chiến Báo Cổ `BattleResultModal.tsx`**
  Hiển thị bản tấu công văn trang nghiêm: danh sách thương vong từng cánh quân, chiến công của Tướng, chiến lợi phẩm thu giữ (ngựa, khí giới, lương thảo).
- [x] **Step 4: Khấu trừ quân số thực vào thế giới game**
  Sau khi người chơi đóng Sớ Chiến Báo, cập nhật chính xác số thương vong vào đạo quân Lam Sơn và đồn trú quân Minh trên bản đồ.

---

### Task 6: Kiểm Thử Toàn Diện & Chuẩn Hóa Mã Nguồn

- [x] **Step 1: Chạy toàn bộ kiểm thử unit test**
  `npm test` hoặc chạy các test suite vừa tạo.
- [x] **Step 2: Chạy kiểm tra quy chuẩn `GEMINI.md`**
  1. `npm run lint` (`oxlint`): 0 warnings, 0 errors.
  2. `npx tsc -b`: 0 errors.
  3. `npm run build`: hoàn tất trong < 2 giây.
- [x] **Step 3: Kiểm thử thực tế trải nghiệm trong game**
  Thử nghiệm tạo đạo quân 1x chạm trán quân Minh, kích hoạt bàn cờ chiến trận ngang, quan sát hiệu quả thắt nút cổ chai và nhận sớ chiến báo.
