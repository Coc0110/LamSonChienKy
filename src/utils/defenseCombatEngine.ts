import type { CityNode } from '../types';
import type { BaseBuilding, DefenseBattleState, RegionCombatUnit, RegionLayout } from '../types/region';

type UnitKind = RegionCombatUnit['unitType'];

export function createDefenseBattle(
  city: CityNode,
  playerLayout: RegionLayout,
  mingAttackTroops: number
): DefenseBattleState {
  const clonedLayout: RegionLayout = {
    ...playerLayout,
    buildings: playerLayout.buildings.map((b) => ({ ...b })),
  };

  const units: RegionCombatUnit[] = [];
  // Sinh quân Minh tấn công từ 4 rìa bản đồ
  const waves = Math.min(10, Math.max(3, Math.floor(mingAttackTroops / 100)));
  const perWave = Math.max(15, Math.round(mingAttackTroops / waves));

  for (let i = 0; i < waves; i++) {
    const edge = i % 4;
    const x = edge === 0 ? 1 : edge === 1 ? 22.5 : 4 + ((i * 5) % 16);
    const z = edge === 2 ? 1 : edge === 3 ? 22.5 : 4 + ((i * 5) % 16);
    const ut: UnitKind = i % 4 === 0 ? 'cavalry' : i % 3 === 0 ? 'archer' : 'swordsman';
    units.push({
      id: `ming_atk_${i}`,
      faction: 'ming',
      unitType: ut,
      x,
      z,
      hp: perWave * 12,
      maxHp: perWave * 12,
      atk: ut === 'cavalry' ? 28 : 22,
      range: ut === 'archer' ? 4.8 : 1.35,
      speed: ut === 'cavalry' ? 2.8 : 1.9,
      attackCooldown: 0,
      soldiers: perWave,
      maxSoldiers: perWave,
    });
  }

  // Quân đồn trú Lam Sơn tại căn cứ
  const garrison = city.troops || 60;
  const gGroups = Math.min(4, Math.max(1, Math.floor(garrison / 30)));
  const perG = Math.max(10, Math.round(garrison / gGroups));
  for (let i = 0; i < gGroups; i++) {
    const ut: UnitKind = i % 2 === 0 ? 'spearman' : 'archer';
    units.push({
      id: `ls_def_${i}`,
      faction: 'lam_son',
      unitType: ut,
      x: 10 + (i % 2) * 4,
      z: 10 + Math.floor(i / 2) * 4,
      hp: perG * 13,
      maxHp: perG * 13,
      atk: 24,
      range: ut === 'archer' ? 5.2 : 1.4,
      speed: 2.2,
      attackCooldown: 0,
      soldiers: perG,
      maxSoldiers: perG,
    });
  }

  const reserveTotal = city.population?.combatTroops || 0;
  return {
    id: `def_${city.id}_${Date.now()}`,
    cityId: city.id,
    cityName: city.name,
    layout: clonedLayout,
    units,
    reservePool: {
      swordsman: Math.ceil(reserveTotal * 0.5),
      spearman: Math.floor(reserveTotal * 0.3),
      archer: Math.max(0, reserveTotal - Math.ceil(reserveTotal * 0.5) - Math.floor(reserveTotal * 0.3)),
      cavalry: 0,
      elephant: 0,
    },
    mainHallDestroyed: false,
    status: 'fighting',
    elapsedSeconds: 0,
  };
}

export function deployDefenseReserve(
  state: DefenseBattleState,
  unitType: UnitKind,
  col: number,
  row: number
): DefenseBattleState {
  const avail = state.reservePool[unitType] || 0;
  if (avail <= 0) return state;
  const count = Math.min(20, avail);
  const newUnit: RegionCombatUnit = {
    id: `ls_res_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    faction: 'lam_son',
    unitType,
    x: col + 0.5,
    z: row + 0.5,
    hp: count * 14,
    maxHp: count * 14,
    atk: 25,
    range: unitType === 'archer' ? 5.2 : 1.4,
    speed: 2.3,
    attackCooldown: 0,
    soldiers: count,
    maxSoldiers: count,
  };

  return {
    ...state,
    reservePool: {
      ...state.reservePool,
      [unitType]: avail - count,
    },
    units: [...state.units, newUnit],
  };
}

function bCenter(b: BaseBuilding) {
  return { x: b.col + b.spanCols / 2, z: b.row + b.spanRows / 2 };
}

export function stepDefenseBattle(state: DefenseBattleState, dt: number): DefenseBattleState {
  if (state.status !== 'fighting') return state;

  const buildings = state.layout.buildings.map((b) => ({ ...b }));
  const units = state.units.map((u) => ({ ...u, attackCooldown: Math.max(0, u.attackCooldown - dt) }));

  // Chòi canh & bẫy chông của người chơi bắn quân Minh
  for (const b of buildings) {
    if (b.status === 'destroyed') continue;
    const bc = bCenter(b);
    if (b.type === 'watchtower') {
      const target = units.find(
        (u) => u.faction === 'ming' && u.hp > 0 && Math.hypot(u.x - bc.x, u.z - bc.z) <= 6.5
      );
      if (target) {
        target.hp = Math.max(0, target.hp - (24 + b.level * 14) * dt);
        target.soldiers = Math.ceil((target.hp / Math.max(1, target.maxHp)) * target.maxSoldiers);
      }
    } else if (b.type === 'spike_trap') {
      const victim = units.find(
        (u) => u.faction === 'ming' && u.hp > 0 && Math.hypot(u.x - bc.x, u.z - bc.z) <= 0.9
      );
      if (victim) {
        victim.hp = Math.max(0, victim.hp - 95 * b.level);
        victim.soldiers = Math.ceil((victim.hp / Math.max(1, victim.maxHp)) * victim.maxSoldiers);
        b.hp = 0;
        b.status = 'destroyed';
      }
    }
  }

  for (const u of units) {
    if (u.hp <= 0) continue;
    if (u.faction === 'lam_son') {
      let target: RegionCombatUnit | null = null;
      let best = Infinity;
      for (const other of units) {
        if (other.faction !== 'ming' || other.hp <= 0) continue;
        const d = Math.hypot(other.x - u.x, other.z - u.z);
        if (d < best) {
          best = d;
          target = other;
        }
      }
      if (target) {
        if (best <= u.range) {
          if (u.attackCooldown <= 0) {
            target.hp = Math.max(0, target.hp - u.atk);
            target.soldiers = Math.ceil((target.hp / Math.max(1, target.maxHp)) * target.maxSoldiers);
            u.attackCooldown = 0.85;
          }
        } else {
          u.x += ((target.x - u.x) / best) * u.speed * dt;
          u.z += ((target.z - u.z) / best) * u.speed * dt;
        }
      }
    } else {
      // Quân Minh đánh lính Lam Sơn gần (<3 ô) hoặc phá Đại Bản Doanh / công trình
      let nearDef: RegionCombatUnit | null = null;
      let nearDist = 3.0;
      for (const other of units) {
        if (other.faction !== 'lam_son' || other.hp <= 0) continue;
        const d = Math.hypot(other.x - u.x, other.z - u.z);
        if (d < nearDist) {
          nearDist = d;
          nearDef = other;
        }
      }
      if (nearDef) {
        if (nearDist <= u.range) {
          if (u.attackCooldown <= 0) {
            nearDef.hp = Math.max(0, nearDef.hp - u.atk);
            nearDef.soldiers = Math.ceil((nearDef.hp / Math.max(1, nearDef.maxHp)) * nearDef.maxSoldiers);
            u.attackCooldown = 0.9;
          }
        } else {
          u.x += ((nearDef.x - u.x) / nearDist) * u.speed * dt;
          u.z += ((nearDef.z - u.z) / nearDist) * u.speed * dt;
        }
        continue;
      }

      const activeBuildings = buildings.filter((b) => b.status !== 'destroyed' && b.type !== 'spike_trap');
      const mainHall = activeBuildings.find((b) => b.type === 'main_hall');
      let targetB: BaseBuilding | null = mainHall || null;
      let bestB = Infinity;
      for (const b of activeBuildings) {
        const bc = bCenter(b);
        const d = Math.hypot(bc.x - u.x, bc.z - u.z);
        if (b.type !== 'wall' && d < bestB) {
          bestB = d;
          targetB = b;
        }
      }
      if (targetB) {
        const bc = bCenter(targetB);
        const d = Math.hypot(bc.x - u.x, bc.z - u.z);
        const reach = u.range + Math.max(targetB.spanCols, targetB.spanRows) * 0.45;
        if (d <= reach) {
          if (u.attackCooldown <= 0) {
            targetB.hp = Math.max(0, targetB.hp - u.atk * 1.25);
            u.attackCooldown = 0.9;
            if (targetB.hp <= 0) targetB.status = 'destroyed';
          }
        } else {
          u.x += ((bc.x - u.x) / d) * u.speed * dt;
          u.z += ((bc.z - u.z) / d) * u.speed * dt;
        }
      }
    }
  }

  const mainHall = buildings.find((b) => b.type === 'main_hall');
  const mainHallDestroyed = !mainHall || mainHall.status === 'destroyed';
  const aliveMing = units.some((u) => u.faction === 'ming' && u.hp > 0);

  let status: DefenseBattleState['status'] = 'fighting';
  if (mainHallDestroyed) status = 'defeat';
  else if (!aliveMing) status = 'victory';

  return {
    ...state,
    layout: { ...state.layout, buildings },
    units: units.filter((u) => u.hp > 0),
    mainHallDestroyed,
    status,
    elapsedSeconds: state.elapsedSeconds + dt,
  };
}
