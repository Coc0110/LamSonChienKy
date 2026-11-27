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
  woodCost: number;
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
    maxLevel: 4,
    baseHp: 2200,
    goldCost: 0,
    woodCost: 0,
    foodCost: 0,
    buildDays: 0,
    maxPerBase: 1,
    requiredMainHallLevel: 1,
    description: 'Nhà sàn gỗ lớn mái tranh, treo cờ lệnh "Lê", có trống cái và giá binh khí trước sân.',
    effectLabel: (lvl) =>
      lvl >= 4
        ? 'Mở khóa công trình Lv.4 & Phất Cờ Khởi Nghĩa'
        : `Mở khóa công trình cấp ${lvl}`,
  },
  farm: {
    type: 'farm',
    name: 'Đồn Điền',
    shortName: 'Đồn Điền',
    category: 'economy',
    spanCols: 5,
    spanRows: 5,
    maxLevel: 4,
    baseHp: 480,
    goldCost: 35,
    woodCost: 25,
    foodCost: 0,
    buildDays: 3,
    maxPerBase: 5,
    requiredMainHallLevel: 1,
    description: 'Ruộng lúa nước bậc thang sử dụng binh sĩ canh tác theo kế sách "Ngụ binh ư nông".',
    effectLabel: (lvl) => {
      const yields = [450, 750, 1150, 1650];
      const y = yields[Math.min(3, Math.max(0, lvl - 1))];
      return `${y} lương/vụ 15 ngày (~${Math.round(y / 15)}/ngày)`;
    },
  },
  forge: {
    type: 'forge',
    name: 'Lò Rèn',
    shortName: 'Lò Rèn',
    category: 'economy',
    spanCols: 3,
    spanRows: 3,
    maxLevel: 4,
    baseHp: 540,
    goldCost: 45,
    woodCost: 30,
    foodCost: 0,
    buildDays: 4,
    maxPerBase: 3,
    requiredMainHallLevel: 1,
    description: 'Lò rèn bí mật đúc kiếm, cung, giáo từ quặng thô và vàng.',
    effectLabel: (lvl) => {
      const rates = [10, 18, 28, 42];
      return `${rates[Math.min(3, Math.max(0, lvl - 1))]} binh khí / 4 ngày`;
    },
  },
  food_storage: {
    type: 'food_storage',
    name: 'Kho Lương',
    shortName: 'Kho Lương',
    category: 'economy',
    spanCols: 3,
    spanRows: 3,
    maxLevel: 3,
    baseHp: 800,
    goldCost: 30,
    woodCost: 30,
    foodCost: 0,
    buildDays: 2,
    maxPerBase: 4,
    requiredMainHallLevel: 1,
    description: 'Nhà kho sàn cao chống ẩm, bảo quản lương thực tránh hư hao.',
    effectLabel: (lvl) => {
      const caps = [2000, 4500, 8000];
      return `+${caps[Math.min(2, Math.max(0, lvl - 1))].toLocaleString()} sức chứa lương`;
    },
  },
  armory: {
    type: 'armory',
    name: 'Kho Bạc & Quân Nhu',
    shortName: 'Kho Bạc',
    category: 'economy',
    spanCols: 3,
    spanRows: 3,
    maxLevel: 3,
    baseHp: 900,
    goldCost: 40,
    woodCost: 35,
    foodCost: 0,
    buildDays: 2,
    maxPerBase: 3,
    requiredMainHallLevel: 1,
    description: 'Kho chứa gỗ, quặng thô và binh khí dự phòng.',
    effectLabel: (lvl) => {
      const caps = [300, 700, 1400];
      return `+${caps[Math.min(2, Math.max(0, lvl - 1))]} sức chứa gỗ/quặng/khí giới`;
    },
  },
  house: {
    type: 'house',
    name: 'Nhà Dân',
    shortName: 'Nhà Dân',
    category: 'economy',
    spanCols: 2,
    spanRows: 2,
    maxLevel: 3,
    baseHp: 350,
    goldCost: 25,
    woodCost: 25,
    foodCost: 0,
    buildDays: 2,
    maxPerBase: 8,
    requiredMainHallLevel: 1,
    description: 'Mở rộng chỗ ở để tiếp nhận lưu dân và tăng trần quân số.',
    effectLabel: (lvl) => {
      const pops = [40, 85, 140];
      return `+${pops[Math.min(2, Math.max(0, lvl - 1))]} dân số tối đa`;
    },
  },
  barracks: {
    type: 'barracks',
    name: 'Trại Luyện Binh',
    shortName: 'Trại Binh',
    category: 'military',
    spanCols: 5,
    spanRows: 5,
    maxLevel: 4,
    baseHp: 900,
    goldCost: 60,
    woodCost: 40,
    foodCost: 15,
    buildDays: 4,
    maxPerBase: 2,
    requiredMainHallLevel: 1,
    description: 'Huấn luyện Binh sĩ và nâng cấp thành quân Tinh nhuệ (từ Cấp 3).',
    effectLabel: (lvl) => {
      if (lvl >= 4) return 'Luyện 75 Binh sĩ / 30 Tinh nhuệ mỗi đợt';
      if (lvl === 3) return 'Luyện 50 Binh sĩ / mở khóa Tinh nhuệ (15/đợt)';
      if (lvl === 2) return 'Luyện tối đa 35 Binh sĩ / 9 ngày';
      return 'Luyện tối đa 20 Binh sĩ / 10 ngày';
    },
  },
  wall: {
    type: 'wall',
    name: 'Lũy Tre / Tường Thành',
    shortName: 'Tường',
    category: 'defense',
    spanCols: 1,
    spanRows: 1,
    maxLevel: 3,
    baseHp: 550,
    goldCost: 3,
    woodCost: 4,
    foodCost: 0,
    buildDays: 0,
    maxPerBase: 60,
    requiredMainHallLevel: 1,
    description: 'Chặn bước tiến quân địch khi cố thủ trong căn cứ 3D.',
    effectLabel: (lvl) => `${[550, 1000, 1600][Math.min(2, Math.max(0, lvl - 1))]} HP chắn địch`,
  },
  gate: {
    type: 'gate',
    name: 'Cổng Thành',
    shortName: 'Cổng',
    category: 'defense',
    spanCols: 3,
    spanRows: 1,
    maxLevel: 3,
    baseHp: 850,
    goldCost: 15,
    woodCost: 18,
    foodCost: 0,
    buildDays: 1,
    maxPerBase: 4,
    requiredMainHallLevel: 1,
    description: 'Vọng lâu gỗ có mái che bên trên cổng, cánh cổng gỗ dày có then cài lớn.',
    effectLabel: (lvl) => `${[850, 1500, 2400][Math.min(2, Math.max(0, lvl - 1))]} HP cửa thành`,
  },
  watchtower: {
    type: 'watchtower',
    name: 'Chòi Canh',
    shortName: 'Chòi Canh',
    category: 'defense',
    spanCols: 2,
    spanRows: 2,
    maxLevel: 4,
    baseHp: 680,
    goldCost: 50,
    woodCost: 35,
    foodCost: 0,
    buildDays: 3,
    maxPerBase: 4,
    requiredMainHallLevel: 1,
    description: 'Do thám huyện thành và điều phối các đội đi săn cấp 1–4.',
    effectLabel: (lvl) => {
      if (lvl >= 4) return 'Do thám Tây Đô & Săn Cấp 4 (Vật phẩm hiếm)';
      if (lvl === 3) return 'Do thám 3 bước & Săn Cấp 3 (Lương + Gỗ + Quặng)';
      if (lvl === 2) return 'Do thám 2 bước & Săn Cấp 2 (Lương + Gỗ)';
      return 'Do thám giáp ranh & Săn Cấp 1 (Lương)';
    },
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
    goldCost: 8,
    woodCost: 10,
    foodCost: 0,
    buildDays: 0,
    maxPerBase: 12,
    requiredMainHallLevel: 1,
    description: 'Gây sát thương lớn khi quân địch giẫm phải.',
    effectLabel: (lvl) => `${[90, 170, 280][Math.min(2, Math.max(0, lvl - 1))]} sát thương nổ bẫy`,
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
    woodCost: 1,
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
    goldCost: 50,
    woodCost: 40,
    foodCost: 0,
    buildDays: 3,
    maxPerBase: 1,
    requiredMainHallLevel: 1,
    description: 'Bán ra lương thực, binh khí, sản vật săn bắt và tổ chức đấu giá hàng tháng.',
    effectLabel: (lvl) =>
      lvl >= 3
        ? '+25% giá bán & giảm 30% nghi ngờ giao dịch'
        : lvl === 2
        ? '+12% giá bán & mở bán binh khí'
        : 'Bán sản vật & Đấu giá 1 lần/tháng',
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
  if (mainHallLevel >= 4) return 36;
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
        { type: 'watchtower', count: 2, minLevel: 2 },
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

export function getUpgradeCost(
  type: BaseBuildingType,
  currentLevel: number
): { gold: number; wood: number; food: number; days: number } {
  const spec = BASE_BUILDING_CATALOG[type];
  const factor = Math.max(1, currentLevel);
  if (type === 'main_hall') {
    const table: Record<number, { gold: number; wood: number; food: number; days: number }> = {
      1: { gold: 120, wood: 80, food: 0, days: 8 },
      2: { gold: 260, wood: 180, food: 0, days: 14 },
      3: { gold: 450, wood: 320, food: 0, days: 20 },
    };
    return table[currentLevel] ?? { gold: 120 * factor, wood: 80 * factor, food: 0, days: 8 + factor * 4 };
  }
  return {
    gold: Math.round(spec.goldCost * (1 + factor * 0.75)),
    wood: Math.round(spec.woodCost * (1 + factor * 0.75)),
    food: Math.round(spec.foodCost * (1 + factor * 0.5)),
    days: Math.max(1, Math.round(spec.buildDays * (1 + factor * 0.45))),
  };
}
