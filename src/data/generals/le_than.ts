import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: LÊ THẬN
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const le_than: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'le_than',
  name: 'Lê Thận',
  hanzi: '黎慎',
  portraitUrl: '/generals/le_than.png?v=7',
  title: 'THÁI PHÓ HOẰNG HÓA',
  epithet: 'Người Dâng Gươm Thuận Thiên',
  group: 'lung_nhai_1416',
  unlocked: true,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'gold',
  stats: {
    command: 81,   // Thống Lĩnh (1 - 100)
    martial: 80,   // Võ Nghệ   (1 - 100)
    intellect: 76, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["navy","infantry"],
  buffName: 'DÂNG THUẬN THIÊN',
  buffDescription: '+20% Sĩ khí quân đồn trú, thông thạo thủy bộ vùng sông Chu',
  specialty: '+20% Sĩ khí quân đồn trú, thông thạo thủy bộ vùng sông Chu',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1416,
  joinMonth: 2,
  joinDay: 1,
  lore: 'Vốn làm nghề chài lưới trên sông Lương, ba lần kéo lưới bắt được lưỡi gươm thần khắc chữ "Thuận Thiên" dâng lên Lê Lợi.',
};
