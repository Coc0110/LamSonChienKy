import type { 
  BattlefieldState, 
  BattlefieldUnit, 
  BattlefieldLogEntry 
} from '../types/battlefield';

// Bảng phạm vi tấn công theo binh chủng
export const UNIT_ATTACK_RANGE: Record<BattlefieldUnit['unitTypeId'], number> = {
  archer: 4,
  spearman: 2,
  swordsman: 1,
  cavalry: 1,
  elephant: 1,
  general: 1,
  scout: 1,
  supply_cart: 0,
};

function getDistance(u1: { col: number; row: number }, u2: { col: number; row: number }): number {
  return Math.max(Math.abs(u1.col - u2.col), Math.abs(u1.row - u2.row));
}

export function resolveBattlefieldTick(prevState: BattlefieldState): BattlefieldState {
  if (prevState.phase !== 'in_progress') {
    return prevState;
  }

  const nextTurn = prevState.turn + 1;
  const newLogs: BattlefieldLogEntry[] = [...prevState.logs];
  const grid = prevState.grid;

  // Clone danh sách đơn vị để cập nhật
  const units: BattlefieldUnit[] = prevState.units.map(u => ({ ...u }));

  // Tạo set vị trí bị chiếm đóng
  const occupied = new Set<string>();
  units.forEach(u => {
    if (u.status !== 'eliminated') {
      occupied.add(`${u.col},${u.row}`);
    }
  });

  const canMoveTo = (c: number, r: number) => {
    if (c < 0 || c >= grid.cols || r < 0 || r >= grid.rows) return false;
    const tile = grid.tiles[r]?.[c];
    if (!tile || !tile.isPassable) return false;
    return !occupied.has(`${c},${r}`);
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
      if (canMoveTo(stepC, unit.row)) {
        occupied.delete(`${unit.col},${unit.row}`);
        unit.col = stepC;
        occupied.add(`${unit.col},${unit.row}`);
      }
      continue;
    }

    // Tìm kẻ địch gần nhất trên bản đồ
    let closestEnemy: BattlefieldUnit | null = null;
    let minDist = Infinity;
    for (const enemy of enemies) {
      const dist = getDistance(unit, enemy);
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
      ? 5 
      : UNIT_ATTACK_RANGE[unit.unitTypeId];

    // Cự ly lý tưởng: Cung thủ 4 (hoặc 5), Tướng 3 (ngay sau tiền tuyến buff hào quang), Xe lương 7, Giáo 2, Cận chiến 1
    const desiredRange = isArcher ? effectiveRange : isGeneral ? 3 : isSupply ? 7 : (unit.unitTypeId === 'spearman' ? 2 : 1);

    // Nếu đã ở cự ly chiến đấu lý tưởng -> Giữ vị trí, không cần tiến thêm
    if (minDist <= desiredRange) {
      // Riêng cung thủ: Nếu địch cận chiến áp sát cự ly 1 ô -> Né lùi 1 bước nếu phía sau còn trống
      if (isArcher && minDist === 1) {
        const retreatCol = unit.col + (unit.faction === 'lam_son' ? -1 : 1);
        if (canMoveTo(retreatCol, unit.row)) {
          occupied.delete(`${unit.col},${unit.row}`);
          unit.col = retreatCol;
          occupied.add(`${unit.col},${unit.row}`);
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

    // THUẬT TOÁN ĐIỀU HƯỚNG 2D (Tiến về phía mục tiêu trên cả 2 trục X và Y)
    const dx = closestEnemy.col - unit.col;
    const dy = closestEnemy.row - unit.row;

    const stepCol = unit.col + (dx !== 0 ? Math.sign(dx) : (unit.faction === 'lam_son' ? 1 : -1));
    const stepRow = unit.row + (dy !== 0 ? Math.sign(dy) : 0);

    // Ưu tiên trục có khoảng cách lớn hơn hoặc tìm đường né vật cản
    let firstChoice = { c: stepCol, r: unit.row };
    let secondChoice = { c: unit.col, r: stepRow };

    if (Math.abs(dy) > Math.abs(dx)) {
      firstChoice = { c: unit.col, r: stepRow };
      secondChoice = { c: stepCol, r: unit.row };
    }

    if (canMoveTo(firstChoice.c, firstChoice.r)) {
      occupied.delete(`${unit.col},${unit.row}`);
      unit.col = firstChoice.c;
      unit.row = firstChoice.r;
      occupied.add(`${unit.col},${unit.row}`);
    } else if (canMoveTo(secondChoice.c, secondChoice.r)) {
      occupied.delete(`${unit.col},${unit.row}`);
      unit.col = secondChoice.c;
      unit.row = secondChoice.r;
      occupied.add(`${unit.col},${unit.row}`);
    } else if (canMoveTo(stepCol, stepRow)) {
      occupied.delete(`${unit.col},${unit.row}`);
      unit.col = stepCol;
      unit.row = stepRow;
      occupied.add(`${unit.col},${unit.row}`);
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
      ? 5 
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

    if (closestEnemy.hp <= 0 || closestEnemy.soldiersCount <= 0) {
      closestEnemy.status = 'eliminated';
      newLogs.unshift({
        id: `log_kill_${nextTurn}_${closestEnemy.id}`,
        turn: nextTurn,
        canhHour: `Canh ${Math.ceil(nextTurn / 3)}`,
        type: 'clash',
        message: `${attacker.faction === 'lam_son' ? 'Nghĩa quân' : 'Quân Minh'} đã tiêu diệt hoàn toàn toán ${closestEnemy.unitTypeId} của đối phương!`,
        actorFaction: attacker.faction,
      });
    } else if (closestEnemy.morale < 20 && closestEnemy.status !== 'routing') {
      closestEnemy.status = 'routing';
      newLogs.unshift({
        id: `log_rout_${nextTurn}_${closestEnemy.id}`,
        turn: nextTurn,
        canhHour: `Canh ${Math.ceil(nextTurn / 3)}`,
        type: 'morale',
        message: `Toán ${closestEnemy.unitTypeId} (${closestEnemy.faction === 'lam_son' ? 'Lam Sơn' : 'Quân Minh'}) sĩ khí suy sụp, đã bắt đầu vỡ trận tháo lui!`,
        actorFaction: closestEnemy.faction,
      });
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
  // Điều kiện Thất Bại của Lam Sơn: Quân ta bị diệt sạch hoặc vỡ trận
  else if (currentLamSonLiving.length === 0 || (currentLamSonLiving.filter(u => u.status !== 'routing').length === 0 && nextTurn >= 2) || newLamSonMorale < 15) {
    nextPhase = 'defeat';
    newLogs.unshift({
      id: `log_def_${nextTurn}`,
      turn: nextTurn,
      canhHour: `Canh ${Math.ceil(nextTurn / 3)}`,
      type: 'system',
      message: '⚠️ NGHĨA QUÂN THẤT LỢI! Thế giặc quá mạnh, quân ta buộc phải phá vây rút lui!',
      actorFaction: 'ming',
    });
  } else if (nextTurn >= prevState.maxTurns) {
    // Hết thời gian: bên nào mất ít % quân hơn sẽ nắm quyền kiểm soát
    if (newLamSonMorale >= newMingMorale) {
      nextPhase = 'victory';
    } else {
      nextPhase = 'defeat';
    }
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
      weaponsLost: prevState.casualties.weaponsLost + Math.round(roundLamSonCasualties * 0.4),
      weaponsCaptured: prevState.casualties.weaponsCaptured + Math.round(roundMingCasualties * 0.5),
      foodCaptured: prevState.casualties.foodCaptured + Math.round(roundMingCasualties * 2.2),
      goldCaptured: prevState.casualties.goldCaptured + Math.round(roundMingCasualties * 0.8),
    },
    logs: newLogs.slice(0, 50),
  };
}
