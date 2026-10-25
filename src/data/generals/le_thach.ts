import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: LÊ THẠCH
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const le_thach: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'le_thach',
  name: 'Lê Thạch',
  hanzi: '黎石',
  portraitUrl: undefined,
  title: 'ĐÌNH THƯỢNG HẦU',
  epithet: 'Chiến Thần Vô Song (Tử trận 1421)',
  group: 'khoi_nghia_1418',
  unlocked: false,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'red',
  stats: {
    command: 87,   // Thống Lĩnh (1 - 100)
    martial: 95,   // Võ Nghệ   (1 - 100)
    intellect: 74, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["cavalry","infantry"],
  buffName: 'CHIẾN THẦN TIÊN',
  buffDescription: '+45% Sức tấn công tiên phong, đánh bại Mã Kỳ ở Lạc Thủy',
  specialty: '+45% Sức tấn công tiên phong, đánh bại Mã Kỳ ở Lạc Thủy',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1418,
  joinMonth: 2,
  joinDay: 10,
  deathYear: 1421,
  lore: 'Con của anh trai Lê Lợi, dũng tướng số một giai đoạn đầu khởi nghĩa, lập công đầu ở trận Lạc Thủy (1418), hy sinh vì trúng tên tẩm độc ở Ai Lao (1421).',
};
