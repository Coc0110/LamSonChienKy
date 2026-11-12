import './setupTest.cjs';
import { useGameStore } from '../../store/gameStore';
import {
  calculateMarketTradeSuspicion,
  getDistrictMarketListings,
} from '../marketUtils';

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const state0 = useGameStore.getState();
const date = { day: state0.day, month: state0.month, year: state0.year };

// 1. Different districts have different prices
const luongGiang = getDistrictMarketListings('luong_giang', state0.cities, date);
const quanDu = getDistrictMarketListings('quan_du', state0.cities, date);
const foodGranary = luongGiang.find(l => l.config.key === 'food')!;
const foodHighland = quanDu.find(l => l.config.key === 'food')!;
assert(
  foodGranary.buyPrice < foodHighland.buyPrice,
  `Expected granary food (${foodGranary.buyPrice}) to be cheaper than highland (${foodHighland.buyPrice})`
);

// 2. Small trades incur 0 suspicion; large trades increase suspicion (more in Ming districts)
assert(calculateMarketTradeSuspicion('lam_son', 'food', 2, state0.cities) === 0, 'Small food trade should have 0 suspicion');
const bulkLamSon = calculateMarketTradeSuspicion('lam_son', 'food', 8, state0.cities);
const bulkTayDo = calculateMarketTradeSuspicion('tay_do', 'food', 8, state0.cities);
assert(bulkLamSon > 0, `Expected bulk trade in lam_son to add suspicion, got ${bulkLamSon}`);
assert(bulkTayDo > bulkLamSon, `Expected Ming-held tay_do (${bulkTayDo}) > lam_son (${bulkLamSon})`);

// 3. Execute buy & sell through store and verify resources, stock, suspicion, and daily reset
useGameStore.setState(s => ({
  suspicion: 15,
  marketUsedToday: {},
  resources: { ...s.resources, gold: 5000, food: 2000, swords: 20, weapons: 50 },
}));

const beforeGold = useGameStore.getState().resources.gold;
const buySmall = useGameStore.getState().executeMarketTrade('luong_giang', 'food', 'buy', 1);
assert(buySmall.success && buySmall.suspicionGain === 0, 'Expected small buy to succeed with 0 suspicion');
assert(useGameStore.getState().resources.food === 2100, 'Expected +100 food from 1 lot');
assert(useGameStore.getState().resources.gold === beforeGold - foodGranary.buyPrice, 'Expected gold deducted');

const sellBulk = useGameStore.getState().executeMarketTrade('tay_do', 'food', 'sell', 8);
assert(sellBulk.success && sellBulk.suspicionGain > 0, 'Expected bulk sell to succeed and raise suspicion');
assert(useGameStore.getState().suspicion === 15 + sellBulk.suspicionGain, 'Expected store suspicion to increase');
assert(useGameStore.getState().resources.food === 1300, 'Expected 800 food deducted on 8-lot sell');

// 4. Daily tick resets marketUsedToday
assert(
  Object.keys(useGameStore.getState().marketUsedToday).length > 0,
  'Expected marketUsedToday to record purchase'
);
useGameStore.getState().tick();
assert(
  Object.keys(useGameStore.getState().marketUsedToday).length === 0,
  'Expected tick() to replenish marketUsedToday'
);

console.log('PASS: marketSystem tests');
