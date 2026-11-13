import { recalculateFarmWorkers } from '../farmLaborUtils';
import type { CityNode, PlacedStructure } from '../../types';
import type { TacticalFormation } from '../../types/armyFormation';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

console.log('--- Testing militaryBookAndFarming ---');

// 1. Ngụ binh ư nông: Binh lính ở nhà tự động đi làm ruộng
const mockCity: CityNode = {
  id: 'lam_son',
  name: 'Lam Sơn',
  type: 'camp',
  x: 55,
  y: 45,
  faction: 'lam_son',
  troops: 0,
  hasBase: true,
  population: {
    combatTroops: 100, // 100 quân chính quy
    idleLaborers: 50,  // 50 dân đinh
    farmLaborers: 0,
    forgeLaborers: 0,
    unfitPopulation: 50,
    swappedCombatants: 0,
  },
};

const farmA: PlacedStructure = {
  id: 'f_a',
  name: 'Đồn Điền 1',
  type: 'farm',
  x: 55,
  y: 45,
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

const farmB: PlacedStructure = {
  ...farmA,
  id: 'f_b',
  name: 'Đồn Điền 2',
  maxWorkers: 35, // 6x6 farm
};

const farmC: PlacedStructure = {
  ...farmA,
  id: 'f_c',
  name: 'Đồn Điền 3',
  maxWorkers: 50, // 7x7 farm
};

// Total capacity = 25 + 35 + 50 = 110 workers
// Idle (50) + reserve troops (100) = 150 available
// All 3 farms should be completely filled (25, 35, 50 = 110)
const stationedFormation: TacticalFormation = {
  id: 'f_stationed',
  name: 'Đạo Doanh',
  cityId: 'lam_son',
  rows: 32,
  cols: 32,
  grid: [],
  assignedGeneralIds: [],
  commanderGeneralId: null,
  status: 'stationed',
  createdAt: 1000,
  totalTroops: 60,
  totalWeapons: 60,
  totalHorses: 0,
  totalElephants: 0,
  totalFoodCarried: 0,
  faction: 'lam_son',
};

const resAll = recalculateFarmWorkers([mockCity], [farmA, farmB, farmC], [stationedFormation]);
assert(resAll.structures[0].assignedWorkers === 25, 'Farm A gets 25');
assert(resAll.structures[1].assignedWorkers === 35, 'Farm B gets 35');
assert(resAll.structures[2].assignedWorkers === 50, 'Farm C gets 50');
assert(resAll.cities[0].population!.farmLaborers === 110, 'City farmLaborers is 110');

// 2. When army marches out, if manpower drops below 110, farm workers scale down automatically
const cityLowManpower: CityNode = {
  ...mockCity,
  population: {
    ...mockCity.population!,
    idleLaborers: 15,
    combatTroops: 10,
  },
};

const marchingArmy: TacticalFormation = {
  ...stationedFormation,
  status: 'marching',
  marchOrder: {
    cells: [],
    currentCellIndex: 0,
    cellProgress: 0,
    endpointAction: 'camp',
    totalDays: 10,
    elapsedDays: 2,
    totalFoodCost: 20,
  },
};

// Available = 15 + 10 = 25 (army is away on campaign, not farming)
const resLow = recalculateFarmWorkers([cityLowManpower], [farmA, farmB, farmC], [marchingArmy]);
assert(resLow.structures[0].assignedWorkers === 25, 'Farm A gets full 25');
assert(resLow.structures[1].assignedWorkers === 0, 'Farm B gets 0 (no workers left)');
assert(resLow.structures[2].assignedWorkers === 0, 'Farm C gets 0 (no workers left)');
assert(resLow.cities[0].population!.farmLaborers === 25, 'City farmLaborers is 25');

console.log('PASS: militaryBookAndFarming tests');
