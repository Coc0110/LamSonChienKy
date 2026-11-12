import type {
  ArmyRosterCounts,
  ArmyThreeLayersState,
  TacticalFormation,
} from '../types/armyFormation';
import { TACTICAL_UNIT_CONFIGS } from '../types/armyFormation';
import type { General, TroopType } from '../types';
import type { TerrainType } from '../types/terrain';
import { TERRAIN_DEFINITIONS } from '../data/terrainData';

export const EMPTY_ROSTER: ArmyRosterCounts = {
  swordsman: 0,
  spearman: 0,
  archer: 0,
  cavalry: 0,
  elephant: 0,
  scout: 0,
  supply_cart: 0,
};

export const TRAINABLE_BRANCH_KEYS: (keyof ArmyRosterCounts)[] = [
  'swordsman',
  'spearman',
  'archer',
  'cavalry',
  'elephant',
  'scout',
];

const TROOP_TYPE_TO_BRANCHES: Record<TroopType, (keyof ArmyRosterCounts)[]> = {
  infantry: ['swordsman', 'spearman'],
  archer: ['archer'],
  cavalry: ['cavalry', 'scout'],
  elephant: ['elephant'],
  navy: [],
};

/** Trả về danh sách binh chủng mà vị tướng thông thạo để huấn luyện (không bao gồm xe lương). */
export function getTrainableBranchesForGeneral(
  general: Pick<General, 'troops'> | undefined
): (keyof ArmyRosterCounts)[] {
  if (!general?.troops || general.troops.length === 0) return [];
  const allowed = new Set<keyof ArmyRosterCounts>();
  for (const t of general.troops) {
    for (const branch of TROOP_TYPE_TO_BRANCHES[t] ?? []) {
      allowed.add(branch);
    }
  }
  return TRAINABLE_BRANCH_KEYS.filter(k => allowed.has(k));
}

/** Kiểm tra vị tướng có thông thạo và huấn luyện được binh chủng này không (xe lương không cần luyện). */
export function canGeneralTrainBranch(
  general: Pick<General, 'troops'> | undefined,
  branch: keyof ArmyRosterCounts
): boolean {
  if (branch === 'supply_cart') return false;
  return getTrainableBranchesForGeneral(general).includes(branch);
}

/**
 * Lấy quân số dự bị theo từng binh chủng của căn cứ.
 * Nếu bản lưu cũ chưa có trainedRoster thì tự chia đều theo combatTroops.
 */
export function getCityTrainedRoster(pop: { combatTroops: number; trainedRoster?: Partial<ArmyRosterCounts> }): ArmyRosterCounts {
  if (pop.trainedRoster) {
    const out: ArmyRosterCounts = { ...EMPTY_ROSTER };
    (Object.keys(EMPTY_ROSTER) as (keyof ArmyRosterCounts)[]).forEach(k => {
      out[k] = Math.max(0, Math.floor(pop.trainedRoster![k] ?? 0));
    });
    return out;
  }
  const total = Math.max(0, Math.floor(pop.combatTroops));
  const swordsman = Math.round(total * 0.4);
  const spearman = Math.round(total * 0.35);
  const archer = Math.max(0, total - swordsman - spearman);
  return { ...EMPTY_ROSTER, swordsman, spearman, archer };
}

/** Cộng hoặc trừ số lượng binh chủng dự bị của căn cứ (đảm bảo >= 0). */
export function mergeTrainedRoster(
  base: ArmyRosterCounts,
  delta: Partial<ArmyRosterCounts>,
  sign: 1 | -1
): ArmyRosterCounts {
  const out: ArmyRosterCounts = { ...base };
  (Object.keys(EMPTY_ROSTER) as (keyof ArmyRosterCounts)[]).forEach(k => {
    out[k] = Math.max(0, Math.floor(out[k] + sign * Math.floor(delta[k] ?? 0)));
  });
  return out;
}

/** Rút ngẫu nhiên/lần lượt N binh sĩ khỏi trainedRoster khi phải cắt cử đi làm việc thế chỗ. */
export function deductFromTrainedRoster(base: ArmyRosterCounts, count: number): ArmyRosterCounts {
  let rem = Math.max(0, Math.floor(count));
  const out: ArmyRosterCounts = { ...base };
  const order: (keyof ArmyRosterCounts)[] = ['swordsman', 'spearman', 'archer', 'cavalry', 'scout', 'elephant'];
  for (const k of order) {
    if (rem <= 0) break;
    const take = Math.min(out[k], rem);
    out[k] -= take;
    rem -= take;
  }
  return out;
}

/** Cộng quân số vừa thao luyện/chi viện vào trainedRoster và đồng bộ combatTroops. */
export function addTrainedTroopsToRoster(
  pop: { combatTroops: number; trainedRoster?: Partial<ArmyRosterCounts> },
  count: number,
  targetRoster?: Partial<ArmyRosterCounts>
): { combatTroops: number; trainedRoster: ArmyRosterCounts } {
  const base = getCityTrainedRoster(pop);
  const delta: Partial<ArmyRosterCounts> =
    targetRoster ?? {
      swordsman: Math.round(count * 0.4),
      spearman: Math.round(count * 0.35),
      archer: Math.max(0, count - Math.round(count * 0.4) - Math.round(count * 0.35)),
    };
  const trainedRoster = mergeTrainedRoster(base, delta, 1);
  return {
    combatTroops: pop.combatTroops + count,
    trainedRoster,
  };
}

const hp = (type: keyof ArmyRosterCounts): number => TACTICAL_UNIT_CONFIGS[type].baseStats.hp;

/** Sức chứa quân tối đa của đạo quân theo Chủ tướng + Phó tướng (tối thiểu 300). */
export function calculateCommandCapacity(commander: General | undefined, deputies: General[]): number {
  if (!commander) return 300;
  const base = commander.stats.command * 12 + commander.stars * 120;
  const extra = deputies.reduce((s, d) => s + d.stats.command * 4, 0);
  return Math.max(300, Math.round(base + extra));
}

export function buildLayersFromRoster(roster: ArmyRosterCounts): ArmyThreeLayersState {
  const frontlineMaxHp = roster.swordsman * hp('swordsman') + roster.spearman * hp('spearman') + roster.elephant * hp('elephant');
  const backlineMaxHp = roster.archer * hp('archer') + roster.supply_cart * hp('supply_cart');
  const flankMaxHp = roster.cavalry * hp('cavalry') + roster.scout * hp('scout');
  return {
    frontlineHp: frontlineMaxHp,
    frontlineMaxHp,
    backlineHp: backlineMaxHp,
    backlineMaxHp,
    flankHp: flankMaxHp,
    flankMaxHp,
  };
}

function scaleCount(count: number, layerHp: number, layerMaxHp: number): number {
  if (layerMaxHp <= 0 || layerHp <= 0 || count <= 0) return 0;
  return Math.min(count, Math.ceil(count * (layerHp / layerMaxHp)));
}

/** Thu hẹp số lượng từng binh chủng tỉ lệ theo máu còn lại của tuyến chứa nó. */
export function syncRosterAfterLayerDamage(roster: ArmyRosterCounts, layers: ArmyThreeLayersState): ArmyRosterCounts {
  const f = (c: number) => scaleCount(c, layers.frontlineHp, layers.frontlineMaxHp);
  const b = (c: number) => scaleCount(c, layers.backlineHp, layers.backlineMaxHp);
  const m = (c: number) => scaleCount(c, layers.flankHp, layers.flankMaxHp);
  return {
    swordsman: f(roster.swordsman),
    spearman: f(roster.spearman),
    elephant: f(roster.elephant),
    archer: b(roster.archer),
    supply_cart: b(roster.supply_cart),
    cavalry: m(roster.cavalry),
    scout: m(roster.scout),
  };
}

export function rosterTotal(roster: ArmyRosterCounts): number {
  return roster.swordsman + roster.spearman + roster.archer + roster.cavalry + roster.elephant + roster.scout + roster.supply_cart;
}

const UNIT_SPEED: Record<keyof ArmyRosterCounts, number> = {
  swordsman: 1.0,
  spearman: 1.0,
  archer: 1.0,
  cavalry: 2.0,
  scout: 2.2,
  elephant: 0.7,
  supply_cart: 0.8,
};

export function computeFormationSpeedAndVision(
  roster: ArmyRosterCounts,
  terrain: TerrainType
): { speedMultiplier: number; visionRadiusPct: number; canStealthInCover: boolean; maxSupplyDays: number } {
  let minSpeed = Infinity;
  (Object.keys(UNIT_SPEED) as (keyof ArmyRosterCounts)[]).forEach(k => {
    if (roster[k] > 0) minSpeed = Math.min(minSpeed, UNIT_SPEED[k]);
  });
  if (!Number.isFinite(minSpeed)) minSpeed = 1.0;
  const cost = Math.max(0.1, TERRAIN_DEFINITIONS[terrain].moveSpeedCost);
  const cover = terrain === 'forest' || terrain === 'mountain' || terrain === 'cliff';
  return {
    speedMultiplier: minSpeed / cost,
    visionRadiusPct: 3 + (roster.scout > 0 ? 3 : 0) + (roster.cavalry > 0 ? 1 : 0),
    canStealthInCover: cover && roster.elephant === 0 && roster.supply_cart <= 1,
    maxSupplyDays: 5 + roster.supply_cart * 12,
  };
}

/** Dựng roster từ lưới cũ (nếu có) hoặc từ tổng quân số để tương thích save cũ. */
function deriveRosterFromLegacy(formation: TacticalFormation): ArmyRosterCounts {
  const roster: ArmyRosterCounts = { ...EMPTY_ROSTER };
  let gridCounted = 0;
  for (const row of formation.grid ?? []) {
    for (const cell of row ?? []) {
      if (!cell || !cell.isRoot || cell.type === 'general') continue;
      const n = cell.multiplier ?? 1;
      roster[cell.type] += n;
      gridCounted += n;
    }
  }
  if (gridCounted > 0) return roster;
  const elephants = Math.max(0, formation.totalElephants ?? 0);
  const horses = Math.max(0, formation.totalHorses ?? 0);
  const total = Math.max(0, formation.totalTroops ?? 0);
  roster.elephant = Math.min(elephants, total);
  roster.cavalry = Math.min(horses, total - roster.elephant);
  roster.swordsman = Math.max(0, total - roster.elephant - roster.cavalry);
  return roster;
}

/** Bổ sung roster/layers/morale/faction cho formation tạo trước bản cập nhật này. */
export function ensureFormationRosterAndLayers(formation: TacticalFormation): TacticalFormation {
  if (formation.roster && formation.layers && formation.morale !== undefined && formation.faction) {
    return formation;
  }
  const roster = formation.roster ?? deriveRosterFromLegacy(formation);
  return {
    ...formation,
    roster,
    layers: formation.layers ?? buildLayersFromRoster(roster),
    morale: formation.morale ?? 100,
    faction: formation.faction ?? 'lam_son',
    facingAngleDeg: formation.facingAngleDeg ?? 0,
  };
}
