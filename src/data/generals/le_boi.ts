import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: LÊ BỒI
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const le_boi: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'le_boi',
  name: 'Lê Bồi',
  hanzi: '黎培',
  portraitUrl: undefined,
  title: 'THIẾU ÚY',
  epithet: 'Trấn Ải Tướng Quân',
  group: 'khoi_nghia_1418',
  unlocked: false,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'silver',
  stats: {
    command: 79,   // Thống Lĩnh (1 - 100)
    martial: 81,   // Võ Nghệ   (1 - 100)
    intellect: 73, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["infantry"],
  buffName: 'TRẤN HIỂM QUAN',
  buffDescription: '+30% Phòng thủ tại các điểm Quan ải (Chokepoint)',
  specialty: '+30% Phòng thủ tại các điểm Quan ải (Chokepoint)',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1418,
  joinMonth: 2,
  joinDay: 18,
  lore: 'Dũng tướng buổi đầu khởi nghĩa, chuyên trấn giữ các hẻm núi hiểm yếu ngăn quân Minh tiến sâu.',
};
