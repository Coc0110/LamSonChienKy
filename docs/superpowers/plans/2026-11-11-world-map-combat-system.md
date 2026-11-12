# World-Map Continuous Combat & 3-Layer Army System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy 32×32/96×32 grid-locked battle popup with a Clash-of-Clans-style 3-Layer Army Roster Builder and a continuous, terrain-width-aware, morale-driven World-Map Combat & Stratagem system on the Thanh Hóa map.

**Architecture:** Armies are configured via troop-count sliders (`ArmyRosterCounts`) that automatically partition into three tactical health/role layers (`Frontline`, `Backline`, `Flank`). Armies move and clash directly on the continuous `(x, y)` world map while querying high-resolution underlying terrain (`getGridTerrain`) in `O(1)` time for **Combat Width (Chokepoints)**, **Forest/Mountain Stealth**, **Directional Flanking (Front/Flank/Rear)**, **Supply Line Interception**, and **Independent Morale Collapse**.

**Tech Stack:** React 19, TypeScript 6.0, Zustand 5, Leaflet 1.9, Tailwind CSS 4, Node.js native TypeScript test runner (`node --experimental-strip-types`).

**Spec:** `docs/superpowers/specs/2026-11-11-combat-system-redesign.md`

## Global Constraints

- Preserve 60–144 FPS performance rules in `GEMINI.md`: no nested CSS `filter: drop-shadow()` or Gaussian blur on repeated map markers; read store state via `useGameStore.getState()` inside drag/map pointer handlers.
- Every task must pass `npm run lint` (`oxlint`: 0 warnings, 0 errors), `npx tsc -b` (0 errors), and `npm run build` before completion.
- Keep legacy `grid` field on `TacticalFormation` optional/compatible so existing save migrations in `saveSlice.ts` do not crash when loading older state.
- Nighttime rule (`canhHour` 0, 1, 2 = Tý, Sửu, Dần): regular marching pauses for night camp, except stealthed ambush/night-raid maneuvers explicitly triggered by the player.

## Review Focus

1. **Zero-troop or wiped-frontline overflow:** When `frontlineHp` reaches `0` mid-tick, remaining incoming melee damage in that same tick must overflow into `backlineHp` instead of being discarded or producing `NaN` when `frontlineMaxHp === 0`.
2. **Resource clamping on roster edits:** Increasing a unit count in `updateFormationRoster` beyond available city `combatTroops`, weapons (`swords`, `bows`, `spears`), `horses`, or `elephants` must clamp or reject cleanly without producing negative city/global resource pools.
3. **Simultaneous multi-army pincer morbidity:** When 2+ Lam Sơn formations attack 1 Ming formation in the same tick, casualties and morale reductions must accumulate sequentially on the shared target state rather than overwriting each other with stale copies.
4. **Routing army immunity to infinite re-ambush:** Once a formation enters `isRouting: true` (`morale < 20`), it must not re-trigger one-shot ambush shock (`-30` morale) on every subsequent tick while fleeing.
5. **Save-state backward compatibility:** Formations created before this update (which have `grid` but no `roster` or `layers`) must automatically hydrate valid `roster` and `layers` via `ensureFormationRosterAndLayers` without throwing undefined property errors.

---

### Task 1: Core Data Types & 3-Layer Army Composition Calculator

**Files:**
- Modify: `src/types/armyFormation.ts`
- Create: `src/utils/armyCompositionUtils.ts`
- Test: `src/utils/__tests__/armyCompositionUtils.test.ts`

**Interfaces:**
- Consumes: `General` from `src/types/index.ts`, `TerrainType` from `src/types/terrain.ts`
- Produces:
  - `ArmyRosterCounts`, `ArmyThreeLayersState`, `StratagemType`, `WorldCombatLog`, `WorldCombatState` in `src/types/armyFormation.ts`
  - `calculateCommandCapacity(commander: General | undefined, deputies: General[]): number` in `src/utils/armyCompositionUtils.ts`
  - `buildLayersFromRoster(roster: ArmyRosterCounts): ArmyThreeLayersState` in `src/utils/armyCompositionUtils.ts`
  - `syncRosterAfterLayerDamage(roster: ArmyRosterCounts, layers: ArmyThreeLayersState): ArmyRosterCounts` in `src/utils/armyCompositionUtils.ts`
  - `computeFormationSpeedAndVision(roster: ArmyRosterCounts, terrain: TerrainType): { speedMultiplier: number; visionRadiusPct: number; canStealthInCover: boolean; maxSupplyDays: number }` in `src/utils/armyCompositionUtils.ts`
  - `ensureFormationRosterAndLayers(formation: TacticalFormation): TacticalFormation` in `src/utils/armyCompositionUtils.ts`

- [ ] **Step 1: Write the failing test in `src/utils/__tests__/armyCompositionUtils.test.ts`**

```ts
import './setupTest.cjs';
import {
  calculateCommandCapacity,
  buildLayersFromRoster,
  syncRosterAfterLayerDamage,
  computeFormationSpeedAndVision,
  ensureFormationRosterAndLayers,
} from '../armyCompositionUtils';
import type { ArmyRosterCounts, TacticalFormation } from '../../types/armyFormation';
import type { General } from '../../types';

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const mockLeLoi: General = {
  id: 'le_loi',
  name: 'Lê Lợi',
  hanzi: '黎利',
  title: 'Bình Định Vương',
  epithet: 'Thống Lĩnh',
  group: 'lung_nhai_1416',
  stars: 5,
  starTier: 'red',
  joinYear: 1416,
  joinMonth: 1,
  joinDay: 1,
  unlocked: true,
  locationId: 'lam_son',
  stats: { command: 98, martial: 88, intellect: 92 },
  specialty: 'Bình Ngô',
  lore: '',
};

// 1. Command capacity scales with commander command stat + stars + deputies
const cap = calculateCommandCapacity(mockLeLoi, []);
assert(cap >= 1500, `Expected Lê Lợi command capacity >= 1500, got ${cap}`);

// 2. 3-Layer HP partitioning from roster
const roster: ArmyRosterCounts = {
  swordsman: 100,
  spearman: 100,
  elephant: 2,
  archer: 80,
  supply_cart: 2,
  cavalry: 40,
  scout: 10,
};
const layers = buildLayersFromRoster(roster);
// Frontline = 100*70 + 100*65 + 2*250 = 14000
assert(layers.frontlineMaxHp === 14000, `Expected frontlineMaxHp 14000, got ${layers.frontlineMaxHp}`);
// Backline = 80*40 + 2*50 = 3300
assert(layers.backlineMaxHp === 3300, `Expected backlineMaxHp 3300, got ${layers.backlineMaxHp}`);
// Flank = 40*80 + 10*45 = 3650
assert(layers.flankMaxHp === 3650, `Expected flankMaxHp 3650, got ${layers.flankMaxHp}`);

// 3. Proportional troop reduction when frontline loses 50% HP
const damagedLayers = { ...layers, frontlineHp: 7000 };
const synced = syncRosterAfterLayerDamage(roster, damagedLayers);
assert(synced.swordsman === 50 && synced.spearman === 50 && synced.elephant === 1, 'Expected 50% frontline roster remaining');
assert(synced.archer === 80, 'Expected untouched backline archers to remain 80');

// 4. Zero-troop roster safety (Review Focus #1)
const emptyLayers = buildLayersFromRoster({
  swordsman: 0, spearman: 0, elephant: 0, archer: 0, supply_cart: 0, cavalry: 0, scout: 0,
});
const emptySynced = syncRosterAfterLayerDamage(
  { swordsman: 0, spearman: 0, elephant: 0, archer: 0, supply_cart: 0, cavalry: 0, scout: 0 },
  emptyLayers
);
assert(emptySynced.swordsman === 0 && !Number.isNaN(emptyLayers.frontlineHp), 'Empty roster must not produce NaN');

// 5. Speed & stealth: pure cavalry/scout army moves faster than supply-cart army
const fastStats = computeFormationSpeedAndVision(
  { swordsman: 0, spearman: 0, elephant: 0, archer: 0, supply_cart: 0, cavalry: 50, scout: 10 },
  'plains'
);
const slowStats = computeFormationSpeedAndVision(roster, 'plains');
assert(fastStats.speedMultiplier > slowStats.speedMultiplier * 1.8, 'Cavalry detachment should move >1.8x faster than cart army');
assert(slowStats.maxSupplyDays > fastStats.maxSupplyDays, 'Supply carts must increase maxSupplyDays');

// 6. Legacy formation hydration (Review Focus #5)
const hydrated = ensureFormationRosterAndLayers({
  id: 'legacy_1',
  name: 'Legacy',
  cityId: 'lam_son',
  rows: 32,
  cols: 32,
  grid: [],
  assignedGeneralIds: ['le_loi'],
  commanderGeneralId: 'le_loi',
  status: 'stationed',
  createdAt: 0,
  totalTroops: 100,
  totalWeapons: 100,
  totalHorses: 0,
  totalElephants: 0,
  totalFoodCarried: 500,
} as TacticalFormation);
assert(Boolean(hydrated.roster) && Boolean(hydrated.layers), 'Legacy formation must hydrate roster and layers');

console.log('PASS: armyCompositionUtils tests');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types src/utils/__tests__/armyCompositionUtils.test.ts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `../armyCompositionUtils`.

- [ ] **Step 3: Extend `src/types/armyFormation.ts` and implement `src/utils/armyCompositionUtils.ts`**

Add to `src/types/armyFormation.ts`:
```ts
export interface ArmyRosterCounts {
  swordsman: number;
  spearman: number;
  archer: number;
  cavalry: number;
  elephant: number;
  scout: number;
  supply_cart: number;
}

export interface ArmyThreeLayersState {
  frontlineHp: number;
  frontlineMaxHp: number;
  backlineHp: number;
  backlineMaxHp: number;
  flankHp: number;
  flankMaxHp: number;
}

export type StratagemType =
  | 'ambush_strike'
  | 'fire_attack'
  | 'rockfall_trap'
  | 'taunt_lure'
  | 'decoy_illusion'
  | 'duel_snipe';

export interface WorldCombatState {
  targetFormationId: string;
  attackDirection: 'front' | 'flank' | 'rear';
  terrain: TerrainType;
  combatWidth: number;
  canhElapsed: number;
  panickedCanhRemaining: number;
  lastDamageDealt: number;
  lastDamageTaken: number;
  lastLogMessage: string;
}
```
And add optional fields onto `TacticalFormation` in `src/types/armyFormation.ts`:
- `faction?: 'lam_son' | 'ming'`
- `roster?: ArmyRosterCounts`
- `layers?: ArmyThreeLayersState`
- `morale?: number` (0..100, default 100)
- `facingAngleDeg?: number` (default 0)
- `isStealthed?: boolean`
- `isRouting?: boolean`
- `ambushShockApplied?: boolean`
- `preparedTrap?: 'fire' | 'rockfall' | null`
- `supplySourceCityId?: string | null`
- `isSupplyCut?: boolean`
- `armyRole?: 'main' | 'detachment' | 'ming_expedition' | 'ming_convoy'`
- `combatState?: WorldCombatState | null`

Implement `src/utils/armyCompositionUtils.ts` using `TACTICAL_UNIT_CONFIGS` base stats:
- `calculateCommandCapacity`: returns `Math.round((commander.stats.command * 12 + commander.stars * 120) + deputies.reduce((s, d) => s + d.stats.command * 4, 0))` (minimum `300` if no commander).
- `buildLayersFromRoster`:
  - `frontlineMaxHp = roster.swordsman * 70 + roster.spearman * 65 + roster.elephant * 250`
  - `backlineMaxHp = roster.archer * 40 + roster.supply_cart * 50`
  - `flankMaxHp = roster.cavalry * 80 + roster.scout * 45`
- `syncRosterAfterLayerDamage`: scales each unit count in Frontline (`swordsman`, `spearman`, `elephant`), Backline (`archer`, `supply_cart`), and Flank (`cavalry`, `scout`) by `Math.ceil(count * (layerHp / layerMaxHp))` when `layerMaxHp > 0`, or `0` when `layerHp <= 0`.
- `computeFormationSpeedAndVision`: computes minimum speed across present unit types (`elephant: 0.7`, `supply_cart: 0.8`, infantry/archer: `1.0`, `cavalry: 2.0`, `scout: 2.2`) divided by `TERRAIN_DEFINITIONS[terrain].moveSpeedCost`; `canStealthInCover = (terrain === 'forest' || terrain === 'mountain' || terrain === 'cliff') && roster.elephant === 0 && roster.supply_cart <= 1`; `maxSupplyDays = 5 + roster.supply_cart * 12`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types src/utils/__tests__/armyCompositionUtils.test.ts`
Expected: `PASS: armyCompositionUtils tests`

- [ ] **Step 5: Commit**

```bash
git add src/types/armyFormation.ts src/utils/armyCompositionUtils.ts src/utils/__tests__/armyCompositionUtils.test.ts
git commit -m "feat(combat): add 3-layer army roster types and composition calculator"
```

---

### Task 2: World-Map Continuous Combat Engine (Combat Width, 3-Layer Flanking, Morale & Traps)

**Files:**
- Create: `src/utils/worldMapCombatEngine.ts`
- Test: `src/utils/__tests__/worldMapCombatEngine.test.ts`

**Interfaces:**
- Consumes: `TacticalFormation`, `ArmyRosterCounts`, `ArmyThreeLayersState`, `StratagemType` from `src/types/armyFormation.ts`; `General` from `src/types/index.ts`; `TerrainType` from `src/types/terrain.ts`
- Produces:
  - `TERRAIN_COMBAT_WIDTH: Record<TerrainType, number>`
  - `classifyAttackDirection(attackerPos: { x: number; y: number }, defenderPos: { x: number; y: number }, defenderFacingDeg: number): 'front' | 'flank' | 'rear'`
  - `resolveWorldMapCombatTick(formations: TacticalFormation[], generals: General[], getTerrainAtPos: (x: number, y: number) => TerrainType): { formations: TacticalFormation[]; logs: string[]; capturedResources: { food: number; gold: number; swords: number; bows: number; spears: number } }`
  - `applyWorldStratagem(actor: TacticalFormation, target: TacticalFormation, stratagem: StratagemType, generals: General[], terrain: TerrainType): { actor: TacticalFormation; target: TacticalFormation; success: boolean; message: string }`

- [ ] **Step 1: Write the failing test in `src/utils/__tests__/worldMapCombatEngine.test.ts`**

```ts
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

const cliffOutcome = resolveWorldMapCombatTick(
  [structuredClone(ls300), structuredClone(ming3000)],
  [],
  () => 'cliff'
);
const plainsOutcome = resolveWorldMapCombatTick(
  [structuredClone(ls300), structuredClone(ming3000)],
  [],
  () => 'plains'
);
const lsLostInCliff = 300 - cliffOutcome.formations.find(f => f.id === 'ls_def')!.totalTroops;
const lsLostInPlains = 300 - plainsOutcome.formations.find(f => f.id === 'ls_def')!.totalTroops;
assert(lsLostInCliff < lsLostInPlains * 0.4, `Cliff chokepoint must drastically reduce Lam Son losses (${lsLostInCliff} vs ${lsLostInPlains})`);

// 2. Rear/Flank attack bypasses frontline and hits backline + drops morale (Review Focus #3)
const dirRear = classifyAttackDirection({ x: 51, y: 50 }, { x: 50.4, y: 50 }, 180);
assert(dirRear === 'rear', `Expected 'rear' when attacking from behind facing=180, got ${dirRear}`);

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

// 3. Routing army does not re-trigger ambush shock infinitely (Review Focus #4)
const routingMing = { ...mingAfter, morale: 15, isRouting: true, status: 'retreating' as const };
const pursuitRes = resolveWorldMapCombatTick([lsRearCavalry, routingMing], [], () => 'forest');
const pursuedMing = pursuitRes.formations.find(f => f.id === 'ming_mid')!;
assert(pursuedMing.isRouting === true, 'Routing army stays routing');
assert(pursuitRes.capturedResources.swords > 0 || pursuitRes.capturedResources.food > 0, 'Pursuing routing enemy yields captured supplies');

// 4. Fire attack stratagem in forest deals heavy morale & HP damage
const stratRes = applyWorldStratagem(lsFront, mingTarget, 'fire_attack', [], 'forest');
assert(stratRes.success && (stratRes.target.morale ?? 100) < 85, 'Fire attack in forest must succeed and reduce morale');

console.log('PASS: worldMapCombatEngine tests');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types src/utils/__tests__/worldMapCombatEngine.test.ts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `../worldMapCombatEngine`.

- [ ] **Step 3: Implement `src/utils/worldMapCombatEngine.ts`**

Implement deterministic combat resolution per Canh Hour:
- `TERRAIN_COMBAT_WIDTH`: `{ plains: 3000, water: 1200, swamp: 900, forest: 800, mountain: 500, cliff: 300 }`.
- `classifyAttackDirection`: computes angle from defender to attacker relative to `defenderFacingDeg`. Difference `<= 60°` is `'front'`, `60°..120°` is `'flank'`, `> 120°` is `'rear'`.
- In `resolveWorldMapCombatTick`:
  - Pair engaged formations within `ENGAGEMENT_RADIUS_PCT = 1.25`.
  - Cap effective attacking troops per side by `effectiveRatio = Math.min(1, combatWidth / Math.max(1, attacker.totalTroops))`.
  - If `attacker.isStealthed && !defender.ambushShockApplied`, apply Ambush Strike (`2.2x` damage multiplier, `-30` defender morale, set `attacker.isStealthed = false`, `defender.ambushShockApplied = true`, `panickedCanhRemaining = 2`).
  - Route damage to layers:
    - `'front'`: `85%` to `frontlineHp` (with overflow to `backlineHp` if `frontlineHp` hits `0`), `15%` ranged volley exchange to `backlineHp`.
    - `'flank'`: `45%` to `frontlineHp`, `55%` to `backlineHp` + `-10` morale.
    - `'rear'`: `20%` to `frontlineHp`, `80%` to `backlineHp` + `-20` morale.
  - Apply `isSupplyCut` penalty (`-12` morale/canh).
  - If `defender.morale < 20`, set `defender.isRouting = true`, `defender.status = 'retreating'`. When an army attacks a routing enemy, it deals `1.4x` capture/elimination damage, takes `0` counter-damage, and adds captured food/weapons to `capturedResources`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types src/utils/__tests__/worldMapCombatEngine.test.ts`
Expected: `PASS: worldMapCombatEngine tests`

- [ ] **Step 5: Commit**

```bash
git add src/utils/worldMapCombatEngine.ts src/utils/__tests__/worldMapCombatEngine.test.ts
git commit -m "feat(combat): implement continuous world-map combat engine with combat width and 3-layer flanking"
```

---

### Task 3: Ming Field Armies, Supply Convoys & Supply Line Interception

**Files:**
- Create: `src/utils/mingMapAI.ts`
- Test: `src/utils/__tests__/mingMapAI.test.ts`

**Interfaces:**
- Consumes: `TacticalFormation` from `src/types/armyFormation.ts`, `CityNode` from `src/types/index.ts`
- Produces:
  - `spawnMingFieldFormation(sourceCity: CityNode, targetPos: { x: number; y: number }, troopCount: number, role: 'ming_expedition' | 'ming_convoy'): TacticalFormation`
  - `updateMingFormationsAI(formations: TacticalFormation[], cities: CityNode[], deltaDays: number): { formations: TacticalFormation[]; interceptedFood: number; interceptedWeapons: number; notices: string[] }`

- [ ] **Step 1: Write the failing test in `src/utils/__tests__/mingMapAI.test.ts`**

```ts
import './setupTest.cjs';
import { spawnMingFieldFormation, updateMingFormationsAI } from '../mingMapAI';
import { buildLayersFromRoster } from '../armyCompositionUtils';
import type { CityNode, TacticalFormation } from '../../types';

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const tayDo: CityNode = {
  id: 'tay_do',
  name: 'Thành Tây Đô',
  type: 'city',
  x: 60,
  y: 48,
  faction: 'ming',
  troops: 5000,
};

// 1. Spawning Ming expedition creates 3-layer formation with supplySourceCityId
const mingExp = spawnMingFieldFormation(tayDo, { x: 54, y: 48 }, 1200, 'ming_expedition');
assert(mingExp.faction === 'ming' && mingExp.totalTroops === 1200, 'Expected 1200 Ming expedition troops');
assert(mingExp.supplySourceCityId === 'tay_do', 'Expected supplySourceCityId = tay_do');

// 2. Spawning Ming convoy creates supply-cart heavy formation
const mingConvoy = spawnMingFieldFormation(tayDo, { x: 56, y: 48 }, 200, 'ming_convoy');
assert((mingConvoy.roster?.supply_cart ?? 0) >= 4, 'Ming convoy must carry multiple supply carts');

// 3. Lam Son detachment blocking line between tay_do (60,48) and mingExp (54,48) cuts Ming supply line
mingExp.mapPosition = { x: 54, y: 48, col: 432, row: 504 };
const lsRaider: TacticalFormation = {
  ...mingConvoy,
  id: 'ls_raider',
  name: 'Kỵ Binh Cắt Lương',
  faction: 'lam_son',
  armyRole: 'detachment',
  mapPosition: { x: 57, y: 48, col: 456, row: 504 },
  roster: { swordsman: 0, spearman: 0, archer: 0, cavalry: 150, elephant: 0, scout: 20, supply_cart: 0 },
  layers: buildLayersFromRoster({ swordsman: 0, spearman: 0, archer: 0, cavalry: 150, elephant: 0, scout: 20, supply_cart: 0 }),
  totalTroops: 170,
};

const aiStep = updateMingFormationsAI([mingExp, lsRaider], [tayDo], 0.25);
const updatedExp = aiStep.formations.find(f => f.id === mingExp.id)!;
assert(updatedExp.isSupplyCut === true, 'Expected Ming expedition supply line to be marked cut when Lam Son blocks corridor');

console.log('PASS: mingMapAI tests');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types src/utils/__tests__/mingMapAI.test.ts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `../mingMapAI`.

- [ ] **Step 3: Implement `src/utils/mingMapAI.ts`**

Implement `spawnMingFieldFormation` and `updateMingFormationsAI`:
- `spawnMingFieldFormation`: allocates balanced Ming roster (`40% swordsman`, `25% spearman`, `20% archer`, `15% cavalry` for `'ming_expedition'`; or `50% spearman`, `35% swordsman`, `Math.max(4, Math.ceil(troopCount / 40))` `supply_cart` for `'ming_convoy'`), sets `supplySourceCityId: sourceCity.id`, and builds a continuous march path toward `targetPos`.
- `updateMingFormationsAI`:
  - Checks if any active `'ming_expedition'` more than `3.5%` map distance from its `supplySourceCityId` has an enemy Lam Sơn formation positioned within `1.5%` perpendicular distance of the segment connecting the expedition to its supply city (or if its paired `'ming_convoy'` was destroyed). If so, sets `isSupplyCut = true`.
  - When a `'ming_convoy'` is eliminated by Lam Sơn, transfers `convoy.totalFoodCarried` to `interceptedFood` and `Math.round(convoy.totalWeapons * 0.6)` to `interceptedWeapons`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types src/utils/__tests__/mingMapAI.test.ts`
Expected: `PASS: mingMapAI tests`

- [ ] **Step 5: Commit**

```bash
git add src/utils/mingMapAI.ts src/utils/__tests__/mingMapAI.test.ts
git commit -m "feat(combat): add Ming field armies, supply convoys, and supply line interception AI"
```

---

### Task 4: Zustand Store Integration (`armySlice.ts` & Continuous World-Map Combat)

**Files:**
- Modify: `src/store/slices/armySlice.ts`
- Test: `src/utils/__tests__/armySliceCombatIntegration.test.ts`

**Interfaces:**
- Consumes: `armyCompositionUtils.ts`, `worldMapCombatEngine.ts`, `mingMapAI.ts`
- Produces on `ArmySlice`:
  - `updateFormationRoster: (formationId: string, targetRoster: ArmyRosterCounts) => { success: boolean; message: string }`
  - `prepareTerrainTrap: (formationId: string, trapType: 'fire' | 'rockfall') => { success: boolean; message: string }`
  - `triggerFormationStratagem: (formationId: string, targetFormationId: string, stratagem: StratagemType) => { success: boolean; message: string }`
  - Updated `stepArmies: (deltaDays: number) => void` (executes continuous world-map combat ticks without opening the legacy 96×32 popup)

- [ ] **Step 1: Write the failing test in `src/utils/__tests__/armySliceCombatIntegration.test.ts`**

```ts
import './setupTest.cjs';
import { useGameStore } from '../../store/gameStore';

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const store = useGameStore.getState();
const formId = store.formations[0].id;

// 1. Updating roster within available city troops & weapons succeeds and updates 3 layers
const resOk = store.updateFormationRoster(formId, {
  swordsman: 15,
  spearman: 10,
  archer: 10,
  cavalry: 2,
  elephant: 0,
  scout: 2,
  supply_cart: 1,
});
assert(resOk.success, `Expected updateFormationRoster to succeed: ${resOk.message}`);
const updatedForm = useGameStore.getState().formations.find(f => f.id === formId)!;
assert(updatedForm.totalTroops === 40, `Expected totalTroops 40, got ${updatedForm.totalTroops}`);
assert((updatedForm.layers?.frontlineMaxHp ?? 0) > 0, 'Expected frontlineMaxHp > 0');

// 2. Requesting 999,999 troops rejects cleanly without negative resources (Review Focus #2)
const resOverflow = useGameStore.getState().updateFormationRoster(formId, {
  swordsman: 999999,
  spearman: 0,
  archer: 0,
  cavalry: 0,
  elephant: 0,
  scout: 0,
  supply_cart: 0,
});
assert(resOverflow.success === false, 'Overflow roster must fail cleanly');
assert(useGameStore.getState().resources.swords >= 0, 'Swords pool must never go negative');

// 3. Preparing a fire trap in forest succeeds
const trapRes = useGameStore.getState().prepareTerrainTrap(formId, 'fire');
assert(trapRes.success && useGameStore.getState().formations.find(f => f.id === formId)?.preparedTrap === 'fire', 'Expected fire trap prepared');

console.log('PASS: armySliceCombatIntegration tests');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types src/utils/__tests__/armySliceCombatIntegration.test.ts`
Expected: FAIL with `store.updateFormationRoster is not a function`.

- [ ] **Step 3: Implement `updateFormationRoster`, `prepareTerrainTrap`, `triggerFormationStratagem`, and world-map combat in `src/store/slices/armySlice.ts`**

In `src/store/slices/armySlice.ts`:
- Initialize default formation with `roster`, `layers`, `morale: 100`, `faction: 'lam_son'`.
- Implement `updateFormationRoster(formationId, targetRoster)`:
  - Compute delta between `formation.roster` and `targetRoster` for `combatTroops`, `swords` (`swordsman + cavalry`), `spears` (`spearman + elephant + scout`), `bows` (`archer`), `horses` (`cavalry + scout`), `elephants` (`elephant`), and `food` (`supply_cart * 150`).
  - Verify commander capacity (`calculateCommandCapacity`) and available city `combatTroops` + global `resources`. Return `{ success: false, message }` if exceeded.
  - Deduct/refund resources and rebuild `layers` via `buildLayersFromRoster(targetRoster)`.
- Implement `prepareTerrainTrap(formationId, trapType)` and `triggerFormationStratagem(formationId, targetFormationId, stratagem)`.
- In `stepArmies(deltaDays)`:
  - Move formations smoothly along `marchOrder.cells`, updating `facingAngleDeg` from movement vector `(dx, dy)` and setting `isStealthed = true` when `status === 'ambushing'` on `forest`, `mountain`, or `cliff`.
  - When a `feigned_retreat`, `decoy`, or `raid` triggers Ming response, call `spawnMingFieldFormation` to place a live Ming formation (and a paired `'ming_convoy'` if marching > `3.5%` distance) directly onto `state.formations` instead of calling `startBattle` modal!
  - Run `updateMingFormationsAI` and `resolveWorldMapCombatTick` on each step, updating `formations`, city garrisons, and `resources` directly on the world map.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types src/utils/__tests__/armySliceCombatIntegration.test.ts`
Expected: `PASS: armySliceCombatIntegration tests`

- [ ] **Step 5: Commit**

```bash
git add src/store/slices/armySlice.ts src/utils/__tests__/armySliceCombatIntegration.test.ts
git commit -m "feat(store): integrate 3-layer roster management and live world-map combat into armySlice"
```

---

### Task 5: Clash-of-Clans Style Army Roster Builder Modal (`ArmyRosterModal.tsx`)

**Files:**
- Create: `src/components/army/ArmyRosterModal.tsx`
- Modify: `src/components/layout/panel/ArmyOverviewPanel.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useGameStore` (`formations`, `generals`, `cities`, `resources`, `updateFormationRoster`, `assignGeneralToFormation`, `removeGeneralFromFormation`, `setFormationCommander`), `useUIStore` (`activeModal`, `setActiveModal`)
- Produces: `export const ArmyRosterModal: React.FC` in `src/components/army/ArmyRosterModal.tsx`

- [ ] **Step 1: Create `src/components/army/ArmyRosterModal.tsx`**

Build the Clash-of-Clans / Three-Kingdoms style Army Composition modal with:
- Left column: **Formation Selector & Command Staff (1 Commander + up to 2 Deputies/Advisors)** displaying total **Command Capacity (`Thống lĩnh`)**, **Martial Bonus (`Võ nghệ`)**, and **Unlocked Stratagems (`Mưu lược`)**.
- Center column: **7 Unit Type Sliders & `+/-` Stepper Cards** (`Đao Khiên`, `Giáo Binh`, `Cung Nỏ`, `Kỵ Binh`, `Tượng Binh`, `Thám Mã`, `Xe Lương`) showing available city `combatTroops` and weapon/mount stocks in real time.
- Right column: **Live 3-Layer Tactical Preview** (`🛡️ Tuyến Tiền Phong`, `🏹 Tuyến Hậu Phương`, `🐎 Tuyến Cơ Động`), **March Speed multiplier**, **Supply Duration (days)**, and a **"Lưu Biên Chế Đạo Quân"** button calling `updateFormationRoster`.

- [ ] **Step 2: Wire `ArmyRosterModal` in `src/App.tsx` and update button label in `src/components/layout/panel/ArmyOverviewPanel.tsx`**

In `src/App.tsx`, replace the lazy `TacticalFormationModal` mount for `activeModal === 'tactical_grid'` with `ArmyRosterModal`. In `ArmyOverviewPanel.tsx`, display each formation's 3-Layer summary (`Tiền phong / Hậu phương / Cơ động`) and `morale` directly from `form.roster` and `form.layers`.

- [ ] **Step 3: Run lint, typecheck, and build verification**

Run: `npm run lint && npx tsc -b && npm run build`
Expected: `0 warnings, 0 errors`, build completes cleanly.

- [ ] **Step 4: Commit**

```bash
git add src/components/army/ArmyRosterModal.tsx src/components/layout/panel/ArmyOverviewPanel.tsx src/App.tsx
git commit -m "feat(ui): replace 32x32 grid modal with Clash-of-Clans style 3-layer ArmyRosterModal"
```

---

### Task 6: World-Map Live Combat Visuals & Tactical Engagement HUD (`WorldCombatHUD.tsx`)

**Files:**
- Create: `src/components/map/overlay/WorldCombatHUD.tsx`
- Modify: `src/components/map/hooks/useArmyMarchLayer.ts`
- Modify: `src/components/map/WorldMap.tsx`

**Interfaces:**
- Consumes: `useGameStore` (`formations`, `generals`, `prepareTerrainTrap`, `triggerFormationStratagem`, `stopFormationMarch`), `useUIStore` (`selectedMapFormationId`, `setSelectedMapFormationId`, `setMarchDrawMode`)
- Produces: `export const WorldCombatHUD: React.FC` in `src/components/map/overlay/WorldCombatHUD.tsx`

- [ ] **Step 1: Update `src/components/map/hooks/useArmyMarchLayer.ts` to render both Lam Sơn & Ming field formations and live combat badges**

In `useArmyMarchLayer.ts`:
- Render Ming field armies (`form.faction === 'ming'`) with crimson banners (`#991b1b`) and supply convoy icons (`🌾 Đoàn Vận Lương`) alongside Lam Sơn formations.
- Above each formation marker on the map, render dual compact bars: **Troop Count / HP bar** and **Morale bar (`0..100`)**, plus tactical status pills (`🌲 Đang Ẩn Thân`, `🔥 Bẫy Lửa Sẵn Sàng`, `⚠️ Lưỡng Đầu Thụ Địch`, `🌾 Tuyệt Lương`, `🏳️ Vỡ Trận`).
- When `form.combatState` is active, draw a directional clash vector line between the engaged formations on the map.

- [ ] **Step 2: Create `src/components/map/overlay/WorldCombatHUD.tsx` and mount it in `src/components/map/WorldMap.tsx`**

Build `WorldCombatHUD.tsx` as a non-blocking parchment tactical command panel anchored to the bottom-right of `WorldMap.tsx` whenever `selectedMapFormationId` is selected:
- Displays current underlying terrain name and **Độ Rộng Mặt Trận (`TERRAIN_COMBAT_WIDTH[terrain]`)**.
- Displays **3-Layer HP bars** (`Tiền Phong`, `Hậu Phương`, `Cơ Động`) and **Morale** for the selected formation (and its engaged enemy target if in combat).
- Provides instant tactical command buttons:
  - `🌲 Mai Phục Ẩn Thân` / `📣 Phát Pháo Hiệu Xuất Kích` (`ambush_strike`)
  - `🔥 Dựng / Phóng Hỏa Công` (`fire_attack`)
  - `🪨 Bẫy Đá Lăn Hẻm Núi` (`rockfall_trap`)
  - `🏳️ Khiêu Khích & Trá Bại` (`taunt_lure` / dual route draw)
  - `⚔️ Đơn Kỵ Đột Kích Trảm Tướng` (`duel_snipe`)

- [ ] **Step 3: Run full test suite, linter, typechecker, and production build**

Run:
```bash
node --experimental-strip-types src/utils/__tests__/armyCompositionUtils.test.ts
node --experimental-strip-types src/utils/__tests__/worldMapCombatEngine.test.ts
node --experimental-strip-types src/utils/__tests__/mingMapAI.test.ts
node --experimental-strip-types src/utils/__tests__/armySliceCombatIntegration.test.ts
npm run lint
npx tsc -b
npm run build
```
Expected: All 4 test suites print `PASS`, `oxlint` reports `0 warnings and 0 errors`, `tsc -b` exits `0`, and `vite build` succeeds in `< 2s`.

- [ ] **Step 4: Commit**

```bash
git add src/components/map/overlay/WorldCombatHUD.tsx src/components/map/hooks/useArmyMarchLayer.ts src/components/map/WorldMap.tsx
git commit -m "feat(map): add live world-map Ming armies, morale bars, and WorldCombatHUD tactical command panel"
```
