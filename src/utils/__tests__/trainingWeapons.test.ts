import './setupTest.cjs';
import { useGameStore } from '../../store/gameStore';
import { calculateTrainingWeaponReturn } from '../../store/slices/militarySlice';

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

// 1. Unit check: 90% return / 10% wear per weapon category
const unitReturn = calculateTrainingWeaponReturn({ swords: 40, bows: 30, spears: 30 });
assert(unitReturn.swords === 36 && unitReturn.bows === 27 && unitReturn.spears === 27, 'Expected 90% per weapon type');
assert(unitReturn.totalCheckedOut === 100 && unitReturn.totalReturned === 90 && unitReturn.totalWear === 10, 'Expected 100 -> 90 returned, 10 wear');

const emptyReturn = calculateTrainingWeaponReturn(null);
assert(emptyReturn.totalReturned === 0 && emptyReturn.totalWear === 0, 'Null weaponsUsed should return 0');

// 2. Integration: startTraining temporarily checks out weapons & cancelTraining refunds 100%
const baseSnapshot = useGameStore.getState();
const lamSon = baseSnapshot.cities.find(c => c.id === 'lam_son')!;
const idleGen = baseSnapshot.generals.find(
  g => g.unlocked && g.locationId === 'lam_son'
)!;
assert(lamSon && idleGen, 'Expected lam_son city and an idle general');

useGameStore.setState(s => ({
  structures: [],
  resources: {
    ...s.resources,
    swords: 60,
    bows: 20,
    spears: 20,
    weapons: 100,
    food: 10000,
  },
  cities: s.cities.map(c =>
    c.id === 'lam_son' && c.population
      ? {
          ...c,
          training: null,
          population: {
            ...c.population,
            idleLaborers: Math.max(c.population.idleLaborers, 60),
          },
        }
      : c
  ),
}));

// Train 50 troops -> temporarily deducts 50 weapons from stock
useGameStore.getState().startTraining('lam_son', idleGen.id, 50, 0, 1);
let state = useGameStore.getState();
let city = state.cities.find(c => c.id === 'lam_son')!;
assert(city.training?.traineesCount === 50, 'Expected active training for 50 troops');
assert(state.resources.weapons === 50, `Expected 50 remaining weapons while training, got ${state.resources.weapons}`);

// Cancel refunds 100% (back to 100 weapons)
useGameStore.getState().cancelTraining('lam_son');
state = useGameStore.getState();
assert(state.resources.weapons === 100, `Expected 100% weapon refund on cancelTraining, got ${state.resources.weapons}`);
assert(state.resources.swords === 60 && state.resources.bows === 20 && state.resources.spears === 20, 'Expected exact breakdown restored on cancel');

// 3. Integration: tick() completion returns ~90% of weapons (10% wear)
const troopsBeforeDayTick = state.resources.troops;
useGameStore.getState().startTraining('lam_son', idleGen.id, 50, 0, 1);
const checkedOut = useGameStore.getState().cities.find(c => c.id === 'lam_son')!.training!.weaponsUsed!;
const expectedDayReturn = calculateTrainingWeaponReturn(checkedOut);

useGameStore.getState().tick();
state = useGameStore.getState();
city = state.cities.find(c => c.id === 'lam_son')!;
assert(city.training === null, 'Training should complete after 1 day tick');
assert(state.resources.troops === troopsBeforeDayTick + 50, `Expected +50 troops after day tick, got ${state.resources.troops}`);
assert(
  state.resources.weapons === 50 + expectedDayReturn.totalReturned,
  `Expected weapons to rebound to ${50 + expectedDayReturn.totalReturned}, got ${state.resources.weapons}`
);
assert(state.resources.weapons >= 95, `Expected ~95 weapons after 10% wear on 50 weapons, got ${state.resources.weapons}`);

// 4. Integration: tickCanh() completion returns ~90% of weapons and adds trained troops
const stockBeforeCanh = state.resources.weapons;
const troopsBeforeCanh = state.resources.troops;
useGameStore.getState().startTraining('lam_son', idleGen.id, 40, 0, 0.05);
const checkedOutCanh = useGameStore.getState().cities.find(c => c.id === 'lam_son')!.training!.weaponsUsed!;
const expectedCanhReturn = calculateTrainingWeaponReturn(checkedOutCanh);

useGameStore.setState({ isWarMode: true, canhHour: 4 });
useGameStore.getState().tickCanh();

state = useGameStore.getState();
city = state.cities.find(c => c.id === 'lam_son')!;
assert(city.training === null, 'Training should complete during tickCanh when remainingDays <= 1/12');
assert(state.resources.troops === troopsBeforeCanh + 40, `Expected +40 troops on tickCanh completion, got ${state.resources.troops}`);
assert(
  state.resources.weapons === stockBeforeCanh - 40 + expectedCanhReturn.totalReturned,
  `Expected weapons ${stockBeforeCanh - 40 + expectedCanhReturn.totalReturned} after tickCanh completion, got ${state.resources.weapons}`
);

console.log('trainingWeapons tests passed!');
