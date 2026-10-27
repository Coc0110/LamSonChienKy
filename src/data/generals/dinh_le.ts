import type { General } from '../../types';

/**
 * ============================================================================
 * HỒ SƠ DANH TƯỚNG: ĐINH LỄ
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa thông tin vị tướng này tại đây:
 * - stats: Chỉ số khởi đầu (Thống Lĩnh, Võ Nghệ, Mưu Lược)
 * - troops: Binh chủng sở trường ('infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy')
 * - buffName: Tên ngắn gọn của buff (2-3 chữ) hiển thị ở mặt sau thẻ đồng
 * - buffDescription: Chi tiết hiệu ứng buff (hiển thị trong Cuộn Thư khi nháy đúp)
 * - lore: Điển tích và tiểu sử lịch sử
 * ============================================================================
 */
export const dinh_le: General = {
  // --- 1. ĐỊNH DANH CƠ BẢN ---
  id: 'dinh_le',
  name: 'Đinh Lễ',
  hanzi: '丁禮',
  portraitUrl: '/generals/dinh_le.png?v=7',
  title: 'TƯ KHÔNG',
  epithet: 'Sát Thần Đinh Lễ',
  group: 'lung_nhai_1416',
  unlocked: true,
  locationId: 'lam_son',

  // --- 2. BẬC SAO & CHỈ SỐ KHỞI ĐẦU ---
  stars: 5,
  starTier: 'red',
  stats: {
    command: 78,   // Thống Lĩnh (1 - 100)
    martial: 90,   // Võ Nghệ   (1 - 100)
    intellect: 78, // Mưu Lược  (1 - 100)
  },

  // --- 3. BINH CHỦNG & ĐẶC KỸ CHIẾN TRẬN ---
  troops: ["infantry"],
  buffName: 'SÁT THẦN',
  buffDescription: '+40% Sức chiến đấu ở địa hình Đầm lầy & Truy kích (Trận Tốt Động)',
  specialty: '+40% Sức chiến đấu ở địa hình Đầm lầy & Truy kích (Trận Tốt Động)',

  // --- 4. THÔNG TIN TIỂU SỬ & CUỘN THƯ LỊCH SỬ ---
  joinYear: 1416,
  joinMonth: 2,
  joinDay: 1,
  deathYear: 1427,
  lore: 'Cháu ruột Lê Lợi, dũng lược hơn người, chỉ huy trận đại thắng Tốt Động - Chúc Động làm chấn động toàn cõi Đông Quan.',
};
