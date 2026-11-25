import type { BaseBuildingCategory, BaseBuildingType } from '../types/region';

export interface BaseBuildingSpec {
  type: BaseBuildingType;
  name: string;
  shortName: string;
  category: BaseBuildingCategory;
  spanCols: number;
  spanRows: number;
  maxLevel: number;
  baseHp: number;
  goldCost: number;
  foodCost: number;
  buildDays: number;
  maxPerBase: number;
  requiredMainHallLevel: number;
  description: string;
  /** Thống kê hiệu ứng theo cấp */
  effectLabel: (level: number) => string;
}

export const REGION_GRID_SIZE = 32;

export const BASE_BUILDING_CATALOG: Record<BaseBuildingType, BaseBuildingSpec> = {
  main_hall: {
    type: 'main_hall',
    name: 'Nhà Chính (Căn Cứ)',
    shortName: 'Nhà Chính',
    category: 'core',
    spanCols: 5,
    spanRows: 5,
    maxLevel: 5,
    baseHp: 2200,
    goldCost: 0,
    foodCost: 0,
    buildDays: 0,
    maxPerBase: 1,
    requiredMainHallLevel: 1,
    description: 'Nhà sàn gỗ lớn mái tranh, treo cờ lệnh "Lê", có trống cái và giá binh khí trước sân.',
    effectLabel: (lvl) => `Mở khóa công trình cấp ${lvl}`,
  },
  farm: {
    type: 'farm',
    name: 'Đồn Điền',
    shortName: 'Đồn Điền',
    category: 'economy',
    spanCols: 5,
    spanRows: 5,
    maxLevel: 5,
    baseHp: 480,
    goldCost: 25,
    foodCost: 10,
    buildDays: 3,
    maxPerBase: 6,
    requiredMainHallLevel: 1,
    description: 'Ruộng lúa nước bậc thang kèm chòi canh điền, lu nước và nông cụ.',
    effectLabel: (lvl) => `+${18 * lvl} lương/ngày`,
  },
  forge: {
    type: 'forge',
    name: 'Lò Rèn',
    shortName: 'Lò Rèn',
    category: 'economy',
    spanCols: 3,
    spanRows: 3,
    maxLevel: 5,
    baseHp: 540,
    goldCost: 35,
    foodCost: 15,
    buildDays: 4,
    maxPerBase: 4,
    requiredMainHallLevel: 1,
    description: 'Nhà mái tranh vách hở thoát nhiệt, bếp lò đỏ lửa, đe sắt, búa tạ và giá vũ khí.',
    effectLabel: (lvl) => `+${6 * lvl} binh khí/ngày`,
  },
  food_storage: {
    type: 'food_storage',
    name: 'Kho Lương',
    shortName: 'Kho Lương',
    category: 'economy',
    spanCols: 3,
    spanRows: 3,
    maxLevel: 5,
    baseHp: 800,
    goldCost: 30,
    foodCost: 0,
    buildDays: 2,
    maxPerBase: 4,
    requiredMainHallLevel: 1,
    description: 'Nhà kho sàn cao chống ẩm, vách gỗ kín, thang gỗ và bao tải lương thực.',
    effectLabel: (lvl) => `+${1500 * lvl} sức chứa lương`,
  },
  armory: {
    type: 'armory',
    name: 'Kho Bạc & Quân Nhu',
    shortName: 'Kho Bạc',
    category: 'economy',
    spanCols: 3,
    spanRows: 3,
    maxLevel: 5,
    baseHp: 900,
    goldCost: 35,
    foodCost: 0,
    buildDays: 2,
    maxPerBase: 4,
    requiredMainHallLevel: 1,
    description: 'Kho tàng kiên cố nhất, cửa gỗ lim gia cố đai sắt có lính canh gác.',
    effectLabel: (lvl) => `+${400 * lvl} sức chứa khí giới`,
  },
  house: {
    type: 'house',
    name: 'Nhà Dân',
    shortName: 'Nhà Dân',
    category: 'economy',
    spanCols: 2,
    spanRows: 2,
    maxLevel: 5,
    baseHp: 350,
    goldCost: 20,
    foodCost: 20,
    buildDays: 2,
    maxPerBase: 8,
    requiredMainHallLevel: 1,
    description: 'Tăng dân số tráng đinh và tốc độ chiêu mộ nhân lực.',
    effectLabel: (lvl) => `+${35 * lvl} dân số tối đa`,
  },
  barracks: {
    type: 'barracks',
    name: 'Trại Luyện Binh',
    shortName: 'Trại Binh',
    category: 'military',
    spanCols: 5,
    spanRows: 5,
    maxLevel: 5,
    baseHp: 900,
    goldCost: 45,
    foodCost: 30,
    buildDays: 4,
    maxPerBase: 3,
    requiredMainHallLevel: 1,
    description: 'Huấn luyện nghĩa quân và quản lý đội hình theo cấp lính. Bấm vào để mở bảng luyện binh.',
    effectLabel: (lvl) => `Mở khóa luyện lính cấp ${lvl}`,
  },
  wall: {
    type: 'wall',
    name: 'Lũy Tre / Tường Thành',
    shortName: 'Tường',
    category: 'defense',
    spanCols: 1,
    spanRows: 1,
    maxLevel: 5,
    baseHp: 550,
    goldCost: 4,
    foodCost: 2,
    buildDays: 0,
    maxPerBase: 60,
    requiredMainHallLevel: 1,
    description: 'Chặn bước tiến quân địch khi thủ thành.',
    effectLabel: (lvl) => `${550 * lvl} HP chắn địch`,
  },
  gate: {
    type: 'gate',
    name: 'Cổng Thành',
    shortName: 'Cổng',
    category: 'defense',
    spanCols: 3,
    spanRows: 1,
    maxLevel: 5,
    baseHp: 850,
    goldCost: 15,
    foodCost: 5,
    buildDays: 1,
    maxPerBase: 4,
    requiredMainHallLevel: 1,
    description: 'Vọng lâu gỗ có mái che bên trên cổng, cánh cổng gỗ dày có then cài lớn.',
    effectLabel: (lvl) => `${850 * lvl} HP cửa thành`,
  },
  watchtower: {
    type: 'watchtower',
    name: 'Chòi Canh Cung',
    shortName: 'Chòi Canh',
    category: 'defense',
    spanCols: 2,
    spanRows: 2,
    maxLevel: 5,
    baseHp: 680,
    goldCost: 40,
    foodCost: 15,
    buildDays: 3,
    maxPerBase: 6,
    requiredMainHallLevel: 1,
    description: 'Đài quan sát cao giúp do thám các huyện thành lân cận (Cấp 4 mở khóa do thám Thành Tây Đô).',
    effectLabel: (lvl) =>
      lvl >= 4
        ? 'Do thám toàn Thanh Hóa (gồm Thành Tây Đô)'
        : 'Do thám huyện thành lân cận (trừ Thành Tây Đô)',
  },
  spike_trap: {
    type: 'spike_trap',
    name: 'Bẫy Chông',
    shortName: 'Bẫy Chông',
    category: 'defense',
    spanCols: 1,
    spanRows: 1,
    maxLevel: 3,
    baseHp: 180,
    goldCost: 10,
    foodCost: 0,
    buildDays: 0,
    maxPerBase: 12,
    requiredMainHallLevel: 1,
    description: 'Gây sát thương lớn khi quân địch giẫm phải.',
    effectLabel: (lvl) => `${90 * lvl} sát thương nổ bẫy`,
  },
  road: {
    type: 'road',
    name: 'Đường Đất',
    shortName: 'Đường',
    category: 'defense',
    spanCols: 1,
    spanRows: 1,
    maxLevel: 1,
    baseHp: 120,
    goldCost: 2,
    foodCost: 0,
    buildDays: 0,
    maxPerBase: 80,
    requiredMainHallLevel: 1,
    description: 'Lối đi đất nện nối liền các công trình trong căn cứ.',
    effectLabel: () => 'Kết nối giao thông nội thành',
  },
  market: {
    type: 'market',
    name: 'Chợ Phiên',
    shortName: 'Chợ',
    category: 'economy',
    spanCols: 3,
    spanRows: 3,
    maxLevel: 3,
    baseHp: 520,
    goldCost: 45,
    foodCost: 15,
    buildDays: 2,
    maxPerBase: 1,
    requiredMainHallLevel: 1,
    description: 'Nơi giao thương vật phẩm săn bắt hái lượm và tổ chức đấu giá bảo vật (mỗi tháng 1 lần).',
    effectLabel: (lvl) => `+${(lvl - 1) * 15}% giá trị bán & đấu giá vật phẩm`,
  },
};

export interface ForagedItemSpec {
  id: string;
  name: string;
  rare: boolean;
  basePrice: number;
  description: string;
}

export const FORAGED_ITEM_CATALOG: ForagedItemSpec[] = [
  { id: 'thao_duoc', name: 'Thảo Dược Rừng Sâu', rare: false, basePrice: 18, description: 'Cây thuốc quý hái trên sườn núi Thanh Hóa.' },
  { id: 'mat_ong_rung', name: 'Mật Ong Rừng', rare: false, basePrice: 24, description: 'Mật ong rừng nguyên chất ngọt thanh.' },
  { id: 'da_thu', name: 'Da Thú Rừng', rare: false, basePrice: 32, description: 'Da thú săn được dùng làm giáp da hoặc trao đổi.' },
  { id: 'nhung_huou', name: 'Nhung Hươu Lam Sơn', rare: true, basePrice: 90, description: 'Vật phẩm hiếm rất được giới thương nhân săn đón.' },
  { id: 'nhan_sam', name: 'Nhân Sâm Cổ Thụ', rare: true, basePrice: 130, description: 'Nhân sâm trăm năm mọc sâu trong đại ngàn.' },
  { id: 'ngoc_bich', name: 'Ngọc Bích Cổ Vật', rare: true, basePrice: 175, description: 'Bảo vật cổ lưu lạc trong rừng rậm.' },
  { id: 'tram_huong', name: 'Trầm Hương Kỳ Nam', rare: true, basePrice: 220, description: 'Cực phẩm quý hiếm có giá trị đấu giá cực cao.' },
];

export function getBuildableHalfRadius(mainHallLevel: number): number {
  if (mainHallLevel >= 5) return 44;
  if (mainHallLevel === 4) return 35;
  if (mainHallLevel === 3) return 28;
  if (mainHallLevel === 2) return 22;
  return 16;
}

export interface MainHallUpgradeReq {
  type: BaseBuildingType;
  count: number;
  minLevel: number;
}

export function getMainHallUpgradeRequirements(nextLevel: number): MainHallUpgradeReq[] {
  switch (nextLevel) {
    case 2:
      return [
        { type: 'house', count: 2, minLevel: 1 },
        { type: 'farm', count: 1, minLevel: 1 },
        { type: 'barracks', count: 1, minLevel: 1 },
      ];
    case 3:
      return [
        { type: 'house', count: 3, minLevel: 2 },
        { type: 'farm', count: 2, minLevel: 2 },
        { type: 'forge', count: 1, minLevel: 1 },
        { type: 'barracks', count: 1, minLevel: 2 },
      ];
    case 4:
      return [
        { type: 'house', count: 4, minLevel: 2 },
        { type: 'farm', count: 2, minLevel: 2 },
        { type: 'forge', count: 2, minLevel: 2 },
        { type: 'barracks', count: 1, minLevel: 3 },
        { type: 'watchtower', count: 2, minLevel: 1 },
      ];
    case 5:
      return [
        { type: 'house', count: 6, minLevel: 3 },
        { type: 'farm', count: 3, minLevel: 3 },
        { type: 'forge', count: 2, minLevel: 3 },
        { type: 'barracks', count: 1, minLevel: 4 },
        { type: 'watchtower', count: 4, minLevel: 2 },
      ];
    default:
      return [];
  }
}

export function checkMainHallUpgradeRequirements(
  buildings: Array<{ type: BaseBuildingType; level: number; status: string }>,
  nextLevel: number
): Array<{ req: MainHallUpgradeReq; current: number; met: boolean }> {
  const reqs = getMainHallUpgradeRequirements(nextLevel);
  return reqs.map((req) => {
    const current = buildings.filter(
      (b) => b.status !== 'destroyed' && b.type === req.type && b.level >= req.minLevel
    ).length;
    return { req, current, met: current >= req.count };
  });
}

export const BUILDING_BUILD_ORDER: BaseBuildingType[] = [
  'farm',
  'forge',
  'food_storage',
  'armory',
  'house',
  'barracks',
  'watchtower',
  'wall',
  'gate',
  'spike_trap',
];

export function getBuildingMaxHp(type: BaseBuildingType, level: number): number {
  const spec = BASE_BUILDING_CATALOG[type];
  return Math.round(spec.baseHp * (1 + (level - 1) * 0.45));
}

export function getUpgradeCost(type: BaseBuildingType, currentLevel: number): { gold: number; food: number; days: number } {
  const spec = BASE_BUILDING_CATALOG[type];
  const factor = Math.max(1, currentLevel);
  if (type === 'main_hall') {
    return {
      gold: 80 * factor,
      food: 60 * factor,
      days: 4 + factor * 2,
    };
  }
  return {
    gold: Math.round(spec.goldCost * (1 + factor * 0.6)),
    food: Math.round(spec.foodCost * (1 + factor * 0.5)),
    days: Math.max(1, Math.round(spec.buildDays * (1 + factor * 0.4))),
  };
}
