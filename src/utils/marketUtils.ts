import districtData from '../data/districtPolygons.json';
import type { CityNode, Resources } from '../types';
import type { DistrictInfo } from '../types/map';

export type MarketGoodKey =
  | 'food'
  | 'swords'
  | 'spears'
  | 'bows'
  | 'clothes'
  | 'horses'
  | 'elephants';

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
    unitLabel: '100 thạch',
    lotSize: 100,
    icon: '/icons/food.png',
    baseBuyPrice: 22,
    sellRatio: 0.72,
    safeLots: 2,
    suspicionWeight: 1.5,
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
    safeLots: 1,
    suspicionWeight: 3.5,
  },
  {
    key: 'elephants',
    label: 'Voi Chiến',
    unitLabel: 'thớt',
    lotSize: 1,
    icon: '/troops/elephant.png',
    baseBuyPrice: 180,
    sellRatio: 0.65,
    safeLots: 0,
    suspicionWeight: 8,
  },
];

export type DistrictEconomyTag = 'granary' | 'highland' | 'urban_ming' | 'coastal' | 'balanced';

const DISTRICT_ECONOMY: Record<string, { tag: DistrictEconomyTag; tagLabel: string; marketName: string }> = {
  lam_son: { tag: 'highland', tagLabel: 'Miền Núi • Căn Cứ', marketName: 'Chợ Phố Đầm (Lam Sơn)' },
  chi_linh: { tag: 'highland', tagLabel: 'Rừng Núi Hiểm Trở', marketName: 'Chợ Mường Chí Linh' },
  muong_thoi: { tag: 'highland', tagLabel: 'Biên Thùy • Tượng Mã', marketName: 'Chợ Mường Thôi' },
  muong_kiet: { tag: 'highland', tagLabel: 'Biên Thùy • Tượng Mã', marketName: 'Chợ Mường Kiệt' },
  quan_du: { tag: 'highland', tagLabel: 'Cửa Ải • Ngựa Chiến', marketName: 'Chợ Cửa Ải Quan Du' },
  loi_giang: { tag: 'highland', tagLabel: 'Thượng Nguồn Sông Mã', marketName: 'Chợ Lỗi Giang' },
  co_loi: { tag: 'highland', tagLabel: 'Đồi Núi • Gỗ Quý', marketName: 'Chợ Cổ Lôi' },
  tay_do: { tag: 'urban_ming', tagLabel: 'Đô Thị • Đồn Minh', marketName: 'Chợ Thành Tây Đô' },
  dong_son: { tag: 'urban_ming', tagLabel: 'Phủ Thành • Làng Rèn', marketName: 'Chợ Phủ Đông Sơn' },
  an_lac: { tag: 'urban_ming', tagLabel: 'Trấn Thị • Binh Khí', marketName: 'Chợ An Lạc' },
  thong_ninh: { tag: 'urban_ming', tagLabel: 'Đồn Trú • Thương Khẩu', marketName: 'Chợ Thống Ninh' },
  luong_giang: { tag: 'granary', tagLabel: 'Vựa Lúa Sông Chu', marketName: 'Chợ Lương Giang' },
  vinh_ninh: { tag: 'granary', tagLabel: 'Đồng Bằng Trù Phú', marketName: 'Chợ Vĩnh Ninh' },
  yen_dinh: { tag: 'granary', tagLabel: 'Vựa Thóc • Đồn Minh', marketName: 'Chợ Yên Định' },
  nong_cong: { tag: 'granary', tagLabel: 'Đồng Chiêm • Cửa Ngõ', marketName: 'Chợ Nông Cống' },
  co_hoang: { tag: 'granary', tagLabel: 'Vựa Lúa Ven Sông', marketName: 'Chợ Cổ Hoằng' },
  ha_trung: { tag: 'coastal', tagLabel: 'Cửa Biển • Muối Cá', marketName: 'Chợ Bến Hà Trung' },
  tong_giang: { tag: 'coastal', tagLabel: 'Thủy Đạo • Giao Thương', marketName: 'Chợ Tống Giang' },
  chi_nga: { tag: 'coastal', tagLabel: 'Ven Sông • Đóng Thuyền', marketName: 'Chợ Chi Nga' },
  co_dang: { tag: 'coastal', tagLabel: 'Đồng Trũng • Vải Vóc', marketName: 'Chợ Cổ Đằng' },
};

const TAG_MULTIPLIERS: Record<DistrictEconomyTag, Partial<Record<MarketGoodKey, number>>> = {
  granary: { food: 0.78, clothes: 0.95, swords: 1.12, spears: 1.12, bows: 1.1, horses: 1.2, elephants: 1.25 },
  highland: { food: 1.18, swords: 1.05, spears: 0.96, bows: 0.9, clothes: 1.12, horses: 0.82, elephants: 0.78 },
  urban_ming: { food: 1.05, swords: 0.85, spears: 0.85, bows: 0.88, clothes: 0.84, horses: 1.05, elephants: 1.15 },
  coastal: { food: 0.95, swords: 1.02, spears: 1.0, bows: 1.0, clothes: 0.9, horses: 1.15, elephants: 1.2 },
  balanced: { food: 1.0, swords: 1.0, spears: 1.0, bows: 1.0, clothes: 1.0, horses: 1.0, elephants: 1.0 },
};

const BASE_DAILY_STOCK: Record<DistrictEconomyTag, Record<MarketGoodKey, number>> = {
  granary: { food: 25, swords: 12, spears: 14, bows: 10, clothes: 18, horses: 3, elephants: 0 },
  highland: { food: 10, swords: 10, spears: 14, bows: 16, clothes: 10, horses: 8, elephants: 3 },
  urban_ming: { food: 16, swords: 24, spears: 24, bows: 20, clothes: 28, horses: 6, elephants: 1 },
  coastal: { food: 15, swords: 14, spears: 14, bows: 12, clothes: 20, horses: 4, elephants: 0 },
  balanced: { food: 15, swords: 15, spears: 15, bows: 15, clothes: 15, horses: 4, elephants: 1 },
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
  dailyStock: number;
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
  date: { day: number; month: number; year: number },
  marketUsedToday: Record<string, number> = {}
): MarketListing[] {
  const meta = getDistrictMarketMeta(districtId, cities);
  const tagMult = TAG_MULTIPLIERS[meta.tag];
  const baseStock = BASE_DAILY_STOCK[meta.tag];
  const dayIndex = date.year * 365 + date.month * 30 + date.day;

  return MARKET_GOODS.map(cfg => {
    const seed = hashString(`${districtId}:${cfg.key}`);
    const staticSpread = 0.92 + ((seed % 17) / 100); // 0.92 .. 1.08
    const timeWave = 1 + Math.sin(dayIndex * 0.25 + (seed % 31)) * 0.1; // 0.90 .. 1.10
    const mult = (tagMult[cfg.key] ?? 1.0) * staticSpread * timeWave;
    const buyPrice = Math.max(2, Math.round(cfg.baseBuyPrice * mult));
    const sellPrice = Math.max(1, Math.round(buyPrice * cfg.sellRatio));
    const dailyStock = baseStock[cfg.key];
    const used = Math.max(0, Math.floor(marketUsedToday[`${districtId}:${cfg.key}`] ?? 0));
    const remainingStock = Math.max(0, dailyStock - used);

    return {
      config: cfg,
      buyPrice,
      sellPrice,
      dailyStock,
      remainingStock,
    };
  });
}

export function calculateMarketTradeSuspicion(
  districtId: string,
  goodKey: MarketGoodKey,
  lots: number,
  cities: CityNode[]
): number {
  const cleanLots = Math.max(0, Math.floor(lots));
  if (cleanLots <= 0) return 0;
  const cfg = MARKET_GOODS.find(g => g.key === goodKey);
  if (!cfg) return 0;
  if (cleanLots <= cfg.safeLots) return 0;

  const meta = getDistrictMarketMeta(districtId, cities);
  const excess = cleanLots - cfg.safeLots;
  const raw = excess * cfg.suspicionWeight * meta.mingRiskMultiplier;
  return Math.min(35, Math.max(1, Math.round(raw)));
}

export function getResourceAmountForGood(resources: Resources, key: MarketGoodKey): number {
  return Math.max(0, Math.floor(resources[key] ?? 0));
}
