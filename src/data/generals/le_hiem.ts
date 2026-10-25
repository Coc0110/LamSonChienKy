import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: LÊ HIỂM
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const le_hiem: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'le_hiem',
  name: 'Lê Hiểm',
  hanzi: '黎險',
  portraitUrl: undefined,
  title: 'THIẾU ÚY',
  epithet: 'Bức Tường Chí Linh',
  group: 'lung_nhai_1416',
  unlocked: true,
  locationId: 'chi_linh',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'silver',
  stats: {
    command: 80,   // Thống Lĩnh (1 - 100)
    martial: 79,   // Võ Nghệ   (1 - 100)
    intellect: 74, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["infantry"],
  buffName: 'CỐ THỦ HIỂM',
  buffDescription: '+30% Phòng ngự khi trấn giữ căn cứ trên núi cao',
  specialty: '+30% Phòng ngự khi trấn giữ căn cứ trên núi cao',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1416,
  joinMonth: 2,
  joinDay: 1,
  lore: 'Chuyên trách phòng thủ các hiểm địa và căn cứ Núi Chí Linh trong những năm tháng bị quân Minh vây ráp.',
};
