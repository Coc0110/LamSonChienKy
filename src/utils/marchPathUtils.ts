import type {
  TacticalFormation,
  MarchPathCell,
  MarchEndpointAction,
} from '../types/armyFormation';
import type { CityNode } from '../types';
import type { TerrainType } from '../types/terrain';
import { getGridTerrain, coordToCell, cellToCoord, GRID_COLS, GRID_ROWS } from '../data/terrainGrid';
import { TERRAIN_DEFINITIONS } from '../data/terrainData';

export interface EndpointActionMeta {
  id: MarchEndpointAction;
  name: string;
  nameHanzi: string;
  shortLabel: string;
  icon: string;
  color: string;
  badgeClass: string;
  description: string;
}

export const MARCH_ENDPOINT_ACTIONS: Record<MarchEndpointAction, EndpointActionMeta> = {
  camp: {
    id: 'camp',
    name: 'Đóng Quân / Hạ Trại',
    nameHanzi: '駐營',
    shortLabel: 'Hạ Trại',
    icon: '⛺',
    color: '#d97706',
    badgeClass: 'bg-amber-900/90 text-amber-100 border-amber-500',
    description: 'Dựng trại dã chiến giữ vị trí tại ô đích (+25% phòng thủ, hồi phục sĩ khí, làm bàn đạp vẽ chặng tiếp theo).',
  },
  ambush: {
    id: 'ambush',
    name: 'Mai Phục / Phục Kích',
    nameHanzi: '埋伏',
    shortLabel: 'Mai Phục',
    icon: '🌲',
    color: '#16a34a',
    badgeClass: 'bg-emerald-950/90 text-emerald-200 border-emerald-500',
    description: 'Ẩn quân tại địa hình hiểm (Rừng già/Núi cao). Tự động đổ ra đánh úp toán quân Minh đi lọt vào bán kính 6 ô quanh trận địa!',
  },
  raid: {
    id: 'raid',
    name: 'Tập Kích / Công Kích',
    nameHanzi: '襲擊',
    shortLabel: 'Tập Kích',
    icon: '⚔️',
    color: '#dc2626',
    badgeClass: 'bg-red-950/90 text-red-200 border-red-500',
    description: 'Đánh úp đồn trại quân Minh lân cận điểm đích, tiêu hao sinh lực địch, đoạt lương thảo và vũ khí hoặc hạ thành.',
  },
  scout: {
    id: 'scout',
    name: 'Thám Thính / Do Thám',
    nameHanzi: '偵察',
    shortLabel: 'Thám Thính',
    icon: '👁️',
    color: '#0284c7',
    badgeClass: 'bg-sky-950/90 text-sky-200 border-sky-500',
    description: 'Mở rộng tầm nhìn trinh sát bán kính 12 ô lưới, soi rõ quân số đồn địch và tăng +15% sức chiến đấu cho quân ta gần đó.',
  },
  forage: {
    id: 'forage',
    name: 'Thu Thập / Tích Lương',
    nameHanzi: '屯糧',
    shortLabel: 'Tích Lương',
    icon: '🌾',
    color: '#ca8a04',
    badgeClass: 'bg-yellow-950/90 text-yellow-200 border-yellow-500',
    description: 'Cho quân thu lượm lương thảo, săn bắn và khai thác tại chỗ, bổ sung lương thực mỗi ngày vào quân lương.',
  },
  decoy: {
    id: 'decoy',
    name: 'Nghi Binh / Dụ Địch',
    nameHanzi: '疑兵',
    shortLabel: 'Nghi Binh',
    icon: '🔥',
    color: '#ea580c',
    badgeClass: 'bg-orange-950/90 text-orange-200 border-orange-500',
    description: 'Đốt nhiều lửa trại, cắm cờ hư trương thanh thế thu hút quân Minh rời đồn kéo ra truy kích vào ổ phục kích của đại quân.',
  },
  feigned_retreat: {
    id: 'feigned_retreat',
    name: 'Trá Bại Dụ Địch',
    nameHanzi: '詐敗',
    shortLabel: 'Trá Bại',
    icon: '🏳️',
    color: '#9333ea',
    badgeClass: 'bg-purple-950/90 text-purple-200 border-purple-400',
    description: 'Lộ trình kép: Tiến lên khiêu khích đồn địch rồi vờ thua tháo chạy theo đường rút lui để dẫn xác quân Minh vào ổ Mai Phục!',
  },
};

export const STATUS_LABELS: Record<TacticalFormation['status'], { label: string; icon: string; color: string }> = {
  idle: { label: 'Tại Bản Doanh', icon: '🏯', color: '#a8a29e' },
  stationed: { label: 'Đang Hạ Trại', icon: '⛺', color: '#f59e0b' },
  marching: { label: 'Đang Hành Quân', icon: '🚩', color: '#ef4444' },
  ambushing: { label: 'Đang Mai Phục', icon: '🌲', color: '#22c55e' },
  scouting: { label: 'Đang Thám Thính', icon: '👁️', color: '#38bdf8' },
  foraging: { label: 'Đang Tích Lương', icon: '🌾', color: '#eab308' },
  decoying: { label: 'Đang Nghi Binh', icon: '🔥', color: '#f97316' },
  engaging: { label: 'Đang Giao Chiến', icon: '⚔️', color: '#dc2626' },
  retreating: { label: 'Trá Bại Rút Lui', icon: '🏳️', color: '#c084fc' },
};

// Lấy tọa độ hiện tại của đạo quân trên bản đồ & ô lưới
export function getFormationMapPos(
  formation: TacticalFormation,
  cities: CityNode[]
): { x: number; y: number; col: number; row: number } {
  if (formation.mapPosition) {
    return formation.mapPosition;
  }
  const homeCity = cities.find(c => c.id === formation.cityId) || cities[0];
  const x = homeCity ? homeCity.x : 44.8;
  const y = homeCity ? homeCity.y : 46.2;
  const cell = coordToCell(x, y);
  return { x, y, col: cell.col, row: cell.row };
}

// Tính hệ số tốc độ của đạo quân dựa trên thành phần binh chủng và địa hình ô
export function getFormationTerrainSpeedFactor(
  formation: TacticalFormation,
  terrain: TerrainType,
  isRetreat = false
): number {
  let hasCavalry = false;
  let hasHeavy = false;
  let totalMounted = 0;
  let totalInfantry = 0;

  const seen = new Set<string>();
  formation.grid.forEach(row => {
    row.forEach(u => {
      if (u && !seen.has(u.parentUnitId) && u.type !== 'general') {
        seen.add(u.parentUnitId);
        const mult = u.multiplier || 1;
        if (u.type === 'cavalry' || u.type === 'scout') {
          hasCavalry = true;
          totalMounted += mult;
        } else if (u.type === 'elephant' || u.type === 'supply_cart') {
          hasHeavy = true;
        } else {
          totalInfantry += mult;
        }
      }
    });
  });

  let factor = 1.0;

  // Kỵ binh/Thám mã phi nhanh trên đồng bằng nhưng vướng víu trong rừng/núi/đầm lầy
  if (hasCavalry && totalMounted >= totalInfantry) {
    if (terrain === 'plains') factor *= 1.45;
    else if (terrain === 'forest' || terrain === 'swamp') factor *= 0.8;
    else if (terrain === 'mountain') factor *= 0.65;
  }

  // Voi chiến và Xe lương đi chậm ở rừng núi, đầm lầy và khi vượt sông
  if (hasHeavy) {
    if (terrain === 'mountain' || terrain === 'swamp' || terrain === 'water') {
      factor *= 0.72;
    } else {
      factor *= 0.88;
    }
  }

  // Đội quân nhẹ (< 20 quân, không mang voi/xe lương) thông thuộc địa hình rừng núi Lam Sơn
  if (!hasHeavy && formation.totalTroops > 0 && formation.totalTroops <= 20) {
    if (terrain === 'forest' || terrain === 'mountain') {
      factor *= 1.25;
    } else {
      factor *= 1.15;
    }
  }

  // Khi trá bại rút lui / chạy gấp, tốc độ tăng thêm 25%
  if (isRetreat) {
    factor *= 1.25;
  }

  return Math.max(0.35, factor);
}

// Thời gian cơ sở để vượt qua 1 ô lưới (250m) ở đồng bằng là ~0.04 ngày (~25 ô/ngày)
export const BASE_CELL_DAYS = 0.04;

export function calculateCellMoveCostDays(
  terrain: TerrainType,
  formation: TacticalFormation,
  isRetreat = false
): number {
  // Cho phép vượt sông (water) bằng cách đóng bè mảng nhưng tốn nhiều thời gian (moveCost = 5.2)
  const rawTerrainCost =
    terrain === 'water'
      ? 5.2
      : TERRAIN_DEFINITIONS[terrain]?.moveSpeedCost || 1.0;

  const speedFactor = getFormationTerrainSpeedFactor(formation, terrain, isRetreat);
  return Math.max(0.015, Number(((BASE_CELL_DAYS * rawTerrainCost) / speedFactor).toFixed(4)));
}

export function createMarchPathCell(
  col: number,
  row: number,
  formation: TacticalFormation,
  prevCumulativeDays = 0,
  isRetreat = false
): MarchPathCell {
  const { minX, minY, maxX, maxY } = cellToCoord(col, row);
  const x = Number(((minX + maxX) / 2).toFixed(4));
  const y = Number(((minY + maxY) / 2).toFixed(4));
  const terrain = getGridTerrain(col, row);
  const moveCostDays = calculateCellMoveCostDays(terrain, formation, isRetreat);
  const cumulativeDays = Number((prevCumulativeDays + moveCostDays).toFixed(3));
  // Lương thảo tiêu hao: mỗi quân 0.15 lương/ngày trên đường hành quân
  const troops = Math.max(1, formation.totalTroops);
  const foodCost = Number((troops * moveCostDays * 0.18).toFixed(2));

  return {
    col,
    row,
    x,
    y,
    terrain,
    moveCostDays,
    cumulativeDays,
    foodCost,
  };
}

// Nội suy đường thẳng qua các ô lưới liền kề (4-connected hoặc 8-connected mượt mà)
// Chặn tự động nếu gặp ô Vách đá (cliff)
export function traceGridSegment(
  startCol: number,
  startRow: number,
  endCol: number,
  endRow: number
): { cells: { col: number; row: number }[]; blockedByCliff: boolean; cliffCell?: { col: number; row: number } } {
  const result: { col: number; row: number }[] = [];
  let c0 = Math.max(0, Math.min(GRID_COLS - 1, startCol));
  let r0 = Math.max(0, Math.min(GRID_ROWS - 1, startRow));
  const c1 = Math.max(0, Math.min(GRID_COLS - 1, endCol));
  const r1 = Math.max(0, Math.min(GRID_ROWS - 1, endRow));

  const dc = Math.abs(c1 - c0);
  const dr = Math.abs(r1 - r0);
  const sc = c0 < c1 ? 1 : -1;
  const sr = r0 < r1 ? 1 : -1;
  let err = dc - dr;

  let safety = 0;
  while (safety++ < 2500) {
    if (c0 !== startCol || r0 !== startRow) {
      const terrain = getGridTerrain(c0, r0);
      if (terrain === 'cliff') {
        return {
          cells: result,
          blockedByCliff: true,
          cliffCell: { col: c0, row: r0 },
        };
      }
      result.push({ col: c0, row: r0 });
    }
    if (c0 === c1 && r0 === r1) break;
    const e2 = 2 * err;
    if (e2 > -dr) {
      err -= dr;
      c0 += sc;
    }
    if (e2 < dc) {
      err += dc;
      r0 += sr;
    }
  }

  return { cells: result, blockedByCliff: false };
}

// Nối thêm ô mới vào lộ trình đang vẽ (hỗ trợ kéo lùi để xóa bớt đầu mút)
export function appendCellsToMarchPath(
  existingCells: MarchPathCell[],
  targetCol: number,
  targetRow: number,
  formation: TacticalFormation,
  isRetreat = false
): { cells: MarchPathCell[]; blockedByCliff: boolean; cliffCell?: { col: number; row: number } } {
  if (existingCells.length === 0) {
    const first = createMarchPathCell(targetCol, targetRow, formation, 0, isRetreat);
    first.moveCostDays = 0;
    first.cumulativeDays = 0;
    first.foodCost = 0;
    return { cells: [first], blockedByCliff: false };
  }

  const lastCell = existingCells[existingCells.length - 1];
  if (lastCell.col === targetCol && lastCell.row === targetRow) {
    return { cells: existingCells, blockedByCliff: false };
  }

  // Nếu người chơi kéo lùi về đúng một trong 6 ô gần nhất ở cuối đường -> Cắt ngắn đường về ô đó (xoá lùi tự nhiên)
  const backtrackWindow = Math.max(0, existingCells.length - 8);
  for (let i = existingCells.length - 2; i >= backtrackWindow; i--) {
    if (existingCells[i].col === targetCol && existingCells[i].row === targetRow) {
      return {
        cells: existingCells.slice(0, i + 1),
        blockedByCliff: false,
      };
    }
  }

  const traced = traceGridSegment(lastCell.col, lastCell.row, targetCol, targetRow);
  if (traced.cells.length === 0) {
    return {
      cells: existingCells,
      blockedByCliff: traced.blockedByCliff,
      cliffCell: traced.cliffCell,
    };
  }

  const nextCells = [...existingCells];
  let cumDays = lastCell.cumulativeDays;

  for (const pt of traced.cells) {
    const prev = nextCells[nextCells.length - 1];
    if (prev && prev.col === pt.col && prev.row === pt.row) continue;

    // Nếu quẹt trùng ô cách đó 1 bước thì thu gọn tránh răng cưa
    if (nextCells.length >= 2) {
      const prev2 = nextCells[nextCells.length - 2];
      if (prev2.col === pt.col && prev2.row === pt.row) {
        nextCells.pop();
        cumDays = nextCells[nextCells.length - 1].cumulativeDays;
        continue;
      }
    }

    const cellObj = createMarchPathCell(pt.col, pt.row, formation, cumDays, isRetreat);
    cumDays = cellObj.cumulativeDays;
    nextCells.push(cellObj);
  }

  return {
    cells: nextCells,
    blockedByCliff: traced.blockedByCliff,
    cliffCell: traced.cliffCell,
  };
}

export interface RouteAnalysisSummary {
  totalCells: number;
  totalDistanceKm: number;
  totalDays: number;
  totalFoodCost: number;
  waterCrossings: number;
  endTerrain: TerrainType;
  ambushSuccessRate: number;
  defenseBonus: number;
  nearbyEnemyCity: CityNode | null;
  nearbyFriendlyAmbush: TacticalFormation | null;
  terrainCounts: Record<TerrainType, number>;
}

export function analyzeMarchRoute(
  cells: MarchPathCell[],
  retreatCells: MarchPathCell[] | undefined,
  cities: CityNode[],
  formations: TacticalFormation[],
  currentFormationId: string
): RouteAnalysisSummary {
  const allCells = [
    ...cells.slice(1), // Bỏ ô xuất phát
    ...(retreatCells ? retreatCells.slice(1) : []),
  ];

  const terrainCounts: Record<TerrainType, number> = {
    plains: 0,
    forest: 0,
    mountain: 0,
    cliff: 0,
    swamp: 0,
    water: 0,
  };

  let totalDays = 0;
  let totalFoodCost = 0;
  let waterCrossings = 0;

  allCells.forEach(c => {
    terrainCounts[c.terrain] = (terrainCounts[c.terrain] || 0) + 1;
    totalDays += c.moveCostDays;
    totalFoodCost += c.foodCost;
    if (c.terrain === 'water') waterCrossings++;
  });

  const finalCell =
    retreatCells && retreatCells.length > 0
      ? retreatCells[retreatCells.length - 1]
      : cells[cells.length - 1];

  const primaryEndCell = cells[cells.length - 1];
  const endTerrain = finalCell ? finalCell.terrain : 'plains';
  const tDef = TERRAIN_DEFINITIONS[endTerrain];

  // Kiểm tra đồn địch gần điểm cuối của Chặng 1 (bán kính ~2.2% tọa độ ~ 15 ô)
  let nearbyEnemyCity: CityNode | null = null;
  if (primaryEndCell) {
    let minDist = Infinity;
    for (const city of cities) {
      if (city.faction === 'ming' && city.troops > 0) {
        const d = Math.hypot(city.x - primaryEndCell.x, city.y - primaryEndCell.y);
        if (d <= 2.4 && d < minDist) {
          minDist = d;
          nearbyEnemyCity = city;
        }
      }
    }
  }

  // Kiểm tra xem điểm cuối có nằm gần ổ Mai Phục của đại quân ta không
  let nearbyFriendlyAmbush: TacticalFormation | null = null;
  if (finalCell) {
    for (const f of formations) {
      if (f.id !== currentFormationId && f.status === 'ambushing') {
        const fPos = getFormationMapPos(f, cities);
        const cellDist = Math.hypot(fPos.col - finalCell.col, fPos.row - finalCell.row);
        if (cellDist <= 8) {
          nearbyFriendlyAmbush = f;
          break;
        }
      }
    }
  }

  return {
    totalCells: allCells.length,
    totalDistanceKm: Number((allCells.length * 0.25).toFixed(1)),
    totalDays: Math.max(0.1, Number(totalDays.toFixed(1))),
    totalFoodCost: Math.ceil(totalFoodCost),
    waterCrossings,
    endTerrain,
    ambushSuccessRate: tDef?.ambushSuccessRate || 10,
    defenseBonus: tDef?.defenseBonus || 0,
    nearbyEnemyCity,
    nearbyFriendlyAmbush,
    terrainCounts,
  };
}
