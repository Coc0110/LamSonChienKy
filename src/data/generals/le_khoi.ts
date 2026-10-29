import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: LÊ KHÔI
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const le_khoi: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'le_khoi',
  name: 'Lê Khôi',
  hanzi: '黎魁',
  portraitUrl: '/generals/le_khoi.png?v=1',
  title: 'CHIÊU TRƯNG VƯƠNG',
  epithet: 'Bàn Tay Thép Bắt Sống Hoàng Phúc',
  group: 'khoi_nghia_1418',
  unlocked: false,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'gold',
  stats: {
    command: 83,   // Thống Lĩnh (1 - 100)
    martial: 86,   // Võ Nghệ   (1 - 100)
    intellect: 78, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["cavalry"],
  buffName: 'KỴ BINH ĐỘT',
  buffDescription: '+35% Sức đột kích kỵ binh, tăng khả năng bắt sống tướng giặc',
  specialty: '+35% Sức đột kích kỵ binh, tăng khả năng bắt sống tướng giặc',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1418,
  joinMonth: 2,
  joinDay: 10,
  lore: 'Cháu gọi Lê Lợi bằng chú, dũng tướng trăm trận trăm thắng, từng bắt sống Thượng thư Hoàng Phúc và Đô đốc Chu Kiệt.',
};
