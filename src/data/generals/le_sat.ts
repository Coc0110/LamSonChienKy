import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: LÊ SÁT
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const le_sat: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'le_sat',
  name: 'Lê Sát',
  hanzi: '黎察',
  portraitUrl: '/generals/le_sat.png?v=7',
  title: 'ĐẠI TƯ ĐỒ',
  epithet: 'Trảm Tướng Lê Sát - Người Chém Liễu Thăng',
  group: 'lung_nhai_1416',
  unlocked: true,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'red',
  stats: {
    command: 83,   // Thống Lĩnh (1 - 100)
    martial: 88,   // Võ Nghệ   (1 - 100)
    intellect: 74, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["infantry","cavalry"],
  buffName: 'TRẢM SOÁI',
  buffDescription: '+35% Sát thương xung kích, tăng tỷ lệ trảm tướng địch trong phục kích',
  specialty: '+35% Sát thương xung kích, tăng tỷ lệ trảm tướng địch trong phục kích',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1416,
  joinMonth: 2,
  joinDay: 1,
  lore: 'Dũng tướng trí dũng song toàn, lập vô số chiến công từ Lạc Thủy đến Chi Lăng - Xương Giang, chém đầu An Viễn hầu Liễu Thăng.',
};
