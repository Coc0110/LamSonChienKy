import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: TRỊNH LỖI
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const trinh_loi: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'trinh_loi',
  name: 'Trịnh Lỗi',
  hanzi: '鄭磊',
  portraitUrl: undefined,
  title: 'ĐÔ ĐỐC',
  epithet: 'Tiền Phong Đô Đốc',
  group: 'khoi_nghia_1418',
  unlocked: false,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'silver',
  stats: {
    command: 78,   // Thống Lĩnh (1 - 100)
    martial: 80,   // Võ Nghệ   (1 - 100)
    intellect: 73, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["infantry"],
  buffName: 'CÔNG ĐỒN NGOẠI',
  buffDescription: '+20% Sức công phá đồn trại ngoại vi của quân Minh',
  specialty: '+20% Sức công phá đồn trại ngoại vi của quân Minh',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1418,
  joinMonth: 2,
  joinDay: 18,
  lore: 'Cùng các hào kiệt xứ Thanh tụ nghĩa dưới cờ Bình Định Vương, lập nhiều công trạng hiển hách.',
};
