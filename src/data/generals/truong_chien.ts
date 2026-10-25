import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: TRƯƠNG CHIẾN
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const truong_chien: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'truong_chien',
  name: 'Trương Chiến',
  hanzi: '張戰',
  portraitUrl: undefined,
  title: 'THIẾU ÚY',
  epithet: 'Xung Kích Tiên Phong',
  group: 'lung_nhai_1416',
  unlocked: true,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'silver',
  stats: {
    command: 77,   // Thống Lĩnh (1 - 100)
    martial: 84,   // Võ Nghệ   (1 - 100)
    intellect: 70, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["cavalry"],
  buffName: 'TIÊN PHONG ĐẠO',
  buffDescription: '+20% Tốc độ hành quân khi làm đạo quân tiên phong',
  specialty: '+20% Tốc độ hành quân khi làm đạo quân tiên phong',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1416,
  joinMonth: 2,
  joinDay: 1,
  lore: 'Tướng tiên phong gan dạ trong nhóm 18 anh hùng Lũng Nhai, không ngại hiểm nguy mở đường máu.',
};
