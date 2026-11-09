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

  // 1. DI CHUYỂN ĐƠN VỊ THEO AI
  for (const unit of units) {
    if (unit.status === 'eliminated') continue;

    // Đơn vị đang vỡ trận: Tháo chạy về hậu phương
    if (unit.status === 'routing') {
      const escapeDir = unit.faction === 'lam_son' ? -1 : 1;
      const targetCol = unit.col + escapeDir;
      if (targetCol >= 0 && targetCol < grid.cols) {
        const destKey = `${targetCol},${unit.row}`;
        const tile = grid.tiles[unit.row]?.[targetCol];
        if (tile && tile.isPassable && !occupied.has(destKey)) {
          occupied.delete(`${unit.col},${unit.row}`);
          unit.col = targetCol;
          occupied.add(destKey);
        }
      }
      continue;
    }

    // Kiểm tra xem có địch trong tầm đánh không
    const enemies = units.filter(
      e => e.faction !== unit.faction && e.status !== 'eliminated' && e.soldiersCount > 0
    );
    const range = unit.unitTypeId === 'archer' && (grid.tiles[unit.row]?.[unit.col]?.elevation || 0) > 0 ? 5 : UNIT_ATTACK_RANGE[unit.unitTypeId];
    const enemyInRange = enemies.some(e => getDistance(unit, e) <= range);

    // Nếu đã có địch trong tầm đánh hoặc đang giữ thế phòng thủ -> Không cần tiến
    if (enemyInRange || unit.status === 'holding') {
      continue;
    }

    // Đang tiến công: Di chuyển về phía trung lộ / phía đối phương
    if (unit.status === 'advancing') {
      const moveDir = unit.faction === 'lam_son' ? 1 : -1;
      const targetCol = unit.col + moveDir;
      if (targetCol >= 0 && targetCol < grid.cols) {
        const destKey = `${targetCol},${unit.row}`;
        const tile = grid.tiles[unit.row]?.[targetCol];
        if (tile && tile.isPassable && !occupied.has(destKey)) {
          occupied.delete(`${unit.col},${unit.row}`);
          unit.col = targetCol;
          occupied.add(destKey);
        }
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
    // 1. Sát thương cơ bản dựa trên quân số thực
    let attackPower = attacker.soldiersCount * 1.5;

    // 2. Hệ số khắc chế binh chủng
    if (attacker.unitTypeId === 'spearman' && closestEnemy.unitTypeId === 'cavalry') {
      attackPower *= 1.8; // Trường giáo khắc cứng thiết kỵ
    } else if (attacker.unitTypeId === 'swordsman' && closestEnemy.unitTypeId === 'archer') {
      attackPower *= 1.4; // Đao khiên ép sát cung thủ
    } else if (attacker.unitTypeId === 'cavalry' && closestEnemy.unitTypeId === 'archer') {
      attackPower *= 1.6; // Thiết kỵ càn quét xạ thủ
    } else if (attacker.unitTypeId === 'cavalry' && closestEnemy.unitTypeId === 'supply_cart') {
      attackPower *= 2.0; // Tập kích cướp xe lương
    }

    // 3. Vòng hào quang chỉ huy của tướng
    const nearGeneral = livingGenerals.find(g => g.faction === attacker.faction && getDistance(attacker, g) <= (g.commandAuraRadius || 4));
    if (nearGeneral) {
      attackPower *= 1.25;
    }

    // 4. Địa hình phòng thủ của đối phương
    const defTile = grid.tiles[closestEnemy.row]?.[closestEnemy.col];
    let defenseRate = defTile ? defTile.defenseBonus : 0;

    // Nếu đứng trong đầm lầy -> bị giảm khả năng phòng thủ (-15%)
    if (defTile?.terrain === 'swamp') {
      attackPower *= 1.2;
    }

    // Nếu phòng thủ trên cao (mỏm đá) -> giảm 25% sát thương nhận vào
    if ((defTile?.elevation || 0) > (grid.tiles[attacker.row]?.[attacker.col]?.elevation || 0)) {
      defenseRate += 0.25;
    }

    // Giới hạn giảm tối đa 70% sát thương
    defenseRate = Math.min(0.7, Math.max(-0.3, defenseRate));
    const damage = Math.max(1, Math.round(attackPower * (1 - defenseRate) * (0.8 + Math.random() * 0.4)));

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
    const moraleLoss = Math.round((damage / closestEnemy.maxHp) * 70);
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
    } else if (closestEnemy.morale < 25 && closestEnemy.status !== 'routing') {
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

  const newLamSonMorale = Math.max(0, Math.round((totalLamSonSoldiersNow / prevState.initialLamSonSoldiers) * 100));
  const newMingMorale = Math.max(0, Math.round((totalMingSoldiersNow / prevState.initialMingSoldiers) * 100));

  let nextPhase: BattlefieldState['phase'] = 'in_progress';

  // Điều kiện Toàn Thắng của Lam Sơn: Quân Minh bị diệt hết hoặc toàn bộ vỡ trận tháo lui
  const mingNonRouting = currentMingLiving.filter(u => u.status !== 'routing');
  if (currentMingLiving.length === 0 || mingNonRouting.length === 0 || newMingMorale < 15) {
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
  else if (currentLamSonLiving.length === 0 || currentLamSonLiving.filter(u => u.status !== 'routing').length === 0 || newLamSonMorale < 15) {
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
