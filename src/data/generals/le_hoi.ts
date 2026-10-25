import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: LÊ HỒI
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const le_hoi: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'le_hoi',
  name: 'Lê Hồi',
  hanzi: '黎回',
  portraitUrl: undefined,
  title: 'ĐẠI TƯỚNG QUÂN',
  epithet: 'Thiết Giáp Binh',
  group: 'lung_nhai_1416',
  unlocked: true,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'silver',
  stats: {
    command: 78,   // Thống Lĩnh (1 - 100)
    martial: 81,   // Võ Nghệ   (1 - 100)
    intellect: 71, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["infantry"],
  buffName: 'THIẾT GIÁP TRẬN',
  buffDescription: '-15% Thương vong cho nghĩa quân khi giao chiến cận chiến',
  specialty: '-15% Thương vong cho nghĩa quân khi giao chiến cận chiến',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1416,
  joinMonth: 2,
  joinDay: 1,
  lore: 'Khai quốc công thần từ buổi đầu Lũng Nhai, luôn sát cánh giữ vững đội hình trước các đợt tấn công của giặc.',
};
