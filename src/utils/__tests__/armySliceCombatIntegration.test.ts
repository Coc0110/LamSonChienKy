import './setupTest.cjs';
import { useGameStore } from '../../store/gameStore';

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const store = useGameStore.getState();
const formId = store.formations[0].id;
const startTroopsPool = store.cities.find(c => c.id === store.formations[0].cityId)!.population!.combatTroops;

// Kho ban đầu chưa có chiến mã; cấp thêm để kiểm thử biên chế có Kỵ binh / Thám mã
useGameStore.setState(s => ({
  resources: { ...s.resources, horses: 10 },
  cities: s.cities.map(c =>
    c.id === 'lam_son' && c.population
      ? {
          ...c,
          population: {
            ...c.population,
            combatTroops: 64,
            trainedRoster: {
              swordsman: 19,
              spearman: 20,
              archer: 15,
              supply_cart: 0,
              cavalry: 5,
              scout: 5,
            },
          },
        }
      : c
  ),
}));

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
const afterCity = useGameStore.getState().cities.find(c => c.id === updatedForm.cityId)!;
assert(afterCity.population!.combatTroops === startTroopsPool - 34, `City reserve should drop by 34, got ${afterCity.population!.combatTroops}`);
assert(useGameStore.getState().resources.horses === 6, 'Horses deducted (4)');

// 2. Requesting 999,999 troops rejects cleanly without negative resources (Review Focus #2)
const before = useGameStore.getState();
const resOverflow = before.updateFormationRoster(formId, {
  swordsman: 999999, spearman: 0, archer: 0, cavalry: 0, elephant: 0, scout: 0, supply_cart: 0,
});
assert(resOverflow.success === false, 'Overflow roster must fail cleanly');
const after = useGameStore.getState();
assert(after.resources.swords >= 0 && after.resources.swords === before.resources.swords, 'Swords pool must never go negative or change on failure');
assert(after.formations.find(f => f.id === formId)!.totalTroops === 40, 'Failed edit leaves formation unchanged');

// 2b. Shrinking roster refunds resources
const shrink = useGameStore.getState().updateFormationRoster(formId, {
  swordsman: 5, spearman: 5, archer: 5, cavalry: 0, elephant: 0, scout: 0, supply_cart: 1,
});
assert(shrink.success, `Shrink should succeed: ${shrink.message}`);
assert(useGameStore.getState().resources.horses === 10, 'Horses refunded when cavalry removed');

// 2c. Elephants not in stock -> reject
const noElephants = useGameStore.getState().updateFormationRoster(formId, {
  swordsman: 5, spearman: 5, archer: 5, cavalry: 0, elephant: 3, scout: 0, supply_cart: 1,
});
assert(noElephants.success === false, 'Cannot add elephants when none in stock');

// 3. Preparing a fire trap in forest succeeds (Lam Son base stands in forest)
const trapRes = useGameStore.getState().prepareTerrainTrap(formId, 'fire');
assert(trapRes.success && useGameStore.getState().formations.find(f => f.id === formId)?.preparedTrap === 'fire', 'Expected fire trap prepared');
assert(useGameStore.getState().prepareTerrainTrap(formId, 'rockfall').success === false, 'Rockfall trap rejected in forest');

// 4. stepArmies with idle formation is a no-op and never opens the battle modal
useGameStore.getState().stepArmies(1);
assert(useGameStore.getState().formations.length === 1, 'Idle step keeps formations');

// 5. Live world-map combat: Lam Son ambush meets Ming sortie without startBattle
useGameStore.setState(s => ({
  formations: s.formations.map(f => f.id === formId
    ? { ...f, status: 'ambushing' as const, mapPosition: { x: 55.6, y: 48.1, col: 444, row: 506 }, isStealthed: true }
    : f),
}));
const cityTay = useGameStore.getState().cities.find(c => c.id === 'tay_do')!;
const { spawnMingFieldFormation } = await import('../mingMapAI');
const ming = spawnMingFieldFormation(cityTay, { x: 55.6, y: 48.1 }, 60, 'ming_expedition');
ming.mapPosition = { x: 55.9, y: 48.1, col: 447, row: 506 };
ming.marchOrder = null;
ming.status = 'stationed';
useGameStore.setState(s => ({ formations: [...s.formations, ming] }));
useGameStore.getState().stepArmies(1);
const afterFight = useGameStore.getState();
const mingAfter = afterFight.formations.find(f => f.id === ming.id);
assert(!mingAfter || mingAfter.totalTroops < 60 || (mingAfter.morale ?? 100) < 100, 'Ming force takes casualties or morale loss from the ambush');
assert(afterFight.formations.every(f => f.roster && f.layers), 'All formations keep 3-layer state');
assert(afterFight.formations.every(f => !Number.isNaN(f.layers!.frontlineHp)), 'No NaN layers after combat');

// 6. Raid arrival next to a Ming city spawns Ming sortie visibly without insta-deleting Lam Son on the spawn tick
const raidFormId = useGameStore.getState().createFormation('lam_son', 'Đạo Tập Kích Test');
useGameStore.setState(s => ({
  timeMode: 'day',
  isWarMode: false,
  formations: s.formations
    .filter(f => f.id === raidFormId)
    .map(f => ({
      ...f,
      status: 'marching' as const,
      isRouting: false,
      morale: 100,
      roster: { swordsman: 2, spearman: 2, archer: 1, cavalry: 0, elephant: 0, scout: 0, supply_cart: 1 },
      layers: { frontlineHp: 270, frontlineMaxHp: 270, backlineHp: 90, backlineMaxHp: 90, flankHp: 0, flankMaxHp: 0 },
      totalTroops: 6,
      mapPosition: { x: 60.2, y: 49.4, col: 481, row: 519 },
      marchOrder: {
        cells: [
          { col: 480, row: 519, x: 60.06, y: 49.4, terrain: 'plains' as const, moveCostDays: 0, cumulativeDays: 0, foodCost: 0 },
          { col: 481, row: 519, x: 60.2, y: 49.4, terrain: 'plains' as const, moveCostDays: 0.05, cumulativeDays: 0.05, foodCost: 1 },
        ],
        currentCellIndex: 0,
        cellProgress: 0,
        endpointAction: 'raid' as const,
        totalDays: 0.05,
        elapsedDays: 0,
        totalFoodCost: 1,
        pursuingEnemy: null,
      },
    })),
}));
useGameStore.getState().stepArmies(0.1);
const afterRaidArrive = useGameStore.getState();
const lsAtRaid = afterRaidArrive.formations.find(f => f.id === raidFormId);
const mingSortie = afterRaidArrive.formations.find(f => f.faction === 'ming' && f.cityId === 'da_cang');
assert(Boolean(lsAtRaid) && lsAtRaid!.totalTroops > 0 && lsAtRaid!.status === 'engaging', 'Lam Son formation must stay alive and engaging on Ming sortie spawn tick');
assert(Boolean(mingSortie) && mingSortie!.totalTroops > 0, 'Ming sortie must spawn on the map');
assert(afterRaidArrive.isWarMode === true && afterRaidArrive.timeMode === 'hour', 'Raid clash must auto-switch to War Mode (Canh giờ)');

console.log('PASS: armySliceCombatIntegration tests');
