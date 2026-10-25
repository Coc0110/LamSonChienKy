import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: LÊ LỰU
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const le_luu: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'le_luu',
  name: 'Lê Lựu',
  hanzi: '黎榴',
  portraitUrl: undefined,
  title: 'THIẾU ÚY',
  epithet: 'Cận Vệ Đội Trưởng',
  group: 'quy_tu_1420_1426',
  unlocked: false,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'silver',
  stats: {
    command: 79,   // Thống Lĩnh (1 - 100)
    martial: 83,   // Võ Nghệ   (1 - 100)
    intellect: 73, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["cavalry"],
  buffName: 'THIẾT CẬN VỆ',
  buffDescription: '+30% Sức phòng vệ cho đạo quân chủ lực của Bình Định Vương',
  specialty: '+30% Sức phòng vệ cho đạo quân chủ lực của Bình Định Vương',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1420,
  joinMonth: 5,
  joinDay: 1,
  lore: 'Võ tướng trung dũng chỉ huy đội quân thiết đột bảo vệ trung quân trong các chiến dịch mở rộng.',
};
