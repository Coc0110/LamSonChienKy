import type {
  ArmyRosterCounts,
  ArmyThreeLayersState,
  StratagemType,
  TacticalFormation,
  WorldCombatState,
} from '../types/armyFormation';
import { TACTICAL_UNIT_CONFIGS } from '../types/armyFormation';
import type { General } from '../types';
import type { TerrainType } from '../types/terrain';
import { buildLayersFromRoster, rosterTotal, syncRosterAfterLayerDamage } from './armyCompositionUtils';

/** Số quân tối đa có thể trực tiếp giao chiến trong 1 canh giờ theo địa hình. */
export const TERRAIN_COMBAT_WIDTH: Record<TerrainType, number> = {
  plains: 3000,
  water: 1200,
  swamp: 900,
  forest: 800,
  mountain: 500,
  cliff: 300,
};

export const ENGAGEMENT_RADIUS_PCT = 1.25;
const DAMAGE_SCALE = 0.4;
const AMBUSH_DAMAGE_MULT = 2.2;
const ROUT_PURSUIT_MULT = 1.4;
const PURSUIT_CAPTURE_FRACTION = 0.15;

type Direction = 'front' | 'flank' | 'rear';
type LayerKey = 'front' | 'back' | 'flank';

export interface WorldCombatTickResult {
  formations: TacticalFormation[];
  logs: string[];
  capturedResources: { food: number; gold: number; swords: number; bows: number; spears: number };
}

export function classifyAttackDirection(
  attackerPos: { x: number; y: number },
  defenderPos: { x: number; y: number },
  defenderFacingDeg: number
): Direction {
  const angle = (Math.atan2(attackerPos.y - defenderPos.y, attackerPos.x - defenderPos.x) * 180) / Math.PI;
  const diff = Math.abs((((angle - defenderFacingDeg) % 360) + 540) % 360 - 180);
  if (diff <= 60) return 'front';
  if (diff <= 120) return 'flank';
  return 'rear';
}

const LAYER_FIELDS: Record<LayerKey, { hp: 'frontlineHp' | 'backlineHp' | 'flankHp'; max: 'frontlineMaxHp' | 'backlineMaxHp' | 'flankMaxHp' }> = {
  front: { hp: 'frontlineHp', max: 'frontlineMaxHp' },
  back: { hp: 'backlineHp', max: 'backlineMaxHp' },
  flank: { hp: 'flankHp', max: 'flankMaxHp' },
};

/** Trừ máu theo chuỗi tuyến; phần dư tràn sang tuyến kế tiếp. Trả về lượng máu thực sự mất. */
function absorbChain(layers: ArmyThreeLayersState, chain: LayerKey[], amount: number): number {
  let remaining = amount;
  for (const key of chain) {
    if (remaining <= 0) break;
    const f = LAYER_FIELDS[key];
    const available = layers[f.max] > 0 ? Math.max(0, layers[f.hp]) : 0;
    const taken = Math.min(available, remaining);
    layers[f.hp] = available - taken;
    remaining -= taken;
  }
  return amount - remaining;
}

function applyDirectionalDamage(layers: ArmyThreeLayersState, damage: number, direction: Direction): number {
  const shares: Record<Direction, [number, number]> = {
    front: [0.85, 0.15],
    flank: [0.45, 0.55],
    rear: [0.2, 0.8],
  };
  const [frontShare, backShare] = shares[direction];
  let lost = absorbChain(layers, ['front', 'back', 'flank'], damage * frontShare);
  lost += absorbChain(layers, ['back', 'flank', 'front'], damage * backShare);
  return lost;
}

function totalLayerHp(l: ArmyThreeLayersState): number {
  return l.frontlineHp + l.backlineHp + l.flankHp;
}

function totalLayerMax(l: ArmyThreeLayersState): number {
  return l.frontlineMaxHp + l.backlineMaxHp + l.flankMaxHp;
}

function attackPower(f: TacticalFormation, terrain: TerrainType): number {
  const r = f.roster;
  if (!r) return 0;
  const cavElephantMult = terrain === 'forest' ? 0.6 : 1;
  let sum = 0;
  (Object.keys(r) as (keyof ArmyRosterCounts)[]).forEach(k => {
    const mult = k === 'cavalry' || k === 'elephant' ? cavElephantMult : 1;
    sum += r[k] * TACTICAL_UNIT_CONFIGS[k].baseStats.attack * mult;
  });
  return sum;
}

function cloneFormation(f: TacticalFormation): TacticalFormation {
  return {
    ...f,
    roster: f.roster ? { ...f.roster } : f.roster,
    layers: f.layers ? { ...f.layers } : f.layers,
    mapPosition: f.mapPosition ? { ...f.mapPosition } : f.mapPosition,
    combatState: f.combatState ? { ...f.combatState } : f.combatState,
  };
}

function factionOf(f: TacticalFormation): 'lam_son' | 'ming' {
  return f.faction ?? 'lam_son';
}

function isVisible(f: TacticalFormation): boolean {
  return !f.isStealthed || f.status === 'ambushing' || f.status === 'engaging';
}

function clampMorale(m: number): number {
  return Math.max(0, Math.min(100, m));
}

function finalizeFormation(f: TacticalFormation, startTroops: number): void {
  if (!f.roster || !f.layers) return;
  const newRoster = syncRosterAfterLayerDamage(f.roster, f.layers);
  const rebuilt = buildLayersFromRoster(newRoster);
  rebuilt.frontlineHp = Math.min(f.layers.frontlineHp, rebuilt.frontlineMaxHp);
  rebuilt.backlineHp = Math.min(f.layers.backlineHp, rebuilt.backlineMaxHp);
  rebuilt.flankHp = Math.min(f.layers.flankHp, rebuilt.flankMaxHp);
  const newTotal = rosterTotal(newRoster);
  const ratio = startTroops > 0 ? newTotal / startTroops : 0;
  f.roster = newRoster;
  f.layers = rebuilt;
  f.totalTroops = newTotal;
  f.totalWeapons = Math.round(f.totalWeapons * ratio);
  f.totalHorses = newRoster.cavalry + newRoster.scout;
  f.totalElephants = newRoster.elephant;
  if (newTotal <= 0) {
    f.morale = 0;
    f.isRouting = true;
    f.status = 'retreating';
  }
}

/**
 * Giải quyết 1 canh giờ giao chiến liên tục trên bản đồ. Không biến đổi đầu vào.
 * Sát thương mỗi bên tính từ trạng thái đầu canh (đồng thời) rồi cộng dồn tuần tự lên mục tiêu dùng chung.
 */
export function resolveWorldMapCombatTick(
  formations: TacticalFormation[],
  _generals: General[],
  getTerrainAtPos: (x: number, y: number) => TerrainType
): WorldCombatTickResult {
  const work = new Map<string, TacticalFormation>();
  const startTroops = new Map<string, number>();
  const snapshot = new Map<string, TacticalFormation>();
  formations.forEach(f => {
    const c = cloneFormation(f);
    work.set(f.id, c);
    snapshot.set(f.id, cloneFormation(f));
    startTroops.set(f.id, f.roster ? rosterTotal(f.roster) : f.totalTroops);
  });

  const logs: string[] = [];
  const captured = { food: 0, gold: 0, swords: 0, bows: 0, spears: 0 };

  const alive = (f: TacticalFormation) => !!f.mapPosition && !!f.roster && !!f.layers && rosterTotal(f.roster) > 0;
  const dist = (a: TacticalFormation, b: TacticalFormation) =>
    Math.hypot(a.mapPosition!.x - b.mapPosition!.x, a.mapPosition!.y - b.mapPosition!.y);

  // 1. Chọn mục tiêu gần nhất cho mỗi bên tấn công (đầu canh).
  const targetOf = new Map<string, string>();
  const attackers = [...snapshot.values()].filter(f => alive(f) && !f.isRouting);
  for (const a of attackers) {
    let best: TacticalFormation | null = null;
    let bestD = ENGAGEMENT_RADIUS_PCT;
    for (const d of snapshot.values()) {
      if (d.id === a.id || !alive(d) || factionOf(d) === factionOf(a)) continue;
      if (!isVisible(d) && !(d.status === 'ambushing')) continue;
      const dd = dist(a, d);
      if (dd <= bestD) {
        best = d;
        bestD = dd;
      }
    }
    if (best && (isVisible(a) || a.status === 'ambushing')) targetOf.set(a.id, best.id);
  }

  // 2. Hướng mặt: quay về kẻ địch đầu tiên chạm trán (chỉ khi chưa trong giao chiến).
  for (const [aId, dId] of targetOf) {
    const a = work.get(aId)!;
    const d = snapshot.get(dId)!;
    if (!a.combatState && !a.isRouting) {
      a.facingAngleDeg = (Math.atan2(d.mapPosition!.y - a.mapPosition!.y, d.mapPosition!.x - a.mapPosition!.x) * 180) / Math.PI;
    }
  }

  const attackersPerDefender = new Map<string, string[]>();
  for (const [aId, dId] of targetOf) {
    attackersPerDefender.set(dId, [...(attackersPerDefender.get(dId) ?? []), aId]);
  }

  const damageDealt = new Map<string, number>();
  const damageTaken = new Map<string, number>();
  const engagedTarget = new Map<string, WorldCombatState>();
  const panic = new Map<string, number>();
  for (const f of work.values()) panic.set(f.id, Math.max(0, (f.combatState?.panickedCanhRemaining ?? 0) - 1));

  // 3. Áp sát thương tuần tự lên trạng thái làm việc dùng chung.
  for (const [aId, dId] of targetOf) {
    const snapA = snapshot.get(aId)!;
    const defender = work.get(dId)!;
    const attacker = work.get(aId)!;
    if (!defender.layers || !defender.roster) continue;

    const pos = defender.mapPosition!;
    const terrain = getTerrainAtPos(pos.x, pos.y);
    const combatWidth = TERRAIN_COMBAT_WIDTH[terrain];
    const snapTroops = Math.max(1, rosterTotal(snapA.roster!));
    const effectiveRatio = Math.min(1, combatWidth / snapTroops);
    const direction = classifyAttackDirection(snapA.mapPosition!, pos, defender.facingAngleDeg ?? 0);
    const defenderWasRouting = !!defender.isRouting;

    let damage = attackPower(snapA, terrain) * effectiveRatio * DAMAGE_SCALE * (0.5 + clampMorale(snapA.morale ?? 100) / 200);
    if (snapA.combatState && snapA.combatState.panickedCanhRemaining > 0) damage *= 0.5;

    if (snapA.isStealthed && !defender.ambushShockApplied && !defenderWasRouting) {
      damage *= AMBUSH_DAMAGE_MULT;
      defender.morale = clampMorale((defender.morale ?? 100) - 30);
      defender.ambushShockApplied = true;
      panic.set(dId, 2);
      logs.push(`🌲 ${attacker.name} phục kích bất ngờ ${defender.name}! Sĩ khí địch -30.`);
    }
    if (attacker.isStealthed) attacker.isStealthed = false;

    if (defenderWasRouting) damage *= ROUT_PURSUIT_MULT;

    const before = totalLayerHp(defender.layers);
    applyDirectionalDamage(defender.layers, damage, direction);
    const lost = before - totalLayerHp(defender.layers);

    let moraleHit = 0;
    if (direction === 'flank') moraleHit += 10;
    if (direction === 'rear') moraleHit += 20;
    const maxHp = Math.max(1, totalLayerMax(defender.layers));
    moraleHit += (lost / maxHp) * 40;
    defender.morale = clampMorale((defender.morale ?? 100) - moraleHit);

    if (defenderWasRouting && factionOf(snapA) === 'lam_son') {
      const food = Math.round(defender.totalFoodCarried * PURSUIT_CAPTURE_FRACTION);
      const weapons = Math.round(defender.totalWeapons * PURSUIT_CAPTURE_FRACTION);
      defender.totalFoodCarried -= food;
      defender.totalWeapons = Math.max(0, defender.totalWeapons - weapons);
      captured.food += food;
      captured.swords += Math.round(weapons * 0.6);
      captured.bows += Math.round(weapons * 0.2);
      captured.spears += weapons - Math.round(weapons * 0.6) - Math.round(weapons * 0.2);
      logs.push(`🏳️ ${attacker.name} truy kích ${defender.name} đang vỡ trận, thu lương thảo và vũ khí.`);
    }

    damageDealt.set(aId, (damageDealt.get(aId) ?? 0) + lost);
    damageTaken.set(dId, (damageTaken.get(dId) ?? 0) + lost);
    engagedTarget.set(dId, {
      targetFormationId: aId,
      attackDirection: direction,
      terrain,
      combatWidth,
      canhElapsed: (defender.combatState?.canhElapsed ?? 0) + 1,
      panickedCanhRemaining: panic.get(dId) ?? 0,
      lastDamageDealt: 0,
      lastDamageTaken: lost,
      lastLogMessage: `${attacker.name} đánh ${direction === 'front' ? 'chính diện' : direction === 'flank' ? 'bọc sườn' : 'đánh hậu'} (${terrain}, mặt trận ${combatWidth}).`,
    });
  }

  // 4. Giáp công, đứt lương, vỡ trận, trạng thái giao chiến.
  for (const f of work.values()) {
    const snap = snapshot.get(f.id)!;
    const attackedBy = attackersPerDefender.get(f.id) ?? [];
    const myTargetId = targetOf.get(f.id);

    if (attackedBy.length >= 2 && !f.isRouting) {
      f.morale = clampMorale((f.morale ?? 100) - (snap.combatState ? 5 : 15));
      logs.push(`⚠️ ${f.name} lưỡng đầu thụ địch (bị ${attackedBy.length} đạo quân giáp công).`);
    }
    if (f.isSupplyCut && alive(f)) {
      f.morale = clampMorale((f.morale ?? 100) - 12);
    }

    const inCombat = attackedBy.length > 0 || myTargetId !== undefined;
    if (inCombat) {
      const incoming = engagedTarget.get(f.id);
      const targetId = incoming?.targetFormationId ?? myTargetId!;
      const targetSnap = snapshot.get(targetId);
      const pos = f.mapPosition!;
      const terrain = incoming?.terrain ?? getTerrainAtPos(pos.x, pos.y);
      const prev = f.combatState;
      f.combatState = {
        targetFormationId: targetId,
        attackDirection: incoming?.attackDirection ?? 'front',
        terrain,
        combatWidth: TERRAIN_COMBAT_WIDTH[terrain],
        canhElapsed: (prev?.canhElapsed ?? 0) + (incoming ? 0 : 1),
        panickedCanhRemaining: panic.get(f.id) ?? 0,
        lastDamageDealt: damageDealt.get(f.id) ?? 0,
        lastDamageTaken: damageTaken.get(f.id) ?? 0,
        lastLogMessage: incoming?.lastLogMessage ?? `${f.name} giao chiến với ${targetSnap?.name ?? targetId}.`,
      };
      if (!f.isRouting && f.status !== 'retreating') f.status = 'engaging';
    } else if (f.combatState) {
      f.combatState = null;
      if (f.status === 'engaging') f.status = f.marchOrder ? 'marching' : 'stationed';
    }
  }

  // 5. Chốt quân số, kiểm tra vỡ trận (sĩ khí < 20).
  for (const f of work.values()) {
    finalizeFormation(f, startTroops.get(f.id) ?? f.totalTroops);
    if (alive(f) && (f.morale ?? 100) < 20 && !f.isRouting) {
      f.isRouting = true;
      f.status = 'retreating';
      logs.push(`🏳️ ${f.name} vỡ trận, tháo chạy tán loạn!`);
    }
  }

  return { formations: formations.map(f => work.get(f.id)!), logs, capturedResources: captured };
}

function commanderStat(
  f: TacticalFormation,
  generals: General[],
  stat: 'intellect' | 'martial'
): number {
  const g = generals.find(x => x.id === f.commanderGeneralId);
  return g ? g.stats[stat] : 60;
}

/** Mưu kế chủ động trên bản đồ. Không biến đổi đầu vào. */
export function applyWorldStratagem(
  actor: TacticalFormation,
  target: TacticalFormation,
  stratagem: StratagemType,
  generals: General[],
  terrain: TerrainType
): { actor: TacticalFormation; target: TacticalFormation; success: boolean; message: string } {
  const a = cloneFormation(actor);
  const t = cloneFormation(target);
  const fail = (message: string) => ({ actor: a, target: t, success: false, message });
  const hit = (hpFraction: number, moraleDrop: number) => {
    if (t.layers) {
      const lost = totalLayerMax(t.layers) * hpFraction;
      applyDirectionalDamage(t.layers, lost, 'front');
      finalizeFormation(t, t.roster ? rosterTotal(t.roster) : t.totalTroops);
    }
    t.morale = clampMorale((t.morale ?? 100) - moraleDrop);
    if ((t.morale ?? 100) < 20 && !t.isRouting && t.totalTroops > 0) {
      t.isRouting = true;
      t.status = 'retreating';
    }
  };

  switch (stratagem) {
    case 'fire_attack': {
      const natural = terrain === 'forest' || terrain === 'swamp';
      if (!natural && a.preparedTrap !== 'fire') return fail('Hỏa công cần địa hình rừng hoặc bẫy lửa đã chuẩn bị.');
      const bonus = a.preparedTrap === 'fire' ? 1.5 : 1;
      hit((terrain === 'forest' ? 0.18 : 0.1) * bonus, 20);
      a.preparedTrap = a.preparedTrap === 'fire' ? null : a.preparedTrap;
      return { actor: a, target: t, success: true, message: `🔥 Hỏa công thiêu đốt ${t.name}! Sĩ khí -20.` };
    }
    case 'rockfall_trap': {
      const natural = terrain === 'cliff' || terrain === 'mountain';
      if (!natural && a.preparedTrap !== 'rockfall') return fail('Đá lăn cần vách núi hoặc bẫy đá đã chuẩn bị.');
      const bonus = a.preparedTrap === 'rockfall' ? 1.5 : 1;
      hit(0.15 * bonus, 20);
      a.preparedTrap = a.preparedTrap === 'rockfall' ? null : a.preparedTrap;
      return { actor: a, target: t, success: true, message: `🪨 Đá lăn nghiền nát hàng ngũ ${t.name}! Sĩ khí -20.` };
    }
    case 'ambush_strike': {
      if (!a.isStealthed) return fail('Đạo quân chưa ẩn thân nên không thể phục kích.');
      if (t.isRouting || t.ambushShockApplied) return fail('Mục tiêu không thể bị phục kích bất ngờ lần nữa.');
      a.isStealthed = false;
      a.status = 'engaging';
      t.ambushShockApplied = true;
      t.combatState = {
        targetFormationId: a.id,
        attackDirection: 'flank',
        terrain,
        combatWidth: TERRAIN_COMBAT_WIDTH[terrain],
        canhElapsed: 0,
        panickedCanhRemaining: 2,
        lastDamageDealt: 0,
        lastDamageTaken: 0,
        lastLogMessage: `${a.name} phục kích bất ngờ!`,
      };
      hit(0.08, 30);
      return { actor: a, target: t, success: true, message: `📣 ${a.name} phát pháo hiệu xuất kích! ${t.name} hoảng loạn.` };
    }
    case 'taunt_lure': {
      if (commanderStat(a, generals, 'intellect') < 45) return fail('Mưu lược của chủ tướng chưa đủ để khiêu khích.');
      if (a.mapPosition && t.mapPosition) {
        t.facingAngleDeg = (Math.atan2(a.mapPosition.y - t.mapPosition.y, a.mapPosition.x - t.mapPosition.x) * 180) / Math.PI;
      }
      hit(0, 5);
      return { actor: a, target: t, success: true, message: `🏳️ ${t.name} nổi giận truy đuổi ${a.name}.` };
    }
    case 'decoy_illusion': {
      if (a.totalTroops > 150) return fail('Nghi binh chỉ dùng cho toán nhỏ (tối đa 150 quân).');
      hit(0, 10);
      return { actor: a, target: t, success: true, message: `🔥 Nghi binh hư trương thanh thế khiến ${t.name} dao động.` };
    }
    case 'duel_snipe': {
      if (commanderStat(a, generals, 'martial') < 70) return fail('Võ nghệ chưa đủ để đột kích trảm tướng.');
      if (!a.roster || a.roster.cavalry + a.roster.scout <= 0) return fail('Cần kỵ binh để đột kích trảm tướng.');
      hit(0, 45);
      return { actor: a, target: t, success: true, message: `⚔️ ${a.name} đột kích trảm tướng! Sĩ khí ${t.name} -45.` };
    }
    default:
      return fail('Mưu kế không hợp lệ.');
  }
}
