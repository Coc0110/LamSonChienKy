import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: LÝ CỐT
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const ly_cot: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'ly_cot',
  name: 'Lý Cốt',
  hanzi: '李骨',
  portraitUrl: undefined,
  title: 'TƯỚNG QUÂN',
  epithet: 'Thiết Cốt Chiến Tướng',
  group: 'khoi_nghia_1418',
  unlocked: false,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'silver',
  stats: {
    command: 75,   // Thống Lĩnh (1 - 100)
    martial: 81,   // Võ Nghệ   (1 - 100)
    intellect: 68, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["infantry"],
  buffName: 'DŨNG NGHỊCH THẾ',
  buffDescription: '+20% Sĩ khí khi quân số ít hơn địch',
  specialty: '+20% Sĩ khí khi quân số ít hơn địch',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1418,
  joinMonth: 2,
  joinDay: 18,
  lore: 'Võ tướng gan góc không lùi bước trước thế giặc đông đảo trong những năm đầu khởi nghĩa.',
};
