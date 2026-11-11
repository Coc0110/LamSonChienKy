import type { TacticalFormation, MarchOrder, MarchPathCell } from '../types/armyFormation';
import type { CityNode } from '../types';
import { buildLayersFromRoster, rosterTotal } from './armyCompositionUtils';
import { createMarchPathCell } from './marchPathUtils';
import { GRID_CELL_W_PCT, coordToCell } from '../data/terrainGrid';

/** Quân viễn chinh cách thành tiếp tế xa hơn mức này mới phụ thuộc đường lương. */
export const SUPPLY_DEPENDENCY_DISTANCE_PCT = 3.5;
/** Quân ta nằm trong khoảng này so với đường nối thành–đạo quân thì cắt được lương. */
export const SUPPLY_BLOCK_CORRIDOR_PCT = 1.5;
const ROUT_LOOT_RADIUS_PCT = 2;
const CONVOY_WEAPON_LOOT_RATIO = 0.6;
const STARVING_FOOD_PER_TROOP_PER_DAY = 0.18;

let spawnCounter = 0;

function buildStraightMarchOrder(formation: TacticalFormation, from: { x: number; y: number }, to: { x: number; y: number }): MarchOrder {
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(dist / GRID_CELL_W_PCT));
  const cells: MarchPathCell[] = [];
  let cumulative = 0;
  let prevKey = '';
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const { col, row } = coordToCell(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
    const key = `${col},${row}`;
    if (key === prevKey) continue;
    prevKey = key;
    const cell = createMarchPathCell(col, row, formation, cumulative);
    if (cells.length === 0) {
      cell.moveCostDays = 0;
      cell.cumulativeDays = 0;
      cell.foodCost = 0;
    }
    cumulative = cell.cumulativeDays;
    cells.push(cell);
  }
  return {
    cells,
    currentCellIndex: 0,
    cellProgress: 0,
    endpointAction: 'raid',
    totalDays: cumulative,
    elapsedDays: 0,
    totalFoodCost: Number(cells.reduce((s, c) => s + c.foodCost, 0).toFixed(2)),
    pursuingEnemy: null,
  };
}

export function spawnMingFieldFormation(
  sourceCity: CityNode,
  targetPos: { x: number; y: number },
  troopCount: number,
  role: 'ming_expedition' | 'ming_convoy'
): TacticalFormation {
  const n = Math.max(1, Math.round(troopCount));
  let roster;
  if (role === 'ming_expedition') {
    const swordsman = Math.round(n * 0.4);
    const spearman = Math.round(n * 0.25);
    const archer = Math.round(n * 0.2);
    roster = { swordsman, spearman, archer, cavalry: n - swordsman - spearman - archer, elephant: 0, scout: 0, supply_cart: 0 };
  } else {
    const supply_cart = Math.min(n, Math.max(4, Math.ceil(n / 40)));
    const spearman = Math.min(n - supply_cart, Math.round(n * 0.5));
    roster = { swordsman: n - supply_cart - spearman, spearman, archer: 0, cavalry: 0, elephant: 0, scout: 0, supply_cart };
  }
  const total = rosterTotal(roster);
  const base: TacticalFormation = {
    id: `ming_field_${role}_${sourceCity.id}_${++spawnCounter}`,
    name: role === 'ming_expedition' ? `Quân Minh Viễn Chinh (${sourceCity.name})` : `🌾 Đoàn Vận Lương (${sourceCity.name})`,
    faction: 'ming',
    cityId: sourceCity.id,
    rows: 32,
    cols: 32,
    grid: [],
    assignedGeneralIds: [],
    commanderGeneralId: null,
    status: 'marching',
    mapPosition: {
      x: sourceCity.x,
      y: sourceCity.y,
      col: coordToCell(sourceCity.x, sourceCity.y).col,
      row: coordToCell(sourceCity.x, sourceCity.y).row,
    },
    roster,
    layers: buildLayersFromRoster(roster),
    morale: 100,
    facingAngleDeg: (Math.atan2(targetPos.y - sourceCity.y, targetPos.x - sourceCity.x) * 180) / Math.PI,
    createdAt: Date.now(),
    totalTroops: total,
    totalWeapons: total - roster.supply_cart,
    totalHorses: roster.cavalry,
    totalElephants: 0,
    totalFoodCarried: role === 'ming_convoy' ? roster.supply_cart * 150 : Math.round(total * 6),
    armyRole: role,
    supplySourceCityId: sourceCity.id,
    isSupplyCut: false,
  };
  base.marchOrder = buildStraightMarchOrder(base, sourceCity, targetPos);
  return base;
}

/** Khoảng cách từ điểm p tới đoạn a–b; trả null nếu hình chiếu nằm ngoài đoạn. */
function distanceToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): number | null {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  if (len2 === 0) return null;
  const t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
  if (t < 0 || t > 1) return null;
  return Math.hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t));
}

export function updateMingFormationsAI(
  formations: TacticalFormation[],
  cities: CityNode[],
  deltaDays: number
): { formations: TacticalFormation[]; interceptedFood: number; interceptedWeapons: number; notices: string[] } {
  const notices: string[] = [];
  let interceptedFood = 0;
  let interceptedWeapons = 0;

  const lamSon = formations.filter(f => (f.faction ?? 'lam_son') === 'lam_son' && f.mapPosition && f.totalTroops > 0);
  const removedIds = new Set<string>();
  const lostConvoyParents = new Set<string>();

  // 1. Đoàn vận lương bị tiêu diệt (hoặc vỡ trận ngay cạnh quân ta) -> quân ta thu giữ.
  for (const f of formations) {
    if (f.armyRole !== 'ming_convoy') continue;
    const destroyed = f.totalTroops <= 0;
    const looted =
      destroyed ||
      (!!f.isRouting &&
        !!f.mapPosition &&
        lamSon.some(l => Math.hypot(l.mapPosition!.x - f.mapPosition!.x, l.mapPosition!.y - f.mapPosition!.y) <= ROUT_LOOT_RADIUS_PCT));
    if (!looted) continue;
    const food = Math.max(0, Math.round(f.totalFoodCarried));
    const weapons = Math.round(Math.max(0, f.totalWeapons) * CONVOY_WEAPON_LOOT_RATIO);
    interceptedFood += food;
    interceptedWeapons += weapons;
    removedIds.add(f.id);
    if (f.parentFormationId) lostConvoyParents.add(f.parentFormationId);
    notices.push(`🌾 Nghĩa quân chặn đứt ${f.name}, thu ${food} lương và ${weapons} vũ khí.`);
  }

  // 2. Đường lương của quân viễn chinh.
  const out: TacticalFormation[] = [];
  for (const f of formations) {
    if (removedIds.has(f.id)) continue;
    if (f.armyRole !== 'ming_expedition' || !f.mapPosition) {
      out.push(f);
      continue;
    }
    const source = cities.find(c => c.id === f.supplySourceCityId);
    if (!source) {
      out.push(f);
      continue;
    }
    const pos = f.mapPosition;
    const farFromSource = Math.hypot(source.x - pos.x, source.y - pos.y) > SUPPLY_DEPENDENCY_DISTANCE_PCT;
    const blocked =
      farFromSource &&
      lamSon.some(l => {
        const d = distanceToSegment(l.mapPosition!, pos, source);
        return d !== null && d <= SUPPLY_BLOCK_CORRIDOR_PCT;
      });
    const convoyLost = farFromSource && (!!f.convoyLost || lostConvoyParents.has(f.id));
    const cut = blocked || convoyLost;

    const next: TacticalFormation = { ...f, isSupplyCut: cut, convoyLost };
    if (cut) {
      next.totalFoodCarried = Math.max(0, f.totalFoodCarried - f.totalTroops * STARVING_FOOD_PER_TROOP_PER_DAY * deltaDays);
      if (!f.isSupplyCut) notices.push(`🌾 ${f.name} bị cắt đứt đường lương từ ${source.name}!`);
    }
    out.push(next);
  }

  return { formations: out, interceptedFood, interceptedWeapons, notices };
}
