import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: TRỊNH TUÂN
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const trinh_tuan: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'trinh_tuan',
  name: 'Trịnh Tuân',
  hanzi: '鄭遵',
  portraitUrl: undefined,
  title: 'TƯỚNG QUÂN',
  epithet: 'Tuần Tiễu Tiên Phong',
  group: 'khoi_nghia_1418',
  unlocked: false,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'silver',
  stats: {
    command: 76,   // Thống Lĩnh (1 - 100)
    martial: 77,   // Võ Nghệ   (1 - 100)
    intellect: 72, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["cavalry"],
  buffName: 'CẢNH GIỚI TIỄU',
  buffDescription: '+20% Tầm phát hiện quân địch xung quanh trại',
  specialty: '+20% Tầm phát hiện quân địch xung quanh trại',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1418,
  joinMonth: 2,
  joinDay: 18,
  lore: 'Vị tướng dũng cảm gia nhập nghĩa quân năm 1418, chuyên dẫn đội tuần tiễu cảnh giới.',
};
