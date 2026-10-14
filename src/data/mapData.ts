import type { CityNode, Connection, River } from '../types';

export const INITIAL_CITIES: CityNode[] = [
    { id: 'lam_son', name: 'Lam Sơn', type: 'camp', x: 55.89, y: 48.65, faction: 'lam_son', troops: 2000 },
    { id: 'chi_linh', name: 'Núi Chí Linh', type: 'camp', x: 49.64, y: 44.38, faction: 'lam_son', troops: 0 },
    { id: 'kha_lam', name: 'Khả Lam', type: 'camp', x: 50, y: 80, faction: 'lam_son', troops: 0 },
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

// Hệ thống sông ngòi trọng yếu trong khởi nghĩa Lam Sơn
export const HISTORICAL_RIVERS: River[] = [
    {
        id: 'song_ma',
        name: 'Sông Mã',
        width: 3.5,
        points: [
            [41.5, 39.0], [43.2, 39.8], [45.5, 40.5], [47.8, 41.2],
            [49.2, 41.6], [50.8, 42.1], [52.5, 42.6], [53.8, 43.1],
            [55.2, 43.8], [56.62, 44.34], [57.8, 45.0], [58.6, 45.8],
            [59.1, 46.6], [59.5, 47.1], [60.2, 47.5], [61.3, 47.9],
            [62.5, 48.4], [63.8, 48.8], [65.2, 49.2]
        ]
    },
    {
        id: 'song_chu',
        name: 'Sông Chu (Lương Giang)',
        width: 3,
        points: [
            [46.0, 46.2], [47.5, 46.8], [49.0, 47.3], [50.5, 47.6],
            [52.0, 47.3], [53.5, 47.1], [54.8, 47.5], [55.6, 48.0],
            [55.89, 48.65], [57.2, 48.7], [58.8, 48.5], [60.2, 48.2],
            [61.3, 47.9]
        ]
    },
    {
        id: 'song_am',
        name: 'Sông Âm (Chi lưu Chí Linh)',
        width: 2,
        points: [
            [49.64, 44.38], [50.5, 45.3], [51.2, 46.2], [52.0, 47.3]
        ]
    },
    {
        id: 'song_buoi',
        name: 'Sông Bưởi',
        width: 2,
        points: [
            [57.5, 41.5], [58.2, 43.0], [58.8, 44.6], [59.2, 45.8], [59.5, 47.1]
        ]
    }
];

export const START_YEAR = 1418;
export const START_MONTH = 2;
export const START_DAY = 7;
