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
      trainedRoster: { swordsman: 24, spearman: 20, archer: 20, cavalry: 0, elephant: 0, scout: 0 },
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
  { id: 'quan_du', name: 'Ải Quan Du', type: 'chokepoint', x: 52.8, y: 43.3, faction: 'ming', troops: 1200 },
  { id: 'kinh_long', name: 'Ải Kình Lộng', type: 'chokepoint', x: 59.3, y: 45.0, faction: 'ming', troops: 1500 },
  { id: 'tay_do', name: 'Thành Tây Đô', type: 'city', x: 59.29, y: 47.04, faction: 'ming', troops: 10000 },
  { id: 'nga_lac', name: 'Đồn Nga Lạc', type: 'camp', x: 62.6, y: 47.4, faction: 'ming', troops: 1500 },
  { id: 'da_cang', name: 'Đồn Đa Căng', type: 'camp', x: 60.4, y: 49.4, faction: 'ming', troops: 1800 },
];

// Mạng lưới quân lộ và đường hành quân kết nối các huyện thành
export const INITIAL_CONNECTIONS: Connection[] = [
  { from: 'lam_son', to: 'tay_do' },
  { from: 'lam_son', to: 'quan_du' },
  { from: 'lam_son', to: 'da_cang' },
  { from: 'quan_du', to: 'kinh_long' },
  { from: 'kinh_long', to: 'tay_do' },
  { from: 'tay_do', to: 'nga_lac' },
  { from: 'tay_do', to: 'da_cang' },
  { from: 'nga_lac', to: 'da_cang' },
];

// Thời điểm bắt đầu trò chơi: Ngày mở đầu Hội Thề Lũng Nhai (Tháng 2 năm Bính Thân 1416)
export const START_YEAR = 1416;
export const START_MONTH = 2;
export const START_DAY = 1;
