import type { CityNode, Connection } from '../types';

// Danh sách Cứ điểm / Huyện thành đương thời tỉnh Thanh Hóa thế kỷ XV
// Tọa độ chuẩn khớp trực tiếp với từng địa hạt huyện thành trên bản đồ sa bàn
export const INITIAL_CITIES: CityNode[] = [
    // --- CHÂU THANH HÓA (Căn cứ địa nghĩa quân & Vùng núi hiểm trở) ---
    { id: 'lam_son', name: 'Lam Sơn', type: 'camp', x: 55.6, y: 48.1, faction: 'lam_son', troops: 2000 },
    { id: 'chi_linh', name: 'Núi Chí Linh', type: 'camp', x: 51.8, y: 46.5, faction: 'lam_son', troops: 500 },
    { id: 'co_loi', name: 'Cổ Lôi', type: 'camp', x: 56.2, y: 51.2, faction: 'neutral', troops: 0 },
    { id: 'loi_giang', name: 'Lỗi Giang', type: 'chokepoint', x: 51.8, y: 45.6, faction: 'neutral', troops: 0 },
    { id: 'quan_du', name: 'Quan Du', type: 'camp', x: 52.8, y: 43.3, faction: 'ming', troops: 1500 },
    { id: 'muong_kiet', name: 'Mường Kiệt', type: 'camp', x: 47.6, y: 40.8, faction: 'neutral', troops: 0 },
    { id: 'muong_thoi', name: 'Mường Thôi', type: 'camp', x: 42.2, y: 41.8, faction: 'neutral', troops: 0 },

    // --- CHÂU NINH HÓA (Cửa ngõ phía Bắc) ---
    { id: 'huyen_khoi', name: 'Huyện Khôi', type: 'city', x: 56.5, y: 44.2, faction: 'ming', troops: 2000 },

    // --- CHÂU ÁI (Trung tâm đầu não giặc Minh & Đồng bằng Sông Mã - Sông Chu) ---
    { id: 'tay_do', name: 'Thành Tây Đô', type: 'city', x: 59.29, y: 47.04, faction: 'ming', troops: 10000 },
    { id: 'te_giang', name: 'Tế Giang', type: 'chokepoint', x: 59.3, y: 45.4, faction: 'ming', troops: 1000 },
    { id: 'vinh_ninh', name: 'Vĩnh Ninh', type: 'city', x: 60.8, y: 47.5, faction: 'ming', troops: 1500 },
    { id: 'luong_giang', name: 'Lương Giang', type: 'city', x: 58.3, y: 48.2, faction: 'neutral', troops: 0 },
    { id: 'yen_dinh', name: 'Yên Định', type: 'city', x: 60.4, y: 48.7, faction: 'ming', troops: 1200 },
    { id: 'an_lac', name: 'An Lạc', type: 'city', x: 61.3, y: 46.3, faction: 'ming', troops: 800 },
    { id: 'tong_giang', name: 'Tống Giang', type: 'city', x: 63.6, y: 46.7, faction: 'ming', troops: 1000 },
    { id: 'chi_nga', name: 'Chi Nga', type: 'chokepoint', x: 66.0, y: 47.4, faction: 'neutral', troops: 0 },
    { id: 'ha_trung', name: 'Hà Trung', type: 'city', x: 62.8, y: 48.0, faction: 'ming', troops: 1000 },
    { id: 'thong_ninh', name: 'Thống Ninh', type: 'city', x: 64.8, y: 48.7, faction: 'ming', troops: 800 },
    { id: 'co_dang', name: 'Cổ Đằng', type: 'city', x: 64.1, y: 49.8, faction: 'neutral', troops: 0 },
    { id: 'co_hoang', name: 'Cổ Hoằng', type: 'city', x: 63.9, y: 50.8, faction: 'neutral', troops: 0 },

    // --- CHÂU CỬU CHÂN (Vùng đồng bằng & Duyên hải phía Nam) ---
    { id: 'dong_son', name: 'Đông Sơn', type: 'city', x: 61.2, y: 50.4, faction: 'ming', troops: 2500 },
    { id: 'ket_duyet', name: 'Kết Duyệt', type: 'city', x: 62.2, y: 52.1, faction: 'neutral', troops: 0 },
    { id: 'nong_cong', name: 'Nông Cống', type: 'city', x: 59.8, y: 52.8, faction: 'neutral', troops: 0 },
    { id: 'co_binh',    name: 'Cổ Bình',   type: 'chokepoint', x: 61.4, y: 55.2, faction: 'neutral', troops: 0 }
];

// Mạng lưới quân lộ và đường hành quân kết nối các huyện thành đương thời
export const INITIAL_CONNECTIONS: Connection[] = [
    // 1. Vùng đại ngàn Lam Sơn - Chí Linh - Cổ Lôi
    { from: 'lam_son', to: 'chi_linh', waypoints: [[54.0, 47.4]] },
    { from: 'lam_son', to: 'co_loi', waypoints: [[55.8, 49.6]] },
    { from: 'chi_linh', to: 'loi_giang', waypoints: [[51.7, 46.0]] },

    // 2. Thượng đạo Tây Bắc (Sông Mã - Mường Kiệt - Mường Thôi)
    { from: 'loi_giang', to: 'quan_du', waypoints: [[52.4, 44.4]] },
    { from: 'quan_du', to: 'muong_kiet', waypoints: [[50.0, 42.0]] },
    { from: 'muong_kiet', to: 'muong_thoi', waypoints: [[45.0, 41.2]] },

    // 3. Đường hành quân từ Lam Sơn sang Châu Ái & Thành Tây Đô
    { from: 'lam_son', to: 'luong_giang' },
    { from: 'luong_giang', to: 'tay_do' },
    { from: 'luong_giang', to: 'yen_dinh' },
    { from: 'quan_du', to: 'tay_do' },
    { from: 'quan_du', to: 'huyen_khoi' },

    // 4. Mạng lưới Châu Ái (lưu vực Sông Mã bao quanh Thành Tây Đô)
    { from: 'tay_do', to: 'vinh_ninh' },
    { from: 'tay_do', to: 'te_giang' },
    { from: 'tay_do', to: 'huyen_khoi' },
    { from: 'te_giang', to: 'an_lac' },
    { from: 'vinh_ninh', to: 'ha_trung' },
    { from: 'an_lac', to: 'tong_giang' },
    { from: 'tong_giang', to: 'chi_nga' },
    { from: 'ha_trung', to: 'thong_ninh' },
    { from: 'thong_ninh', to: 'chi_nga' },
    { from: 'thong_ninh', to: 'co_dang' },
    { from: 'co_dang', to: 'co_hoang' },
    { from: 'vinh_ninh', to: 'yen_dinh' },

    // 5. Kết nối Châu Ái xuống Châu Cửu Chân
    { from: 'yen_dinh', to: 'dong_son' },
    { from: 'co_hoang', to: 'dong_son' },
    { from: 'co_loi', to: 'nong_cong' },
    { from: 'dong_son', to: 'nong_cong' },
    { from: 'dong_son', to: 'ket_duyet' },
    { from: 'nong_cong', to: 'ket_duyet' },
    { from: 'ket_duyet', to: 'co_binh' },
    { from: 'nong_cong', to: 'co_binh' }
];

// Thời điểm bắt đầu trò chơi: Ngày mở đầu Hội Thề Lũng Nhai (Tháng 2 năm Bính Thân 1416)
export const START_YEAR = 1416;
export const START_MONTH = 2;
export const START_DAY = 1;
