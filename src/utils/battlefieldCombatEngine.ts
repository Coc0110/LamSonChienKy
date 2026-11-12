import type { 
  BattlefieldState, 
  BattlefieldUnit, 
  BattlefieldLogEntry 
} from '../types/battlefield';
import {
  getUnitDistance,
  computeFlowField,
  computeFactionAnchor,
  initializeFormationOffsets,
  getRoleTacticalGoal,
  findLocalAStarStep,
  selectBestAttackTarget,
} from './battlefieldAI';

export { getUnitDistance };
export const getDistance = getUnitDistance;

// Bảng phạm vi tấn công theo binh chủng
export const UNIT_ATTACK_RANGE: Record<BattlefieldUnit['unitTypeId'], number> = {
  archer: 8,
  spearman: 2,
  swordsman: 1,
  cavalry: 1,
  elephant: 1,
  general: 1,
  scout: 1,
  supply_cart: 0,
};

export function resolveBattlefieldTick(prevState: BattlefieldState): BattlefieldState {
  if (prevState.phase !== 'in_progress') {
    return prevState;
  }

  const nextTurn = prevState.turn + 1;
  const newLogs: BattlefieldLogEntry[] = [...prevState.logs];
  const grid = prevState.grid;

  // Clone danh sách đơn vị để cập nhật
  const units: BattlefieldUnit[] = prevState.units.map(u => ({ ...u }));

  // Tạo set vị trí bị chiếm đóng (hỗ trợ diện tích đa ô: 1x1, 2x1, 2x2, ...)
  const occupied = new Set<string>();
  units.forEach(u => {
    if (u.status !== 'eliminated') {
      const sCols = u.spanCols || 1;
      const sRows = u.spanRows || 1;
      for (let dc = 0; dc < sCols; dc++) {
        for (let dr = 0; dr < sRows; dr++) {
          occupied.add(`${u.col + dc},${u.row + dr}`);
        }
      }
    }
  });

  const canUnitMoveTo = (u: BattlefieldUnit, targetC: number, targetR: number) => {
    const sCols = u.spanCols || 1;
    const sRows = u.spanRows || 1;
    for (let dc = 0; dc < sCols; dc++) {
      for (let dr = 0; dr < sRows; dr++) {
        const c = targetC + dc;
        const r = targetR + dr;
        if (c < 0 || c >= grid.cols || r < 0 || r >= grid.rows) return false;
        const tile = grid.tiles[r]?.[c];
        if (!tile || !tile.isPassable) return false;
        if (occupied.has(`${c},${r}`)) {
          const isOwn = c >= u.col && c < u.col + sCols && r >= u.row && r < u.row + sRows;
          if (!isOwn) return false;
        }
      }
    }
    return true;
  };

  const removeUnitOccupied = (u: BattlefieldUnit) => {
    const sCols = u.spanCols || 1;
    const sRows = u.spanRows || 1;
    for (let dc = 0; dc < sCols; dc++) {
      for (let dr = 0; dr < sRows; dr++) {
        occupied.delete(`${u.col + dc},${u.row + dr}`);
      }
    }
  };

  const addUnitOccupied = (u: BattlefieldUnit) => {
    const sCols = u.spanCols || 1;
    const sRows = u.spanRows || 1;
    for (let dc = 0; dc < sCols; dc++) {
      for (let dr = 0; dr < sRows; dr++) {
        occupied.add(`${u.col + dc},${u.row + dr}`);
      }
    }
  };

  // 1. TÍNH TRƯỜNG DÒNG CHẢY (FLOW FIELD), NEO ĐỘI HÌNH & DI CHUYỂN AI ĐA TẦNG
  // QUY TẮC ĐIỀU HÀNH HÀNG NGŨ CHIẾN THUẬT:
  // - Quân Lam Sơn tiến sang Đông (+X): Đơn vị cột lớn hơn (tiền tuyến) đi trước để nhường ô cho hàng sau
  // - Quân Minh tiến sang Tây (-X): Đơn vị cột nhỏ hơn (tiền tuyến) đi trước để nhường ô cho hàng sau
  const lamSonLivingInit = units.filter(u => u.faction === 'lam_son' && u.status !== 'eliminated');
  const mingLivingInit = units.filter(u => u.faction === 'ming' && u.status !== 'eliminated');

  const lamSonAnchor = prevState.lamSonAnchor ?? computeFactionAnchor(units, 'lam_son');
  const mingAnchor = prevState.mingAnchor ?? computeFactionAnchor(units, 'ming');
  initializeFormationOffsets(units, lamSonAnchor, mingAnchor);

  const lamSonFlow = computeFlowField(grid, mingLivingInit, lamSonLivingInit);
  const mingFlow = computeFlowField(grid, lamSonLivingInit, mingLivingInit);

  let globalMinFactionDist = Infinity;
  for (const ls of lamSonLivingInit) {
    for (const mg of mingLivingInit) {
      const d = getUnitDistance(ls, mg);
      if (d < globalMinFactionDist) globalMinFactionDist = d;
      if (globalMinFactionDist <= 10) break;
    }
    if (globalMinFactionDist <= 10) break;
  }
  const inMarchingPhase = globalMinFactionDist > 10;

  const movingLamSon = [...lamSonLivingInit].sort((a, b) => b.col - a.col);
  const movingMing = [...mingLivingInit].sort((a, b) => a.col - b.col);
  const orderedMovingUnits = [...movingLamSon, ...movingMing];

  const moveUnitTo = (u: BattlefieldUnit, nextC: number, nextR: number) => {
    removeUnitOccupied(u);
    u.col = nextC;
    u.row = nextR;
    addUnitOccupied(u);
  };

  for (const unit of orderedMovingUnits) {
    if (unit.status === 'eliminated') continue;

    const enemies = unit.faction === 'lam_son' ? mingLivingInit : lamSonLivingInit;
    const friendlies = unit.faction === 'lam_son' ? lamSonLivingInit : mingLivingInit;

    // Nếu không còn kẻ địch sống, không cần di chuyển
    if (enemies.length === 0) continue;

    // Đơn vị đang vỡ trận: Tháo chạy ra xa khỏi kẻ địch
    if (unit.status === 'routing') {
      const escapeDir = unit.faction === 'lam_son' ? -1 : 1;
      const stepC = unit.col + escapeDir;
      if (canUnitMoveTo(unit, stepC, unit.row)) {
        moveUnitTo(unit, stepC, unit.row);
      }
      continue;
    }

    // Tìm kẻ địch gần nhất trên bản đồ (tính theo bounding box khoảng cách đa ô)
    let closestEnemy: BattlefieldUnit | null = null;
    let minDist = Infinity;
    for (const enemy of enemies) {
      const dist = getUnitDistance(unit, enemy);
      if (dist < minDist) {
        minDist = dist;
        closestEnemy = enemy;
      }
    }

    if (!closestEnemy) continue;

    // Cự ly giao tranh tối ưu theo từng loại binh chủng
    const isGeneral = unit.unitTypeId === 'general';
    const isArcher = unit.unitTypeId === 'archer';
    const isSupply = unit.unitTypeId === 'supply_cart';
    const isMelee =
      unit.unitTypeId === 'swordsman' ||
      unit.unitTypeId === 'spearman' ||
      unit.unitTypeId === 'cavalry' ||
      unit.unitTypeId === 'elephant' ||
      isGeneral;

    const effectiveRange = isArcher && (grid.tiles[unit.row]?.[unit.col]?.elevation || 0) > 0
      ? 9
      : UNIT_ATTACK_RANGE[unit.unitTypeId];

    // Cự ly lý tưởng: Cung thủ giữ 7-8 ô; Tướng 3, Xe lương 9, Giáo 2, Đao/Kỵ/Tượng 1
    const desiredRange = isArcher ? 7 : isGeneral ? 3 : isSupply ? 9 : (unit.unitTypeId === 'spearman' ? 2 : 1);

    // Nếu đã ở cự ly chiến đấu lý tưởng -> Giữ vị trí bắn tên / chỉ huy
    if (minDist <= desiredRange) {
      unit.stuckTurns = 0;
      // Riêng cung thủ: Nếu địch áp sát <= 2 ô -> Chủ động lùi 1 bước (thẳng hoặc chéo)
      if (isArcher && minDist <= 2) {
        const retreatCol = unit.col + (unit.faction === 'lam_son' ? -1 : 1);
        const retreatMoves = [
          { c: retreatCol, r: unit.row },
          { c: retreatCol, r: unit.row - 1 },
          { c: retreatCol, r: unit.row + 1 },
        ];
        for (const rm of retreatMoves) {
          if (canUnitMoveTo(unit, rm.c, rm.r)) {
            moveUnitTo(unit, rm.c, rm.r);
            break;
          }
        }
      }
      continue;
    }

    // Nếu từng giao chiến ('fighting') nhưng mục tiêu trong tầm đánh không còn (đã tiêu diệt xong hoặc bị bắn tỉa từ xa) -> tiếp tục hành quân
    if (unit.status === 'fighting' && minDist > Math.max(desiredRange, effectiveRange)) {
      unit.status = 'advancing';
    }

    // Kiểm tra mệnh lệnh tham chiến:
    let shouldEngage = false;
    if (unit.status === 'advancing' || unit.status === 'fighting') {
      shouldEngage = true;
    } else if (unit.status === 'holding') {
      if (isMelee && (minDist <= 9 || (unit.lastDamageTaken ?? 0) > 0)) shouldEngage = true;
      if (isArcher && minDist <= effectiveRange + 2) shouldEngage = true;
      if (isGeneral && minDist <= 3) shouldEngage = true;
    }

    if (!shouldEngage) {
      unit.stuckTurns = 0;
      continue;
    }

    const activeFlow = unit.faction === 'lam_son' ? lamSonFlow : mingFlow;
    const activeAnchor = unit.faction === 'lam_son' ? lamSonAnchor : mingAnchor;

    // PHƯƠNG ÁN 1 + 3: Mục tiêu chiến thuật theo binh chủng & giữ slot đội hình
    let { targetCol, targetRow } = getRoleTacticalGoal(
      unit,
      closestEnemy,
      minDist,
      enemies,
      friendlies,
      activeAnchor,
      inMarchingPhase
    );

    // Chống kẹt hoặc tụt hậu do neo đội hình bị đồng đội đứng yên kéo lại
    if (unit.unitTypeId !== 'general') {
      const wrongWay =
        (unit.faction === 'lam_son' && targetCol < unit.col && closestEnemy.col > unit.col) ||
        (unit.faction === 'ming' && targetCol > unit.col && closestEnemy.col < unit.col);
      if (wrongWay || (unit.stuckTurns || 0) >= 2) {
        targetCol = closestEnemy.col;
        targetRow = closestEnemy.row;
      }
    }

    const dx = targetCol - unit.col;
    const dy = targetRow - unit.row;
    const preferCol = unit.col + (dx !== 0 ? Math.sign(dx) : (dy === 0 ? (unit.faction === 'lam_son' ? 1 : -1) : 0));
    const preferRow = unit.row + (dy !== 0 ? Math.sign(dy) : 0);

    const currFlow = activeFlow[unit.row * grid.cols + unit.col] ?? 1e9;

    // Xây dựng danh sách 8 bước láng giềng sắp xếp theo Flow Field + Hướng Mục Tiêu
    const scoredNeighbors: { c: number; r: number; score: number }[] = [];
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (dc === 0 && dr === 0) continue;
        const nc = unit.col + dc;
        const nr = unit.row + dr;
        if (nc < 0 || nc >= grid.cols || nr < 0 || nr >= grid.rows) continue;

        const nFlow = activeFlow[nr * grid.cols + nc];
        if (nFlow >= 1e8) continue;

        const distGoal = Math.hypot(targetCol - nc, targetRow - nr);
        const stepBias = dc !== 0 && dr !== 0 ? 0.08 : 0;
        scoredNeighbors.push({
          c: nc,
          r: nr,
          score: nFlow + distGoal * 0.35 + stepBias,
        });
      }
    }
    scoredNeighbors.sort((a, b) => a.score - b.score);

    const candidateMoves: { c: number; r: number }[] = [];
    // Ưu tiên bước đi trực diện nếu nó thuận chiều Flow Field (tránh lao vào hẻm núi cụt)
    const preferFlow =
      preferRow >= 0 && preferRow < grid.rows && preferCol >= 0 && preferCol < grid.cols
        ? activeFlow[preferRow * grid.cols + preferCol]
        : 1e9;
    if (preferFlow < 1e8 && preferFlow <= currFlow + 0.35) {
      candidateMoves.push({ c: preferCol, r: preferRow });
    }
    for (const sn of scoredNeighbors) {
      if (sn.c !== preferCol || sn.r !== preferRow) {
        candidateMoves.push({ c: sn.c, r: sn.r });
      }
    }

    let moved = false;
    for (const move of candidateMoves) {
      if (canUnitMoveTo(unit, move.c, move.r)) {
        moveUnitTo(unit, move.c, move.r);
        moved = true;
        break;
      }
    }

    // PHƯƠNG ÁN 4A: NHƯỜNG ĐƯỜNG HỢP TÁC (COOPERATIVE STEP-ASIDE & RANK PASSING)
    if (!moved) {
      const sCols = unit.spanCols || 1;
      const sRows = unit.spanRows || 1;
      const blocker = friendlies.find(f => {
        if (f.id === unit.id || f.status === 'eliminated') return false;
        const fCols = f.spanCols || 1;
        const fRows = f.spanRows || 1;
        return !(
          f.col + fCols <= preferCol ||
          preferCol + sCols <= f.col ||
          f.row + fRows <= preferRow ||
          preferRow + sRows <= f.row
        );
      });

      if (blocker) {
        const canYield =
          blocker.status === 'holding' ||
          blocker.unitTypeId === 'archer' ||
          blocker.unitTypeId === 'supply_cart' ||
          blocker.unitTypeId === 'general';

        if (canYield) {
          const origBC = blocker.col;
          const origBR = blocker.row;
          const sideDirs = blocker.row % 2 === 0
            ? [
                { c: origBC, r: origBR - 1 },
                { c: origBC, r: origBR + 1 },
                { c: origBC + (blocker.faction === 'lam_son' ? -1 : 1), r: origBR - 1 },
                { c: origBC + (blocker.faction === 'lam_son' ? -1 : 1), r: origBR + 1 },
              ]
            : [
                { c: origBC, r: origBR + 1 },
                { c: origBC, r: origBR - 1 },
                { c: origBC + (blocker.faction === 'lam_son' ? -1 : 1), r: origBR + 1 },
                { c: origBC + (blocker.faction === 'lam_son' ? -1 : 1), r: origBR - 1 },
              ];
          for (const sd of sideDirs) {
            if (canUnitMoveTo(blocker, sd.c, sd.r)) {
              moveUnitTo(blocker, sd.c, sd.r);
              if (canUnitMoveTo(unit, preferCol, preferRow)) {
                moveUnitTo(unit, preferCol, preferRow);
                moved = true;
                break;
              } else {
                moveUnitTo(blocker, origBC, origBR);
              }
            }
          }
        }

        // Hoán vị 1x1 (Rank Passing) nếu đồng đội 1x1 là cung thủ / xe lương ở trước mặt
        if (
          !moved &&
          isMelee &&
          sCols === 1 &&
          sRows === 1 &&
          (blocker.spanCols || 1) === 1 &&
          (blocker.spanRows || 1) === 1 &&
          (blocker.unitTypeId === 'archer' || blocker.unitTypeId === 'supply_cart')
        ) {
          removeUnitOccupied(unit);
          removeUnitOccupied(blocker);

          const tempCol = unit.col;
          const tempRow = unit.row;
          unit.col = blocker.col;
          unit.row = blocker.row;
          blocker.col = tempCol;
          blocker.row = tempRow;

          addUnitOccupied(unit);
          addUnitOccupied(blocker);
          moved = true;
        }
      }
    }

    // PHƯƠNG ÁN 4B: TÌM ĐƯỜNG CỤC BỘ (BOUNDED LOCAL A*) KHI ĐƯỜNG BỊ CHẶN CỨNG
    if (!moved) {
      const aStarStep = findLocalAStarStep(
        unit,
        targetCol,
        targetRow,
        activeFlow,
        grid,
        canUnitMoveTo
      );
      if (aStarStep) {
        moveUnitTo(unit, aStarStep.c, aStarStep.r);
        moved = true;
      }
    }

    unit.stuckTurns = moved ? 0 : (unit.stuckTurns || 0) + 1;
  }

  // 2. TÍNH TOÁN TẤN CÔNG & GIAO TRANH
  for (const u of units) {
    u.lastDamageTaken = 0;
  }
  let roundLamSonCasualties = 0;
  let roundMingCasualties = 0;

  // Tìm tướng lĩnh còn sống để tính vòng hào quang
  const livingGenerals = units.filter(u => u.unitTypeId === 'general' && u.status !== 'eliminated');

  for (const attacker of units) {
    if (attacker.status === 'eliminated' || attacker.soldiersCount <= 0) continue;
    const baseRange = UNIT_ATTACK_RANGE[attacker.unitTypeId];
    if (baseRange === 0) continue; // Xe vận lương không tấn công

    const effectiveRange = attacker.unitTypeId === 'archer' && (grid.tiles[attacker.row]?.[attacker.col]?.elevation || 0) > 0 
      ? 9 
      : baseRange;

    // Tìm kẻ địch gần nhất trong tầm đánh
    const enemies = units.filter(
      e => e.faction !== attacker.faction && e.status !== 'eliminated' && e.soldiersCount > 0
    );

    const enemiesInRange = enemies.filter(e => getUnitDistance(attacker, e) <= effectiveRange);
    const closestEnemy = selectBestAttackTarget(attacker, enemiesInRange);

    if (!closestEnemy) continue;

    // TÍNH TOÁN SÁT THƯƠNG
    let attackPower = attacker.soldiersCount * 1.6;
    if (attacker.unitTypeId === 'general') {
      attackPower = attacker.soldiersCount * 3.5; // Tướng lĩnh dũng mãnh, sát thương võ công cao
    }

    // Khắc chế binh chủng
    if (attacker.unitTypeId === 'spearman' && closestEnemy.unitTypeId === 'cavalry') {
      attackPower *= 1.8;
    } else if (attacker.unitTypeId === 'swordsman' && closestEnemy.unitTypeId === 'archer') {
      attackPower *= 1.4;
    } else if (attacker.unitTypeId === 'cavalry' && closestEnemy.unitTypeId === 'archer') {
      attackPower *= 1.6;
    } else if (attacker.unitTypeId === 'cavalry' && closestEnemy.unitTypeId === 'supply_cart') {
      attackPower *= 2.0;
    }

    // Vòng hào quang chỉ huy của tướng
    const nearGeneral = livingGenerals.find(g => g.faction === attacker.faction && getDistance(attacker, g) <= (g.commandAuraRadius || 4));
    if (nearGeneral) {
      attackPower *= 1.25;
    }

    // Địa hình phòng thủ của đối phương
    const defTile = grid.tiles[closestEnemy.row]?.[closestEnemy.col];
    let defenseRate = defTile ? defTile.defenseBonus : 0;

    if (defTile?.terrain === 'swamp') {
      attackPower *= 1.25;
    }

    if ((defTile?.elevation || 0) > (grid.tiles[attacker.row]?.[attacker.col]?.elevation || 0)) {
      defenseRate += 0.25;
    }

    defenseRate = Math.min(0.7, Math.max(-0.3, defenseRate));
    const damage = Math.max(1, Math.round(attackPower * (1 - defenseRate) * (0.85 + Math.random() * 0.3)));

    // KHẤU TRỪ VÀO HP & QUÂN SỐ
    const oldSoldiers = closestEnemy.soldiersCount;
    closestEnemy.hp = Math.max(0, closestEnemy.hp - damage);
    const hpPerSoldier = closestEnemy.maxHp / closestEnemy.maxSoldiersCount;
    closestEnemy.soldiersCount = Math.max(0, Math.ceil(closestEnemy.hp / hpPerSoldier));
    const lostSoldiers = oldSoldiers - closestEnemy.soldiersCount;

    if (closestEnemy.faction === 'lam_son') {
      roundLamSonCasualties += lostSoldiers;
    } else {
      roundMingCasualties += lostSoldiers;
    }

    // TÍNH SĨ KHÍ & VỠ TRẬN
    const moraleLoss = Math.round((damage / closestEnemy.maxHp) * 50);
    closestEnemy.morale = Math.max(0, closestEnemy.morale - moraleLoss);

    if (lostSoldiers > 0) {
      newLogs.unshift({
        id: `log_hit_${nextTurn}_${attacker.id}_${closestEnemy.id}`,
        turn: nextTurn,
        canhHour: `Canh ${Math.ceil(nextTurn / 3)}`,
        type: 'clash',
        message: `${attacker.faction === 'lam_son' ? 'Nghĩa quân' : 'Quân Minh'} (${attacker.unitTypeId}) giao chiến gây thương vong ${lostSoldiers} quân đối phương!`,
        actorFaction: attacker.faction,
      });
    }

    attacker.status = 'fighting';
    closestEnemy.lastDamageTaken = damage;

    if (closestEnemy.hp <= 0 || closestEnemy.soldiersCount <= 0) {
      closestEnemy.status = 'eliminated';
      closestEnemy.eliminatedAtTurn = nextTurn;
      newLogs.unshift({
        id: `log_kill_${nextTurn}_${closestEnemy.id}`,
        turn: nextTurn,
        canhHour: `Canh ${Math.ceil(nextTurn / 3)}`,
        type: 'clash',
        message: `${attacker.faction === 'lam_son' ? 'Nghĩa quân' : 'Quân Minh'} đã tiêu diệt hoàn toàn toán ${closestEnemy.unitTypeId} của đối phương!`,
        actorFaction: attacker.faction,
      });
    } else if (closestEnemy.faction === 'ming' && closestEnemy.morale < 20 && closestEnemy.status !== 'routing') {
      closestEnemy.status = 'routing';
      newLogs.unshift({
        id: `log_rout_${nextTurn}_${closestEnemy.id}`,
        turn: nextTurn,
        canhHour: `Canh ${Math.ceil(nextTurn / 3)}`,
        type: 'morale',
        message: `Toán ${closestEnemy.unitTypeId} (Quân Minh) sĩ khí suy sụp, đã bắt đầu vỡ trận tháo lui!`,
        actorFaction: 'ming',
      });
    } else if (
      closestEnemy.status !== 'routing' &&
      getUnitDistance(attacker, closestEnemy) <= Math.max(2, UNIT_ATTACK_RANGE[closestEnemy.unitTypeId])
    ) {
      closestEnemy.status = 'fighting';
    }
  }

  // 3. CẬP NHẬT TỔNG SĨ KHÍ & KIỂM TRA ĐIỀU KIỆN KẾT THÚC
  const currentLamSonLiving = units.filter(u => u.faction === 'lam_son' && u.status !== 'eliminated');
  const currentMingLiving = units.filter(u => u.faction === 'ming' && u.status !== 'eliminated');

  const totalLamSonSoldiersNow = currentLamSonLiving.reduce((acc, u) => acc + u.soldiersCount, 0);
  const totalMingSoldiersNow = currentMingLiving.reduce((acc, u) => acc + u.soldiersCount, 0);

  const initLamSon = Math.max(1, prevState.initialLamSonSoldiers);
  const initMing = Math.max(1, prevState.initialMingSoldiers);

  const newLamSonMorale = Math.min(100, Math.max(0, Math.round((totalLamSonSoldiersNow / initLamSon) * 100)));
  const newMingMorale = Math.min(100, Math.max(0, Math.round((totalMingSoldiersNow / initMing) * 100)));

  let nextPhase: BattlefieldState['phase'] = 'in_progress';

  // Điều kiện Toàn Thắng của Lam Sơn: Quân Minh bị diệt hết hoặc toàn bộ vỡ trận tháo lui sau khi đã giao chiến
  const mingNonRouting = currentMingLiving.filter(u => u.status !== 'routing');
  if (currentMingLiving.length === 0 || (mingNonRouting.length === 0 && nextTurn >= 2) || newMingMorale < 15) {
    nextPhase = 'victory';
    newLogs.unshift({
      id: `log_vic_${nextTurn}`,
      turn: nextTurn,
      canhHour: `Canh ${Math.ceil(nextTurn / 3)}`,
      type: 'system',
      message: '🚩 ĐẠI THẮNG QUÂN MINH! Giặc Minh tan vỡ đại bại, tháo chạy tán loạn khỏi chiến trường!',
      actorFaction: 'lam_son',
    });
  } 
  // Điều kiện Thất Bại của Lam Sơn: Khi người chơi chưa nhấn rút lui, nghĩa quân quyết tử chiến đấu đến khi toàn quân tận diệt!
  else if (currentLamSonLiving.length === 0 || totalLamSonSoldiersNow === 0) {
    nextPhase = 'defeat';
    newLogs.unshift({
      id: `log_def_${nextTurn}`,
      turn: nextTurn,
      canhHour: `Canh ${Math.ceil(nextTurn / 3)}`,
      type: 'system',
      message: '⚠️ TOÀN QUÂN TẬN DIỆT! Toàn bộ nghĩa binh khởi nghĩa đã anh dũng chiến đấu hy sinh đến người lính cuối cùng!',
      actorFaction: 'ming',
    });
  }

  const nextLamSonAnchor = computeFactionAnchor(units, 'lam_son');
  const nextMingAnchor = computeFactionAnchor(units, 'ming');

  return {
    ...prevState,
    turn: nextTurn,
    phase: nextPhase,
    units,
    lamSonAnchor: nextLamSonAnchor,
    mingAnchor: nextMingAnchor,
    lamSonMorale: newLamSonMorale,
    mingMorale: newMingMorale,
    casualties: {
      lamSonKilled: prevState.casualties.lamSonKilled + roundLamSonCasualties,
      mingKilled: prevState.casualties.mingKilled + roundMingCasualties,
      weaponsLost: nextPhase === 'defeat'
        ? Math.round((prevState.casualties.lamSonKilled + roundLamSonCasualties) * 0.75)
        : prevState.casualties.weaponsLost + Math.round(roundLamSonCasualties * 0.4),
      weaponsCaptured: nextPhase === 'defeat'
        ? 0
        : prevState.casualties.weaponsCaptured + Math.round(roundMingCasualties * 0.5),
      foodCaptured: nextPhase === 'defeat'
        ? 0
        : prevState.casualties.foodCaptured + Math.round(roundMingCasualties * 2.2),
      goldCaptured: nextPhase === 'defeat'
        ? 0
        : prevState.casualties.goldCaptured + Math.round(roundMingCasualties * 0.8),
    },
    logs: newLogs.slice(0, 50),
  };
}
