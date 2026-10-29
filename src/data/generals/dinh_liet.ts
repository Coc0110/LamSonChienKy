import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: ĐINH LIỆT
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const dinh_liet: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'dinh_liet',
  name: 'Đinh Liệt',
  hanzi: '丁列',
  portraitUrl: '/generals/dinh_liet.png?v=1',
  title: 'LÂN QUỐC CÔNG',
  epithet: 'Trường Thương Đinh Liệt',
  group: 'khoi_nghia_1418',
  unlocked: false,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'gold',
  stats: {
    command: 82,   // Thống Lĩnh (1 - 100)
    martial: 84,   // Võ Nghệ   (1 - 100)
    intellect: 79, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["infantry"],
  buffName: 'TRƯỜNG THƯƠNG KHÓA',
  buffDescription: '+30% Sức mạnh thương binh & khả năng khóa chặt đường rút của địch',
  specialty: '+30% Sức mạnh thương binh & khả năng khóa chặt đường rút của địch',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1418,
  joinMonth: 2,
  joinDay: 10,
  lore: 'Em ruột Đinh Lễ, danh tướng tài ba từng chỉ huy quân luồn đường tắt chiếm ải Linh Cảm ở Nghệ An.',
};
