import './setupTest.cjs';
import { useGameStore } from '../../store/gameStore';
import { formatRemainingDays, roundRemainingDays } from '../formatters';

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

// 1. Floating-point day precision across Canh -> Day transition
assert(roundRemainingDays(5.419 - 1) === 4.419, `Expected exact 4.419, got ${roundRemainingDays(5.419 - 1)}`);
assert(formatRemainingDays(4.4190000000000005) === '4.4', `Expected '4.4', got ${formatRemainingDays(4.4190000000000005)}`);
assert(formatRemainingDays(0.083) === '0.1', `Expected '0.1', got ${formatRemainingDays(0.083)}`);
assert(formatRemainingDays(5) === '5', `Expected '5', got ${formatRemainingDays(5)}`);

useGameStore.setState(s => ({
  timeMode: 'hour',
  canhHour: 4,
  isPaused: false,
  structures: [
    ...s.structures,
    {
      id: 'test_build_precision',
      type: 'farm',
      name: 'Đồn Điền Thử Nghiệm',
      cityId: 'lam_son',
      x: 55.6,
      y: 48.1,
      status: 'building',
      buildDaysRemaining: 6,
      buildDaysTotal: 6,
      cropCycleDays: 90,
      builderWorkers: 5,
      assignedWorkers: 0,
      maxWorkers: 25,
      level: 1,
      gridSize: 5,
      cropDays: 0,
      terrain: 'plains',
    },
  ],
}));

// Advance 7 canh hours in hour mode, then 1 day tick
for (let i = 0; i < 7; i++) {
  useGameStore.getState().tickCanh();
}
const afterCanhStruct = useGameStore.getState().structures.find(st => st.id === 'test_build_precision')!;
assert(afterCanhStruct.buildDaysRemaining === 5.419 || Number(afterCanhStruct.buildDaysRemaining.toFixed(3)) === afterCanhStruct.buildDaysRemaining,
  `Expected <=3 decimal places after tickCanh, got ${afterCanhStruct.buildDaysRemaining}`);

useGameStore.getState().tick();
const afterDayStruct = useGameStore.getState().structures.find(st => st.id === 'test_build_precision')!;
const strVal = String(afterDayStruct.buildDaysRemaining);
assert(!strVal.includes('00000'), `Floating-point drift detected after Canh->Day tick: ${strVal}`);

// 2. Suspicion 100% triggers world-map Ming expedition instead of old battle modal
const tayDoBefore = useGameStore.getState().cities.find(c => c.id === 'tay_do')!.troops;
useGameStore.setState(s => ({
  suspicion: 99.95,
  timeMode: 'day',
  isWarMode: false,
  isBattleModalOpen: false,
  currentBattle: null,
  isPaused: false,
  cities: s.cities.map(c =>
    c.id === 'lam_son' && c.population
      ? { ...c, population: { ...c.population, combatTroops: 250 } }
      : c
  ),
}));

useGameStore.getState().tick();
const afterSusp = useGameStore.getState();
assert(afterSusp.isBattleModalOpen === false && afterSusp.currentBattle === null, 'Suspicion 100% must NOT open old BattleResultModal');
assert(afterSusp.suspicion === 35, `Expected suspicion reset to 35 after dispatch, got ${afterSusp.suspicion}`);
assert(afterSusp.timeMode === 'hour' && afterSusp.isWarMode === true, 'Expected switch to War Mode (hour)');

const spawnedMingExp = afterSusp.formations.find(f => f.faction === 'ming' && f.armyRole === 'ming_expedition');
const spawnedMingConvoy = afterSusp.formations.find(f => f.faction === 'ming' && f.armyRole === 'ming_convoy');
assert(!!spawnedMingExp && spawnedMingExp.status === 'marching', 'Expected Ming expedition spawned & marching on world map');
assert(!!spawnedMingConvoy && spawnedMingConvoy.status === 'marching', 'Expected Ming supply convoy spawned from Tây Đô');

const tayDoAfterDispatch = afterSusp.cities.find(c => c.id === 'tay_do')!.troops;
assert(
  tayDoAfterDispatch === tayDoBefore - spawnedMingExp!.totalTroops - spawnedMingConvoy!.totalTroops,
  'Expected Tây Đô garrison reduced by expedition + convoy troops'
);

// 3. Unopposed Ming expedition reaching Lam Sơn plunders & withdraws cleanly (no frozen army)
const lamSonCity = afterSusp.cities.find(c => c.id === 'lam_son')!;
useGameStore.setState(s => ({
  formations: s.formations
    .filter(f => (f.faction ?? 'lam_son') !== 'lam_son') // Temporarily remove all Lam Sơn armies so base is undefended
    .map(f =>
      f.id === spawnedMingExp!.id
        ? {
            ...f,
            status: 'stationed' as const,
            marchOrder: null,
            mapPosition: { x: lamSonCity.x, y: lamSonCity.y, col: 445, row: 506 },
          }
        : f.id === spawnedMingConvoy!.id
        ? { ...f, status: 'stationed' as const, marchOrder: null }
        : f
    ),
}));

useGameStore.getState().stepArmies(1 / 12);
const afterUnopposed = useGameStore.getState();
assert(
  !afterUnopposed.formations.some(f => f.id === spawnedMingExp!.id),
  'Unopposed Ming expedition should plunder and withdraw instead of idling at Lam Sơn'
);
assert(
  afterUnopposed.cities.find(c => c.id === 'tay_do')!.troops === tayDoBefore,
  'Returned unopposed expedition and convoy troops should rejoin Tây Đô garrison'
);

console.log('suspicionAndDayPrecision tests passed!');
