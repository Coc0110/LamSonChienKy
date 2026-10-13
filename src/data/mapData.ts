import type { CityNode, Connection } from '../types';

export const INITIAL_CITIES: CityNode[] = [
    // Nghĩa quân
    { id: 'lam_son', name: 'Lam Sơn', type: 'camp', x: 50, y: 75, faction: 'lam_son', troops: 2000 },
    { id: 'chi_linh', name: 'Núi Chí Linh', type: 'camp', x: 25, y: 55, faction: 'lam_son', troops: 0 },
    { id: 'kha_lam', name: 'Khả Lam', type: 'camp', x: 50, y: 80, faction: 'lam_son', troops: 0 }, // Gần Lam sơn
    
    // Các bản làng / điểm phục kích
    { id: 'lac_thuy', name: 'Lạc Thủy', type: 'chokepoint', x: 35, y: 70, faction: 'neutral', troops: 0 },
    { id: 'muong_mot', name: 'Mường Một', type: 'camp', x: 38, y: 48, faction: 'neutral', troops: 0 },
    { id: 'nga_lac', name: 'Nga Lạc', type: 'camp', x: 50, y: 55, faction: 'neutral', troops: 0 },
    { id: 'muong_thoi', name: 'Mường Thôi', type: 'camp', x: 15, y: 15, faction: 'neutral', troops: 0 },
    { id: 'loi_giang', name: 'Lỗi Giang', type: 'chokepoint', x: 55, y: 40, faction: 'neutral', troops: 0 },
    { id: 'kinh_long', name: 'Ải Kình Lộng', type: 'chokepoint', x: 35, y: 15, faction: 'ming', troops: 500 },
    { id: 'deo_ong', name: 'Đèo Ống', type: 'chokepoint', x: 35, y: 35, faction: 'ming', troops: 300 },
    { id: 'bo_mong', name: 'Bồ Mộng', type: 'camp', x: 25, y: 25, faction: 'neutral', troops: 0 },
    
    // Các điểm quân Minh
    { id: 'quan_du', name: 'Đồn Quan Du', type: 'camp', x: 35, y: 90, faction: 'ming', troops: 1500 },
    { id: 'tay_do', name: 'Thành Tây Đô', type: 'city', x: 75, y: 60, faction: 'ming', troops: 10000 },
    { id: 'huyen_khoi', name: 'Huyện Khôi', type: 'city', x: 80, y: 35, faction: 'ming', troops: 2000 },
    { id: 'ba_lam', name: 'Ba Lãm', type: 'chokepoint', x: 45, y: 25, faction: 'ming', troops: 1000 },
];

export const INITIAL_CONNECTIONS: Connection[] = [
    { from: 'lam_son', to: 'lac_thuy' },
    { from: 'lam_son', to: 'nga_lac' },
    { from: 'lam_son', to: 'quan_du' },
    { from: 'lac_thuy', to: 'quan_du' },
    { from: 'lac_thuy', to: 'chi_linh' },
    { from: 'chi_linh', to: 'muong_mot' },
    { from: 'chi_linh', to: 'bo_mong' },
    { from: 'chi_linh', to: 'muong_thoi' },
    { from: 'muong_thoi', to: 'bo_mong' },
    { from: 'bo_mong', to: 'deo_ong' },
    { from: 'bo_mong', to: 'kinh_long' },
    { from: 'kinh_long', to: 'deo_ong' },
    { from: 'kinh_long', to: 'ba_lam' },
    { from: 'deo_ong', to: 'ba_lam' },
    { from: 'deo_ong', to: 'loi_giang' },
    { from: 'ba_lam', to: 'loi_giang' },
    { from: 'ba_lam', to: 'huyen_khoi' },
    { from: 'loi_giang', to: 'huyen_khoi' },
    { from: 'loi_giang', to: 'tay_do' },
    { from: 'loi_giang', to: 'nga_lac' },
    { from: 'nga_lac', to: 'tay_do' },
    { from: 'lam_son', to: 'tay_do' },
    { from: 'nga_lac', to: 'muong_mot' }
];

export const START_YEAR = 1418;
export const START_MONTH = 2;
export const START_DAY = 7;
