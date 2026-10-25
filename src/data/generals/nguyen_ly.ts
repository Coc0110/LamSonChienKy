import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: NGUYỄN LÝ
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const nguyen_ly: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'nguyen_ly',
  name: 'Nguyễn Lý',
  hanzi: '阮理',
  portraitUrl: undefined,
  title: 'TƯỚNG QUÂN',
  epithet: 'Đột Kích Bộ Quân',
  group: 'khoi_nghia_1418',
  unlocked: false,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'silver',
  stats: {
    command: 77,   // Thống Lĩnh (1 - 100)
    martial: 80,   // Võ Nghệ   (1 - 100)
    intellect: 71, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["infantry"],
  buffName: 'DẠ TẬP PHÁ',
  buffDescription: '+15% Sức tấn công khi đánh tập kích đồn giặc',
  specialty: '+15% Sức tấn công khi đánh tập kích đồn giặc',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1418,
  joinMonth: 2,
  joinDay: 18,
  lore: 'Danh tướng buổi đầu khởi nghĩa, lập nhiều chiến công từ vùng núi Thanh Hóa đến ngày toàn thắng.',
};
