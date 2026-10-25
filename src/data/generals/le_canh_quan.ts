import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: LÊ CẢNH QUẢN
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const le_canh_quan: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'le_canh_quan',
  name: 'Lê Cảnh Quản',
  hanzi: '黎景管',
  portraitUrl: undefined,
  title: 'TƯỚNG QUÂN',
  epithet: 'Quân Nhu Hộ Vệ',
  group: 'khoi_nghia_1418',
  unlocked: false,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'silver',
  stats: {
    command: 74,   // Thống Lĩnh (1 - 100)
    martial: 75,   // Võ Nghệ   (1 - 100)
    intellect: 76, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["infantry"],
  buffName: 'HỘ LƯƠNG QUÂN',
  buffDescription: '-15% Rủi ro bị địch cướp lương khi di chuyển',
  specialty: '-15% Rủi ro bị địch cướp lương khi di chuyển',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1418,
  joinMonth: 2,
  joinDay: 18,
  lore: 'Tướng lĩnh tận tụy bảo vệ các đoàn vận lương của nghĩa quân qua các vùng tranh chấp.',
};
