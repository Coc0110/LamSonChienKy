import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: LÊ LAI
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const le_lai: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'le_lai',
  name: 'Lê Lai',
  hanzi: '黎來',
  portraitUrl: '/generals/le_lai.png?v=3',
  title: 'TRUNG TÚC VƯƠNG',
  epithet: 'Liều Mình Cứu Chúa',
  group: 'lung_nhai_1416',
  unlocked: true,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'red',
  stats: {
    command: 88,   // Thống Lĩnh (1 - 100)
    martial: 92,   // Võ Nghệ   (1 - 100)
    intellect: 84, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["infantry"],
  buffName: 'PHÁ TRÙNG VÂY',
  buffDescription: '+40% Phòng thủ khi đoạn hậu, có thể thế thân giải vây cho chủ tướng',
  specialty: '+40% Phòng thủ khi đoạn hậu, có thể thế thân giải vây cho chủ tướng',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1416,
  joinMonth: 2,
  joinDay: 1,
  deathYear: 1419,
  lore: 'Danh tướng trung nghĩa bậc nhất Lam Sơn, năm 1419 đổi áo bào giả làm Bình Định Vương cưỡi voi xung trận tại Chí Linh để cứu chúa.',
};
