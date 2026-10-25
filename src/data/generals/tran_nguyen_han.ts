import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: TRẦN NGUYÊN HÃN
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const tran_nguyen_han: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'tran_nguyen_han',
  name: 'Trần Nguyên Hãn',
  hanzi: '陳元扞',
  portraitUrl: undefined,
  title: 'TẢ TƯỚNG QUỐC',
  epithet: 'Trung Liệt Vương / Thủy Lục Tịnh Tiến',
  group: 'quy_tu_1420_1426',
  unlocked: false,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'red',
  stats: {
    command: 87,   // Thống Lĩnh (1 - 100)
    martial: 84,   // Võ Nghệ   (1 - 100)
    intellect: 88, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["navy","infantry"],
  buffName: 'HẠ XƯƠNG GIANG',
  buffDescription: '+40% Sức công thành (Trận Xương Giang) & tinh thông cả thủy chiến lẫn bộ chiến',
  specialty: '+40% Sức công thành (Trận Xương Giang) & tinh thông cả thủy chiến lẫn bộ chiến',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1422,
  joinMonth: 2,
  joinDay: 1,
  lore: 'Dòng dõi tôn thất nhà Trần (cháu nội Tư đồ Trần Nguyên Đán), từ Lập Thạch tìm vào Thanh Hóa phò Lê Lợi, hạ thành Xương Giang trước khi viện binh Liễu Thăng kịp tới.',
};
