import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: LÊ NGÂN
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const le_ngan: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'le_ngan',
  name: 'Lê Ngân',
  hanzi: '黎銀',
  portraitUrl: undefined,
  title: 'ĐẠI TƯ MÃ',
  epithet: 'Thủy Sư Đô Đốc',
  group: 'khoi_nghia_1418',
  unlocked: false,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'gold',
  stats: {
    command: 82,   // Thống Lĩnh (1 - 100)
    martial: 80,   // Võ Nghệ   (1 - 100)
    intellect: 83, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["navy"],
  buffName: 'THỦY SƯ ĐÔ',
  buffDescription: '-50% Thời gian vượt sông, +40% sức chiến đấu khi đánh ven sông',
  specialty: '-50% Thời gian vượt sông, +40% sức chiến đấu khi đánh ven sông',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1418,
  joinMonth: 2,
  joinDay: 10,
  lore: 'Danh tướng thủy quân người Lôi Dương, góp công lớn trong các trận thủy chiến trên sông Mã và sông Lam.',
};
