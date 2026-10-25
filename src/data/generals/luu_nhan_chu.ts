import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: LƯU NHÂN CHÚ
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const luu_nhan_chu: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'luu_nhan_chu',
  name: 'Lưu Nhân Chú',
  hanzi: '劉仁澍',
  portraitUrl: undefined,
  title: 'TỂ TƯỚNG ĐẠI TƯ MÃ',
  epithet: 'Hắc Ám Phục Kích',
  group: 'lung_nhai_1416',
  unlocked: true,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'gold',
  stats: {
    command: 84,   // Thống Lĩnh (1 - 100)
    martial: 81,   // Võ Nghệ   (1 - 100)
    intellect: 85, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["infantry","archer"],
  buffName: 'SƠN LÂM PHỤC',
  buffDescription: '+35% Sát thương khi Mai Phục ở hẻm núi & rừng rậm',
  specialty: '+35% Sát thương khi Mai Phục ở hẻm núi & rừng rậm',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1416,
  joinMonth: 2,
  joinDay: 1,
  lore: 'Danh tướng đất Thái Nguyên lặn lội vào Thanh Hóa dự Hội thề Lũng Nhai, bậc thầy điều binh phục kích.',
};
