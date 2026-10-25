import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: PHẠM CUỐNG
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const pham_cuong: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'pham_cuong',
  name: 'Phạm Cuống',
  hanzi: '范誑',
  portraitUrl: undefined,
  title: 'ĐÔ ÚY',
  epithet: 'Mũi Giáo Thiết Kỵ',
  group: 'khoi_nghia_1418',
  unlocked: false,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'silver',
  stats: {
    command: 79,   // Thống Lĩnh (1 - 100)
    martial: 83,   // Võ Nghệ   (1 - 100)
    intellect: 72, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["cavalry"],
  buffName: 'TRUY KÍCH KỴ',
  buffDescription: '+30% Sức đột kích của Kỵ binh trên địa hình bằng phẳng',
  specialty: '+30% Sức đột kích của Kỵ binh trên địa hình bằng phẳng',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1418,
  joinMonth: 2,
  joinDay: 18,
  lore: 'Chỉ huy đội kỵ binh cơ động của nghĩa quân Lam Sơn, chuyên truy kích địch khi chúng vỡ trận.',
};
