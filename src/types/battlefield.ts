import type { TerrainType } from './terrain';
import type { TacticalUnitType } from './armyFormation';

export type BattlefieldScaleLevel = '1x' | '10x' | '100x';

export interface BattlefieldTile {
  col: number;             // 0..95
  row: number;             // 0..31
  terrain: TerrainType;    // plains, forest, mountain, cliff, swamp, water
  isPassable: boolean;     // Không thể đi xuyên qua nếu là vách đá dốc hoặc nước sâu
  speedCost: number;       // Hệ số tiêu hao di chuyển (1.0 = bình thường, 2.5 = đầm lầy)
  defenseBonus: number;    // % Giảm sát thương nhận vào (+0.25 = giảm 25%)
  elevation: number;       // 0: vùng trũng/bình thường, 1: cao điểm mỏm đá/gò đất (+tầm bắn)
  coverType: 'none' | 'light' | 'dense'; // Ẩn thân trong bụi/rừng rậm
  zone: 'lam_son' | 'neutral' | 'ming';  // Cột 0..31: Lam Sơn, 32..63: Trung gian, 64..95: Minh
}

export interface BattlefieldGrid {
  cols: number; // 96
  rows: number; // 32
  tiles: BattlefieldTile[][]; // tiles[row][col] (32 hàng x 96 cột)
  scale: BattlefieldScaleLevel;
  centerMapCol: number;
  centerMapRow: number;
  sampleWindow: {
    startCol: number;
    startRow: number;
    sampleCols: number;
    sampleRows: number;
  };
}

export interface BattlefieldUnit {
  id: string;
  formationId: string;
  faction: 'lam_son' | 'ming';
  unitTypeId: TacticalUnitType;
  
  col: number; // 0..95
  row: number; // 0..31
  spanCols: number;
  spanRows: number;
  
  // Trọng lượng quân cờ thực tế
  soldiersCount: number;
  maxSoldiersCount: number;
  hp: number;
  maxHp: number;
  morale: number; // 0..100
  
  // Chỉ huy tướng lĩnh
  generalId?: string;
  generalName?: string;
  commandAuraRadius?: number; // Bán kính hỗ trợ sĩ khí
  
  // Trang bị vũ khí
  weaponsBreakdown?: {
    swords: number;
    bows: number;
    spears: number;
  };
  
  // Trạng thái chiến trường
  status: 'holding' | 'advancing' | 'fighting' | 'routing' | 'eliminated';
  hasActedThisTurn?: boolean;
  eliminatedAtTurn?: number;
  lastDamageTaken?: number;

  // Dữ liệu Neo Đội Hình & Chống Kẹt AI
  formationOffsetCol?: number;
  formationOffsetRow?: number;
  stuckTurns?: number;
}

export interface BattlefieldLogEntry {
  id: string;
  turn: number;
  canhHour: string;
  type: 'move' | 'clash' | 'morale' | 'retreat' | 'general' | 'system';
  message: string;
  actorFaction?: 'lam_son' | 'ming';
}

export interface BattlefieldState {
  id: string;
  isSandbox?: boolean;
  sandboxParams?: any;
  battleName: string;
  locationName: string;
  scale: BattlefieldScaleLevel;
  grid: BattlefieldGrid;
  units: BattlefieldUnit[];
  
  turn: number;
  maxTurns: number;
  phase: 'preparing' | 'in_progress' | 'victory' | 'defeat' | 'retreated';
  
  lamSonMorale: number; // 0..100
  mingMorale: number;   // 0..100

  lamSonAnchor?: { col: number; row: number };
  mingAnchor?: { col: number; row: number };
  
  initialLamSonSoldiers: number;
  initialMingSoldiers: number;
  
  casualties: {
    lamSonKilled: number;
    mingKilled: number;
    weaponsLost: number;
    weaponsCaptured: number;
    foodCaptured: number;
    goldCaptured: number;
  };
  
  logs: BattlefieldLogEntry[];
}
