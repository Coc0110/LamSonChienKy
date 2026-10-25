import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: TRỊNH KHẢ
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const trinh_kha: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'trinh_kha',
  name: 'Trịnh Khả',
  hanzi: '鄭可',
  portraitUrl: '/generals/trinh_kha.png?v=7',
  title: 'NHẬP NỘI THÁI ÚY',
  epithet: 'Tượng Binh Đô Đốc',
  group: 'lung_nhai_1416',
  unlocked: true,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'red',
  stats: {
    command: 84,   // Thống Lĩnh (1 - 100)
    martial: 83,   // Võ Nghệ   (1 - 100)
    intellect: 77, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["elephant"],
  buffName: 'TƯỢNG BINH PHÁ',
  buffDescription: '+45% Sức càn quét của Voi chiến (Tượng binh), giỏi tiếng Ai Lao',
  specialty: '+45% Sức càn quét của Voi chiến (Tượng binh), giỏi tiếng Ai Lao',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1416,
  joinMonth: 2,
  joinDay: 1,
  lore: 'Vị tướng gắn bó với Lê Lợi từ thuở hàn vi, chỉ huy đội tượng binh thiện chiến phá tan kỵ binh giặc Minh.',
};
