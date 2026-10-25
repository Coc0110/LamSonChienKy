import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: NGUYỄN CHÍCH
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const nguyen_chich: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'nguyen_chich',
  name: 'Nguyễn Chích',
  hanzi: '阮隻',
  portraitUrl: undefined,
  title: 'ĐÌNH THƯỢNG HẦU',
  epithet: 'Định Quốc Phá Địch - Hiến Kế Đánh Nghệ An',
  group: 'quy_tu_1420_1426',
  unlocked: false,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'gold',
  stats: {
    command: 84,   // Thống Lĩnh (1 - 100)
    martial: 82,   // Võ Nghệ   (1 - 100)
    intellect: 87, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["infantry","cavalry"],
  buffName: 'ĐỊNH NGHỆ AN',
  buffDescription: 'Đem theo 1.500 nghĩa quân Hoàng Nghiêu gia nhập; mở khóa chiến lược "Tiến vào Nghệ An"',
  specialty: 'Đem theo 1.500 nghĩa quân Hoàng Nghiêu gia nhập; mở khóa chiến lược "Tiến vào Nghệ An"',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1420,
  joinMonth: 3,
  joinDay: 10,
  lore: 'Thủ lĩnh nghĩa quân Hoàng Nghiêu (Đông Sơn) đem toàn bộ lực lượng quy tụ với Lê Lợi, năm 1424 hiến kế chuyển hướng vào Nghệ An làm xoay chuyển cục diện.',
};
