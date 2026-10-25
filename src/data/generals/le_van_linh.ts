import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: LÊ VĂN LINH
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const le_van_linh: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'le_van_linh',
  name: 'Lê Văn Linh',
  hanzi: '黎文靈',
  portraitUrl: undefined,
  title: 'THÁI PHÓ',
  epithet: 'Trí Tướng Lũng Nhai',
  group: 'lung_nhai_1416',
  unlocked: true,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'gold',
  stats: {
    command: 75,   // Thống Lĩnh (1 - 100)
    martial: 66,   // Võ Nghệ   (1 - 100)
    intellect: 86, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["infantry"],
  buffName: 'DƯỠNG LÒNG DÂN',
  buffDescription: '+25% Tốc độ thu gom lương thảo & ổn định lòng dân tại căn cứ',
  specialty: '+25% Tốc độ thu gom lương thảo & ổn định lòng dân tại căn cứ',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1416,
  joinMonth: 2,
  joinDay: 1,
  lore: 'Mưu sĩ kỳ cựu bên cạnh Bình Định Vương từ những ngày đầu gian khổ nhất ở núi rừng Chí Linh.',
};
