import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: BÙI QUỐC HƯNG
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const bui_quoc_hung: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'bui_quoc_hung',
  name: 'Bùi Quốc Hưng',
  hanzi: '裴國興',
  portraitUrl: '/generals/bui_quoc_hung.png?v=1',
  title: 'NHẬP NỘI TƯ ĐỒ',
  epithet: 'Hùng Binh Hữu Bật',
  group: 'lung_nhai_1416',
  unlocked: true,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'gold',
  stats: {
    command: 82,   // Thống Lĩnh (1 - 100)
    martial: 79,   // Võ Nghệ   (1 - 100)
    intellect: 83, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["infantry","archer"],
  buffName: 'VÂY THÀNH CÔNG',
  buffDescription: '+25% Hiệu quả vây thành và cắt đường tiếp lương của địch',
  specialty: '+25% Hiệu quả vây thành và cắt đường tiếp lương của địch',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1416,
  joinMonth: 2,
  joinDay: 1,
  lore: 'Văn võ toàn tài, từng chỉ huy vây hãm thành Điêu Diêu và Thị Cầu khiến quân Minh phải mở cửa đầu hàng.',
};
