import './setupTest.cjs';
import { useGameStore } from '../../store/gameStore';
import {
  MARKET_GOODS,
  calculateMarketTradeSuspicion,
  getDistrictMarketListings,
  getMarketDistrictsList,
} from '../marketUtils';

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const state0 = useGameStore.getState();
const date = { month: state0.month, year: state0.year };

// 0. Simplified to 6 markets
const marketDistricts = getMarketDistrictsList();
assert(marketDistricts.length === 6, `Expected 6 markets, got ${marketDistricts.length}`);

// 1. No elephants in Thanh Hoa markets & food lotSize is 500
assert(!MARKET_GOODS.some(g => (g.key as string) === 'elephants'), 'Thanh Hoa markets must not sell elephants');
const nongCong = getDistrictMarketListings('nong_cong', state0.cities, date);
const tayDo = getDistrictMarketListings('tay_do', state0.cities, date);
const muongKiet = getDistrictMarketListings('muong_kiet', state0.cities, date);
const foodGranary = nongCong.find(l => l.config.key === 'food')!;
const foodHighland = muongKiet.find(l => l.config.key === 'food')!;
assert(foodGranary.config.lotSize === 500, `Expected food lotSize 500, got ${foodGranary.config.lotSize}`);
assert(
  foodGranary.buyPrice < foodHighland.buyPrice,
  `Expected granary food (${foodGranary.buyPrice}) < highland (${foodHighland.buyPrice})`
);

// 2. Selective weapon availability
assert(
  nongCong.find(l => l.config.key === 'swords')!.monthlyStock === 0 &&
    nongCong.find(l => l.config.key === 'bows')!.monthlyStock === 0,
  'Granary market should not sell swords or bows'
);
assert(
  tayDo.find(l => l.config.key === 'swords')!.monthlyStock > 0 &&
    tayDo.find(l => l.config.key === 'spears')!.monthlyStock > 0 &&
    tayDo.find(l => l.config.key === 'bows')!.monthlyStock > 0,
  'Urban Ming market should sell swords, spears, and bows'
);

// 3. Buying horses raises suspicion more than selling or small food trades
assert(calculateMarketTradeSuspicion('lam_son', 'food', 'buy', 2, state0.cities) === 0, 'Small food buy = 0 suspicion');
const buyHorseSusp = calculateMarketTradeSuspicion('lam_son', 'horses', 'buy', 1, state0.cities);
const sellHorseSusp = calculateMarketTradeSuspicion('lam_son', 'horses', 'sell', 1, state0.cities);
assert(buyHorseSusp > 0 && buyHorseSusp > sellHorseSusp, `Expected buying horse (${buyHorseSusp}) > selling (${sellHorseSusp})`);

// 4. Buy creates awaiting_pickup order (not instant resources); army pickup & return delivers it
useGameStore.setState(s => ({
  day: 28,
  month: 2,
  year: 1418,
  suspicion: 15,
  marketUsedThisMonth: {},
  pendingMarketOrders: [],
  resources: { ...s.resources, gold: 5000, food: 2000, swords: 20, weapons: 50, horses: 0 },
}));

const febGranaryPrice = getDistrictMarketListings('luong_giang', useGameStore.getState().cities, { month: 2, year: 1418 })
  .find(l => l.config.key === 'food')!.buyPrice;
const beforeGold = useGameStore.getState().resources.gold;
const buyRes = useGameStore.getState().executeMarketTrade('luong_giang', 'food', 'buy', 1);
assert(buyRes.success, `Expected buy to succeed: ${buyRes.message}`);
assert(useGameStore.getState().resources.gold === beforeGold - febGranaryPrice, 'Gold deducted immediately');
assert(useGameStore.getState().resources.food === 2000, 'Food must NOT teleport before army pickup');
assert(useGameStore.getState().pendingMarketOrders.length === 1, 'Expected 1 pendingMarketOrder awaiting pickup');

const formId = useGameStore.getState().formations[0].id;
const dispatchRes = useGameStore.getState().dispatchArmyForMarketPickup(formId, 'luong_giang');
assert(dispatchRes.success, `Expected dispatchArmyForMarketPickup to succeed: ${dispatchRes.message}`);
assert(useGameStore.getState().formations[0].marchOrder?.endpointAction === 'market_pickup', 'Expected market_pickup march');

// Step enough days for round-trip pickup & return
for (let i = 0; i < 60; i++) {
  useGameStore.getState().stepArmies(0.5);
  if (useGameStore.getState().pendingMarketOrders.length === 0) break;
}
assert(useGameStore.getState().pendingMarketOrders.length === 0, 'Expected army to pick up and deliver order');
assert(useGameStore.getState().resources.food >= 2450, `Expected +500 food delivered (minus march food), got ${useGameStore.getState().resources.food}`);

// 5. Market refreshes monthly, NOT daily
assert(Object.keys(useGameStore.getState().marketUsedThisMonth).length > 0, 'Expected monthly usage recorded');
useGameStore.getState().tick(); // Day 29 -> 1/3 (same month 2 -> 3? Wait: Feb 1418 has 28 days, so 28 -> 1/3!)
// First test same-month day tick: set day 10 -> 11
useGameStore.setState({ day: 10, month: 3, marketUsedThisMonth: { 'luong_giang:food': 2 } });
useGameStore.getState().tick();
assert(
  useGameStore.getState().marketUsedThisMonth['luong_giang:food'] === 2,
  'Same-month day tick must NOT reset marketUsedThisMonth'
);
useGameStore.setState({ day: 31, month: 3 });
useGameStore.getState().tick(); // rolls over to month 4
assert(
  Object.keys(useGameStore.getState().marketUsedThisMonth).length === 0,
  'Month rollover tick MUST reset marketUsedThisMonth'
);

console.log('PASS: marketSystem tests');
