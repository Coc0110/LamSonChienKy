import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: TRẦN LỰU
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const tran_luu: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'tran_luu',
  name: 'Trần Lựu',
  hanzi: '陳榴',
  portraitUrl: undefined,
  title: 'THÁI ÚY TRANG ĐỊNH HẦU',
  epithet: 'Người Nhử Mồi Ải Chi Lăng',
  group: 'quy_tu_1420_1426',
  unlocked: false,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'gold',
  stats: {
    command: 84,   // Thống Lĩnh (1 - 100)
    martial: 83,   // Võ Nghệ   (1 - 100)
    intellect: 86, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["cavalry","archer"],
  buffName: 'DỤ CHI LĂNG',
  buffDescription: '+50% Thành công khi giả thua rút lui qua các cửa ải liên hoàn (Chi Lăng)',
  specialty: '+50% Thành công khi giả thua rút lui qua các cửa ải liên hoàn (Chi Lăng)',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1426,
  joinMonth: 9,
  joinDay: 1,
  lore: 'Trấn thủ ải Pha Lũy - Chi Lăng, liên tiếp đánh rồi giả thua rút lui khiến tổng binh Liễu Thăng kiêu ngạo dẫn 100 kỵ binh lao thẳng vào chỗ chết ở núi Mã Yên.',
};
