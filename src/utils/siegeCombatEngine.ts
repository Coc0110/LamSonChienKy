import { TACTICAL_UNIT_CONFIGS, type TacticalFormation } from '../types/armyFormation';
import type {
  BaseBuilding,
  RegionCombatUnit,
  RegionLayout,
  SiegeBattleState,
} from '../types/region';

type UnitKind = RegionCombatUnit['unitType'];

const UNIT_STATS: Record<UnitKind, { hp: number; atk: number; range: number; speed: number; groupSize: number }> = {
  swordsman: { hp: 220, atk: 24, range: 1.2, speed: 2.3, groupSize: 20 },
  spearman: { hp: 250, atk: 22, range: 1.5, speed: 2.1, groupSize: 20 },
  archer: { hp: 140, atk: 28, range: 5.2, speed: 2.2, groupSize: 20 },
  cavalry: { hp: 320, atk: 34, range: 1.4, speed: 3.6, groupSize: 15 },
  elephant: { hp: 650, atk: 62, range: 1.6, speed: 1.7, groupSize: 3 },
};

export function extractDeployPoolFromFormation(
  formation: TacticalFormation
): Record<UnitKind, number> {
  const pool: Record<UnitKind, number> = {
    swordsman: 0,
    spearman: 0,
    archer: 0,
    cavalry: 0,
    elephant: 0,
  };

  for (const row of formation.grid) {
    for (const cell of row) {
      if (!cell) continue;
      if (cell.row !== cell.rootRow || cell.col !== cell.rootCol) continue;
      const count = TACTICAL_UNIT_CONFIGS[cell.type]?.cost.combatTroops || 1;
      if (cell.type === 'swordsman') pool.swordsman += count;
      else if (cell.type === 'spearman') pool.spearman += count;
      else if (cell.type === 'archer') pool.archer += count;
      else if (cell.type === 'cavalry') pool.cavalry += count;
      else if (cell.type === 'elephant') pool.elephant += count;
    }
  }

  const total = pool.swordsman + pool.spearman + pool.archer + pool.cavalry + pool.elephant;
  if (total === 0 && formation.totalTroops > 0) {
    pool.swordsman = Math.ceil(formation.totalTroops * 0.5);
    pool.spearman = Math.floor(formation.totalTroops * 0.3);
    pool.archer = Math.max(0, formation.totalTroops - pool.swordsman - pool.spearman);
  }

  return pool;
}

export function createSiegeBattle(
  targetCityId: string,
  targetCityName: string,
  formation: TacticalFormation,
  enemyLayout: RegionLayout,
  enemyTroops: number
): SiegeBattleState {
  const clonedLayout: RegionLayout = {
    ...enemyLayout,
    buildings: enemyLayout.buildings.map((b) => ({ ...b })),
  };

  const units: RegionCombatUnit[] = [];
  const gs = enemyLayout.gridSize || 32;
  const center = gs / 2;
  const garrisonCount = Math.min(8, Math.max(2, Math.floor(enemyTroops / 150)));
  for (let i = 0; i < garrisonCount; i++) {
    const kind: UnitKind = i % 3 === 0 ? 'archer' : i % 2 === 0 ? 'spearman' : 'swordsman';
    const st = UNIT_STATS[kind];
    const angle = (i / garrisonCount) * Math.PI * 2;
    units.push({
      id: `ming_garrison_${i}`,
      faction: 'ming',
      unitType: kind,
      x: center + Math.cos(angle) * 5.2,
      z: center + Math.sin(angle) * 5.2,
      hp: st.hp,
      maxHp: st.hp,
      atk: st.atk,
      range: st.range,
      speed: st.speed * 0.85,
      attackCooldown: 0,
      soldiers: st.groupSize,
      maxSoldiers: st.groupSize,
    });
  }

  return {
    id: `siege_${targetCityId}_${Date.now()}`,
    targetCityId,
    targetCityName,
    formationId: formation.id,
    layout: clonedLayout,
    units,
    deployPool: extractDeployPoolFromFormation(formation),
    destructionPercent: 0,
    mainHallDestroyed: false,
    lootFood: 0,
    lootWeapons: 0,
    lootGold: 0,
    status: 'deploying',
    elapsedSeconds: 0,
  };
}

export function isValidSiegeDeployCell(col: number, row: number, gridSize = 24): boolean {
  return col < 2 || col >= gridSize - 2 || row < 2 || row >= gridSize - 2;
}

export function deploySiegeUnit(
  state: SiegeBattleState,
  unitType: UnitKind,
  col: number,
  row: number
): SiegeBattleState {
  if (!isValidSiegeDeployCell(col, row, state.layout.gridSize)) return state;
  const available = state.deployPool[unitType] || 0;
  if (available <= 0) return state;

  const st = UNIT_STATS[unitType];
  const count = Math.min(st.groupSize, available);
  const ratio = count / st.groupSize;

  const newUnit: RegionCombatUnit = {
    id: `ls_siege_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    faction: 'lam_son',
    unitType,
    x: col + 0.5,
    z: row + 0.5,
    hp: Math.round(st.hp * ratio),
    maxHp: Math.round(st.hp * ratio),
    atk: Math.max(8, Math.round(st.atk * ratio)),
    range: st.range,
    speed: st.speed,
    attackCooldown: 0,
    soldiers: count,
    maxSoldiers: count,
  };

  return {
    ...state,
    status: 'fighting',
    deployPool: {
      ...state.deployPool,
      [unitType]: available - count,
    },
    units: [...state.units, newUnit],
  };
}

function buildingCenter(b: BaseBuilding): { x: number; z: number } {
  return { x: b.col + b.spanCols / 2, z: b.row + b.spanRows / 2 };
}

export function stepSiegeBattle(state: SiegeBattleState, dt: number): SiegeBattleState {
  if (state.status !== 'fighting') return state;

  const buildings = state.layout.buildings.map((b) => ({ ...b }));
  const units = state.units.map((u) => ({ ...u, attackCooldown: Math.max(0, u.attackCooldown - dt) }));

  let lootFood = state.lootFood;
  let lootWeapons = state.lootWeapons;
  let lootGold = state.lootGold;

  // 1. Chòi canh & bẫy chông phòng thủ
  for (const b of buildings) {
    if (b.status === 'destroyed') continue;
    const bc = buildingCenter(b);

    if (b.type === 'watchtower') {
      const target = units.find(
        (u) => u.faction === 'lam_son' && u.hp > 0 && Math.hypot(u.x - bc.x, u.z - bc.z) <= 6.2
      );
      if (target) {
        const dmg = (20 + b.level * 12) * dt;
        target.hp = Math.max(0, target.hp - dmg);
        target.soldiers = Math.ceil((target.hp / Math.max(1, target.maxHp)) * target.maxSoldiers);
      }
    } else if (b.type === 'spike_trap') {
      const victim = units.find(
        (u) => u.faction === 'lam_son' && u.hp > 0 && Math.hypot(u.x - bc.x, u.z - bc.z) <= 0.9
      );
      if (victim) {
        victim.hp = Math.max(0, victim.hp - 90 * b.level);
        victim.soldiers = Math.ceil((victim.hp / Math.max(1, victim.maxHp)) * victim.maxSoldiers);
        b.hp = 0;
        b.status = 'destroyed';
      }
    }
  }

  // 2. Cập nhật từng đơn vị
  for (const u of units) {
    if (u.hp <= 0) continue;

    if (u.faction === 'lam_son') {
      // Ưu tiên lính địch gần (< 3.5 ô) hoặc công trình (trừ tường nếu không chặn)
      let nearestUnit: RegionCombatUnit | null = null;
      let nearestUnitDist = 3.5;
      for (const other of units) {
        if (other.faction !== 'ming' || other.hp <= 0) continue;
        const d = Math.hypot(other.x - u.x, other.z - u.z);
        if (d < nearestUnitDist) {
          nearestUnitDist = d;
          nearestUnit = other;
        }
      }

      if (nearestUnit) {
        if (nearestUnitDist <= u.range) {
          if (u.attackCooldown <= 0) {
            nearestUnit.hp = Math.max(0, nearestUnit.hp - u.atk);
            nearestUnit.soldiers = Math.ceil(
              (nearestUnit.hp / Math.max(1, nearestUnit.maxHp)) * nearestUnit.maxSoldiers
            );
            u.attackCooldown = 0.85;
          }
        } else {
          const dx = nearestUnit.x - u.x;
          const dz = nearestUnit.z - u.z;
          u.x += (dx / nearestUnitDist) * u.speed * dt;
          u.z += (dz / nearestUnitDist) * u.speed * dt;
        }
        continue;
      }

      // Tìm công trình địch (ưu tiên non-wall trước; nếu là tường/cổng gần nhất thì phá)
      let targetB: BaseBuilding | null = null;
      let bestDist = Infinity;
      const nonWalls = buildings.filter(
        (b) => b.status !== 'destroyed' && b.type !== 'wall' && b.type !== 'spike_trap'
      );
      const pool = nonWalls.length > 0 ? nonWalls : buildings.filter((b) => b.status !== 'destroyed' && b.type !== 'spike_trap');

      for (const b of pool) {
        const bc = buildingCenter(b);
        const d = Math.hypot(bc.x - u.x, bc.z - u.z);
        if (d < bestDist) {
          bestDist = d;
          targetB = b;
        }
      }

      if (targetB) {
        const bc = buildingCenter(targetB);
        const reach = u.range + Math.max(targetB.spanCols, targetB.spanRows) * 0.45;
        if (bestDist <= reach) {
          if (u.attackCooldown <= 0) {
            targetB.hp = Math.max(0, targetB.hp - u.atk * 1.4);
            u.attackCooldown = 0.85;
            if (targetB.hp <= 0) {
              targetB.status = 'destroyed';
              if (targetB.type === 'food_storage') lootFood += 180 * targetB.level;
              else if (targetB.type === 'armory') lootWeapons += 25 * targetB.level;
              else if (targetB.type === 'main_hall') lootGold += 120 * targetB.level;
              else lootGold += 15 * targetB.level;
            }
          }
        } else {
          const dx = bc.x - u.x;
          const dz = bc.z - u.z;
          u.x += (dx / bestDist) * u.speed * dt;
          u.z += (dz / bestDist) * u.speed * dt;
        }
      }
    } else {
      // Quân Minh thủ thành tìm lính Lam Sơn gần nhất
      let nearestAttacker: RegionCombatUnit | null = null;
      let bestDist = Infinity;
      for (const other of units) {
        if (other.faction !== 'lam_son' || other.hp <= 0) continue;
        const d = Math.hypot(other.x - u.x, other.z - u.z);
        if (d < bestDist) {
          bestDist = d;
          nearestAttacker = other;
        }
      }

      if (nearestAttacker) {
        if (bestDist <= u.range) {
          if (u.attackCooldown <= 0) {
            nearestAttacker.hp = Math.max(0, nearestAttacker.hp - u.atk);
            nearestAttacker.soldiers = Math.ceil(
              (nearestAttacker.hp / Math.max(1, nearestAttacker.maxHp)) * nearestAttacker.maxSoldiers
            );
            u.attackCooldown = 0.9;
          }
        } else {
          const dx = nearestAttacker.x - u.x;
          const dz = nearestAttacker.z - u.z;
          u.x += (dx / bestDist) * u.speed * dt;
          u.z += (dz / bestDist) * u.speed * dt;
        }
      }
    }
  }

  const keyBuildings = buildings.filter((b) => b.type !== 'wall' && b.type !== 'spike_trap');
  const destroyedCount = keyBuildings.filter((b) => b.status === 'destroyed').length;
  const destructionPercent =
    keyBuildings.length > 0 ? Math.round((destroyedCount / keyBuildings.length) * 100) : 100;

  const mainHall = buildings.find((b) => b.type === 'main_hall');
  const mainHallDestroyed = !mainHall || mainHall.status === 'destroyed';

  const poolLeft =
    state.deployPool.swordsman +
    state.deployPool.spearman +
    state.deployPool.archer +
    state.deployPool.cavalry +
    state.deployPool.elephant;
  const aliveLamSon = units.some((u) => u.faction === 'lam_son' && u.hp > 0);

  let nextStatus: SiegeBattleState['status'] = 'fighting';
  if (destructionPercent >= 100 || (mainHallDestroyed && destructionPercent >= 50)) {
    nextStatus = 'victory';
  } else if (!aliveLamSon && poolLeft <= 0) {
    nextStatus = 'defeat';
  }

  return {
    ...state,
    layout: { ...state.layout, buildings },
    units: units.filter((u) => u.hp > 0),
    destructionPercent,
    mainHallDestroyed,
    lootFood,
    lootWeapons,
    lootGold,
    status: nextStatus,
    elapsedSeconds: state.elapsedSeconds + dt,
  };
}
