import type { TroopType } from '../types';

/**
 * ============================================================================
 * BẢNG CÂN BẰNG CHỈ SỐ & BINH CHỦNG TƯỚNG LĨNH LAM SƠN (GAME BALANCE CONFIG)
 * ============================================================================
 * File này được tạo riêng để bạn dễ dàng tinh chỉnh và cân bằng game:
 * - stats:
 *     + command:   Thống Lĩnh (1 - 100) -> Khả năng cầm quân, giữ đội hình, sĩ khí
 *     + martial:   Võ Nghệ   (1 - 100) -> Sức chiến đấu cá nhân, trảm tướng xung kích
 *     + intellect: Mưu Lược  (1 - 100) -> Dụng kế, phục kích, nghi binh, trị an
 * - troops: Danh sách binh chủng sở trường (hình khắc trực tiếp ở mặt sau thẻ đồng)
 *     + 'infantry': Bộ Binh (Gươm chéo)
 *     + 'cavalry':  Thiết Đột Kỵ Binh (Chiến mã)
 *     + 'archer':   Cung Nỏ (Cung tên)
 *     + 'elephant': Tượng Binh (Voi chiến)
 *     + 'navy':     Thủy Quân (Thuyền buồm)
 * - buffName: Tên ngắn gọn của Buff / Đặc kỹ (2 - 3 chữ để luôn hiển thị trên 1 dòng)
 * - note: Ghi chú vai trò / mốc hy sinh lịch sử
 * ============================================================================
 */

export interface GeneralBalanceConfig {
  stats: {
    command: number;
    martial: number;
    intellect: number;
  };
  troops: TroopType[];
  buffName: string;
  note?: string;
}

export const GENERALS_BALANCE_CONFIG: Record<string, GeneralBalanceConfig> = {
  // ============================================================================
  // 1. NHÓM 18 ANH HÙNG HỘI THỀ LŨNG NHAI (1416)
  // ============================================================================

  // --- LÊ LỢI: MINH CHỦ ĐỘC TÔN (9x toàn diện ngay từ đầu) ---
  le_loi: {
    stats: { command: 95, martial: 85, intellect: 93 },
    troops: ['infantry', 'cavalry'],
    buffName: 'BÌNH ĐỊNH CHÍ',
    note: 'Minh chủ toàn tài, quy tụ anh hùng, chỉ số 9x cao nhất toàn quân',
  },

  // --- LÊ LAI: HỘ MỆNH TỬ SĨ (9x Võ & Thống - Hy sinh sớm 1419 tại núi Chí Linh) ---
  le_lai: {
    stats: { command: 88, martial: 92, intellect: 78 },
    troops: ['infantry'],
    buffName: 'PHÁ TRÙNG VÂY',
    note: 'Lá chắn sinh tử giai đoạn đầu, dũng tướng phá trùng vây giải cứu chủ soái',
  },

  // --- CÁC HÀO KIỆT LŨNG NHAI KHÁC (Base 7x - 8x, rèn giũa để thăng tiến) ---
  le_than: {
    stats: { command: 81, martial: 80, intellect: 76 },
    troops: ['navy', 'infantry'],
    buffName: 'DÂNG THUẬN THIÊN',
    note: 'Người dâng gươm Thuận Thiên, thông thạo sông Chu',
  },

  le_sat: {
    stats: { command: 83, martial: 88, intellect: 72 },
    troops: ['infantry', 'cavalry'],
    buffName: 'TRẢM SOÁI KỲ',
    note: 'Dũng tướng trẻ kiệt xuất, sau này chém Liễu Thăng ở Chi Lăng',
  },

  trinh_kha: {
    stats: { command: 84, martial: 83, intellect: 77 },
    troops: ['elephant'],
    buffName: 'TƯỢNG BINH PHÁ',
    note: 'Đô đốc tượng binh, khắc tinh kỵ binh giặc Minh',
  },

  luu_nhan_chu: {
    stats: { command: 84, martial: 81, intellect: 85 },
    troops: ['infantry', 'archer'],
    buffName: 'SƠN LÂM PHỤC',
    note: 'Danh tướng Thái Nguyên, bậc thầy địa hình và phục kích',
  },

  dinh_le: {
    stats: { command: 86, martial: 85, intellect: 80 },
    troops: ['infantry'],
    buffName: 'MAI PHỤC KẾ',
    note: 'Cháu ruột Lê Lợi, thiên tài quân sự (Trận Tốt Động - Chúc Động)',
  },

  le_van_an: {
    stats: { command: 78, martial: 75, intellect: 82 },
    troops: ['infantry'],
    buffName: 'VẬN LƯƠNG TRỤ',
    note: 'Lão tướng trầm ổn, đảm trách tiếp tế lương thảo',
  },

  le_van_linh: {
    stats: { command: 75, martial: 66, intellect: 86 },
    troops: ['infantry'],
    buffName: 'DƯỠNG LÒNG DÂN',
    note: 'Mưu sĩ kỳ cựu theo Lê Lợi từ những ngày khó khăn nhất',
  },

  bui_quoc_hung: {
    stats: { command: 82, martial: 79, intellect: 83 },
    troops: ['infantry', 'archer'],
    buffName: 'VÂY THÀNH CÔNG',
    note: 'Chuyên vây hãm và bức hàng các thành trì kiên cố',
  },

  truong_loi: {
    stats: { command: 78, martial: 85, intellect: 71 },
    troops: ['infantry'],
    buffName: 'THIẾT TIÊN PHÁ',
    note: 'Dũng tướng sức khỏe hơn người, xông xáo giáp lá cà',
  },

  le_lieu: {
    stats: { command: 79, martial: 82, intellect: 72 },
    troops: ['infantry'],
    buffName: 'LÂM CHIẾN BỀN',
    note: 'Kiên cường bám trụ hành quân đường rừng suốt 10 năm',
  },

  truong_chien: {
    stats: { command: 77, martial: 84, intellect: 70 },
    troops: ['cavalry'],
    buffName: 'TIÊN PHONG ĐẠO',
    note: 'Tướng tiên phong gan dạ mở đường máu qua vòng vây',
  },

  le_ninh: {
    stats: { command: 76, martial: 78, intellect: 79 },
    troops: ['archer'],
    buffName: 'ẨN THÂN PHỤC',
    note: 'Thông thạo núi rừng, du kích phục kích hiệu quả',
  },

  le_hiem: {
    stats: { command: 80, martial: 79, intellect: 74 },
    troops: ['infantry'],
    buffName: 'CỐ THỦ HIỂM',
    note: 'Chuyên trách phòng ngự hiểm địa núi cao Chí Linh',
  },

  vu_uy: {
    stats: { command: 77, martial: 83, intellect: 74 },
    troops: ['archer'],
    buffName: 'HỎA TIỄN TRẬN',
    note: 'Thủ lĩnh đội cung nỏ bắn tên lửa từ trên cao',
  },

  dinh_lan: {
    stats: { command: 78, martial: 80, intellect: 76 },
    troops: ['infantry'],
    buffName: 'HỘ TRUNG QUÂN',
    note: 'Bảo vệ đại bản doanh và bộ chỉ huy của Lê Lợi',
  },

  le_hoi: {
    stats: { command: 78, martial: 81, intellect: 71 },
    troops: ['infantry'],
    buffName: 'THIẾT GIÁP TRẬN',
    note: 'Giữ vững khiên trận giảm thiểu thương vong cho nghĩa quân',
  },

  // ============================================================================
  // 2. NHÓM DŨNG TƯỚNG BUỔI ĐẦU KHỞI NGHĨA (1418 - 1419)
  // ============================================================================

  // --- LÊ THẠCH: ĐỆ NHẤT DŨNG TƯỚNG TIÊN PHONG (9x Võ nghệ - Hy sinh sớm 1421) ---
  le_thach: {
    stats: { command: 87, martial: 95, intellect: 74 },
    troops: ['cavalry', 'infantry'],
    buffName: 'CHIẾN THẦN TIÊN',
    note: 'Cháu Lê Lợi, dũng tướng số một giai đoạn đầu, hy sinh 1421 tại Ba Lẫm',
  },

  ly_trien: {
    stats: { command: 85, martial: 86, intellect: 83 },
    troops: ['infantry', 'cavalry'],
    buffName: 'NGHI BINH KẾ',
    note: 'Bậc thầy giả thua nhử địch, cặp bài trùng với Đinh Lễ',
  },

  nguyen_xi: {
    stats: { command: 81, martial: 83, intellect: 84 },
    troops: ['infantry'],
    buffName: 'KHUYỂN DẠ TẬP',
    note: 'Tướng trẻ tài ba, dùng bầy chó săn nghi binh lập công lớn',
  },

  le_khoi: {
    stats: { command: 83, martial: 86, intellect: 78 },
    troops: ['cavalry'],
    buffName: 'KỴ BINH ĐỘT',
    note: 'Cháu gọi Lê Lợi bằng chú, giỏi kỵ binh bắt sống tướng giặc',
  },

  dinh_liet: {
    stats: { command: 82, martial: 84, intellect: 79 },
    troops: ['infantry'],
    buffName: 'TRƯỜNG THƯƠNG KHÓA',
    note: 'Em Đinh Lễ, chỉ huy thương binh khóa ải Linh Cảm',
  },

  le_ngan: {
    stats: { command: 82, martial: 80, intellect: 83 },
    troops: ['navy'],
    buffName: 'THỦY SƯ ĐÔ',
    note: 'Đô đốc thủy quân sông Mã và sông Lam',
  },

  bui_bi: {
    stats: { command: 72, martial: 68, intellect: 84 },
    troops: ['infantry'],
    buffName: 'QUẢN KHỐ TÍCH',
    note: 'Chuyên gia bảo quản kho tàng và quân nhu',
  },

  pham_ngoc: {
    stats: { command: 70, martial: 65, intellect: 85 },
    troops: ['infantry'],
    buffName: 'Y TĂNG LIỆU',
    note: 'Nhà sư chữa trị thương binh và phòng dịch bệnh',
  },

  le_boi: {
    stats: { command: 79, martial: 81, intellect: 73 },
    troops: ['infantry'],
    buffName: 'TRẤN HIỂM QUAN',
    note: 'Chuyên trấn thủ chốt chặn hẻm núi',
  },

  le_linh: {
    stats: { command: 77, martial: 80, intellect: 75 },
    troops: ['archer'],
    buffName: 'DU KÍCH SƠN',
    note: 'Tập kích chớp nhoáng rồi lẩn vào rừng núi',
  },

  dao_boi: {
    stats: { command: 75, martial: 78, intellect: 70 },
    troops: ['infantry'],
    buffName: 'KIÊN TRUNG PHÒNG',
    note: 'Dũng tướng trung trinh phòng ngự trại đóng quân',
  },

  trinh_tuan: {
    stats: { command: 76, martial: 77, intellect: 72 },
    troops: ['cavalry'],
    buffName: 'CẢNH GIỚI TIỄU',
    note: 'Đội trưởng kỵ binh tuần tiễu phát hiện địch sớm',
  },

  nguyen_ly: {
    stats: { command: 77, martial: 80, intellect: 71 },
    troops: ['infantry'],
    buffName: 'DẠ TẬP PHÁ',
    note: 'Tấn công đồn giặc ban đêm',
  },

  le_canh_quan: {
    stats: { command: 74, martial: 75, intellect: 76 },
    troops: ['infantry'],
    buffName: 'HỘ LƯƠNG QUÂN',
    note: 'Bảo vệ các đoàn vận tải qua vùng tranh chấp',
  },

  ly_cot: {
    stats: { command: 75, martial: 81, intellect: 68 },
    troops: ['infantry'],
    buffName: 'DŨNG NGHỊCH THẾ',
    note: 'Tăng sĩ khí khi chiến đấu trong thế ít địch nhiều',
  },

  pham_cuong: {
    stats: { command: 79, martial: 83, intellect: 72 },
    troops: ['cavalry'],
    buffName: 'TRUY KÍCH KỴ',
    note: 'Kỵ binh cơ động truy kích khi địch tan rã',
  },

  nguyen_loi: {
    stats: { command: 78, martial: 78, intellect: 74 },
    troops: ['infantry'],
    buffName: 'CỐ CÔNG SỰ',
    note: 'Chuyên gia đào hào dựng lũy kiên cố',
  },

  trinh_loi: {
    stats: { command: 78, martial: 80, intellect: 73 },
    troops: ['infantry'],
    buffName: 'CÔNG ĐỒN NGOẠI',
    note: 'Phá vỡ các công sự ngoại vi của giặc',
  },

  // ============================================================================
  // 3. NHÓM ĐẠI TÀI & TƯỚNG LĨNH LƯỢT SAU (1420 - 1426)
  // ============================================================================

  // --- NGUYỄN TRÃI: ĐỈNH CAO MƯU LƯỢC TÂM CÔNG (Độc tôn 9x Mưu - Gia nhập 1420) ---
  nguyen_trai: {
    stats: { command: 72, martial: 45, intellect: 94 },
    troops: ['infantry'],
    buffName: 'BÌNH NGÔ SÁCH',
    note: 'Đại quân sư, dâng Bình Ngô Sách, đỉnh cao tư tưởng tâm công',
  },

  nguyen_chich: {
    stats: { command: 84, martial: 82, intellect: 87 },
    troops: ['infantry', 'cavalry'],
    buffName: 'ĐỊNH NGHỆ AN',
    note: 'Hiến kế chuyển hướng vào Nghệ An xoay chuyển cục diện cuộc chiến',
  },

  pham_van_xao: {
    stats: { command: 83, martial: 78, intellect: 86 },
    troops: ['infantry', 'archer'],
    buffName: 'CHẶN LÊ HOA',
    note: 'Chặn đứng viện binh Mộc Thạnh ở ải Lê Hoa',
  },

  do_bi: {
    stats: { command: 82, martial: 84, intellect: 77 },
    troops: ['cavalry'],
    buffName: 'TỐC BẮC PHẠT',
    note: 'Đột kích chớp nhoáng trong chiến dịch tiến quân ra Bắc',
  },

  le_luu: {
    stats: { command: 79, martial: 83, intellect: 73 },
    troops: ['cavalry'],
    buffName: 'THIẾT CẬN VỆ',
    note: 'Đội trưởng thiết đột bảo vệ trung quân',
  },

  tran_nguyen_han: {
    stats: { command: 87, martial: 84, intellect: 88 },
    troops: ['navy', 'infantry'],
    buffName: 'HẠ XƯƠNG GIANG',
    note: 'Tả Tướng quốc, phá thành Xương Giang, tinh thông cả thủy bộ',
  },

  cam_banh: {
    stats: { command: 80, martial: 79, intellect: 78 },
    troops: ['infantry'],
    buffName: 'CHIÊU DÂN QUY',
    note: 'Hàng tướng cảm phục ân đức, quy phục tại Trà Long',
  },

  cam_quy: {
    stats: { command: 81, martial: 82, intellect: 75 },
    troops: ['elephant'],
    buffName: 'SƠN TƯỢNG ĐỘI',
    note: 'Thủ lĩnh Quỳ Châu đem đội voi chiến hùng hậu gia nhập',
  },

  cam_lan: {
    stats: { command: 77, martial: 78, intellect: 79 },
    troops: ['infantry'],
    buffName: 'DẪN LỘ ĐẠO',
    note: 'Tù trưởng Ngọc Ma thông thuộc mọi lối mòn hiểm trở',
  },

  tran_luu: {
    stats: { command: 84, martial: 83, intellect: 86 },
    troops: ['cavalry', 'archer'],
    buffName: 'DỤ CHI LĂNG',
    note: 'Giả thua nhử Liễu Thăng vào họng kìm Mã Yên - Chi Lăng',
  },
};
