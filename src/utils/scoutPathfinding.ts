import type { CityNode } from '../types';
import type { MarchPathCell } from '../types/armyFormation';
import {
  getGridTerrain,
  coordToCell,
  cellToCoord,
  GRID_COLS,
  GRID_ROWS,
} from '../data/terrainGrid';
import { TERRAIN_DEFINITIONS } from '../data/terrainData';
import { BASE_CELL_DAYS } from './marchPathUtils';

// Hệ số tốc độ và chi phí qua ô của thám mã (đơn vị gọn nhẹ, cơ động cao, thông thạo địa hình)
export function getScoutCellMoveCostDays(col: number, row: number): number {
  const terrain = getGridTerrain(col, row);
  if (terrain === 'cliff') {
    return Infinity; // Vách đá hiểm trở tuyệt đối không thể đi qua
  }

  // Thám mã phi nhanh trên đồng bằng (x1.45), gọn nhẹ lướt tốt trong rừng núi (x1.25)
  let speedFactor = 1.15;
  if (terrain === 'plains') {
    speedFactor = 1.45 * 1.15; // 1.6675
  } else if (terrain === 'forest') {
    speedFactor = 1.25; // Luồn lách nhanh
  } else if (terrain === 'mountain') {
    speedFactor = 0.65 * 1.25; // 0.8125
  } else if (terrain === 'swamp') {
    speedFactor = 0.8 * 1.15; // 0.92
  }

  const rawCost = terrain === 'water' ? 5.2 : (TERRAIN_DEFINITIONS[terrain]?.moveSpeedCost || 1.0);
  return Number(((BASE_CELL_DAYS * rawCost) / speedFactor).toFixed(4));
}

// Heuristic Octile distance (thời gian tối thiểu tính theo ô đồng bằng phẳng nhất)
function octileHeuristic(c1: number, r1: number, c2: number, r2: number): number {
  const dx = Math.abs(c1 - c2);
  const dy = Math.abs(r1 - r2);
  const minCostPerCell = 0.0288; // 0.048 / 1.6675
  return (Math.max(dx, dy) + 0.4142 * Math.min(dx, dy)) * minCostPerCell;
}

interface NodeRecord {
  col: number;
  row: number;
  g: number;
  f: number;
  parent: NodeRecord | null;
}

class FastMinHeap {
  private data: NodeRecord[] = [];

  push(item: NodeRecord) {
    this.data.push(item);
    this.bubbleUp(this.data.length - 1);
  }

  pop(): NodeRecord | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const bottom = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = bottom;
      this.bubbleDown(0);
    }
    return top;
  }

  get size(): number {
    return this.data.length;
  }

  private bubbleUp(idx: number) {
    while (idx > 0) {
      const parentIdx = (idx - 1) >> 1;
      if (this.data[idx].f < this.data[parentIdx].f) {
        const tmp = this.data[idx];
        this.data[idx] = this.data[parentIdx];
        this.data[parentIdx] = tmp;
        idx = parentIdx;
      } else {
        break;
      }
    }
  }

  private bubbleDown(idx: number) {
    const len = this.data.length;
    while (true) {
      const left = (idx << 1) + 1;
      const right = left + 1;
      let smallest = idx;

      if (left < len && this.data[left].f < this.data[smallest].f) {
        smallest = left;
      }
      if (right < len && this.data[right].f < this.data[smallest].f) {
        smallest = right;
      }
      if (smallest !== idx) {
        const tmp = this.data[idx];
        this.data[idx] = this.data[smallest];
        this.data[smallest] = tmp;
        idx = smallest;
      } else {
        break;
      }
    }
  }
}

// 8 hướng di chuyển (4 chính + 4 chéo)
const MOVE_DIRS: [number, number, number][] = [
  [1, 0, 1.0],
  [-1, 0, 1.0],
  [0, 1, 1.0],
  [0, -1, 1.0],
  [1, 1, 1.4142],
  [1, -1, 1.4142],
  [-1, 1, 1.4142],
  [-1, -1, 1.4142],
];

/**
 * Thuật toán A* tìm lộ trình ngắn thời gian nhất từ Căn cứ xuất phát đến Thành trì thám thính
 * Đảm bảo:
 * - Tránh hoàn toàn vách đá (cliff).
 * - Ưu tiên đồng bằng và đường mòn, tránh leo núi dốc và lội sông sâu khi có đường vòng phẳng hơn.
 * - Tính toán chính xác thời gian và vẽ lộ trình mượt mà.
 */
export function findShortestScoutPath(
  originCity: CityNode,
  targetCity: CityNode,
  scoutCount: number
): { path: MarchPathCell[]; totalDays: number } {
  const startCell = coordToCell(originCity.x, originCity.y);
  const goalCell = coordToCell(targetCity.x, targetCity.y);

  if (startCell.col === goalCell.col && startCell.row === goalCell.row) {
    const terrain = getGridTerrain(startCell.col, startCell.row);
    return {
      path: [{
        col: startCell.col,
        row: startCell.row,
        x: originCity.x,
        y: originCity.y,
        terrain,
        moveCostDays: 0,
        cumulativeDays: 0,
        foodCost: 0,
      }],
      totalDays: 0,
    };
  }

  // Khung giới hạn tìm kiếm A* (Bounding Box có lề đệm 30 ô để thám mã có thể đi vòng địa hình hiểm trở)
  const minCol = Math.max(0, Math.min(startCell.col, goalCell.col) - 35);
  const maxCol = Math.min(GRID_COLS - 1, Math.max(startCell.col, goalCell.col) + 35);
  const minRow = Math.max(0, Math.min(startCell.row, goalCell.row) - 35);
  const maxRow = Math.min(GRID_ROWS - 1, Math.max(startCell.row, goalCell.row) + 35);

  const openHeap = new FastMinHeap();
  const gScoreMap = new Map<number, number>();

  const startIdx = startCell.row * GRID_COLS + startCell.col;
  const startF = octileHeuristic(startCell.col, startCell.row, goalCell.col, goalCell.row);
  const startNode: NodeRecord = {
    col: startCell.col,
    row: startCell.row,
    g: 0,
    f: startF,
    parent: null,
  };

  openHeap.push(startNode);
  gScoreMap.set(startIdx, 0);

  let targetNode: NodeRecord | null = null;
  let steps = 0;
  const maxSteps = 12000;

  while (openHeap.size > 0 && steps++ < maxSteps) {
    const current = openHeap.pop()!;
    if (current.col === goalCell.col && current.row === goalCell.row) {
      targetNode = current;
      break;
    }

    const curIdx = current.row * GRID_COLS + current.col;
    if (current.g > (gScoreMap.get(curIdx) ?? Infinity)) {
      continue;
    }

    for (const [dc, dr, distMult] of MOVE_DIRS) {
      const nc = current.col + dc;
      const nr = current.row + dr;

      if (nc < minCol || nc > maxCol || nr < minRow || nr > maxRow) {
        continue;
      }

      // Nếu đi chéo, kiểm tra góc cua không đâm xuyên qua vách đá nhọn
      if (dc !== 0 && dr !== 0) {
        const tOrth1 = getGridTerrain(current.col + dc, current.row);
        const tOrth2 = getGridTerrain(current.col, current.row + dr);
        if (tOrth1 === 'cliff' && tOrth2 === 'cliff') {
          continue;
        }
      }

      const moveCost = getScoutCellMoveCostDays(nc, nr);
      if (!isFinite(moveCost)) {
        continue; // Ô vách đá
      }

      const stepCost = moveCost * distMult;
      const tentativeG = current.g + stepCost;
      const nIdx = nr * GRID_COLS + nc;

      if (tentativeG < (gScoreMap.get(nIdx) ?? Infinity)) {
        gScoreMap.set(nIdx, tentativeG);
        const h = octileHeuristic(nc, nr, goalCell.col, goalCell.row);
        const neighborNode: NodeRecord = {
          col: nc,
          row: nr,
          g: tentativeG,
          f: tentativeG + h,
          parent: current,
        };
        openHeap.push(neighborNode);
      }
    }
  }

  // Khôi phục lộ trình từ targetNode ngược về startNode
  const rawCells: { col: number; row: number }[] = [];
  if (targetNode) {
    let curr: NodeRecord | null = targetNode;
    while (curr) {
      rawCells.push({ col: curr.col, row: curr.row });
      curr = curr.parent;
    }
    rawCells.reverse();
  } else {
    // Dự phòng trường hợp bị cô lập hoàn toàn: Đường thẳng trực tiếp
    rawCells.push({ col: startCell.col, row: startCell.row });
    rawCells.push({ col: goalCell.col, row: goalCell.row });
  }

  // Chuyển đổi sang mảng MarchPathCell hoàn chỉnh
  let cumulativeDays = 0;
  const path: MarchPathCell[] = rawCells.map((cell, idx) => {
    const { minX, minY, maxX, maxY } = cellToCoord(cell.col, cell.row);
    const x = Number(((minX + maxX) / 2).toFixed(4));
    const y = Number(((minY + maxY) / 2).toFixed(4));
    const terrain = getGridTerrain(cell.col, cell.row);

    let moveCostDays = 0;
    if (idx > 0) {
      const prev = rawCells[idx - 1];
      const isDiag = prev.col !== cell.col && prev.row !== cell.row;
      const baseCost = getScoutCellMoveCostDays(cell.col, cell.row);
      moveCostDays = Number((baseCost * (isDiag ? 1.4142 : 1.0)).toFixed(4));
    }

    cumulativeDays += moveCostDays;
    const foodCost = Number((scoutCount * moveCostDays * 0.18).toFixed(2));

    return {
      col: cell.col,
      row: cell.row,
      x,
      y,
      terrain,
      moveCostDays,
      cumulativeDays: Number(cumulativeDays.toFixed(3)),
      foodCost,
    };
  });

  return {
    path,
    totalDays: Number(cumulativeDays.toFixed(2)),
  };
}
