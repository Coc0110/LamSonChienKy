export type BaseBuildingType =
  | 'main_hall'     // Căn cứ chính
  | 'farm'          // Ruộng
  | 'forge'         // Lò rèn
  | 'food_storage'  // Kho lương
  | 'armory'        // Kho vũ khí
  | 'house'         // Nhà dân
  | 'barracks'      // Trại luyện binh
  | 'wall'          // Tường rào / Lũy tre
  | 'gate'          // Cổng thành
  | 'watchtower'    // Chòi canh
  | 'spike_trap'    // Bẫy chông
  | 'road'          // Đường đất
  | 'market';       // Chợ phiên

export type BaseBuildingCategory = 'core' | 'economy' | 'military' | 'defense';

export type BaseBuildingStatus = 'building' | 'active' | 'upgrading' | 'destroyed';

export interface BaseBuilding {
  id: string;
  type: BaseBuildingType;
  level: number;
  col: number;
  row: number;
  spanCols: number;
  spanRows: number;
  hp: number;
  maxHp: number;
  status: BaseBuildingStatus;
  buildDaysRemaining?: number;
  rotation?: 0 | 1 | 2 | 3;
  supervisorGeneralId?: string | null;
}

export interface RegionLayout {
  cityId: string;
  gridSize: number; // Mặc định 24x24
  terrainSeed: number;
  buildings: BaseBuilding[];
  lastScoutedDay?: number;
}

export interface Region3DViewState {
  cityId: string;
  mode: 'base_build' | 'scout_view';
}

export type SiegeUnitFaction = 'lam_son' | 'ming';

export interface RegionCombatUnit {
  id: string;
  faction: SiegeUnitFaction;
  unitType: 'swordsman' | 'spearman' | 'archer' | 'cavalry' | 'elephant';
  x: number; // Tọa độ liên tục trên lưới 0..24
  z: number; // Tọa độ liên tục trên lưới 0..24
  hp: number;
  maxHp: number;
  atk: number;
  range: number;
  speed: number;
  targetId?: string;
  attackCooldown: number;
  soldiers: number;
  maxSoldiers: number;
}

export interface SiegeBattleState {
  id: string;
  targetCityId: string;
  targetCityName: string;
  formationId: string;
  layout: RegionLayout;
  units: RegionCombatUnit[];
  deployPool: Record<'swordsman' | 'spearman' | 'archer' | 'cavalry' | 'elephant', number>;
  destructionPercent: number;
  mainHallDestroyed: boolean;
  lootFood: number;
  lootWeapons: number;
  lootGold: number;
  status: 'deploying' | 'fighting' | 'victory' | 'defeat';
  elapsedSeconds: number;
}

export interface AmbushBattleState {
  id: string;
  formationId: string;
  districtName: string;
  gridSize: number; // 24
  blockedTiles: Array<{ col: number; row: number; kind: 'forest' | 'cliff' }>;
  exitZone: { minCol: number; maxCol: number; minRow: number; maxRow: number };
  units: RegionCombatUnit[];
  selectedUnitId: string | null;
  moveTargets: Record<string, { x: number; z: number }>;
  status: 'fighting' | 'escaped' | 'victory' | 'defeat';
  elapsedSeconds: number;
}

export interface DefenseBattleState {
  id: string;
  cityId: string;
  cityName: string;
  layout: RegionLayout;
  units: RegionCombatUnit[];
  reservePool: Record<'swordsman' | 'spearman' | 'archer' | 'cavalry' | 'elephant', number>;
  mainHallDestroyed: boolean;
  status: 'fighting' | 'victory' | 'defeat';
  elapsedSeconds: number;
}
