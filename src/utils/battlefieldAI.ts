import type {
  BattlefieldGrid,
  BattlefieldUnit,
} from '../types/battlefield';

/**
 * Khoảng cách Chebyshev giữa 2 thực thể (hỗ trợ đa ô spanCols x spanRows)
 */
export function getUnitDistance(
  u1: { col: number; row: number; spanCols?: number; spanRows?: number },
  u2: { col: number; row: number; spanCols?: number; spanRows?: number }
): number {
  const u1MinC = u1.col;
  const u1MaxC = u1.col + (u1.spanCols || 1) - 1;
  const u1MinR = u1.row;
  const u1MaxR = u1.row + (u1.spanRows || 1) - 1;

  const u2MinC = u2.col;
  const u2MaxC = u2.col + (u2.spanCols || 1) - 1;
  const u2MinR = u2.row;
  const u2MaxR = u2.row + (u2.spanRows || 1) - 1;

  const dx = Math.max(0, Math.max(u1MinC - u2MaxC, u2MinC - u1MaxC));
  const dy = Math.max(0, Math.max(u1MinR - u2MaxR, u2MinR - u1MaxR));
  return Math.max(dx, dy);
}

/**
 * PHƯƠNG ÁN 2: FLOW FIELD (TRƯỜNG DÒNG CHẢY DIJKSTRA TRÊN LƯỚI 96x32)
 * Tính 1 lần mỗi lượt (< 0.3ms cho toàn bộ 500 quân) để mọi binh chủng tự uốn lượn
 * né núi cao, sông sâu từ xa và tách dòng tránh ùn ứ tại điểm nghẽn.
 */
export function computeFlowField(
  grid: BattlefieldGrid,
  targetEnemies: BattlefieldUnit[],
  friendlyUnits: BattlefieldUnit[]
): Float32Array {
  const cols = grid.cols;
  const rows = grid.rows;
  const total = cols * rows;
  const field = new Float32Array(total);
  field.fill(1e9);

  if (targetEnemies.length === 0) return field;

  // Bản đồ đánh dấu mật độ đồng đội để cộng phạt ùn tắc (Congestion Penalty)
  const congestion = new Uint8Array(total);
  for (const f of friendlyUnits) {
    if (f.status === 'eliminated') continue;
    const sC = f.spanCols || 1;
    const sR = f.spanRows || 1;
    for (let dc = 0; dc < sC; dc++) {
      for (let dr = 0; dr < sR; dr++) {
        const c = f.col + dc;
        const r = f.row + dr;
        if (c >= 0 && c < cols && r >= 0 && r < rows) {
          congestion[r * cols + c] = 1;
        }
      }
    }
  }

  // Ring/FIFO queue nhẹ cho SPFA/Dijkstra trên lưới nhỏ 3.072 ô
  const queue = new Int32Array(total * 4);
  let head = 0;
  let tail = 0;

  for (const e of targetEnemies) {
    if (e.status === 'eliminated') continue;
    const sC = e.spanCols || 1;
    const sR = e.spanRows || 1;
    for (let dc = 0; dc < sC; dc++) {
      for (let dr = 0; dr < sR; dr++) {
        const c = e.col + dc;
        const r = e.row + dr;
        if (c >= 0 && c < cols && r >= 0 && r < rows) {
          const idx = r * cols + c;
          if (field[idx] > 0) {
            field[idx] = 0;
            queue[tail++] = idx;
          }
        }
      }
    }
  }

  const dirs = [
    [1, 0, 1.0],
    [-1, 0, 1.0],
    [0, 1, 1.0],
    [0, -1, 1.0],
    [1, 1, 1.414],
    [1, -1, 1.414],
    [-1, 1, 1.414],
    [-1, -1, 1.414],
  ];

  while (head < tail) {
    const currIdx = queue[head++];
    const currCost = field[currIdx];
    const cr = Math.floor(currIdx / cols);
    const cc = currIdx % cols;

    for (let d = 0; d < 8; d++) {
      const nc = cc + dirs[d][0];
      const nr = cr + dirs[d][1];
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;

      const tile = grid.tiles[nr]?.[nc];
      if (!tile || !tile.isPassable) continue;

      const stepPenalty =
        dirs[d][2] * (tile.speedCost || 1.0) + (congestion[currIdx] ? 0.65 : 0);
      const nextCost = currCost + stepPenalty;
      const nIdx = nr * cols + nc;

      if (nextCost + 0.01 < field[nIdx]) {
        field[nIdx] = nextCost;
        if (tail < queue.length) {
          queue[tail++] = nIdx;
        }
      }
    }
  }

  return field;
}

/**
 * PHƯƠNG ÁN 1: NEO ĐỘI HÌNH (FORMATION ANCHOR & SLOT COHESION)
 * Tính tâm đội hình ban đầu và lưu khoảng lệch tương đối (offset) của từng quân cờ.
 */
export function computeFactionAnchor(units: BattlefieldUnit[], faction: 'lam_son' | 'ming'): { col: number; row: number } {
  const living = units.filter(u => u.faction === faction && u.status !== 'eliminated');
  if (living.length === 0) return { col: faction === 'lam_son' ? 16 : 80, row: 16 };

  let sumC = 0;
  let sumR = 0;
  for (const u of living) {
    sumC += u.col + (u.spanCols || 1) / 2;
    sumR += u.row + (u.spanRows || 1) / 2;
  }
  return {
    col: sumC / living.length,
    row: sumR / living.length,
  };
}

export function initializeFormationOffsets(
  units: BattlefieldUnit[],
  lamSonAnchor: { col: number; row: number },
  mingAnchor: { col: number; row: number }
): void {
  for (const u of units) {
    if (u.formationOffsetCol === undefined || u.formationOffsetRow === undefined) {
      const anchor = u.faction === 'lam_son' ? lamSonAnchor : mingAnchor;
      u.formationOffsetCol = u.col - anchor.col;
      u.formationOffsetRow = u.row - anchor.row;
    }
  }
}

/**
 * PHƯƠNG ÁN 3: PHÂN TẦNG CHIẾN THUẬT THEO BINH CHỦNG (ROLE-BASED TARGETING)
 * Xác định tọa độ mục tiêu chiến thuật tối ưu cho từng binh chủng thay vì lao bừa thẳng mặt.
 */
export function getRoleTacticalGoal(
  unit: BattlefieldUnit,
  closestEnemy: BattlefieldUnit,
  minDist: number,
  enemies: BattlefieldUnit[],
  friendlies: BattlefieldUnit[],
  anchor: { col: number; row: number },
  inMarchingPhase: boolean
): { targetCol: number; targetRow: number } {
  // 1. Pha Hành Quân đồng bộ: Giữ đúng cự ly Slot so với Tâm đội hình khi địch còn xa
  if (
    inMarchingPhase &&
    minDist > 11 &&
    unit.formationOffsetCol !== undefined &&
    unit.formationOffsetRow !== undefined
  ) {
    const dir = unit.faction === 'lam_son' ? 1 : -1;
    const desiredCol = Math.round(anchor.col + dir + unit.formationOffsetCol);
    const desiredRow = Math.round(anchor.row + unit.formationOffsetRow);
    // Nếu Slot vẫn trùng với hướng tiến thẳng về địch gần nhất, bám chặt Slot
    return {
      targetCol: Math.max(0, Math.min(95, desiredCol)),
      targetRow: Math.max(0, Math.min(31, desiredRow)),
    };
  }

  // 2. Kỵ binh (2x1): Tìm hành lang rìa cánh để tạt sườn đánh hậu phương (Cung thủ / Xe lương)
  if (unit.unitTypeId === 'cavalry' && minDist > 3) {
    const highValueRear = enemies.find(
      e => e.unitTypeId === 'archer' || e.unitTypeId === 'supply_cart'
    );
    if (highValueRear) {
      // Đánh giá mật độ địch ở 2 cánh (Bắc row <= 7, Nam row >= 24)
      const topEnemies = enemies.filter(e => e.row <= 8).length;
      const botEnemies = enemies.filter(e => e.row >= 23).length;
      const preferFlank = unit.row < 16 ? (topEnemies <= botEnemies + 2) : !(botEnemies <= topEnemies + 2);
      const flankRow = preferFlank ? 2 : 28;
      // Nếu đang ở tuyến ngoài (cách trung tâm > 4 ô), tạt cánh vòng rộng trước khi bẻ vào
      if (Math.abs(unit.row - flankRow) > 2 && minDist > 5) {
        return {
          targetCol: highValueRear.col,
          targetRow: preferFlank ? Math.max(1, unit.row - 3) : Math.min(30, unit.row + 3),
        };
      }
      return { targetCol: highValueRear.col, targetRow: highValueRear.row };
    }
  }

  // 3. Giáo binh: Ưu tiên đón đầu Kỵ binh địch đang lao vào (Khắc chế x1.8 sát thương)
  if (unit.unitTypeId === 'spearman') {
    let nearestCav: BattlefieldUnit | null = null;
    let cavDist = Infinity;
    for (const e of enemies) {
      if (e.unitTypeId === 'cavalry') {
        const d = getUnitDistance(unit, e);
        if (d <= 7 && d <= minDist + 2 && d < cavDist) {
          cavDist = d;
          nearestCav = e;
        }
      }
    }
    if (nearestCav) {
      return { targetCol: nearestCav.col, targetRow: nearestCav.row };
    }
  }

  // 4. Chủ tướng: Bám trung tâm các quân cận chiến để phủ Hào Quang (+25% công) lên tối đa đồng đội
  if (unit.unitTypeId === 'general') {
    const meleeFriends = friendlies.filter(
      f => f.id !== unit.id && (f.unitTypeId === 'swordsman' || f.unitTypeId === 'spearman' || f.unitTypeId === 'elephant')
    );
    if (meleeFriends.length > 0) {
      let avgC = 0;
      let avgR = 0;
      for (const f of meleeFriends) {
        avgC += f.col;
        avgR += f.row;
      }
      avgC /= meleeFriends.length;
      avgR /= meleeFriends.length;
      const safeOffset = unit.faction === 'lam_son' ? -3 : 3;
      return {
        targetCol: Math.max(0, Math.min(95, Math.round(avgC + safeOffset))),
        targetRow: Math.max(0, Math.min(31, Math.round(avgR))),
      };
    }
  }

  // 5. Mặc định (Đao, Tượng, Cung đang tiến tầm bắn): Hướng về kẻ địch gần nhất
  return { targetCol: closestEnemy.col, targetRow: closestEnemy.row };
}

/**
 * PHƯƠNG ÁN 4: TÌM ĐƯỜNG CỤC BỘ (BOUNDED LOCAL A*) & NHƯỜNG ĐƯỜNG HỢP TÁC
 * Khi đường đi trực tiếp bị chặn bởi vách núi rộng hoặc khối đa ô (2x2 / 3x2),
 * thuật toán A* cục bộ bán kính ngắn (tối đa 64 nút mở) giúp quân cờ biết bước ngang hoặc lùi 1 bước để vòng qua.
 */
export function findLocalAStarStep(
  unit: BattlefieldUnit,
  goalCol: number,
  goalRow: number,
  flowField: Float32Array,
  grid: BattlefieldGrid,
  canUnitMoveTo: (u: BattlefieldUnit, c: number, r: number) => boolean
): { c: number; r: number } | null {
  const cols = grid.cols;
  const rows = grid.rows;
  const startC = unit.col;
  const startR = unit.row;

  interface Node {
    c: number;
    r: number;
    g: number;
    f: number;
    firstC: number;
    firstR: number;
  }

  const startFlow = flowField[startR * cols + startC] || 0;
  const open: Node[] = [];
  const visited = new Set<number>();
  visited.add(startR * cols + startC);

  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ];

  // Khởi tạo các bước đi đầu tiên hợp lệ quanh đơn vị
  for (const [dc, dr] of dirs) {
    const nc = startC + dc;
    const nr = startR + dr;
    if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
    if (!canUnitMoveTo(unit, nc, nr)) continue;

    const h = Math.hypot(goalCol - nc, goalRow - nr);
    const g = (dc !== 0 && dr !== 0 ? 1.4 : 1.0);
    open.push({ c: nc, r: nr, g, f: g + h, firstC: nc, firstR: nr });
    visited.add(nr * cols + nc);
  }

  if (open.length === 0) return null;

  let bestFallback: Node | null = null;
  let expansions = 0;
  const maxExpansions = 64;

  while (open.length > 0 && expansions < maxExpansions) {
    // Chọn nút có f nhỏ nhất
    let minIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[minIdx].f) minIdx = i;
    }
    const curr = open.splice(minIdx, 1)[0];
    expansions++;

    const currFlow = flowField[curr.r * cols + curr.c];
    // Nếu tìm được điểm làm giảm đáng kể chi phí Flow Field (thoát được điểm nghẽn)
    if (currFlow < startFlow - 0.8) {
      return { c: curr.firstC, r: curr.firstR };
    }

    if (!bestFallback || curr.f < bestFallback.f) {
      bestFallback = curr;
    }

    for (const [dc, dr] of dirs) {
      const nc = curr.c + dc;
      const nr = curr.r + dr;
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
      const key = nr * cols + nc;
      if (visited.has(key)) continue;
      if (!canUnitMoveTo(unit, nc, nr)) continue;

      visited.add(key);
      const stepCost = (dc !== 0 && dr !== 0 ? 1.4 : 1.0) * (grid.tiles[nr]?.[nc]?.speedCost || 1.0);
      const g = curr.g + stepCost;
      const h = Math.hypot(goalCol - nc, goalRow - nr) * 0.8 + (flowField[key] < 1e8 ? flowField[key] * 0.2 : 0);
      open.push({
        c: nc,
        r: nr,
        g,
        f: g + h,
        firstC: curr.firstC,
        firstR: curr.firstR,
      });
    }
  }

  return bestFallback ? { c: bestFallback.firstC, r: bestFallback.firstR } : null;
}

/**
 * CHỌN MỤC TIÊU TẤN CÔNG THÔNG MINH THEO KHẮC CHẾ & HP THẤP
 */
export function selectBestAttackTarget(
  attacker: BattlefieldUnit,
  enemiesInRange: BattlefieldUnit[]
): BattlefieldUnit | null {
  if (enemiesInRange.length === 0) return null;

  let bestTarget: BattlefieldUnit | null = null;
  let bestScore = -Infinity;

  for (const e of enemiesInRange) {
    const dist = getUnitDistance(attacker, e);
    // Điểm cơ sở ưu tiên địch gần và máu thấp (kết liễu nhanh)
    let score = 100 - dist * 5 + (1 - e.hp / Math.max(1, e.maxHp)) * 25;

    // Bonus khắc chế binh chủng
    if (attacker.unitTypeId === 'spearman' && e.unitTypeId === 'cavalry') score += 45;
    if (attacker.unitTypeId === 'cavalry' && e.unitTypeId === 'supply_cart') score += 50;
    if (attacker.unitTypeId === 'cavalry' && e.unitTypeId === 'archer') score += 35;
    if (attacker.unitTypeId === 'swordsman' && e.unitTypeId === 'archer') score += 30;
    if (attacker.unitTypeId === 'archer' && (e.unitTypeId === 'archer' || e.unitTypeId === 'cavalry')) score += 20;

    if (score > bestScore) {
      bestScore = score;
      bestTarget = e;
    }
  }

  return bestTarget;
}
