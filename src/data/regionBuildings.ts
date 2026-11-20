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
    spanCols: 3,
    spanRows: 3,
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
    description: 'Tự động bắn tên vào quân địch trong tầm khi phòng thủ căn cứ.',
    effectLabel: (lvl) => `Tầm 6 ô · ${24 * lvl} sát thương/phát`,
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
};

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
