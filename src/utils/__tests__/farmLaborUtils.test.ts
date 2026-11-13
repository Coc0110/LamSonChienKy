import { recalculateFarmWorkers, isFormationOnCampaign } from '../farmLaborUtils';
import type { CityNode, PlacedStructure } from '../../types';
import type { TacticalFormation } from '../../types/armyFormation';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

console.log('--- Testing farmLaborUtils ---');

// 1. isFormationOnCampaign tests
const baseFormation: TacticalFormation = {
  id: 'f1',
  name: 'Đạo Tiên Phong',
  cityId: 'lam_son',
  rows: 32,
  cols: 32,
  grid: [],
  assignedGeneralIds: [],
  commanderGeneralId: null,
  status: 'stationed',
  createdAt: 1000,
  totalTroops: 100,
  totalWeapons: 100,
  totalHorses: 0,
  totalElephants: 0,
  totalFoodCarried: 50,
  faction: 'lam_son',
};

assert(!isFormationOnCampaign(baseFormation), 'Stationed army with no march order is NOT on campaign');

const marchingFormation: TacticalFormation = {
  ...baseFormation,
  id: 'f2',
  status: 'marching',
  marchOrder: {
    cells: [],
    currentCellIndex: 0,
    cellProgress: 0,
    endpointAction: 'camp',
    totalDays: 5,
    elapsedDays: 1,
    totalFoodCost: 10,
  },
};
assert(isFormationOnCampaign(marchingFormation), 'Marching army is on campaign');

// 2. Auto allocation when stationed (troops + idle farm the land)
const testCity: CityNode = {
  id: 'lam_son',
  name: 'Lam Sơn',
  x: 50,
  y: 50,
  terrain: 'forest',
  faction: 'lam_son',
  troops: 0,
  isCapital: true,
  hasBase: true,
  population: {
    combatTroops: 20, // 20 reserve
    idleLaborers: 10, // 10 idle
    farmLaborers: 0,
    forgeLaborers: 0,
    unfitPopulation: 50,
  },
};

const farm1: PlacedStructure = {
  id: 'farm_1',
  name: 'Ruộng Thượng',
  type: 'farm',
  x: 50,
  y: 50,
  terrain: 'plains',
  gridSize: 5,
  status: 'active',
  cityId: 'lam_son',
  assignedWorkers: 0,
  maxWorkers: 25,
  cropDays: 0,
  cropCycleDays: 90,
  buildDaysRemaining: 0,
  buildDaysTotal: 10,
  builderWorkers: 0,
};

const farm2: PlacedStructure = {
  ...farm1,
  id: 'farm_2',
  name: 'Ruộng Hạ',
  assignedWorkers: 0,
  maxWorkers: 25,
};

// Available = idle(10) + reserve(20) + stationed army(100) = 130
// Farms need 25 + 25 = 50
// Since 130 >= 50, both farms should be 100% full (25 and 25)
const res1 = recalculateFarmWorkers([testCity], [farm1, farm2], [baseFormation]);
assert(res1.hasChanged, 'Recalculation updated workers');
assert(res1.structures[0].assignedWorkers === 25, `Farm 1 should have 25 workers, got ${res1.structures[0].assignedWorkers}`);
assert(res1.structures[1].assignedWorkers === 25, `Farm 2 should have 25 workers, got ${res1.structures[1].assignedWorkers}`);
assert(res1.cities[0].population!.farmLaborers === 50, `City farmLaborers should be 50, got ${res1.cities[0].population!.farmLaborers}`);

// 3. When army goes to war (marching), available manpower drops to 10 + 20 = 30
// Farm 1 gets 25, Farm 2 gets remaining 5 (total 30)
const res2 = recalculateFarmWorkers([testCity], [farm1, farm2], [marchingFormation]);
assert(res2.structures[0].assignedWorkers === 25, `Farm 1 should have 25 workers, got ${res2.structures[0].assignedWorkers}`);
assert(res2.structures[1].assignedWorkers === 5, `Farm 2 should have 5 workers, got ${res2.structures[1].assignedWorkers}`);
assert(res2.cities[0].population!.farmLaborers === 30, `City farmLaborers should be 30, got ${res2.cities[0].population!.farmLaborers}`);

console.log('PASS: farmLaborUtils tests');
