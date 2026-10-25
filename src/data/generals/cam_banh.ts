import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: CẦM BÀNH
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const cam_banh: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'cam_banh',
  name: 'Cầm Bành',
  hanzi: '琴彭',
  portraitUrl: undefined,
  title: 'TRI PHỦ TRÀ LONG',
  epithet: 'Hàng Tướng Trung Thành',
  group: 'quy_tu_1420_1426',
  unlocked: false,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'silver',
  stats: {
    command: 80,   // Thống Lĩnh (1 - 100)
    martial: 79,   // Võ Nghệ   (1 - 100)
    intellect: 78, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["infantry"],
  buffName: 'CHIÊU DÂN QUY',
  buffDescription: '+35% Sức ảnh hưởng và chiêu mộ binh lính vùng biên viễn Nghệ An - Trà Long',
  specialty: '+35% Sức ảnh hưởng và chiêu mộ binh lính vùng biên viễn Nghệ An - Trà Long',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1424,
  joinMonth: 10,
  joinDay: 12,
  lore: 'Sau khi giữ thành Trà Long chờ viện binh Minh không được, cảm phục ân uy của Lê Lợi và thư chiêu hàng của Nguyễn Trãi mà dốc lòng quy thuận.',
};
