import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: CẦM QUÝ
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const cam_quy: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'cam_quy',
  name: 'Cầm Quý',
  hanzi: '琴貴',
  portraitUrl: undefined,
  title: 'TÙ TRƯỞNG QUỲ CHÂU',
  epithet: 'Sơn Cước Lãnh Chúa',
  group: 'quy_tu_1420_1426',
  unlocked: false,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'gold',
  stats: {
    command: 81,   // Thống Lĩnh (1 - 100)
    martial: 82,   // Võ Nghệ   (1 - 100)
    intellect: 75, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["elephant"],
  buffName: 'SƠN TƯỢNG ĐỘI',
  buffDescription: 'Đem 8.000 quân địa phương và 10 Voi chiến gia nhập nghĩa quân Lam Sơn',
  specialty: 'Đem 8.000 quân địa phương và 10 Voi chiến gia nhập nghĩa quân Lam Sơn',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1424,
  joinMonth: 11,
  joinDay: 1,
  lore: 'Thủ lĩnh vùng Quỳ Châu (Nghệ An) đem hàng ngàn tráng đinh và voi chiến hùng mạnh về tụ nghĩa, tiếp thêm sức mạnh to lớn cho nghĩa quân.',
};
