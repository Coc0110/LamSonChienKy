import './setupTest.cjs';
import {
  TERRAIN_COMBAT_WIDTH,
  classifyAttackDirection,
  resolveWorldMapCombatTick,
  applyWorldStratagem,
} from '../worldMapCombatEngine';
import { buildLayersFromRoster } from '../armyCompositionUtils';
import type { TacticalFormation, ArmyRosterCounts } from '../../types/armyFormation';

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function makeFormation(
  id: string,
  faction: 'lam_son' | 'ming',
  x: number,
  y: number,
  roster: ArmyRosterCounts,
  overrides: Partial<TacticalFormation> = {}
): TacticalFormation {
  const totalTroops = Object.values(roster).reduce((a, b) => a + b, 0);
  return {
    id,
    name: id,
    faction,
    cityId: faction === 'lam_son' ? 'lam_son' : 'tay_do',
    rows: 32,
    cols: 32,
    grid: [],
    assignedGeneralIds: [],
    commanderGeneralId: null,
    status: 'engaging',
    mapPosition: { x, y, col: Math.floor(x * 8), row: Math.floor(y * 10) },
    roster: { ...roster },
    layers: buildLayersFromRoster(roster),
    morale: 100,
    facingAngleDeg: faction === 'lam_son' ? 0 : 180,
    createdAt: 0,
    totalTroops,
    totalWeapons: totalTroops,
    totalHorses: roster.cavalry + roster.scout,
    totalElephants: roster.elephant,
    totalFoodCarried: 500,
    ...overrides,
  };
}

// 1. Chokepoint Combat Width limits numerical superiority on cliff vs plains
assert(TERRAIN_COMBAT_WIDTH.cliff === 300, 'Cliff combat width must be 300');
assert(TERRAIN_COMBAT_WIDTH.plains === 3000, 'Plains combat width must be 3000');

const ls300 = makeFormation('ls_def', 'lam_son', 50, 50, {
  swordsman: 120, spearman: 100, archer: 80, cavalry: 0, elephant: 0, scout: 0, supply_cart: 0,
});
const ming3000 = makeFormation('ming_blob', 'ming', 50.4, 50, {
  swordsman: 1500, spearman: 1000, archer: 500, cavalry: 0, elephant: 0, scout: 0, supply_cart: 0,
});

const cliffOutcome = resolveWorldMapCombatTick([ls300, ming3000], [], () => 'cliff');
const plainsOutcome = resolveWorldMapCombatTick([ls300, ming3000], [], () => 'plains');
assert(ls300.totalTroops === 300 && ls300.layers!.frontlineHp === ls300.layers!.frontlineMaxHp, 'Engine must not mutate its inputs');
const lsLostInCliff = 300 - cliffOutcome.formations.find(f => f.id === 'ls_def')!.totalTroops;
const lsLostInPlains = 300 - plainsOutcome.formations.find(f => f.id === 'ls_def')!.totalTroops;
assert(lsLostInCliff < lsLostInPlains * 0.4, `Cliff chokepoint must drastically reduce Lam Son losses (${lsLostInCliff} vs ${lsLostInPlains})`);

// 2. Rear/Flank attack bypasses frontline and hits backline + drops morale
const dirRear = classifyAttackDirection({ x: 51, y: 50 }, { x: 50.4, y: 50 }, 180);
assert(dirRear === 'rear', `Expected 'rear' when attacking from behind facing=180, got ${dirRear}`);
assert(classifyAttackDirection({ x: 50, y: 49 }, { x: 50, y: 50 }, 0) === 'flank', 'Perpendicular attack is flank');

const lsFront = makeFormation('ls_front', 'lam_son', 50.0, 50, {
  swordsman: 150, spearman: 150, archer: 50, cavalry: 0, elephant: 0, scout: 0, supply_cart: 0,
});
const lsRearCavalry = makeFormation('ls_rear', 'lam_son', 50.9, 50, {
  swordsman: 0, spearman: 0, archer: 0, cavalry: 120, elephant: 0, scout: 0, supply_cart: 0,
}, { isStealthed: true });
const mingTarget = makeFormation('ming_mid', 'ming', 50.4, 50, {
  swordsman: 400, spearman: 200, archer: 150, cavalry: 0, elephant: 0, scout: 0, supply_cart: 3,
}, { facingAngleDeg: 180 });

const pincerRes = resolveWorldMapCombatTick([lsFront, lsRearCavalry, mingTarget], [], () => 'forest');
const mingAfter = pincerRes.formations.find(f => f.id === 'ming_mid')!;
assert(mingAfter.layers!.backlineHp < mingAfter.layers!.backlineMaxHp, 'Rear attack must damage enemy backline directly');
assert((mingAfter.morale ?? 100) <= 65, `Ambush + Pincer must drop Ming morale to <= 65, got ${mingAfter.morale}`);
assert(mingAfter.ambushShockApplied === true, 'Ambush shock recorded on defender');

// 3. Routing army does not re-trigger ambush shock infinitely
const routingMing = { ...mingAfter, morale: 15, isRouting: true, status: 'retreating' as const };
const stealthAgain = { ...lsRearCavalry, isStealthed: true };
const pursuitRes = resolveWorldMapCombatTick([stealthAgain, routingMing], [], () => 'forest');
const pursuedMing = pursuitRes.formations.find(f => f.id === 'ming_mid')!;
assert(pursuedMing.isRouting === true, 'Routing army stays routing');
assert(pursuedMing.morale! >= 0 && pursuedMing.morale! <= 15, 'Routing morale must not be boosted and gets no -30 shock again');
assert(pursuitRes.capturedResources.swords > 0 || pursuitRes.capturedResources.food > 0, 'Pursuing routing enemy yields captured supplies');
const pursuer = pursuitRes.formations.find(f => f.id === 'ls_rear')!;
assert(pursuer.layers!.flankHp === pursuer.layers!.flankMaxHp, 'Routing enemy deals no counter-damage');

// 4. Wiped-frontline overflow: no NaN, damage spills into backline (Review Focus #1)
const archersOnly = makeFormation('ming_archers', 'ming', 50.4, 50, {
  swordsman: 0, spearman: 0, archer: 200, cavalry: 0, elephant: 0, scout: 0, supply_cart: 0,
});
const overflow = resolveWorldMapCombatTick([lsFront, archersOnly], [], () => 'plains');
const archersAfter = overflow.formations.find(f => f.id === 'ming_archers')!;
assert(!Number.isNaN(archersAfter.layers!.backlineHp), 'No NaN with empty frontline');
assert(archersAfter.layers!.backlineHp < archersAfter.layers!.backlineMaxHp || archersAfter.totalTroops < 200, 'Overflow reaches backline when frontline is empty');

// 5. Fire attack stratagem in forest deals heavy morale & HP damage
const stratRes = applyWorldStratagem(lsFront, mingTarget, 'fire_attack', [], 'forest');
assert(stratRes.success && (stratRes.target.morale ?? 100) < 85, 'Fire attack in forest must succeed and reduce morale');
assert(mingTarget.morale === 100, 'Stratagem must not mutate inputs');

console.log('PASS: worldMapCombatEngine tests');
