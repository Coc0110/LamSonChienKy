import type { CityNode, Connection, PlacedStructure } from '../types';

// Danh sách các công trình khai hoang và lò rèn ban đầu tại căn cứ Lam Sơn
export const INITIAL_STRUCTURES: PlacedStructure[] = [
  {
    id: 'farm_lam_son_1',
    cityId: 'lam_son',
    type: 'farm',
    name: 'Đồn Điền Lam Sơn 1',
    x: 57.6,
    y: 47.2,
    terrain: 'plains',
    status: 'active',
    buildDaysTotal: 12,
    buildDaysRemaining: 0,
    builderWorkers: 0,
    assignedWorkers: 25,
    maxWorkers: 25,
    cropDays: 45, // Đang được nửa vụ mùa
    cropCycleDays: 90,
  },
  {
    id: 'farm_lam_son_2',
    cityId: 'lam_son',
    type: 'farm',
    name: 'Đồn Điền Lam Sơn 2',
    x: 58.0,
    y: 49.6,
    terrain: 'plains',
    status: 'active',
    buildDaysTotal: 12,
    buildDaysRemaining: 0,
    builderWorkers: 0,
    assignedWorkers: 25,
    maxWorkers: 25,
    cropDays: 30,
    cropCycleDays: 90,
  },
  {
    id: 'forge_lam_son_1',
    cityId: 'lam_son',
    type: 'forge',
    name: 'Lò Rèn Rừng Già Lam Sơn',
    x: 55.2,
    y: 48.6,
    terrain: 'forest',
    status: 'active',
    buildDaysTotal: 18,
    buildDaysRemaining: 0,
    builderWorkers: 0,
    assignedWorkers: 0,
    maxWorkers: 15,
    cropDays: 0,
    cropCycleDays: 0,
    activeOrder: null,
  },
];

// Danh sách Căn cứ nghĩa quân & Các kiên thành đồn binh quân Minh
export const INITIAL_CITIES: CityNode[] = [
  // --- BẢN DOANH KHỞI NGHĨA LAM SƠN ---
  {
    id: 'lam_son',
    name: 'Lam Sơn',
    districtId: 'lam_son',
    type: 'camp',
    x: 55.6,
    y: 48.1,
    faction: 'lam_son',
    troops: 70,             // Toàn bộ lực lượng nghĩa quân tập hợp tại Lam Sơn
    hasBase: true,          // Căn cứ khởi phát duy nhất của nghĩa quân Lam Sơn
    population: {
      combatTroops: 64,     // 64 nghĩa binh dự bị tại doanh trại (+ 6 nghĩa binh trong Tiên Phong Doanh = 70 quân)
      idleLaborers: 190,    // Tráng phu rảnh rỗi sẵn sàng thao luyện, do thám hoặc thi công (tổng 350 người ban đầu)
      farmLaborers: 50,     // 50 nông đinh canh tác 2 khu đồn điền
      forgeLaborers: 0,     // Lò rèn chờ lệnh rèn mới điều động thợ
      swappedCombatants: 0, // Số nghĩa binh đang thế chỗ làm việc
      unfitPopulation: 40,  // Người già, trẻ nhỏ nương nhờ (giảm bớt theo thực tế lịch sử)
    },
    buildings: {
      farms: 2,             // 2 khu đồn điền cày cấy
      forges: 1,            // 1 lò rèn vũ khí bí mật
    },
    training: null,
  },

  // --- HỆ THỐNG ĐỒN BỐT & THÀNH TRÌ ĐỒN TRÚ QUÂN MINH ---
  { id: 'quan_du', name: 'Quan Du', type: 'camp', x: 52.8, y: 43.3, faction: 'ming', troops: 1500 },
  { id: 'huyen_khoi', name: 'Huyện Khôi', type: 'city', x: 56.5, y: 44.2, faction: 'ming', troops: 2000 },
  { id: 'tay_do', name: 'Thành Tây Đô', type: 'city', x: 59.29, y: 47.04, faction: 'ming', troops: 10000 },
  { id: 'te_giang', name: 'Tế Giang', type: 'chokepoint', x: 59.3, y: 45.4, faction: 'ming', troops: 1000 },
  { id: 'vinh_ninh', name: 'Vĩnh Ninh', type: 'city', x: 60.8, y: 47.5, faction: 'ming', troops: 1500 },
  { id: 'yen_dinh', name: 'Yên Định', type: 'city', x: 60.4, y: 48.7, faction: 'ming', troops: 1200 },
  { id: 'an_lac', name: 'An Lạc', type: 'city', x: 61.3, y: 46.3, faction: 'ming', troops: 800 },
  { id: 'tong_giang', name: 'Tống Giang', type: 'city', x: 63.6, y: 46.7, faction: 'ming', troops: 1000 },
  { id: 'ha_trung', name: 'Hà Trung', type: 'city', x: 62.8, y: 48.0, faction: 'ming', troops: 1000 },
  { id: 'thong_ninh', name: 'Thống Ninh', type: 'city', x: 64.8, y: 48.7, faction: 'ming', troops: 800 },
  { id: 'dong_son', name: 'Đông Sơn', type: 'city', x: 61.2, y: 50.4, faction: 'ming', troops: 2500 },
];

// Mạng lưới quân lộ và đường hành quân kết nối các huyện thành
export const INITIAL_CONNECTIONS: Connection[] = [
  // 1. Tuyến từ Bản Doanh Lam Sơn sang các cứ điểm giặc Minh
  { from: 'lam_son', to: 'tay_do' },
  { from: 'lam_son', to: 'yen_dinh' },
  { from: 'lam_son', to: 'quan_du' },

  // 2. Mạng lưới quân sự quân Minh tại Châu Ái & Châu Ninh Hóa
  { from: 'quan_du', to: 'tay_do' },
  { from: 'quan_du', to: 'huyen_khoi' },
  { from: 'tay_do', to: 'huyen_khoi' },
  { from: 'tay_do', to: 'te_giang' },
  { from: 'tay_do', to: 'vinh_ninh' },
  { from: 'te_giang', to: 'an_lac' },
  { from: 'vinh_ninh', to: 'yen_dinh' },
  { from: 'vinh_ninh', to: 'ha_trung' },
  { from: 'an_lac', to: 'tong_giang' },
  { from: 'ha_trung', to: 'thong_ninh' },
  { from: 'tong_giang', to: 'thong_ninh' },

  // 3. Kết nối xuống Đông Sơn
  { from: 'yen_dinh', to: 'dong_son' },
  { from: 'tay_do', to: 'dong_son' },
];

// Thời điểm bắt đầu trò chơi: Ngày mở đầu Hội Thề Lũng Nhai (Tháng 2 năm Bính Thân 1416)
export const START_YEAR = 1416;
export const START_MONTH = 2;
export const START_DAY = 1;
