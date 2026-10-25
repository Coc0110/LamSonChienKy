import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: CẦM LẠN
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const cam_lan: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'cam_lan',
  name: 'Cầm Lạn',
  hanzi: '琴爛',
  portraitUrl: undefined,
  title: 'THỦ LĨNH NGỌC MA',
  epithet: 'Dẫn Lộ Sơn Lâm',
  group: 'quy_tu_1420_1426',
  unlocked: false,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'silver',
  stats: {
    command: 77,   // Thống Lĩnh (1 - 100)
    martial: 78,   // Võ Nghệ   (1 - 100)
    intellect: 79, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["infantry"],
  buffName: 'DẪN LỘ ĐẠO',
  buffDescription: 'Mở thông mọi tuyến đường rừng hiểm trở vùng Tây Nam mà không giảm tốc độ',
  specialty: 'Mở thông mọi tuyến đường rừng hiểm trở vùng Tây Nam mà không giảm tốc độ',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1424,
  joinMonth: 11,
  joinDay: 1,
  lore: 'Tù trưởng địa phương thông thuộc đường sá núi rừng, trực tiếp dẫn đường cho nghĩa quân Lam Sơn tiến đánh đồn Đa Căng và Bồ Đằng.',
};
