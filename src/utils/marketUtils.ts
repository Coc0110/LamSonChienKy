import districtData from '../data/districtPolygons.json';
import { coordToCell } from '../data/terrainGrid';
import type { CityNode, Resources } from '../types';
import type { DistrictInfo } from '../types/map';

export type MarketGoodKey =
  | 'food'
  | 'swords'
  | 'spears'
  | 'bows'
  | 'clothes'
  | 'horses';

export interface MarketGoodConfig {
  key: MarketGoodKey;
  label: string;
  unitLabel: string;
  lotSize: number;
  icon: string;
  baseBuyPrice: number;
  sellRatio: number;
  safeLots: number;
  suspicionWeight: number;
}

export const MARKET_GOODS: MarketGoodConfig[] = [
  {
    key: 'food',
    label: 'Lương Thảo',
    unitLabel: '500 thạch',
    lotSize: 500,
    icon: '/icons/food.png',
    baseBuyPrice: 95,
    sellRatio: 0.72,
    safeLots: 2,
    suspicionWeight: 2.0,
  },
  {
    key: 'swords',
    label: 'Đao Kiếm',
    unitLabel: 'thanh',
    lotSize: 1,
    icon: '/icons/weapon_sword.png',
    baseBuyPrice: 10,
    sellRatio: 0.65,
    safeLots: 4,
    suspicionWeight: 1.5,
  },
  {
    key: 'spears',
    label: 'Trường Giáo',
    unitLabel: 'cây',
    lotSize: 1,
    icon: '/icons/weapon_spear.png',
    baseBuyPrice: 9,
    sellRatio: 0.65,
    safeLots: 4,
    suspicionWeight: 1.5,
  },
  {
    key: 'bows',
    label: 'Cung Nỏ',
    unitLabel: 'chiếc',
    lotSize: 1,
    icon: '/icons/weapon_bow.png',
    baseBuyPrice: 11,
    sellRatio: 0.65,
    safeLots: 4,
    suspicionWeight: 1.5,
  },
  {
    key: 'clothes',
    label: 'Quân Trang',
    unitLabel: 'bộ',
    lotSize: 1,
    icon: '/icons/weapon_armor.png',
    baseBuyPrice: 7,
    sellRatio: 0.65,
    safeLots: 5,
    suspicionWeight: 1.1,
  },
  {
    key: 'horses',
    label: 'Chiến Mã',
    unitLabel: 'con',
    lotSize: 1,
    icon: '/troops/cavalry.png',
    baseBuyPrice: 48,
    sellRatio: 0.68,
    safeLots: 0,
    suspicionWeight: 6.5,
  },
];

export type DistrictEconomyTag = 'granary' | 'highland' | 'urban_ming' | 'coastal' | 'balanced';

export const MARKET_DISTRICT_IDS = [
  'muong_kiet',
  'lam_son',
  'huyen_khoi',
  'tay_do',
  'dong_son',
  'nong_cong',
] as const;

const MARKET_DISTRICT_SET = new Set<string>(MARKET_DISTRICT_IDS);

const DISTRICT_ECONOMY: Record<string, { tag: DistrictEconomyTag; tagLabel: string; marketName: string }> = {
  muong_kiet: { tag: 'highland', tagLabel: 'Biên Thùy • Chiến Mã & Cung', marketName: 'Chợ Mường Kiệt' },
  lam_son: { tag: 'highland', tagLabel: 'Căn Cứ • Giáo & Cung', marketName: 'Chợ Phố Đầm (Lam Sơn)' },
  huyen_khoi: { tag: 'balanced', tagLabel: 'Châu Ninh Hóa • Đao Kiếm', marketName: 'Chợ Huyện Khôi' },
  tay_do: { tag: 'urban_ming', tagLabel: 'Đô Thị • Đủ Binh Khí', marketName: 'Chợ Thành Tây Đô' },
  dong_son: { tag: 'urban_ming', tagLabel: 'Phủ Thành • Làng Rèn', marketName: 'Chợ Phủ Đông Sơn' },
  nong_cong: { tag: 'granary', tagLabel: 'Vựa Lúa Phương Nam', marketName: 'Chợ Nông Cống' },
};

const TAG_MULTIPLIERS: Record<DistrictEconomyTag, Partial<Record<MarketGoodKey, number>>> = {
  granary: { food: 0.78, clothes: 0.95, swords: 1.12, spears: 1.12, bows: 1.1, horses: 1.2 },
  highland: { food: 1.18, swords: 1.05, spears: 0.96, bows: 0.88, clothes: 1.12, horses: 0.82 },
  urban_ming: { food: 1.05, swords: 0.85, spears: 0.85, bows: 0.88, clothes: 0.84, horses: 1.05 },
  coastal: { food: 0.95, swords: 1.02, spears: 1.0, bows: 1.0, clothes: 0.9, horses: 1.15 },
  balanced: { food: 1.0, swords: 1.0, spears: 1.0, bows: 1.0, clothes: 1.0, horses: 1.0 },
};

// Không phải chợ nào cũng bán đủ Kiếm, Giáo, Cung; mặt hàng = 0 sẽ không hiển thị khi mua
const BASE_MONTHLY_STOCK: Record<DistrictEconomyTag, Record<MarketGoodKey, number>> = {
  granary: { food: 45, swords: 0, spears: 0, bows: 0, clothes: 28, horses: 2 },
  highland: { food: 18, swords: 0, spears: 18, bows: 26, clothes: 14, horses: 10 },
  urban_ming: { food: 28, swords: 36, spears: 34, bows: 24, clothes: 40, horses: 8 },
  coastal: { food: 30, swords: 0, spears: 16, bows: 0, clothes: 32, horses: 3 },
  balanced: { food: 26, swords: 18, spears: 0, bows: 14, clothes: 22, horses: 4 },
};

const DISTRICT_STOCK_OVERRIDES: Record<string, Partial<Record<MarketGoodKey, number>>> = {
  nong_cong: { spears: 14 },
  dong_son: { bows: 0 },
};

export interface DistrictMarketMeta {
  districtId: string;
  districtName: string;
  chau: string;
  marketName: string;
  tag: DistrictEconomyTag;
  tagLabel: string;
  hasMingGarrison: boolean;
  hasLamSonBase: boolean;
  mingRiskMultiplier: number;
}

export interface MarketListing {
  config: MarketGoodConfig;
  buyPrice: number;
  sellPrice: number;
  monthlyStock: number;
  remainingStock: number;
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function getAllDistrictsList(): DistrictInfo[] {
  return ((districtData as { districts?: DistrictInfo[] }).districts ?? []);
}

export function hasDistrictMarket(districtId: string): boolean {
  return MARKET_DISTRICT_SET.has(districtId);
}

export function getMarketDistrictsList(): DistrictInfo[] {
  const all = getAllDistrictsList();
  return MARKET_DISTRICT_IDS
    .map(id => all.find(d => d.id === id))
    .filter((d): d is DistrictInfo => !!d);
}

export function getDistrictMarketPosition(districtId: string): { x: number; y: number; col: number; row: number } {
  const district = getAllDistrictsList().find(d => d.id === districtId);
  if (!district || !district.polygon || district.polygon.length === 0) {
    const fallback = coordToCell(35, 50);
    return { x: 35, y: 50, col: fallback.col, row: fallback.row };
  }
  let sx = 0;
  let sy = 0;
  for (const pt of district.polygon) {
    sx += pt[0];
    sy += pt[1];
  }
  const x = Number((sx / district.polygon.length).toFixed(2));
  const y = Number((sy / district.polygon.length).toFixed(2));
  const cell = coordToCell(x, y);
  return { x, y, col: cell.col, row: cell.row };
}

export function getDistrictMarketMeta(districtId: string, cities: CityNode[]): DistrictMarketMeta {
  const district = getAllDistrictsList().find(d => d.id === districtId);
  const districtName = district?.name ?? districtId;
  const chau = district?.chau ?? 'THANH HÓA';
  const eco = DISTRICT_ECONOMY[districtId] ?? {
    tag: 'balanced' as DistrictEconomyTag,
    tagLabel: 'Địa Hạt Giao Thương',
    marketName: `Chợ ${districtName}`,
  };

  const hasMingGarrison = cities.some(
    c => c.faction === 'ming' && c.troops > 0 && (c.districtId === districtId || c.id === districtId)
  );
  const hasLamSonBase = cities.some(
    c => c.faction === 'lam_son' && (c.hasBase || c.troops > 0) && (c.districtId === districtId || c.id === districtId)
  );

  const mingRiskMultiplier = hasMingGarrison ? 1.65 : hasLamSonBase ? 0.65 : 1.0;

  return {
    districtId,
    districtName,
    chau,
    marketName: eco.marketName,
    tag: eco.tag,
    tagLabel: eco.tagLabel,
    hasMingGarrison,
    hasLamSonBase,
    mingRiskMultiplier,
  };
}

export function getDistrictMarketListings(
  districtId: string,
  cities: CityNode[],
  date: { month: number; year: number },
  marketUsedThisMonth: Record<string, number> = {}
): MarketListing[] {
  const meta = getDistrictMarketMeta(districtId, cities);
  const tagMult = TAG_MULTIPLIERS[meta.tag];
  const baseStock = BASE_MONTHLY_STOCK[meta.tag];
  const overrides = DISTRICT_STOCK_OVERRIDES[districtId] ?? {};
  const monthIndex = date.year * 12 + date.month;

  return MARKET_GOODS.map(cfg => {
    const seed = hashString(`${districtId}:${cfg.key}`);
    const staticSpread = 0.92 + ((seed % 17) / 100);
    const timeWave = 1 + Math.sin(monthIndex * 0.65 + (seed % 31)) * 0.1;
    const mult = (tagMult[cfg.key] ?? 1.0) * staticSpread * timeWave;
    const buyPrice = Math.max(2, Math.round(cfg.baseBuyPrice * mult));
    const sellPrice = Math.max(1, Math.round(buyPrice * cfg.sellRatio));
    const monthlyStock = overrides[cfg.key] ?? baseStock[cfg.key];
    const used = Math.max(0, Math.floor(marketUsedThisMonth[`${districtId}:${cfg.key}`] ?? 0));
    const remainingStock = Math.max(0, monthlyStock - used);

    return {
      config: cfg,
      buyPrice,
      sellPrice,
      monthlyStock,
      remainingStock,
    };
  });
}

export function calculateMarketTradeSuspicion(
  districtId: string,
  goodKey: MarketGoodKey,
  action: 'buy' | 'sell',
  lots: number,
  cities: CityNode[]
): number {
  const cleanLots = Math.max(0, Math.floor(lots));
  if (cleanLots <= 0) return 0;
  const cfg = MARKET_GOODS.find(g => g.key === goodKey);
  if (!cfg) return 0;

  const meta = getDistrictMarketMeta(districtId, cities);
  // Mua ngựa gây chú ý cao hơn nhiều so với bán hoặc mua vật tư thông thường
  const safeLots = goodKey === 'horses' && action === 'sell' ? 1 : cfg.safeLots;
  if (cleanLots <= safeLots) return 0;

  const weight =
    goodKey === 'horses'
      ? action === 'buy'
        ? cfg.suspicionWeight
        : 3.0
      : cfg.suspicionWeight;
  const excess = cleanLots - safeLots;
  const raw = excess * weight * meta.mingRiskMultiplier;
  return Math.min(40, Math.max(1, Math.round(raw)));
}

export function getResourceAmountForGood(resources: Resources, key: MarketGoodKey): number {
  return Math.max(0, Math.floor(resources[key] ?? 0));
}
