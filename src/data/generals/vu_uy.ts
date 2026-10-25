import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: VŨ UY
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const vu_uy: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'vu_uy',
  name: 'Vũ Uy',
  hanzi: '武威',
  portraitUrl: undefined,
  title: 'THIẾU ÚY',
  epithet: 'Cung Tiễn Xạ Đội',
  group: 'lung_nhai_1416',
  unlocked: true,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'silver',
  stats: {
    command: 77,   // Thống Lĩnh (1 - 100)
    martial: 83,   // Võ Nghệ   (1 - 100)
    intellect: 74, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["archer"],
  buffName: 'HỎA TIỄN TRẬN',
  buffDescription: '+25% Sát thương tầm xa khi bắn tên từ sườn đồi / ải cao',
  specialty: '+25% Sát thương tầm xa khi bắn tên từ sườn đồi / ải cao',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1416,
  joinMonth: 2,
  joinDay: 1,
  lore: 'Chỉ huy đội cung nỏ phục kích từ trên sườn núi, gây sát thương lớn trước khi bộ binh xung phong.',
};
