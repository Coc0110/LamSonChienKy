import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: PHẠM NGỌC
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const pham_ngoc: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'pham_ngoc',
  name: 'Phạm Ngọc',
  hanzi: '范玉',
  portraitUrl: undefined,
  title: 'Y TĂNG ĐẠI SƯ',
  epithet: 'Nhà Sư Lỗi Giang / Y Tăng Trị Liệu',
  group: 'khoi_nghia_1418',
  unlocked: false,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'gold',
  stats: {
    command: 70,   // Thống Lĩnh (1 - 100)
    martial: 65,   // Võ Nghệ   (1 - 100)
    intellect: 85, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["infantry"],
  buffName: 'Y TĂNG LIỆU',
  buffDescription: 'Cứu chữa thương binh, hồi phục 20% quân số tổn thất sau mỗi trận đánh',
  specialty: 'Cứu chữa thương binh, hồi phục 20% quân số tổn thất sau mỗi trận đánh',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1418,
  joinMonth: 2,
  joinDay: 18,
  lore: 'Bậc chân tu tinh thông y thuật và địa lý vùng Lỗi Giang, giúp nghĩa quân cứu chữa thương binh và vượt bệnh dịch rừng thiêng.',
};
