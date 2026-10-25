import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: LÊ NINH
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const le_ninh: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'le_ninh',
  name: 'Lê Ninh',
  hanzi: '黎寧',
  portraitUrl: undefined,
  title: 'THIẾU ÚY',
  epithet: 'Sơn Lâm Du Kích',
  group: 'lung_nhai_1416',
  unlocked: true,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'silver',
  stats: {
    command: 76,   // Thống Lĩnh (1 - 100)
    martial: 78,   // Võ Nghệ   (1 - 100)
    intellect: 79, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["archer"],
  buffName: 'ẨN THÂN PHỤC',
  buffDescription: '+30% Độ ẩn thân (Tàng hình quân) khi di chuyển trong rừng',
  specialty: '+30% Độ ẩn thân (Tàng hình quân) khi di chuyển trong rừng',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1416,
  joinMonth: 2,
  joinDay: 1,
  lore: 'Thông thuộc từng con suối, hẻm núi vùng thượng đạo Thanh Hóa, giúp nghĩa quân ẩn náu an toàn trước quân Minh.',
};
