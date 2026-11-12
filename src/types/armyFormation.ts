import type { TerrainType } from './terrain';

export type TacticalUnitType = 
  | 'scout'        // Thám Mã / Do Thám (1 ô)
  | 'archer'       // Cung Thủ / Nỏ Binh (1 ô)
  | 'swordsman'    // Đao Khiên Binh (1 ô)
  | 'spearman'     // Trường Giáo Binh (1 ô)
  | 'cavalry'      // Thiết Kỵ Binh (2 ô: 2 hàng x 1 cột)
  | 'elephant'     // Tượng Binh (6 ô: 3 hàng x 2 cột)
  | 'supply_cart'  // Xe Vận Lương (4 ô: 2 hàng x 2 cột)
  | 'general';     // Vị Tướng Chỉ Huy (1 ô)

export type MarchEndpointAction =
  | 'camp'             // Đóng quân / Hạ trại tạm giữ vị trí
  | 'ambush'           // Mai phục / Phục kích chờ đánh úp địch
  | 'raid'             // Tập kích / Công kích đồn địch lân cận
  | 'scout'            // Thám thính / Do thám mở tầm nhìn
  | 'forage'           // Thu thập / Tích lương tại chỗ
  | 'decoy'            // Nghi binh / Đốt lửa dựng cờ dụ địch
  | 'feigned_retreat'  // Trá bại dụ địch (Tiến đánh khiêu khích rồi vờ thua rút lui về ổ phục kích)
  | 'market_pickup'    // Đến chợ huyện nhận hàng đã mua
  | 'market_return';   // Áp tải hàng từ chợ về bản doanh

export type FormationStatus =
  | 'idle'
  | 'stationed'
  | 'marching'
  | 'ambushing'
  | 'scouting'
  | 'foraging'
  | 'decoying'
  | 'engaging'
  | 'retreating';

export interface MarchPathCell {
  col: number;
  row: number;
  x: number;
  y: number;
  terrain: TerrainType;
  moveCostDays: number;
  cumulativeDays: number;
  foodCost: number;
}

export interface PursuingEnemyGroup {
  sourceCityId: string;
  sourceCityName: string;
  troops: number;
  x: number;
  y: number;
  col: number;
  row: number;
}

export interface MarchOrder {
  cells: MarchPathCell[];
  retreatCells?: MarchPathCell[];
  currentCellIndex: number;
  cellProgress: number; // 0..1 trong ô hiện tại
  isInRetreatPhase?: boolean;
  endpointAction: MarchEndpointAction;
  totalDays: number;
  elapsedDays: number;
  totalFoodCost: number;
  pursuingEnemy?: PursuingEnemyGroup | null;
}

export interface TacticalUnitConfig {
  type: TacticalUnitType;
  name: string;
  nameHanzi: string;
  role: string;
  icon: string;
  description: string;
  
  // Diện tích chiếm dụng trên tấm lưới (Hàng x Cột)
  spanRows: number;
  spanCols: number;
  totalCells: number;

  // Hệ màu đặc trưng cho Zoom Semantic LOD
  colorHex: string;       // Mã màu đại diện
  bgSolid: string;        // Màu nền khi Zoom out xa nhất (LOD xa)
  borderColor: string;    // Màu viền khi Zoom gần
  bgTint: string;         // Màu nền nhẹ khi Zoom gần

  cost: {
    combatTroops: number;
    weapons: number;
    horses: number;
    elephants: number;
    food: number;
  };
  requiredGeneralTroopType?: 'infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy';
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    range: number;
    speed: number;
  };
}

export const TACTICAL_UNIT_CONFIGS: Record<TacticalUnitType, TacticalUnitConfig> = {
  scout: {
    type: 'scout',
    name: 'Thám Mã',
    nameHanzi: '探馬',
    role: 'Trinh Sát / Tiên Phong',
    icon: '/troops/scout.png',
    description: 'Thám kỵ phi nhanh, mở tầm nhìn phát hiện mai phục (1 ô).',
    spanRows: 1,
    spanCols: 1,
    totalCells: 1,
    colorHex: '#059669',
    bgSolid: 'bg-emerald-600',
    borderColor: 'border-emerald-600',
    bgTint: 'bg-emerald-500/20',
    cost: { combatTroops: 1, weapons: 1, horses: 1, elephants: 0, food: 10 },
    requiredGeneralTroopType: 'cavalry',
    baseStats: { hp: 45, attack: 14, defense: 8, range: 4, speed: 2.2 },
  },
  archer: {
    type: 'archer',
    name: 'Cung Thủ',
    nameHanzi: '弓手',
    role: 'Tầm Xa / Bắn Tỉa',
    icon: '/troops/archer.png',
    description: 'Cung nỏ thiện xạ, bắn tỉa yểm trợ từ xa (1 ô).',
    spanRows: 1,
    spanCols: 1,
    totalCells: 1,
    colorHex: '#2563eb',
    bgSolid: 'bg-blue-600',
    borderColor: 'border-blue-600',
    bgTint: 'bg-blue-500/20',
    cost: { combatTroops: 1, weapons: 1, horses: 0, elephants: 0, food: 10 },
    requiredGeneralTroopType: 'archer',
    baseStats: { hp: 40, attack: 22, defense: 6, range: 5, speed: 1.0 },
  },
  swordsman: {
    type: 'swordsman',
    name: 'Đao Khiên',
    nameHanzi: '刀盾',
    role: 'Cận Chiến / Đỡ Tên',
    icon: '/troops/infantry.png',
    description: 'Dũng sĩ tay cầm đao đeo khiên che chắn tiền tuyến (1 ô).',
    spanRows: 1,
    spanCols: 1,
    totalCells: 1,
    colorHex: '#dc2626',
    bgSolid: 'bg-red-600',
    borderColor: 'border-red-600',
    bgTint: 'bg-red-500/20',
    cost: { combatTroops: 1, weapons: 1, horses: 0, elephants: 0, food: 10 },
    requiredGeneralTroopType: 'infantry',
    baseStats: { hp: 70, attack: 18, defense: 20, range: 1, speed: 1.0 },
  },
  spearman: {
    type: 'spearman',
    name: 'Giáo Binh',
    nameHanzi: '槍兵',
    role: 'Khắc Chế Kỵ Mã',
    icon: '/icons/weapon_spear.png',
    description: 'Trường thương nhọn hoắt chống kỵ binh (1 ô).',
    spanRows: 1,
    spanCols: 1,
    totalCells: 1,
    colorHex: '#d97706',
    bgSolid: 'bg-amber-600',
    borderColor: 'border-amber-600',
    bgTint: 'bg-amber-500/20',
    cost: { combatTroops: 1, weapons: 1, horses: 0, elephants: 0, food: 10 },
    requiredGeneralTroopType: 'infantry',
    baseStats: { hp: 65, attack: 20, defense: 16, range: 2, speed: 1.0 },
  },
  cavalry: {
    type: 'cavalry',
    name: 'Kỵ Binh',
    nameHanzi: '騎兵',
    role: 'Xung Kích Đột Phá',
    icon: '/troops/cavalry.png',
    description: 'Chiến mã thon dài phi nước đại (Chiếm 2 ô hàng dọc: 2x1).',
    spanRows: 2,
    spanCols: 1,
    totalCells: 2,
    colorHex: '#7c3aed',
    bgSolid: 'bg-violet-600',
    borderColor: 'border-violet-600',
    bgTint: 'bg-violet-500/20',
    cost: { combatTroops: 1, weapons: 1, horses: 1, elephants: 0, food: 15 },
    requiredGeneralTroopType: 'cavalry',
    baseStats: { hp: 80, attack: 28, defense: 14, range: 1, speed: 2.0 },
  },
  supply_cart: {
    type: 'supply_cart',
    name: 'Xe Lương',
    nameHanzi: '糧車',
    role: 'Hậu Cần Tiếp Tế',
    icon: '/icons/food.png',
    description: 'Cỗ xe chở bao thóc cồng kềnh tiếp tế toàn quân (Chiếm 4 ô: 2x2).',
    spanRows: 2,
    spanCols: 2,
    totalCells: 4,
    colorHex: '#ca8a04',
    bgSolid: 'bg-yellow-600',
    borderColor: 'border-yellow-600',
    bgTint: 'bg-yellow-500/25',
    cost: { combatTroops: 1, weapons: 0, horses: 0, elephants: 0, food: 150 },
    baseStats: { hp: 50, attack: 0, defense: 5, range: 0, speed: 0.8 },
  },
  elephant: {
    type: 'elephant',
    name: 'Tượng Binh',
    nameHanzi: '象兵',
    role: 'Phá Thành / Uy Lực',
    icon: '/troops/elephant.png',
    description: 'Thớt voi đại ngàn khổng lồ dẫm nát phòng tuyến (Chiếm 6 ô: 3x2).',
    spanRows: 3,
    spanCols: 2,
    totalCells: 6,
    colorHex: '#78350f',
    bgSolid: 'bg-amber-900',
    borderColor: 'border-amber-900',
    bgTint: 'bg-amber-800/30',
    cost: { combatTroops: 1, weapons: 1, horses: 0, elephants: 1, food: 40 },
    requiredGeneralTroopType: 'elephant',
    baseStats: { hp: 250, attack: 50, defense: 35, range: 2, speed: 0.7 },
  },
  general: {
    type: 'general',
    name: 'Vị Tướng',
    nameHanzi: '主將',
    role: 'Thống Lĩnh Đốc Chiến',
    icon: '/icons/general_token.png',
    description: 'Vị tướng thống lĩnh trực tiếp đốc chiến trên sa bàn (1 ô).',
    spanRows: 1,
    spanCols: 1,
    totalCells: 1,
    colorHex: '#eab308',
    bgSolid: 'bg-yellow-500',
    borderColor: 'border-yellow-500',
    bgTint: 'bg-yellow-400/30',
    cost: { combatTroops: 0, weapons: 0, horses: 0, elephants: 0, food: 5 },
    baseStats: { hp: 130, attack: 35, defense: 25, range: 1, speed: 1.5 },
  },
};

export interface TacticalPlacedUnit {
  id: string;              // Mã duy nhất của người lính/xe lương/voi
  parentUnitId: string;    // Đối với đơn vị nhiều ô (2 ô, 4 ô, 6 ô), chung 1 parentUnitId
  type: TacticalUnitType;
  name: string;
  
  // Tọa độ gốc của đơn vị
  rootRow: number;
  rootCol: number;
  
  // Tọa độ ô cụ thể này
  row: number;
  col: number;

  isRoot: boolean;         // Có phải ô góc trên-trái hiển thị icon chính không
  offsetRow: number;       // 0..spanRows-1
  offsetCol: number;       // 0..spanCols-1

  generalId?: string;      // Nếu là ô tướng
  assignedGeneralId?: string;
  multiplier?: number;     // Quy mô: 1 hoặc 10 (chế độ vạn quân)
  weaponsBreakdown?: {     // Vũ khí thực tế đã cấp cho đơn vị này
    swords: number;
    bows: number;
    spears: number;
  };
  hp: number;
  maxHp: number;
  morale: number;
}

export interface ArmyRosterCounts {
  swordsman: number;
  spearman: number;
  archer: number;
  cavalry: number;
  elephant: number;
  scout: number;
  supply_cart: number;
}

export interface ArmyThreeLayersState {
  frontlineHp: number;
  frontlineMaxHp: number;
  backlineHp: number;
  backlineMaxHp: number;
  flankHp: number;
  flankMaxHp: number;
}

export type StratagemType =
  | 'ambush_strike'
  | 'fire_attack'
  | 'rockfall_trap'
  | 'taunt_lure'
  | 'decoy_illusion'
  | 'duel_snipe';

export interface WorldCombatLog {
  canh: number;
  message: string;
}

export interface WorldCombatState {
  targetFormationId: string;
  attackDirection: 'front' | 'flank' | 'rear';
  terrain: TerrainType;
  combatWidth: number;
  canhElapsed: number;
  panickedCanhRemaining: number;
  lastDamageDealt: number;
  lastDamageTaken: number;
  lastLogMessage: string;
}
export interface TacticalFormation {
  id: string;
  name: string;
  cityId: string;               // Căn cứ đóng quân / xuất phát
  rows: number;                 // 32 hàng
  cols: number;                 // 32 cột
  grid: (TacticalPlacedUnit | null)[][]; // Ma trận 32x32
  
  assignedGeneralIds: string[]; // Các tướng lĩnh tham gia dẫn quân
  commanderGeneralId: string | null; // Chủ tướng tối cao
  
  status: FormationStatus;

  // Tọa độ thực tế trên bản đồ thế giới và ô lưới 800x1052
  mapPosition?: {
    x: number;
    y: number;
    col: number;
    row: number;
  };

  // Lộ trình hành quân hiện tại (nếu đang hành quân hoặc rút lui)
  marchOrder?: MarchOrder | null;

  // Mục tiêu đồn địch đang giao chiến / tập kích (nếu có)
  engagedTargetCityId?: string | null;

  // Nếu là đội nhỏ được tách ra từ đại quân
  parentFormationId?: string | null;

  createdAt: number;
  
  totalTroops: number;
  totalWeapons: number;
  totalHorses: number;
  totalElephants: number;
  totalFoodCarried: number;
  // --- Hệ thống chiến đấu liên tục trên bản đồ thế giới (3 tuyến) ---
  faction?: 'lam_son' | 'ming';
  roster?: ArmyRosterCounts;
  layers?: ArmyThreeLayersState;
  morale?: number;              // 0..100, mặc định 100
  facingAngleDeg?: number;      // mặc định 0
  isStealthed?: boolean;
  isRouting?: boolean;
  ambushShockApplied?: boolean;
  preparedTrap?: 'fire' | 'rockfall' | null;
  supplySourceCityId?: string | null;
  isSupplyCut?: boolean;
  convoyLost?: boolean;         // Đoàn vận lương đi kèm đã bị tiêu diệt/thu giữ
  armyRole?: 'main' | 'detachment' | 'ming_expedition' | 'ming_convoy';
  combatState?: WorldCombatState | null;
}
