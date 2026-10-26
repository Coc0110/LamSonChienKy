import type { TerrainType } from '../types/terrain';
import type { StructureType, CityNode, PlacedStructure, TroopType } from '../types';
import type { CellBuildValidation, GridPathResult } from '../types/grid';
import { getTerrainAt, TERRAIN_DEFINITIONS } from './terrainData';
import { MAP_COORD_W, MAP_COORD_H } from '../utils/mapGeo';

// Ô lưới hình vuông thực sự (Square Grid Cells):
// Cạnh ô = 1/4 chiều rộng ô cũ (0.5% / 4 = 0.125% theo chiều ngang, tương đương 0.7 đơn vị CRS.Simple)
export const GRID_CELL_W_PCT = 0.125;
export const GRID_CELL_SIZE = GRID_CELL_W_PCT; // Giữ tương thích ngược
export const GRID_CELL_UNITS = (GRID_CELL_W_PCT / 100) * MAP_COORD_W; // 0.7 px ở zoom 0
export const GRID_CELL_H_PCT = (GRID_CELL_UNITS / MAP_COORD_H) * 100; // ~0.0951087% để ô hiển thị chuẩn hình vuông 1:1

export const GRID_COLS = Math.round(100 / GRID_CELL_W_PCT); // 800 cột
export const GRID_ROWS = Math.ceil(100 / GRID_CELL_H_PCT); // 1052 hàng
export const TOTAL_GRID_CELLS = GRID_COLS * GRID_ROWS; // 841,600 ô

export const TERRAIN_STORAGE_KEY = 'lam_son_terrain_grid_custom_v2';

// Bảng mã hóa số nguyên cho từng loại địa hình để tối ưu bộ nhớ
export const TERRAIN_CODES: Record<TerrainType, number> = {
  plains: 0,
  forest: 1,
  mountain: 2,
  cliff: 3,
  swamp: 4,
  water: 5,
};

export const CODE_TO_TERRAIN: Record<number, TerrainType> = {
  0: 'plains',
  1: 'forest',
  2: 'mountain',
  3: 'cliff',
  4: 'swamp',
  5: 'water',
};

// Lưu các ô tùy biến đã sơn (sparse map: cellIndex -> TerrainType)
let customTerrainMap = new Map<number, TerrainType>();

// Khởi tạo và đọc dữ liệu đã lưu từ localStorage
export function loadCustomTerrainGrid(): Map<number, TerrainType> {
  try {
    const raw = localStorage.getItem(TERRAIN_STORAGE_KEY);
    if (raw) {
      const parsed: Record<string, number> = JSON.parse(raw);
      customTerrainMap.clear();
      for (const key in parsed) {
        const idx = Number(key);
        const code = parsed[key];
        if (CODE_TO_TERRAIN[code]) {
          customTerrainMap.set(idx, CODE_TO_TERRAIN[code]);
        }
      }
    }
  } catch {
    // Ignore storage parse error
  }
  return customTerrainMap;
}

// Lưu dữ liệu vào localStorage
export function saveCustomTerrainGrid() {
  try {
    const obj: Record<number, number> = {};
    customTerrainMap.forEach((type, idx) => {
      obj[idx] = TERRAIN_CODES[type];
    });
    localStorage.setItem(TERRAIN_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // Ignore storage error
  }
}

// Reset toàn bộ về mặc định
export function resetCustomTerrainGrid() {
  customTerrainMap.clear();
  try {
    localStorage.removeItem(TERRAIN_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

// Export JSON
export function exportTerrainGridJSON(): string {
  const obj: Record<number, number> = {};
  customTerrainMap.forEach((type, idx) => {
    obj[idx] = TERRAIN_CODES[type];
  });
  return JSON.stringify(obj);
}

// Chuyển đổi tọa độ phần trăm % (0..100) sang chỉ số ô (col, row)
export function coordToCell(x: number, y: number): { col: number; row: number; centerX: number; centerY: number } {
  const col = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(x / GRID_CELL_W_PCT)));
  const row = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(y / GRID_CELL_H_PCT)));
  const centerX = Math.round(((col + 0.5) * GRID_CELL_W_PCT) * 10000) / 10000;
  const centerY = Math.round(((row + 0.5) * GRID_CELL_H_PCT) * 10000) / 10000;
  return { col, row, centerX, centerY };
}

// Chuyển đổi từ chỉ số ô (col, row) sang tọa độ biên và tâm %
export function cellToCoord(col: number, row: number) {
  const minX = col * GRID_CELL_W_PCT;
  const maxX = (col + 1) * GRID_CELL_W_PCT;
  const minY = row * GRID_CELL_H_PCT;
  const maxY = (row + 1) * GRID_CELL_H_PCT;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  return { minX, maxX, minY, maxY, centerX, centerY };
}

// Lấy địa hình mặc định dựa trên hàm getTerrainAt gốc
export function getDefaultCellTerrain(col: number, row: number): TerrainType {
  const centerX = (col + 0.5) * GRID_CELL_W_PCT;
  const centerY = (row + 0.5) * GRID_CELL_H_PCT;
  return getTerrainAt(centerX, centerY).type;
}

// Lấy địa hình của ô (ưu tiên dữ liệu đã sơn nếu có)
export function getGridTerrain(col: number, row: number): TerrainType {
  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return 'mountain';
  const idx = row * GRID_COLS + col;
  const custom = customTerrainMap.get(idx);
  if (custom) return custom;
  return getDefaultCellTerrain(col, row);
}

// Lấy địa hình tại tọa độ bất kỳ qua lưới
export function getGridTerrainAt(x: number, y: number): TerrainType {
  const { col, row } = coordToCell(x, y);
  return getGridTerrain(col, row);
}

// Sơn địa hình cho 1 ô đơn lẻ
export function setGridTerrain(col: number, row: number, type: TerrainType) {
  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;
  const idx = row * GRID_COLS + col;
  const def = getDefaultCellTerrain(col, row);
  if (def === type) {
    customTerrainMap.delete(idx);
  } else {
    customTerrainMap.set(idx, type);
  }
}

// Sơn địa hình theo cọ vẽ (1x1, 3x3, 5x5, 9x9)
export function paintTerrainBrush(centerCol: number, centerRow: number, type: TerrainType, brushSize: 1 | 3 | 5 | 9) {
  const half = Math.floor(brushSize / 2);
  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      const c = centerCol + dx;
      const r = centerRow + dy;
      setGridTerrain(c, r, type);
    }
  }
  saveCustomTerrainGrid();
}

// Khởi chạy đọc dữ liệu tùy biến khi nạp module
loadCustomTerrainGrid();

// ============================================================================
// KIỂM SOÁT XÂY DỰNG THEO Ô LƯỚI (CELL-BASED PLACEMENT VALIDATION)
// ============================================================================
export function validateCellPlacement(
  rawX: number,
  rawY: number,
  structureType: StructureType,
  targetCityId: string,
  cities: CityNode[],
  structures: PlacedStructure[],
  ignoreStructureId?: string
): CellBuildValidation {
  const { col, row, centerX, centerY } = coordToCell(rawX, rawY);
  const terrain = getGridTerrain(col, row);
  const terrainInfo = TERRAIN_DEFINITIONS[terrain];

  const targetCity = cities.find(c => c.id === targetCityId);

  // 1. Kiểm tra cự ly bảo hộ tới căn cứ (tối đa 14 dặm ~ 14%)
  if (targetCity) {
    const dist = Math.hypot(targetCity.x - centerX, targetCity.y - centerY);
    if (dist > 14.0) {
      return {
        canBuild: false,
        reason: `Quá xa căn cứ (${dist.toFixed(1)} > 14 dặm)`,
        terrain,
        snappedX: centerX,
        snappedY: centerY,
        col,
        row,
      };
    }
  }

  // 2. Kiểm tra ô đã bị chiếm dụng bởi công trình khác chưa
  for (const s of structures) {
    if (ignoreStructureId && s.id === ignoreStructureId) {
      continue;
    }
    const sCell = coordToCell(s.x, s.y);
    if (sCell.col === col && sCell.row === row) {
      return {
        canBuild: false,
        reason: `Ô này đã có [${s.name}] đang chiếm giữ!`,
        terrain,
        snappedX: centerX,
        snappedY: centerY,
        col,
        row,
      };
    }
    // Giãn cách an toàn tối thiểu giữa các công trình (1.5 dặm)
    if (Math.hypot(s.x - centerX, s.y - centerY) < 1.5) {
      return {
        canBuild: false,
        reason: `Quá gần [${s.name}] (cần cách ít nhất 3 ô)`,
        terrain,
        snappedX: centerX,
        snappedY: centerY,
        col,
        row,
      };
    }
  }

  // 3. Kiểm tra ô đã bị chiếm bởi cứ điểm/thành trì
  for (const c of cities) {
    const cCell = coordToCell(c.x, c.y);
    if (cCell.col === col && cCell.row === row) {
      return {
        canBuild: false,
        reason: `Tâm cứ điểm [${c.name}] không thể đặt công trình!`,
        terrain,
        snappedX: centerX,
        snappedY: centerY,
        col,
        row,
      };
    }
  }

  // 4. Kiểm tra điều kiện địa hình cho từng loại công trình
  if (structureType === 'farm') {
    if (terrain !== 'plains') {
      return {
        canBuild: false,
        reason: `Địa hình ${terrainInfo.name} (Ruộng lúa nước chỉ cấy được trên ô Đồng Bằng)`,
        terrain,
        snappedX: centerX,
        snappedY: centerY,
        col,
        row,
      };
    }
  } else if (structureType === 'forge') {
    if (terrain === 'water') {
      return {
        canBuild: false,
        reason: 'Không thể dựng lò rèn chìm dưới lòng sông ngòi!',
        terrain,
        snappedX: centerX,
        snappedY: centerY,
        col,
        row,
      };
    }
    if (terrain === 'cliff') {
      return {
        canBuild: false,
        reason: 'Vách đá dốc đứng không có mặt bằng dựng bễ đúc!',
        terrain,
        snappedX: centerX,
        snappedY: centerY,
        col,
        row,
      };
    }
  }

  return {
    canBuild: true,
    reason: `Hợp lệ! Ô địa hình: ${terrainInfo.name}`,
    terrain,
    snappedX: centerX,
    snappedY: centerY,
    col,
    row,
  };
}

// ============================================================================
// THUẬT TOÁN A* TÌM ĐƯỜNG HÀNH QUÂN TRÊN TẤM LƯỚI Ô VUÔNG (A* PATHFINDING)
// ============================================================================
interface AStarNode {
  col: number;
  row: number;
  g: number; // Chi phí từ điểm xuất phát đến ô này
  h: number; // Dự đoán chi phí đến đích
  f: number; // g + h
  parent?: AStarNode;
}

export function findGridAStarPath(
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  troopType: TroopType = 'infantry'
): GridPathResult {
  const start = coordToCell(startX, startY);
  const target = coordToCell(targetX, targetY);

  if (start.col === target.col && start.row === target.row) {
    const t = getGridTerrain(start.col, start.row);
    return {
      found: true,
      path: [[start.centerX, start.centerY]],
      cellPath: [{ col: start.col, row: start.row }],
      totalCost: 1,
      totalDistanceKm: 1,
      terrainBreakdown: { plains: 0, forest: 0, mountain: 0, cliff: 0, swamp: 0, water: 0, [t]: 100 },
    };
  }

  const openList: AStarNode[] = [];
  const closedSet = new Set<number>();
  const gScores = new Map<number, number>();

  const startIdx = start.row * GRID_COLS + start.col;
  const startNode: AStarNode = {
    col: start.col,
    row: start.row,
    g: 0,
    h: Math.hypot(start.col - target.col, start.row - target.row),
    f: 0,
  };
  startNode.f = startNode.g + startNode.h;

  openList.push(startNode);
  gScores.set(startIdx, 0);

  // 8 hướng di chuyển (ngang, dọc, chéo)
  const DIRS = [
    { dx: 1, dy: 0, dist: 1.0 },
    { dx: -1, dy: 0, dist: 1.0 },
    { dx: 0, dy: 1, dist: 1.0 },
    { dx: 0, dy: -1, dist: 1.0 },
    { dx: 1, dy: 1, dist: 1.414 },
    { dx: -1, dy: 1, dist: 1.414 },
    { dx: 1, dy: -1, dist: 1.414 },
    { dx: -1, dy: -1, dist: 1.414 },
  ];

  let iterations = 0;
  const MAX_ITERATIONS = 4000; // Giới hạn số bước tìm kiếm để đảm bảo 60fps mượt mà

  while (openList.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;

    // Lấy node có f nhỏ nhất
    let lowestIdx = 0;
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[lowestIdx].f) {
        lowestIdx = i;
      }
    }
    const current = openList.splice(lowestIdx, 1)[0];
    const currIdx = current.row * GRID_COLS + current.col;

    // Đã chạm đích
    if (current.col === target.col && current.row === target.row) {
      const cellPath: { col: number; row: number }[] = [];
      const path: [number, number][] = [];
      const terrainCounts: Record<TerrainType, number> = {
        plains: 0,
        forest: 0,
        mountain: 0,
        cliff: 0,
        swamp: 0,
        water: 0,
      };

      let curr: AStarNode | undefined = current;
      while (curr) {
        cellPath.unshift({ col: curr.col, row: curr.row });
        const { centerX, centerY } = cellToCoord(curr.col, curr.row);
        path.unshift([centerX, centerY]);

        const terr = getGridTerrain(curr.col, curr.row);
        terrainCounts[terr]++;
        curr = curr.parent;
      }

      const totalSteps = cellPath.length || 1;
      const breakdown: Record<TerrainType, number> = {
        plains: Math.round((terrainCounts.plains / totalSteps) * 100),
        forest: Math.round((terrainCounts.forest / totalSteps) * 100),
        mountain: Math.round((terrainCounts.mountain / totalSteps) * 100),
        cliff: Math.round((terrainCounts.cliff / totalSteps) * 100),
        swamp: Math.round((terrainCounts.swamp / totalSteps) * 100),
        water: Math.round((terrainCounts.water / totalSteps) * 100),
      };

      return {
        found: true,
        path,
        cellPath,
        totalCost: Math.round(current.g * 10) / 10,
        totalDistanceKm: Math.round(cellPath.length * 0.25 * 10) / 10, // ~0.25km (250m) mỗi ô
        terrainBreakdown: breakdown,
      };
    }

    closedSet.add(currIdx);

    // Mở rộng các ô lân cận
    for (const dir of DIRS) {
      const nc = current.col + dir.dx;
      const nr = current.row + dir.dy;

      if (nc < 0 || nc >= GRID_COLS || nr < 0 || nr >= GRID_ROWS) continue;
      const nIdx = nr * GRID_COLS + nc;
      if (closedSet.has(nIdx)) continue;

      const nTerrain = getGridTerrain(nc, nr);
      const tProps = TERRAIN_DEFINITIONS[nTerrain];

      // Chi phí di chuyển qua ô dựa trên địa hình & binh chủng
      let moveCost = tProps.moveSpeedCost;

      // Không thể đi qua sông nếu không phải Thủy quân
      if (nTerrain === 'water' && troopType !== 'navy') {
        moveCost = 999; // Cấm đi
      }
      // Vách đá cấm kỵ binh và tượng binh
      if (nTerrain === 'cliff' && (troopType === 'cavalry' || troopType === 'elephant')) {
        moveCost = 999;
      }

      if (moveCost >= 900) continue; // Ô không thể vượt qua

      // Hệ số tương quan binh chủng
      const modifier = tProps.troopModifier[troopType] || 1.0;
      const efficiencyCost = modifier > 0 ? (1 / modifier) : 2.5;

      const tentativeG = current.g + dir.dist * moveCost * efficiencyCost;
      const prevG = gScores.get(nIdx);

      if (prevG === undefined || tentativeG < prevG) {
        gScores.set(nIdx, tentativeG);
        const h = Math.hypot(nc - target.col, nr - target.row);
        const neighborNode: AStarNode = {
          col: nc,
          row: nr,
          g: tentativeG,
          h,
          f: tentativeG + h,
          parent: current,
        };

        const existingOpen = openList.find(n => n.col === nc && n.row === nr);
        if (existingOpen) {
          existingOpen.g = tentativeG;
          existingOpen.f = tentativeG + h;
          existingOpen.parent = current;
        } else {
          openList.push(neighborNode);
        }
      }
    }
  }

  // Nếu không tìm được đường chính xác (hoặc quá bước), nối đường thẳng làm dự phòng
  return {
    found: false,
    path: [[startX, startY], [targetX, targetY]],
    cellPath: [start, target],
    totalCost: 100,
    totalDistanceKm: Math.round(Math.hypot(startX - targetX, startY - targetY) * 2),
    terrainBreakdown: { plains: 100, forest: 0, mountain: 0, cliff: 0, swamp: 0, water: 0 },
  };
}
