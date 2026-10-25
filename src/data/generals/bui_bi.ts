import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: BÙI BỊ
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const bui_bi: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'bui_bi',
  name: 'Bùi Bị',
  hanzi: '裴備',
  portraitUrl: undefined,
  title: 'THIẾU BẢO',
  epithet: 'Quản Khố Tổng Quản',
  group: 'khoi_nghia_1418',
  unlocked: false,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'silver',
  stats: {
    command: 72,   // Thống Lĩnh (1 - 100)
    martial: 68,   // Võ Nghệ   (1 - 100)
    intellect: 84, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["infantry"],
  buffName: 'QUẢN KHỐ TÍCH',
  buffDescription: '+30% Sản lượng Thu Lương và bảo quản quân nhu',
  specialty: '+30% Sản lượng Thu Lương và bảo quản quân nhu',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1418,
  joinMonth: 2,
  joinDay: 18,
  lore: 'Bậc lão thành thông thạo việc quản lý kho tàng, giúp nghĩa quân duy trì lương thảo qua những mùa vây ráp.',
};
