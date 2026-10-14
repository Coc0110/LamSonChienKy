import type { CityNode, Connection } from '../types';

export const INITIAL_CITIES: CityNode[] = [
    { id: 'lam_son', name: 'Lam Sơn', type: 'camp', x: 55.89, y: 48.65, faction: 'lam_son', troops: 2000 },
    { id: 'chi_linh', name: 'Núi Chí Linh', type: 'camp', x: 49.64, y: 44.38, faction: 'lam_son', troops: 0 },
    { id: 'lac_thuy', name: 'Lạc Thủy', type: 'chokepoint', x: 56.65, y: 46.54, faction: 'neutral', troops: 0 },
    { id: 'muong_mot', name: 'Mường Một', type: 'camp', x: 49.75, y: 41.96, faction: 'neutral', troops: 0 },
    { id: 'nga_lac', name: 'Nga Lạc', type: 'camp', x: 55.74, y: 47.91, faction: 'neutral', troops: 0 },
    { id: 'muong_thoi', name: 'Mường Thôi', type: 'camp', x: 51.42, y: 42.6, faction: 'neutral', troops: 0 },
    { id: 'loi_giang', name: 'Lỗi Giang', type: 'chokepoint', x: 56.62, y: 44.34, faction: 'neutral', troops: 0 },
    { id: 'kinh_long', name: 'Ải Kình Lộng', type: 'chokepoint', x: 53.95, y: 43.03, faction: 'ming', troops: 500 },
    { id: 'deo_ong', name: 'Đèo Ống', type: 'chokepoint', x: 52.6, y: 43.42, faction: 'ming', troops: 300 },
    { id: 'bo_mong', name: 'Bồ Mộng', type: 'camp', x: 55.81, y: 47.4, faction: 'neutral', troops: 0 },
    { id: 'quan_du', name: 'Đồn Quan Du', type: 'camp', x: 57.56, y: 47.16, faction: 'ming', troops: 1500 },
    { id: 'tay_do', name: 'Thành Tây Đô', type: 'city', x: 59.29, y: 47.04, faction: 'ming', troops: 10000 },
    { id: 'huyen_khoi', name: 'Huyện Khôi', type: 'city', x: 60.43, y: 45.07, faction: 'ming', troops: 2000 },
    { id: 'ba_lam', name: 'Ba Lãm', type: 'chokepoint', x: 54, y: 43.63, faction: 'ming', troops: 1000 }
];

// Tạm thời ẩn các đường nối (sẽ phát triển theo cơ chế đường hành quân sau)
export const INITIAL_CONNECTIONS: Connection[] = [];

export const START_YEAR = 1418;
export const START_MONTH = 2;
export const START_DAY = 7;
