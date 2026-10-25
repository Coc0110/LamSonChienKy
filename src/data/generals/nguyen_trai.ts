import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: NGUYỄN TRÃI
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const nguyen_trai: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'nguyen_trai',
  name: 'Nguyễn Trãi',
  hanzi: '阮廌',
  portraitUrl: undefined,
  title: 'NHẬP NỘI HÀNH KHIỂN',
  epithet: 'Ức Trai / Bậc Thầy Tâm Công',
  group: 'quy_tu_1420_1426',
  unlocked: false,
  locationId: 'loi_giang',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'red',
  stats: {
    command: 72,   // Thống Lĩnh (1 - 100)
    martial: 45,   // Võ Nghệ   (1 - 100)
    intellect: 94, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["infantry"],
  buffName: 'BÌNH NGÔ SÁCH',
  buffDescription: 'Tuyệt kỹ "Mưu Phạt Tâm Công": Thuyết hàng thành địch không tốn một mũi tên, +50% Sĩ khí toàn quân',
  specialty: 'Tuyệt kỹ "Mưu Phạt Tâm Công": Thuyết hàng thành địch không tốn một mũi tên, +50% Sĩ khí toàn quân',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1420,
  joinMonth: 1,
  joinDay: 15,
  lore: 'Tại bến Lỗi Giang, Nguyễn Trãi dâng "Bình Ngô Sách" với kế sách "Đánh vào lòng người" (Tâm công), trở thành linh hồn mưu lược của cuộc khởi nghĩa.',
};
