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
assert(Boolean(mingExp.layers) && (mingExp.layers?.frontlineMaxHp ?? 0) > 0, 'Expedition has 3-layer HP');
assert((mingExp.marchOrder?.cells.length ?? 0) > 1, 'Expedition gets a continuous march path');

// 2. Spawning Ming convoy creates supply-cart heavy formation
const mingConvoy = spawnMingFieldFormation(tayDo, { x: 56, y: 48 }, 200, 'ming_convoy');
assert((mingConvoy.roster?.supply_cart ?? 0) >= 4, 'Ming convoy must carry multiple supply carts');
assert(mingConvoy.totalTroops === 200, 'Convoy total troops match request');
assert(mingExp.id !== mingConvoy.id, 'Spawned formations have unique ids');

// 3. Lam Son detachment blocking line between tay_do (60,48) and mingExp (54,48) cuts Ming supply line
mingExp.mapPosition = { x: 54, y: 48, col: 432, row: 504 };
const lsRoster = { swordsman: 0, spearman: 0, archer: 0, cavalry: 150, elephant: 0, scout: 20, supply_cart: 0 };
const lsRaider: TacticalFormation = {
  ...mingConvoy,
  id: 'ls_raider',
  name: 'Kỵ Binh Cắt Lương',
  faction: 'lam_son',
  armyRole: 'detachment',
  mapPosition: { x: 57, y: 48, col: 456, row: 504 },
  roster: lsRoster,
  layers: buildLayersFromRoster(lsRoster),
  totalTroops: 170,
};

const aiStep = updateMingFormationsAI([mingExp, lsRaider], [tayDo], 0.25);
const updatedExp = aiStep.formations.find(f => f.id === mingExp.id)!;
assert(updatedExp.isSupplyCut === true, 'Expected Ming expedition supply line to be marked cut when Lam Son blocks corridor');
assert(mingExp.isSupplyCut !== true, 'AI must not mutate inputs');

// 4. Without a blocker, supply line stays open
const openStep = updateMingFormationsAI([mingExp], [tayDo], 0.25);
assert(openStep.formations[0].isSupplyCut !== true, 'Unblocked expedition keeps supply');

// 5. Raider far off the corridor does not cut supply
const farRaider = { ...lsRaider, mapPosition: { x: 57, y: 60, col: 456, row: 600 } };
assert(updateMingFormationsAI([mingExp, farRaider], [tayDo], 0.25).formations.find(f => f.id === mingExp.id)!.isSupplyCut !== true, 'Off-corridor raider does not cut supply');

// 6. Destroyed convoy: loot goes to Lam Son and pairs expedition into supply cut
const pairedConvoy: TacticalFormation = { ...mingConvoy, parentFormationId: mingExp.id, totalTroops: 0, totalFoodCarried: 400, totalWeapons: 100 };
const lootStep = updateMingFormationsAI([mingExp, pairedConvoy], [tayDo], 0.25);
assert(lootStep.interceptedFood === 400, `Expected 400 intercepted food, got ${lootStep.interceptedFood}`);
assert(lootStep.interceptedWeapons === 60, `Expected 60 intercepted weapons, got ${lootStep.interceptedWeapons}`);
assert(!lootStep.formations.some(f => f.id === pairedConvoy.id), 'Destroyed convoy removed');
const cutExp = lootStep.formations.find(f => f.id === mingExp.id)!;
assert(cutExp.isSupplyCut === true && cutExp.convoyLost === true, 'Expedition loses supply when convoy destroyed');
assert(lootStep.notices.length > 0, 'AI emits notices');

console.log('PASS: mingMapAI tests');
