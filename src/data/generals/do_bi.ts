import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: ĐỖ BÍ
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const do_bi: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'do_bi',
  name: 'Đỗ Bí',
  hanzi: '杜秘',
  portraitUrl: undefined,
  title: 'ĐÔ ĐỐC TƯỚNG QUÂN',
  epithet: 'Tốc Chiến Tiên Phong',
  group: 'quy_tu_1420_1426',
  unlocked: false,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'silver',
  stats: {
    command: 82,   // Thống Lĩnh (1 - 100)
    martial: 84,   // Võ Nghệ   (1 - 100)
    intellect: 77, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["cavalry"],
  buffName: 'TỐC BẮC PHẠT',
  buffDescription: '+30% Tốc độ hành quân đường dài & đánh tập kích chớp nhoáng',
  specialty: '+30% Tốc độ hành quân đường dài & đánh tập kích chớp nhoáng',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1420,
  joinMonth: 5,
  joinDay: 1,
  lore: 'Danh tướng dũng mãnh tham gia nhiều chiến dịch lớn từ Bồ Mộng, Kình Lộng đến chiến dịch Bắc tiến.',
};
