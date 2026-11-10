import type { 
  BattlefieldState, 
  BattlefieldUnit, 
  BattlefieldLogEntry 
} from '../types/battlefield';

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

export const getDistance = getUnitDistance;

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

  // 1. DI CHUYỂN ĐƠN VỊ 2D THEO AI HƯỚNG TỚI KẺ ĐỊCH GẦN NHẤT
  // QUY TẮC ĐIỀU HÀNH HÀNG NGŨ CHIẾN THUẬT:
  // - Quân Lam Sơn tiến sang Đông (+X): Đơn vị cột lớn hơn (tiền tuyến) đi trước để nhường ô cho hàng sau
  // - Quân Minh tiến sang Tây (-X): Đơn vị cột nhỏ hơn (tiền tuyến) đi trước để nhường ô cho hàng sau
  const movingLamSon = units
    .filter(u => u.faction === 'lam_son' && u.status !== 'eliminated')
    .sort((a, b) => b.col - a.col);

  const movingMing = units
    .filter(u => u.faction === 'ming' && u.status !== 'eliminated')
    .sort((a, b) => a.col - b.col);

  const orderedMovingUnits = [...movingLamSon, ...movingMing];

  for (const unit of orderedMovingUnits) {
    if (unit.status === 'eliminated') continue;

    const enemies = units.filter(
      e => e.faction !== unit.faction && e.status !== 'eliminated' && e.soldiersCount > 0
    );

    // Nếu không còn kẻ địch sống, không cần di chuyển
    if (enemies.length === 0) continue;

    // Đơn vị đang vỡ trận: Tháo chạy ra xa khỏi kẻ địch
    if (unit.status === 'routing') {
      const escapeDir = unit.faction === 'lam_son' ? -1 : 1;
      const stepC = unit.col + escapeDir;
      if (canUnitMoveTo(unit, stepC, unit.row)) {
        removeUnitOccupied(unit);
        unit.col = stepC;
        addUnitOccupied(unit);
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
    const isMelee = unit.unitTypeId === 'swordsman' || unit.unitTypeId === 'spearman' || unit.unitTypeId === 'cavalry' || unit.unitTypeId === 'elephant' || isGeneral;

    const effectiveRange = isArcher && (grid.tiles[unit.row]?.[unit.col]?.elevation || 0) > 0 
      ? 9 
      : UNIT_ATTACK_RANGE[unit.unitTypeId];

    // Cự ly lý tưởng: Cung thủ giữ khoảng cách 7-8 ô để xả tên ngoài tầm cận chiến; Tướng 3, Xe lương 9, Giáo 2, Đao/Kỵ/Tượng 1
    const desiredRange = isArcher ? 7 : isGeneral ? 3 : isSupply ? 9 : (unit.unitTypeId === 'spearman' ? 2 : 1);

    // Nếu đã ở cự ly chiến đấu lý tưởng -> Giữ vị trí bắn tên / chỉ huy, không lao vào cận chiến
    if (minDist <= desiredRange) {
      // Riêng cung thủ: Nếu địch cận chiến áp sát trong cự ly <= 2 ô -> Chủ động lùi 1 bước nếu có ô trống phía sau
      if (isArcher && minDist <= 2) {
        const retreatCol = unit.col + (unit.faction === 'lam_son' ? -1 : 1);
        if (canUnitMoveTo(unit, retreatCol, unit.row)) {
          removeUnitOccupied(unit);
          unit.col = retreatCol;
          addUnitOccupied(unit);
        }
      }
      continue;
    }

    // Kiểm tra mệnh lệnh tham chiến:
    // - Khi 'advancing': Tất cả binh chủng chiến đấu (Cận chiến, Cung thủ, Tướng) đều tiến về cự ly lý tưởng
    // - Khi 'holding': Chỉ chủ động phản kích khi kẻ địch áp sát trận địa
    let shouldEngage = false;
    if (unit.status === 'advancing') {
      shouldEngage = true;
    } else if (unit.status === 'holding') {
      if (isMelee && minDist <= 8) shouldEngage = true;
      if (isArcher && minDist <= effectiveRange + 2) shouldEngage = true;
      if (isGeneral && minDist <= 3) shouldEngage = true;
    }

    if (!shouldEngage) {
      continue;
    }

    // THUẬT TOÁN ĐIỀU HƯỚNG CHIẾN THUẬT (Tiến công & Bọc sườn bao vây - Flanking & Fanning out)
    const dx = closestEnemy.col - unit.col;
    const dy = closestEnemy.row - unit.row;

    const stepCol = unit.col + (dx !== 0 ? Math.sign(dx) : (unit.faction === 'lam_son' ? 1 : -1));
    const stepRow = unit.row + (dy !== 0 ? Math.sign(dy) : 0);

    const candidateMoves: { c: number; r: number }[] = [];

    // Nếu khoảng cách dọc lớn hơn, ưu tiên căn chỉnh hàng Y trước
    if (Math.abs(dy) > Math.abs(dx)) {
      candidateMoves.push({ c: unit.col, r: stepRow });
      candidateMoves.push({ c: stepCol, r: stepRow });
      candidateMoves.push({ c: stepCol, r: unit.row });
    } else {
      // Ưu tiên tiến trực diện
      candidateMoves.push({ c: stepCol, r: unit.row });
      if (dy !== 0) {
        candidateMoves.push({ c: stepCol, r: stepRow });
        candidateMoves.push({ c: unit.col, r: stepRow });
      }
    }

    // Cơ chế Bọc Sườn Chiến Thuật (Flanking & Fanning out):
    // Khi đường tiến trực diện bị tắc bởi hàng ngũ đồng đội, quân lính chủ động lách sườn sang hàng trên/dưới (row ± 1)
    // để mở rộng mặt trận hình cánh cung bao vây đối phương, loại bỏ hoàn toàn cảm giác ùn ứ một hàng "cứng nhắc"
    const flankRows = (unit.row % 2 === 0) 
      ? [unit.row + 1, unit.row - 1] 
      : [unit.row - 1, unit.row + 1];

    for (const fRow of flankRows) {
      if (fRow >= 0 && fRow < grid.rows) {
        candidateMoves.push({ c: stepCol, r: fRow });
        candidateMoves.push({ c: unit.col, r: fRow });
      }
    }

    let moved = false;
    for (const move of candidateMoves) {
      if (canUnitMoveTo(unit, move.c, move.r)) {
        removeUnitOccupied(unit);
        unit.col = move.c;
        unit.row = move.r;
        addUnitOccupied(unit);
        moved = true;
        break;
      }
    }

    // Cơ chế Đột Phá Hàng Ngũ (Rank Passing / Swapping):
    // Nếu quân cận chiến (1x1) muốn tiến lên giáp lá cà nhưng bị cản bởi
    // đồng đội Cung thủ (1x1) ở ô phía trước -> Cho phép hoán vị tiến lên trước
    if (!moved && isMelee && (unit.spanCols || 1) === 1 && (unit.spanRows || 1) === 1) {
      const stepForwardCol = unit.col + (unit.faction === 'lam_son' ? 1 : -1);
      const friendlyAhead = units.find(
        f => f.col === stepForwardCol && f.row === unit.row && f.status !== 'eliminated' && f.faction === unit.faction &&
             (f.spanCols || 1) === 1 && (f.spanRows || 1) === 1
      );
      if (friendlyAhead && (friendlyAhead.unitTypeId === 'archer' || friendlyAhead.unitTypeId === 'supply_cart')) {
        removeUnitOccupied(unit);
        removeUnitOccupied(friendlyAhead);

        const tempCol = unit.col;
        unit.col = friendlyAhead.col;
        friendlyAhead.col = tempCol;

        addUnitOccupied(unit);
        addUnitOccupied(friendlyAhead);
        moved = true;
      }
    }
  }

  // 2. TÍNH TOÁN TẤN CÔNG & GIAO TRANH
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

    let closestEnemy: BattlefieldUnit | null = null;
    let minDist = Infinity;

    for (const enemy of enemies) {
      const dist = getDistance(attacker, enemy);
      if (dist <= effectiveRange && dist < minDist) {
        minDist = dist;
        closestEnemy = enemy;
      }
    }

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
    } else if (closestEnemy.status !== 'routing') {
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

  return {
    ...prevState,
    turn: nextTurn,
    phase: nextPhase,
    units,
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
