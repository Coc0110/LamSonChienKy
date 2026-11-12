# Bản Thiết Kế Chi Tiết: Cơ Chế Chiến Đấu Chiến Thuật "Bình Ngô Đại Cáo" (Lam Sơn vs Quân Minh)

**Ngày thiết kế:** 2026-11-11  
**Trạng thái:** Bản thảo chi tiết để thảo luận & hiệu chỉnh cùng người chơi  

---

## 1. Mục Tiêu Cốt Lõi & Những Thay Đổi Kiến Trúc Lớn

### 1.1. Loại bỏ các cơ chế cũ gây bất cập
1. **Bỏ Sa Bàn Bày Binh 32×32 (`TacticalFormationModal`):** Người chơi không còn phải ngồi gắp từng ô lính 1×1, 2×1 lên tấm lưới 1.024 ô trước trận.
2. **Bỏ Màn Hình Bàn Cờ Phụ 96×32 (`BattlefieldModal`):** Không còn cảnh đang điều quân trên bản đồ lớn thì bị bật cửa sổ pop-up tách rời thực tại.
3. **Bỏ Di Chuyển Theo Ô Vuông Cứng Nhắc:** Đạo quân không phải nhích từng ô vuông bậc thang mà di chuyển mượt theo **vector tọa độ liên tục `(x, y)`** trên bản đồ Thanh Hóa.

### 1.2. Ba trụ cột của cơ chế mới
1. **Biên Chế Đạo Quân Trực Quan (Kiểu *Clash of Clans* + *Three Kingdoms*):** Chọn Tướng + Kéo thanh số lượng từng binh chủng → Tự động hình thành **Cấu Trúc 3 Tuyến** (Tiền Phong, Hậu Phương, Cơ Động).
2. **Tác Chiến Thời Gian Thực Trên Bản Đồ Lớn (Continuous World-Map Combat):** Mọi hoạt động hành quân, ẩn nấp trong rừng, đặt bẫy, cắt đường lương, bọc sườn, giáp công diễn ra trực tiếp trên bản đồ Thanh Hóa theo nhịp **Canh Giờ**.
3. **Tương Quan Lực Lượng Thực Tế & Nghệ Thuật "Lấy Ít Địch Nhiều":** Thắng bại được quyết định bởi **Độ Rộng Mặt Trận (Combat Width)** theo địa hình, **Hướng Tiếp Cận (Trực diện / Bọc sườn / Đánh lén)**, **Hậu Cần Lương Thảo** và **Sĩ Khí (Morale)** độc lập hoàn toàn với quân số.

---

## 2. Phản Biện & Khắc Phục Các Điểm Bất Hợp Lý Từ Ý Tưởng Sơ Bộ

| Vấn đề tiềm ẩn trong ý tưởng sơ bộ | Giải pháp điều chỉnh trong bản thiết kế này |
|---|---|
| **1. Nếu bỏ hẳn dữ liệu lưới địa hình thì làm sao biết chính xác chỗ nào là rừng, hẻm núi hay sông?** | **Tách biệt "Hiển thị/Di chuyển" và "Tra cứu địa hình":** Trên giao diện, đạo quân di chuyển tự do theo tọa độ thực `(x, y)` (không hiện lưới ô vuông). Nhưng bên dưới, hệ thống vẫn dùng hàm `getGridTerrain(x, y)` tra cứu tức thời trên bản đồ địa hình độ phân giải cao `800×1052` đã có sẵn để biết chính xác đạo quân đang đứng trên *Rừng già, Núi cao, Vách đá* hay *Đồng bằng*. |
| **2. Nếu chỉ chọn số lượng quân kiểu *Clash of Clans* (ví dụ: 200 Đao + 100 Cung + 50 Kỵ) rồi gộp chung thành 1 cục máu thì mất tính khắc chế và che chắn?** | **Cơ chế "Đội Hình 3 Tuyến Tự Động" (3-Layer Tactical Composition):** Người chơi chỉ cần chọn số lượng từng binh chủng, nhưng trong ruột mỗi Đạo Quân được chia làm 3 lớp máu và vai trò riêng biệt: **Tuyến Tiền Phong** (Đao/Giáo/Tượng), **Tuyến Hậu Phương** (Cung/Xe lương/Tướng) và **Tuyến Cơ Động** (Kỵ/Thám mã). Đánh chính diện phải qua Tiền Phong; đánh bọc hậu sẽ chém thẳng vào Hậu Phương! |
| **3. Làm sao để 1.000 quân Lam Sơn thắng 10.000 quân Minh bằng chiến thuật, nhưng nếu đánh bừa ở đồng bằng thì phải thua thảm?** | **Cơ chế "Độ Rộng Mặt Trận" (Combat Width):** Ở *Đồng bằng*, tối đa 5.000 quân có thể tham chiến cùng lúc (quân Minh lấy thịt đè người sẽ nghiền nát quân ta). Nhưng ở *Ải Kình Lộng / Hẻm núi (`cliff`)*, Độ Rộng Mặt Trận chỉ là **300 người** — mỗi canh giờ chỉ 300 lính Minh ở hàng đầu chen vào đánh được với 300 nghĩa quân của ta, 9.700 lính Minh phía sau bị ùn tắc và làm mồi cho Cung nỏ/Hỏa công! |
| **4. Nếu người chơi tách ra 30–40 đội quân 10 người chạy khắp bản đồ để quấy rối thì sao?** | **Giới hạn Chỉ Huy (Command Cap):** Mỗi Đạo Quân chính quy bắt buộc phải có **1 Chủ Tướng** thống lĩnh (có thể kèm tối đa 2 Phó Tướng). Ngoài Đạo Quân chính quy, mỗi đạo chỉ được phép tách ra tối đa **1 Đội Kỳ Binh / Nghi Binh nhỏ** hoạt động trong bán kính giới hạn quanh đại quân. |

---

## 3. Thiết Kế Chi Tiết Từng Hệ Thống

### 3.1. Hệ thống Biên Chế Đạo Quân (Army Composition UI)

Khi người chơi bấm **"Lập Đạo Quân"** tại một Căn Cứ Lam Sơn:

1. **Chọn Ban Chỉ Huy (1–3 Tướng):**
   - **1 Chủ Tướng (Bắt buộc):** Quyết định **Sức Chứa Quân Tối Đa (Command Capacity)** dựa theo chỉ số `Thống Lĩnh (command)` và cấp bậc sao (ví dụ: Tướng `command = 85` dẫn được tối đa `1.500 quân`).
   - **Tối đa 2 Phó Tướng / Quân Sư:**
     - Phó Tướng thiên về `Võ Nghệ (martial)`: Tăng sát thương xung kích và mở khóa kỹ năng **Đột Kích Trảm Tướng**.
     - Quân Sư thiên về `Mưu Lược (intellect)`: Mở khóa các **Mưu Kế** (*Hỏa công, Ngụy báo, Nghi binh, Cạm bẫy*) và tăng tỷ lệ thành công khi Mai phục.
2. **Chọn Số Lượng Binh Chủng (Bằng thanh kéo / nút `+/-` như *Clash of Clans*):**
   - Khấu trừ trực tiếp từ số *Nghĩa Binh (`combatTroops`)* tại căn cứ + *Vũ khí (`swords`, `bows`, `spears`)* + *Chiến mã (`horses`)* + *Voi chiến (`elephants`)* trong kho.
   - Các binh chủng tự động xếp vào **3 Tuyến Nội Tại**:
     - 🛡️ **Tuyến Tiền Phong (Chắn đòn & Giữ ải):**
       - **Đao Khiên Binh:** Giáp cao, giảm 40% sát thương tên bắn cho toàn đạo quân, trụ vững ở hẻm núi.
       - **Trường Giáo Binh:** Phản đòn Kỵ binh địch (`×2.2` sát thương lên Kỵ binh), ngăn Kỵ binh địch đột phá vào Tuyến Hậu Phương.
       - **Tượng Binh:** Phá vỡ Tuyến Tiền Phong của địch, gây khiếp sợ làm tụt Sĩ Khí địch mỗi canh giờ.
     - 🏹 **Tuyến Hậu Phương (Hỏa lực tầm xa & Hậu cần):**
       - **Cung Nỏ Binh:** Bắn yểm trợ từ xa (có thể bắn sang đạo quân địch cách một khoảng trên bản đồ mà không cần giáp lá cà), tăng mạnh sát thương khi đứng trên Đồi/Núi.
       - **Xe Vận Lương:** Quyết định số ngày lương thực mang theo của đạo quân. Không có Xe Lương, đạo quân chỉ mang được 5 ngày lương khô trên người.
     - 🐎 **Tuyến Cơ Động (Đột kích & Trinh sát):**
       - **Thiết Kỵ Binh:** Tăng tốc độ di chuyển chung; khi giao chiến tự động tìm cách đánh tạt sườn vào **Tuyến Hậu Phương** của địch; truy sát cực mạnh khi địch tháo chạy (`routing`).
       - **Thám Mã:** Mở rộng bán kính tầm nhìn và **phát hiện Phục binh / Bẫy** của địch trong rừng.

---

### 3.2. Di Chuyển Tự Do, Tầm Nhìn & Địa Hình Trên Bản Đồ

1. **Di chuyển theo Đường Dẫn Tự Do (Free-Path Vector):**
   - Người chơi chọn Đạo Quân và click/vẽ đường đi đến bất kỳ điểm `(x, y)` nào trên bản đồ (hoặc click thẳng vào một Đạo Quân Minh / Thành Trì Minh để ra lệnh bám đuổi / tập kích).
   - **Tốc độ hành quân thực tế** = `Tốc độ binh chủng chậm nhất` × `Hệ số địa hình tại điểm (x, y)` (ví dụ: đi trên Đồng bằng = `100%`, xuyên Rừng = `60%`, leo Núi = `35%`).
   - *Mẹo chiến thuật:* Một đạo quân chỉ gồm **Kỵ binh + Thám mã** (không mang Xe lương nặng nề) sẽ chạy nhanh gấp 2.5 lần đại quân Minh, rất lý tưởng để làm nhiệm vụ **Khiêu khích – Trá bại** hoặc **Đánh úp đường lương**.
2. **Trạng thái Ẩn Thân Tự Động (Forest & Mountain Stealth):**
   - Khi đạo quân Lam Sơn đứng yên hoặc bật chế độ **Mai Phục** trong vùng địa hình `forest` (Rừng già) hoặc `mountain`/`cliff` (Núi cao/Hẻm vực), đạo quân đó hoàn toàn **Tàng Hình** trước quân Minh.
   - Quân Minh chỉ phát hiện được nếu chúng có Thám Mã tiến vào sát bán kính phát hiện (`r_detect`), hoặc khi người chơi chủ động bấm **"Phát Pháo Hiệu Xuất Kích"**.

---

### 3.3. Cơ Chế Giao Chiến & Tương Quan Lực Lượng (Giải quyết bài toán Lấy Ít Địch Nhiều)

Khi hai hoặc nhiều đạo quân tiến vào **Bán Kính Giao Chiến** trên bản đồ, trận đánh diễn ra ngay tại vị trí đó theo từng **Canh Giờ**:

#### A. Cơ chế "Độ Rộng Mặt Trận" (Combat Width — Vũ khí tối thượng của địa hình hiểm)
Mỗi loại địa hình nơi diễn ra giao tranh quy định **Số quân tối đa có thể trực tiếp xuất chiêu trong 1 Canh Giờ**:
- **Đồng Bằng (`plains`):** Độ rộng = `3.000 quân`. Nếu 500 quân Lam Sơn đánh với 3.000 quân Minh ở đồng bằng → Toàn bộ 3.000 quân Minh đều được đánh cùng lúc (tỷ lệ sát thương 6 chọi 1) → Quân Lam Sơn sẽ bị tiêu diệt rất nhanh!
- **Rừng Già (`forest`):** Độ rộng = `800 quân` (Kỵ binh và Tượng binh địch bị phạt `-40%` sức chiến đấu).
- **Núi Cao (`mountain`):** Độ rộng = `500 quân` (Bên chiếm điểm cao trước được `+35%` công/thủ).
- **Hẻm Vực / Ải Hiểm (`cliff` - như Ải Kình Lộng, Đèo Ống):** Độ rộng = `300 quân`.
  - Dù tướng Minh kéo **10.000 đại quân** đi qua Ải Kình Lộng, mỗi canh giờ chỉ có **300 lính Minh đầu hàng** tiếp chiến được với **300 nghĩa quân Đao/Giáo** của ta đang giữ ải!
  - 9.700 lính Minh phía sau bị kẹt cứng thành hàng dài, không đánh được nhưng lại chịu sát thương từ **Cung nỏ bắn từ sườn núi** hoặc **Bẫy Đá Lăn / Hỏa Công**!

#### B. Cơ chế 3 Tuyến & Hướng Tiếp Cận (Directional Flanking)
Mỗi đạo quân đang giao chiến trên bản đồ có một **Hướng Mặt (Facing Vector)** hướng về kẻ địch đầu tiên mà nó chạm trán:
1. **Đánh Chính Diện (Front Clash):**
   - Sát thương cận chiến dội vào **Tuyến Tiền Phong** (Đao/Giáo).
   - **Tuyến Hậu Phương** (Cung nỏ) của cả 2 bên đứng sau bắn tên qua lại.
2. **Đánh Bọc Sườn (Flank Attack - Góc 60°..120°) & Đánh Bọc Hậu (Rear Attack - Góc > 120°):**
   - Khi bạn điều **Đạo Quân Lam Sơn thứ 2** từ trong rừng đánh ập vào bên hông hoặc sau lưng đạo quân Minh đang giao chiến:
   - Đòn đánh này **bỏ qua 70% Tuyến Tiền Phong** của giặc và **chém thẳng vào Tuyến Hậu Phương** (tàn sát Cung thủ, phá hủy Xe lương và uy hiếp trực tiếp Chủ tướng giặc)!
   - Đồng thời kích hoạt trạng thái **"Lưỡng Đầu Thụ Địch" (Bị Giáp Công)**: Quân Minh bị trừ thẳng **20 Sĩ Khí** ngay lập tức và mất `30%` sức phòng thủ.

---

### 3.4. Hệ Thống Sĩ Khí (Morale) & Tâm Lý Chiến Độc Lập

Sĩ Khí (`0..100`) là thanh quyết định thắng bại thực sự, **tách rời khỏi % quân số**:

- **Các đòn giáng mạnh vào Sĩ Khí quân Minh:**
  1. **Bị Phục Kích Bất Ngờ từ Rừng/Hẻm núi:** `-30 Sĩ Khí` ngay canh giờ đầu tiên + trạng thái **Hoảng Loạn (`Panicked`)** trong 2 canh giờ (sát thương gây ra giảm 50%, không dùng được kỹ năng).
  2. **Bị Giáp Công (2–3 đạo quân vây đánh từ nhiều hướng):** `-15 Sĩ Khí` khi bắt đầu bị kẹp + `-5 Sĩ Khí` mỗi canh giờ.
  3. **Bị Cháy Lương / Đứt Đường Tiếp Lương (`Starving`):** `-12 Sĩ Khí` mỗi canh giờ.
  4. **Trúng Hỏa Công / Đá Lăn:** `-20 Sĩ Khí`.
  5. **Chủ Tướng bị trọng thương hoặc bị đột kích (bởi Tướng võ nghệ cao của ta):** `-45 Sĩ Khí`!
- **Khi Sĩ Khí tụt xuống `< 20` → Vỡ Trận (`Routing`):**
  - Dù đạo quân Minh còn tới **70–80% quân số**, khi Sĩ Khí sụp đổ, toàn quân sẽ quăng giáo mác tháo chạy tán loạn về thành gần nhất!
  - Khi địch đang `Routing`, chúng **không thể đánh trả**; đạo quân Lam Sơn (đặc biệt là Kỵ binh) truy kích sẽ **bắt sống hàng loạt quân đầu hàng và thu hồi vũ khí/lương thảo** với thương vong bằng 0.

---

### 3.5. Hệ Thống Mưu Kế, Bẫy Địa Hình & Cắt Lương Trên Bản Đồ

Để người chơi thực sự hóa thân thành bộ chỉ huy Lê Lợi – Nguyễn Trãi, mỗi đạo quân (tùy thuộc chỉ số `Mưu Lược` của Tướng đi cùng) có bộ **Lệnh Chiến Thuật & Mưu Kế** ngay trên bản đồ:

1. **🌲 Phục Kích & Khóa Đuôi (Ambush & Trap):**
   - Đặt 1–2 đạo quân nằm phục trong rừng/hẻm núi dọc đường hành quân của giặc.
   - Có thể tốn 1–2 ngày chuẩn bị trước tại chỗ để dựng **Bẫy Hỏa Công** (trong rừng) hoặc **Bẫy Đá Lăn / Gỗ Lao** (trên vách núi). Khi giặc đi vào vùng bẫy, bấm kích hoạt gây sát thương diện rộng và đốt cháy đội hình giặc.
2. **🏳️ Khiêu Khích & Trá Bại (Taunt & Feigned Retreat):**
   - Đạo quân nhỏ cơ động tiến đến gần thành hoặc trại giặc phát lệnh **Khiêu Khích** (tỷ lệ thành công dựa vào `Mưu Lược` tướng ta so với tính cách tướng Minh).
   - Tướng Minh nổi giận sẽ xuất một Đạo Quân truy đuổi bám theo đuôi đạo quân trá bại của ta, đi thẳng vào hẻm núi đã gài sẵn bẫy và phục binh.
3. **🔥 Nghi Binh Hư Trương Thanh Thế (Decoy):**
   - Tách một toán nhỏ (50–100 quân) mang nhiều cờ xí, đốt lửa gõ trống ở hướng Đông thành giặc.
   - Trên bản đồ, quân Minh sẽ tưởng đó là đại quân 3.000 người nên điều chủ lực trong thành ra hướng Đông nghênh đón → Thành giặc ở hướng Tây trống rỗng, tạo cơ hội cho đại quân thật của ta **Tập Kích Hạ Thành** hoặc **Đánh Cướp Kho Lương**.
4. **🌾 Cắt Đường Lương & Tập Kích Đoàn Vận Lương (Supply Interception):**
   - Mỗi khi đại quân Minh xuất thành đi đánh xa (ví dụ từ Tây Đô tiến lên vây núi Chí Linh), hệ thống sẽ sinh ra các **Đoàn Vận Lương Minh** đi nối đuôi từ thành tiếp tế cho tiền quân của chúng.
   - Người chơi không cần đâm đầu vào đại quân Minh, mà cho 1 đạo Kỵ binh/Du kích luồn đường rừng đánh úp **Đoàn Vận Lương** này:
     - Cướp toàn bộ số lương đó đem về nuôi nghĩa quân Lam Sơn.
     - Đại quân Minh ở tiền tuyến lập tức lâm vào cảnh **Tuyệt Lương**, sĩ khí tụt dốc không phanh và buộc phải rút lui trong hỗn loạn (lúc chúng rút lui chính là lúc ta tổng phản công!).

---

## 4. Hiển Thị Giao Chiến Trên Bản Đồ Như Thế Nào Để Vừa Đẹp Vừa Mượt (60–144 FPS)?

Khi 2 đạo quân giao chiến trên bản đồ thế giới:
1. **Biểu tượng Đạo Quân Động (Animated Tactical Token) ngay trên bản đồ:**
   - Hiển thị rõ: Cờ hiệu, Chân dung Tướng chỉ huy, Thanh Quân Số, Thanh Sĩ Khí, Trạng thái (*Đang ẩn thân 🌲, Đang trúng hỏa công 🔥, Bị bao vây ⚠️, Tuyệt lương 🌾, Vỡ trận 🏳️*) và hiệu ứng tên bay / kiếm chạm nhau ngay giữa 2 đạo quân.
2. **Bảng Chỉ Huy Giao Tranh Nổi (Tactical Engagement HUD ở góc màn hình):**
   - Khi người chơi click vào điểm nóng đang giao tranh, một bảng điều khiển chiến thuật gọn gàng hiện ra ngay cạnh bên (không che bản đồ!), hiển thị:
     - **Tương quan 3 Tuyến** của 2 bên (Tiền Phong đang giữ được bao nhiêu %, Cung thủ đang bắn bao nhiêu sát thương/canh, Kỵ binh có đang bọc sườn được không).
     - **Độ rộng mặt trận hiện tại** (ví dụ: *"Địa hình Ải Kình Lộng: Giới hạn 300 quân tiếp chiến/canh — Đang vô hiệu hóa 85% ưu thế quân số của giặc Minh!"*).
     - **Các nút Phát Lệnh Tức Thời:** *Tung Hỏa Công, Phát Pháo Hiệu Xuất Kích, Chuyển sang Trá Bại Rút Lui, Đột Kích Chém Tướng, hoặc Tổng Truy Kích*.
