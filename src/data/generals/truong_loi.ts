import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: TRƯƠNG LÔI
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const truong_loi: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'truong_loi',
  name: 'Trương Lôi',
  hanzi: '張雷',
  portraitUrl: undefined,
  title: 'THÁI PHÓ',
  epithet: 'Thiết Tiên Trương Lôi',
  group: 'lung_nhai_1416',
  unlocked: true,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'silver',
  stats: {
    command: 78,   // Thống Lĩnh (1 - 100)
    martial: 85,   // Võ Nghệ   (1 - 100)
    intellect: 71, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["infantry"],
  buffName: 'THIẾT TIÊN PHÁ',
  buffDescription: '+25% Sát thương phá giáp trước bộ binh nặng của quân Minh',
  specialty: '+25% Sát thương phá giáp trước bộ binh nặng của quân Minh',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1416,
  joinMonth: 2,
  joinDay: 1,
  lore: 'Dũng tướng Lũng Nhai nổi tiếng với sức mạnh phi thường, luôn đi đầu trong các trận đánh giáp lá cà.',
};
