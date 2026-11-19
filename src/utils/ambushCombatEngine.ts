import type { TacticalFormation } from '../types/armyFormation';
import type { AmbushBattleState, RegionCombatUnit } from '../types/region';
import { extractDeployPoolFromFormation } from './siegeCombatEngine';

export function createAmbushBattle(
  formation: TacticalFormation,
  districtName: string,
  mingTroops: number
): AmbushBattleState {
  const blockedTiles: AmbushBattleState['blockedTiles'] = [];
  // Rừng rậm & vách đá hai bên đường mòn (cột 0..5 và 18..23)
  for (let r = 2; r < 22; r++) {
    for (let c = 0; c < 6; c++) {
      if ((c + r) % 2 === 0) blockedTiles.push({ col: c, row: r, kind: c < 2 ? 'cliff' : 'forest' });
    }
    for (let c = 18; c < 24; c++) {
      if ((c + r) % 2 === 1) blockedTiles.push({ col: c, row: r, kind: c > 21 ? 'cliff' : 'forest' });
    }
  }

  const pool = extractDeployPoolFromFormation(formation);
  const units: RegionCombatUnit[] = [];

  const spawnLamSon = (unitType: RegionCombatUnit['unitType'], count: number, x: number, z: number, idx: number) => {
    if (count <= 0) return;
    units.push({
      id: `ls_amb_${unitType}_${idx}`,
      faction: 'lam_son',
      unitType,
      x,
      z,
      hp: count * 12,
      maxHp: count * 12,
      atk: unitType === 'cavalry' ? 28 : unitType === 'archer' ? 24 : 20,
      range: unitType === 'archer' ? 5 : 1.4,
      speed: unitType === 'cavalry' ? 3.5 : 2.3,
      attackCooldown: 0,
      soldiers: count,
      maxSoldiers: count,
    });
  };

  spawnLamSon('cavalry', pool.cavalry, 12, 18.5, 1);
  spawnLamSon('swordsman', pool.swordsman, 10.5, 19.5, 2);
  spawnLamSon('spearman', pool.spearman, 13.5, 19.5, 3);
  spawnLamSon('archer', pool.archer, 12, 21, 4);
  spawnLamSon('elephant', pool.elephant, 9.5, 20.5, 5);

  const mingGroups = Math.min(6, Math.max(2, Math.floor(mingTroops / 80)));
  const perGroup = Math.max(15, Math.round(mingTroops / mingGroups));
  for (let i = 0; i < mingGroups; i++) {
    const isLeft = i % 2 === 0;
    const ut: RegionCombatUnit['unitType'] = i % 3 === 0 ? 'archer' : 'swordsman';
    units.push({
      id: `ming_amb_${i}`,
      faction: 'ming',
      unitType: ut,
      x: isLeft ? 6.5 : 17.5,
      z: 6 + Math.floor(i / 2) * 4.5,
      hp: perGroup * 10,
      maxHp: perGroup * 10,
      atk: ut === 'archer' ? 20 : 18,
      range: ut === 'archer' ? 4.8 : 1.3,
      speed: 2.0,
      attackCooldown: 0,
      soldiers: perGroup,
      maxSoldiers: perGroup,
    });
  }

  return {
    id: `ambush_${Date.now()}`,
    formationId: formation.id,
    districtName,
    gridSize: 24,
    blockedTiles,
    exitZone: { minCol: 9, maxCol: 14, minRow: 0, maxRow: 2 },
    units,
    selectedUnitId: units.find((u) => u.faction === 'lam_son')?.id || null,
    moveTargets: {},
    status: 'fighting',
    elapsedSeconds: 0,
  };
}

export function stepAmbushBattle(state: AmbushBattleState, dt: number): AmbushBattleState {
  if (state.status !== 'fighting') return state;

  const units = state.units.map((u) => ({ ...u, attackCooldown: Math.max(0, u.attackCooldown - dt) }));

  for (const u of units) {
    if (u.hp <= 0) continue;

    // Tìm kẻ địch gần nhất
    let nearestEnemy: RegionCombatUnit | null = null;
    let bestDist = Infinity;
    for (const other of units) {
      if (other.faction === u.faction || other.hp <= 0) continue;
      const d = Math.hypot(other.x - u.x, other.z - u.z);
      if (d < bestDist) {
        bestDist = d;
        nearestEnemy = other;
      }
    }

    if (u.faction === 'lam_son') {
      const target = state.moveTargets[u.id];
      if (target) {
        const dTarget = Math.hypot(target.x - u.x, target.z - u.z);
        if (dTarget > 0.35) {
          u.x += ((target.x - u.x) / dTarget) * u.speed * dt;
          u.z += ((target.z - u.z) / dTarget) * u.speed * dt;
        }
      }
      if (nearestEnemy && bestDist <= u.range && u.attackCooldown <= 0) {
        nearestEnemy.hp = Math.max(0, nearestEnemy.hp - u.atk);
        nearestEnemy.soldiers = Math.ceil(
          (nearestEnemy.hp / Math.max(1, nearestEnemy.maxHp)) * nearestEnemy.maxSoldiers
        );
        u.attackCooldown = 0.85;
      }
    } else if (nearestEnemy) {
      if (bestDist <= u.range) {
        if (u.attackCooldown <= 0) {
          nearestEnemy.hp = Math.max(0, nearestEnemy.hp - u.atk);
          nearestEnemy.soldiers = Math.ceil(
            (nearestEnemy.hp / Math.max(1, nearestEnemy.maxHp)) * nearestEnemy.maxSoldiers
          );
          u.attackCooldown = 0.9;
        }
      } else {
        u.x += ((nearestEnemy.x - u.x) / bestDist) * u.speed * dt;
        u.z += ((nearestEnemy.z - u.z) / bestDist) * u.speed * dt;
      }
    }
  }

  const aliveLS = units.filter((u) => u.faction === 'lam_son' && u.hp > 0);
  const aliveMing = units.filter((u) => u.faction === 'ming' && u.hp > 0);

  const escapedCount = aliveLS.filter(
    (u) =>
      u.x >= state.exitZone.minCol &&
      u.x <= state.exitZone.maxCol + 1 &&
      u.z >= state.exitZone.minRow &&
      u.z <= state.exitZone.maxRow + 1
  ).length;

  let status: AmbushBattleState['status'] = 'fighting';
  if (aliveLS.length === 0) status = 'defeat';
  else if (aliveMing.length === 0) status = 'victory';
  else if (escapedCount >= Math.ceil(aliveLS.length * 0.5) && escapedCount > 0) status = 'escaped';

  return {
    ...state,
    units: aliveLS.concat(aliveMing),
    status,
    elapsedSeconds: state.elapsedSeconds + dt,
  };
}
