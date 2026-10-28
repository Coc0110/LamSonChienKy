import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: NGUYỄN XÍ
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const nguyen_xi: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'nguyen_xi',
  name: 'Nguyễn Xí',
  hanzi: '阮熾',
  portraitUrl: undefined,
  title: 'THÁI BẢO KHUYỂN VƯƠNG',
  epithet: 'Tướng Điều Khiển Bầy Chó Săn',
  group: 'khoi_nghia_1418',
  unlocked: false,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'red',
  stats: {
    command: 81,   // Thống Lĩnh (1 - 100)
    martial: 83,   // Võ Nghệ   (1 - 100)
    intellect: 84, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["infantry"],
  buffName: 'DẠ KHUYỂN',
  buffDescription: 'Tuyệt kỹ "Khuyển Dạ Tập": Buộc nhạc vào cổ chó săn gây rối loạn trại địch ban đêm',
  specialty: 'Tuyệt kỹ "Khuyển Dạ Tập": Buộc nhạc vào cổ chó săn gây rối loạn trại địch ban đêm',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1418,
  joinMonth: 2,
  joinDay: 10,
  lore: 'Gia nhập nghĩa quân khi mới 14 tuổi, dùng đàn chó săn đeo nhạc đánh lừa quân Minh bắn hết tên tại núi Chí Linh.',
};
