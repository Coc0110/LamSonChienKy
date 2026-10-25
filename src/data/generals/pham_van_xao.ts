import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: PHẠM VĂN XẢO
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const pham_van_xao: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'pham_van_xao',
  name: 'Phạm Văn Xảo',
  hanzi: '范文巧',
  portraitUrl: undefined,
  title: 'THÁI BẢO',
  epithet: 'Ngoại Giao Đại Thần & Danh Tướng Bắc Tiến',
  group: 'quy_tu_1420_1426',
  unlocked: false,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'gold',
  stats: {
    command: 83,   // Thống Lĩnh (1 - 100)
    martial: 78,   // Võ Nghệ   (1 - 100)
    intellect: 86, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["infantry","archer"],
  buffName: 'CHẶN LÊ HOA',
  buffDescription: 'Chặn đứng viện binh Vân Nam của Mộc Thạnh tại Lê Hoa, giỏi ngoại giao nghị hòa',
  specialty: 'Chặn đứng viện binh Vân Nam của Mộc Thạnh tại Lê Hoa, giỏi ngoại giao nghị hòa',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1420,
  joinMonth: 5,
  joinDay: 1,
  lore: 'Hào kiệt đất Thăng Long tìm vào Thanh Hóa tụ nghĩa, sau này chỉ huy cánh quân Tây Bắc đánh bại viện binh của Mộc Thạnh.',
};
