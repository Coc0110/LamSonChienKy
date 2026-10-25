import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: LÊ LIỄU
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const le_lieu: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'le_lieu',
  name: 'Lê Liễu',
  hanzi: '黎柳',
  portraitUrl: undefined,
  title: 'THÁI PHÓ',
  epithet: 'Dũng Tướng Bộ Binh',
  group: 'lung_nhai_1416',
  unlocked: true,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'silver',
  stats: {
    command: 79,   // Thống Lĩnh (1 - 100)
    martial: 82,   // Võ Nghệ   (1 - 100)
    intellect: 72, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["infantry"],
  buffName: 'LÂM CHIẾN BỀN',
  buffDescription: '+20% Sức bền bộ binh khi hành quân đường núi',
  specialty: '+20% Sức bền bộ binh khi hành quân đường núi',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1416,
  joinMonth: 2,
  joinDay: 1,
  lore: 'Hào kiệt đất Lam Sơn sớm theo Lê Lợi lập lời thề, kiên cường chiến đấu suốt 10 năm kháng chiến.',
};
