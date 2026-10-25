import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: NGUYỄN LỖI
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const nguyen_loi: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'nguyen_loi',
  name: 'Nguyễn Lỗi',
  hanzi: '阮磊',
  portraitUrl: undefined,
  title: 'ĐÔ ĐỐC',
  epithet: 'Thạch Lũy Đô Đốc',
  group: 'khoi_nghia_1418',
  unlocked: false,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'silver',
  stats: {
    command: 78,   // Thống Lĩnh (1 - 100)
    martial: 78,   // Võ Nghệ   (1 - 100)
    intellect: 74, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["infantry"],
  buffName: 'CỐ CÔNG SỰ',
  buffDescription: '+20% Tốc độ dựng trại và củng cố công sự',
  specialty: '+20% Tốc độ dựng trại và củng cố công sự',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1418,
  joinMonth: 2,
  joinDay: 18,
  lore: 'Tướng lĩnh dày dạn kinh nghiệm gia nhập từ năm 1418, sau được phong tới chức Đô đốc.',
};
