import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: LÊ VĂN AN
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const le_van_an: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'le_van_an',
  name: 'Lê Văn An',
  hanzi: '黎文安',
  portraitUrl: '/generals/le_van_an.png?v=2',
  title: 'THÁI PHÓ',
  epithet: 'Trụ Thạch Hậu Cần',
  group: 'lung_nhai_1416',
  unlocked: true,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'gold',
  stats: {
    command: 78,   // Thống Lĩnh (1 - 100)
    martial: 75,   // Võ Nghệ   (1 - 100)
    intellect: 82, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["infantry"],
  buffName: 'VẬN LƯƠNG TRỤ',
  buffDescription: '-20% Tiêu hao lương thảo của đạo quân đi cùng, giỏi công thành',
  specialty: '-20% Tiêu hao lương thảo của đạo quân đi cùng, giỏi công thành',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1416,
  joinMonth: 2,
  joinDay: 1,
  lore: 'Lão tướng trầm ổn của Hội thề Lũng Nhai, luôn đảm đương việc vận lương và bao vây các thành trì kiên cố.',
};
