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
assert(layers.frontlineMaxHp === 14000, `Expected frontlineMaxHp 14000, got ${layers.frontlineMaxHp}`);
assert(layers.backlineMaxHp === 3300, `Expected backlineMaxHp 3300, got ${layers.backlineMaxHp}`);
assert(layers.flankMaxHp === 3650, `Expected flankMaxHp 3650, got ${layers.flankMaxHp}`);

// 3. Proportional troop reduction when frontline loses 50% HP
const damagedLayers = { ...layers, frontlineHp: 7000 };
const synced = syncRosterAfterLayerDamage(roster, damagedLayers);
assert(synced.swordsman === 50 && synced.spearman === 50 && synced.elephant === 1, 'Expected 50% frontline roster remaining');
assert(synced.archer === 80, 'Expected untouched backline archers to remain 80');

// 4. Zero-troop roster safety (Review Focus #1)
const zero: ArmyRosterCounts = {
  swordsman: 0, spearman: 0, elephant: 0, archer: 0, supply_cart: 0, cavalry: 0, scout: 0,
};
const emptyLayers = buildLayersFromRoster(zero);
const emptySynced = syncRosterAfterLayerDamage({ ...zero }, emptyLayers);
assert(emptySynced.swordsman === 0 && !Number.isNaN(emptyLayers.frontlineHp), 'Empty roster must not produce NaN');

// 5. Speed & stealth
const fastStats = computeFormationSpeedAndVision(
  { swordsman: 0, spearman: 0, elephant: 0, archer: 0, supply_cart: 0, cavalry: 50, scout: 10 },
  'plains'
);
const slowStats = computeFormationSpeedAndVision(roster, 'plains');
assert(fastStats.speedMultiplier > slowStats.speedMultiplier * 1.8, 'Cavalry detachment should move >1.8x faster than cart army');
assert(slowStats.maxSupplyDays > fastStats.maxSupplyDays, 'Supply carts must increase maxSupplyDays');
assert(fastStats.canStealthInCover === false, 'Plains never allows cover stealth');
assert(computeFormationSpeedAndVision({ ...zero, cavalry: 10 }, 'forest').canStealthInCover === true, 'Light cavalry can stealth in forest');

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
assert(hydrated.morale === 100 && hydrated.faction === 'lam_son', 'Hydration fills morale/faction defaults');

console.log('PASS: armyCompositionUtils tests');
