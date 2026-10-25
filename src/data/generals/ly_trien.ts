import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: LÝ TRIỆN
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const ly_trien: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'ly_trien',
  name: 'Lý Triện',
  hanzi: '李篆',
  portraitUrl: undefined,
  title: 'THÁI BẢO TÂY KỲ VƯƠNG',
  epithet: 'Bậc Thầy Nghi Binh Dụ Địch',
  group: 'khoi_nghia_1418',
  unlocked: false,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'red',
  stats: {
    command: 85,   // Thống Lĩnh (1 - 100)
    martial: 86,   // Võ Nghệ   (1 - 100)
    intellect: 83, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["infantry","cavalry"],
  buffName: 'NGHI BINH KẾ',
  buffDescription: '+40% Hiệu quả lệnh "Nghi Binh Rút Lui" nhử địch vào trận địa mai phục',
  specialty: '+40% Hiệu quả lệnh "Nghi Binh Rút Lui" nhử địch vào trận địa mai phục',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1418,
  joinMonth: 2,
  joinDay: 10,
  deathYear: 1427,
  lore: 'Cặp bài trùng với Đinh Lễ, người trực tiếp khiêu chiến và giả thua nhử đại quân Vương Thông lọt vào bẫy đầm lầy Tốt Động - Chúc Động.',
};
