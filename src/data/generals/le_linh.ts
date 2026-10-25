import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: LÊ LĨNH
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const le_linh: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'le_linh',
  name: 'Lê Lĩnh',
  hanzi: '黎嶺',
  portraitUrl: undefined,
  title: 'THIẾU ÚY',
  epithet: 'Du Kích Lâm Chiến',
  group: 'khoi_nghia_1418',
  unlocked: false,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'silver',
  stats: {
    command: 77,   // Thống Lĩnh (1 - 100)
    martial: 80,   // Võ Nghệ   (1 - 100)
    intellect: 75, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["archer"],
  buffName: 'DU KÍCH SƠN',
  buffDescription: '+25% Tốc độ di chuyển trong địa hình Rừng núi',
  specialty: '+25% Tốc độ di chuyển trong địa hình Rừng núi',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1418,
  joinMonth: 2,
  joinDay: 18,
  lore: 'Tướng lĩnh thông thuộc địa hình rừng núi Thanh Hóa, dẫn quân tập kích bất ngờ rồi rút êm vào rừng sâu.',
};
