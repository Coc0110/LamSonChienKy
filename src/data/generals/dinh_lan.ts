import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: ĐINH LAN
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const dinh_lan: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'dinh_lan',
  name: 'Đinh Lan',
  hanzi: '丁蘭',
  portraitUrl: undefined,
  title: 'THÁI BẢO',
  epithet: 'Hộ Giá Công Thần',
  group: 'lung_nhai_1416',
  unlocked: true,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'silver',
  stats: {
    command: 78,   // Thống Lĩnh (1 - 100)
    martial: 80,   // Võ Nghệ   (1 - 100)
    intellect: 76, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["infantry"],
  buffName: 'HỘ TRUNG QUÂN',
  buffDescription: '+25% Phòng vệ cho đại bản doanh và kho lương',
  specialty: '+25% Phòng vệ cho đại bản doanh và kho lương',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1416,
  joinMonth: 2,
  joinDay: 1,
  lore: 'Tướng thân cận bảo vệ trung quân của Lê Lợi trong suốt những lần rút lui chiến thuật đầy cam go.',
};
