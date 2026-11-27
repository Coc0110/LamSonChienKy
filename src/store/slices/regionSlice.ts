import type { StateCreator } from 'zustand';
import type { GameStore } from './types';
import type {
  AmbushBattleState,
  BaseBuilding,
  BaseBuildingType,
  DefenseBattleState,
  RegionLayout,
  SiegeBattleState,
} from '../../types/region';
import { BASE_BUILDING_CATALOG, FORAGED_ITEM_CATALOG, checkMainHallUpgradeRequirements, getBuildingMaxHp, getUpgradeCost } from '../../data/regionBuildings';
import { canPlaceOnRegionGrid, generateEnemyCityLayout, generateLamSonStarterLayout } from '../../utils/regionLayoutGenerator';
import { isThanhHoaBuildable } from '../../utils/thanhHoa3DTerrain';
import { coordToCell, getGridTerrain } from '../../data/terrainGrid';
import { createSiegeBattle } from '../../utils/siegeCombatEngine';
import { createAmbushBattle } from '../../utils/ambushCombatEngine';
import { createDefenseBattle } from '../../utils/defenseCombatEngine';
import { useUIStore } from '../uiStore';
import { notify } from '../dialogStore';
import { INITIAL_CITIES } from '../../data/mapData';

export interface BaseAutomationConfig {
  dayNightLock: 'auto' | 'day' | 'night';
  autoClean: boolean;
  autoRefugees: boolean;
  autoTrain: boolean;
}

export interface SpawnedBush {
  id: string;
  col: number;
  row: number;
  wx: number;
  wz: number;
}

export interface ForagedInventoryItem {
  uid: string;
  itemId: string;
  name: string;
  rare: boolean;
  basePrice: number;
}

export interface WatchtowerScoutTask {
  targetId: string;
  targetName: string;
  totalDays: number;
  daysRemaining: number;
}

export interface WatchtowerNormalHuntTask {
  tier: 1 | 2 | 3;
  totalDays: number;
  daysRemaining: number;
}

export interface WatchtowerRareHuntTask {
  leaderGeneralId: string;
  leaderName: string;
  totalDays: number;
  daysRemaining: number;
}

export interface PendingMingRaid {
  cityId: string;
  cityName: string;
  sourceName: string;
  enemyTroops: number;
}

export interface UprisingResult {
  rank: 'S' | 'A' | 'B' | 'C';
  title: string;
  score: number;
  troops: number;
  eliteTroops: number;
  food: number;
  weapons: number;
  scoutedCount: number;
  dateStr: string;
}

export interface RegionSlice {
  regionLayouts: Record<string, RegionLayout>;
  clearedTerrainKeys: Record<string, string[]>; // cityId -> array of "col,row" cleared keys
  baseAutomation: Record<string, BaseAutomationConfig>;
  bushes: Record<string, SpawnedBush[]>;
  bushNextSpawnDay: Record<string, number>;
  scoutedRegionIds: Record<string, number>; // cityId -> day last scouted
  activeWatchtowerScouts: Record<string, WatchtowerScoutTask>; // watchtowerId -> active scout task
  defenseFormationIds: Record<string, string[]>; // cityId -> formationIds assigned to defense
  foragedInventory: ForagedInventoryItem[];
  watchtowerLastForageDay: Record<string, number>;
  lastAuctionMonthKey: string | null;
  activeSiegeBattle: SiegeBattleState | null;
  activeAmbushBattle: AmbushBattleState | null;
  activeDefenseBattle: DefenseBattleState | null;

  getOrCreateRegionLayout: (cityId: string) => RegionLayout;
  placeBaseBuilding: (
    cityId: string,
    type: BaseBuildingType,
    col: number,
    row: number,
    rotation?: 0 | 1 | 2 | 3
  ) => { success: boolean; message: string; building?: BaseBuilding };
  upgradeBaseBuilding: (
    cityId: string,
    buildingId: string
  ) => { success: boolean; message: string };
  moveBaseBuilding: (
    cityId: string,
    buildingId: string,
    newCol: number,
    newRow: number,
    rotation?: 0 | 1 | 2 | 3
  ) => { success: boolean; message: string };
  demolishBaseBuilding: (
    cityId: string,
    buildingId: string
  ) => { success: boolean; message: string };
  assignBuildingSupervisor: (
    cityId: string,
    buildingId: string,
    generalId: string | null
  ) => { success: boolean; message: string };
  repairBaseBuilding: (
    cityId: string,
    buildingId: string
  ) => { success: boolean; message: string };
  promoteToEliteTroops: (
    cityId: string,
    count: number
  ) => { success: boolean; message: string };
  tickRegionConstruction: () => void;
  markRegionScouted: (cityId: string) => void;
  startWatchtowerScout: (
    watchtowerId: string,
    targetId: string,
    targetName: string,
    days: number
  ) => { success: boolean; message: string };
  setRegionLayout: (cityId: string, layout: RegionLayout) => void;
  completeTerrainClearing: (cityId: string, key: string, kind: 'chop_tree' | 'clear_forest') => void;
  setBaseAutomation: (cityId: string, patch: Partial<BaseAutomationConfig>) => void;
  clearBush: (cityId: string, bushId: string) => void;
  tickBaseAutomationAndBushes: (day: number) => void;
  toggleDefenseFormation: (cityId: string, formationId: string) => void;
  activeNormalHunt: Record<string, WatchtowerNormalHuntTask>;
  activeRareHunt: Record<string, WatchtowerRareHuntTask>;
  watchtowerLastRareHuntDay: Record<string, number>;
  pendingMingRaid: PendingMingRaid | null;
  suspicionRateMultiplier: number;
  evacuationDaysRemaining: number;
  evacuationLastActionDay: number;
  zeroFoodDays: number;
  lowMoraleDays: number;
  defeatReason: string | null;
  uprisingResult: UprisingResult | null;
  chooseMingRaidResponse: (choice: 'ambush' | 'defense' | 'evacuate') => void;
  retreatAmbushToDefense: () => void;
  performEvacuationAction: (action: 'forage' | 'skirmish' | 'rest') => { success: boolean; message: string };
  triggerPreUprisingVictory: () => { success: boolean; message: string };
  craftWeaponAtForge3D: (
    cityId: string,
    forgeId: string,
    weaponType: 'sword' | 'bow' | 'spear'
  ) => { success: boolean; message: string };
  startWatchtowerNormalHunt: (
    cityId: string,
    watchtowerId: string,
    tier: 1 | 2 | 3
  ) => { success: boolean; message: string };
  startWatchtowerRareHunt: (
    cityId: string,
    watchtowerId: string,
    leaderGeneralId: string
  ) => { success: boolean; message: string };
  buyFromDistrictMarket: (
    cityId: string,
    good: 'wood' | 'ironOre' | 'food',
    amount: number
  ) => { success: boolean; message: string };
  forageFromWatchtower: (
    watchtowerId: string,
    watchtowerLevel: number,
    mode?: 'gather' | 'hunt' | 'treasure'
  ) => { success: boolean; message: string; item?: ForagedInventoryItem };
  sellForagedItem: (uid: string, cityId: string) => { success: boolean; message: string };
  sellBaseResourceAtMarket: (
    cityId: string,
    kind: 'food' | 'swords' | 'spears' | 'bows',
    amount: number
  ) => { success: boolean; message: string };
  sellMarketGoods: (
    cityId: string,
    payload: {
      kind: 'item' | 'food' | 'wood' | 'ironOre' | 'swords' | 'spears' | 'bows';
      itemId?: string;
      amount: number;
      askPrice: number;
    }
  ) => { success: boolean; message: string };
  runMarketAuction: (
    cityId: string,
    payload: {
      kind: 'item' | 'food' | 'wood' | 'ironOre' | 'swords' | 'spears' | 'bows';
      uid?: string;
      itemId?: string;
      amount?: number;
      startPrice: number;
      bidStep: number;
      targetPrice: number;
    }
  ) => { success: boolean; message: string };

  startSiege3D: (targetCityId: string, formationId: string) => void;
  resolveSiege3D: (finalState: SiegeBattleState) => void;
  closeSiege3D: () => void;

  startAmbush3D: (formationId: string, districtName: string, mingTroops: number) => void;
  resolveAmbush3D: (finalState: AmbushBattleState) => void;

  startDefense3D: (cityId: string, mingAttackTroops: number) => void;
  resolveDefense3D: (finalState: DefenseBattleState) => void;
}

function createInitialRegionLayouts(): Record<string, RegionLayout> {
  const map: Record<string, RegionLayout> = {};
  for (const city of INITIAL_CITIES) {
    if (city.faction === 'lam_son' || city.hasBase) {
      map[city.id] = generateLamSonStarterLayout(city.id);
    } else {
      map[city.id] = generateEnemyCityLayout(city);
    }
  }
  return map;
}

export const createRegionSlice: StateCreator<GameStore, [], [], RegionSlice> = (set, get) => ({
  regionLayouts: createInitialRegionLayouts(),
  clearedTerrainKeys: {},
  baseAutomation: {},
  bushes: {},
  bushNextSpawnDay: {},
  scoutedRegionIds: {},
  activeWatchtowerScouts: {},
  activeNormalHunt: {},
  activeRareHunt: {},
  watchtowerLastRareHuntDay: {},
  pendingMingRaid: null,
  suspicionRateMultiplier: 1,
  evacuationDaysRemaining: 0,
  evacuationLastActionDay: -1,
  zeroFoodDays: 0,
  lowMoraleDays: 0,
  defeatReason: null,
  uprisingResult: null,
  defenseFormationIds: {},
  foragedInventory: [],
  watchtowerLastForageDay: {},
  lastAuctionMonthKey: null,
  activeSiegeBattle: null,
  activeAmbushBattle: null,
  activeDefenseBattle: null,

  getOrCreateRegionLayout: (cityId: string) => {
    const existing = get().regionLayouts[cityId];
    if (existing) return existing;

    const city = get().cities.find((c) => c.id === cityId);
    const generated =
      city && city.faction !== 'lam_son' && !city.hasBase
        ? generateEnemyCityLayout(city)
        : generateLamSonStarterLayout(cityId);

    set((state) => ({
      regionLayouts: {
        ...state.regionLayouts,
        [cityId]: generated,
      },
    }));
    return generated;
  },

  placeBaseBuilding: (cityId, type, col, row, rotation = 0) => {
    const state = get();
    const layout = state.getOrCreateRegionLayout(cityId);
    const spec = BASE_BUILDING_CATALOG[type];
    const effSpanCols = rotation % 2 === 1 ? spec.spanRows : spec.spanCols;
    const effSpanRows = rotation % 2 === 1 ? spec.spanCols : spec.spanRows;

    const mainHall = layout.buildings.find((b) => b.type === 'main_hall' && b.status !== 'destroyed');
    const mainHallLvl = mainHall?.level ?? 1;

    if (mainHallLvl < spec.requiredMainHallLevel) {
      return {
        success: false,
        message: `Cần Đại Bản Doanh cấp ${spec.requiredMainHallLevel} để xây ${spec.name}!`,
      };
    }

    const currentCount = layout.buildings.filter((b) => b.type === type && b.status !== 'destroyed').length;
    if (currentCount >= spec.maxPerBase) {
      return {
        success: false,
        message: `Đã đạt giới hạn tối đa ${spec.maxPerBase} ${spec.name} trong căn cứ!`,
      };
    }

    const baseCity = state.cities.find((c) => c.id === cityId);
    const placeOpts = {
      allowOutside: true,
      basePctX: baseCity?.x ?? 50.8,
      basePctY: baseCity?.y ?? 47.6,
    };

    if (!canPlaceOnRegionGrid(layout.buildings, col, row, effSpanCols, effSpanRows, undefined, placeOpts)) {
      return {
        success: false,
        message: 'Vị trí bị vướng công trình khác hoặc nằm trên mặt nước / ngoài Thanh Hóa!',
      };
    }

    if (
      state.resources.gold < spec.goldCost ||
      (state.resources.wood ?? 0) < spec.woodCost ||
      state.resources.food < spec.foodCost
    ) {
      return {
        success: false,
        message: `Không đủ tài nguyên! Cần ${spec.goldCost} vàng, ${spec.woodCost} gỗ${spec.foodCost > 0 ? ` và ${spec.foodCost} lương` : ''}.`,
      };
    }

    const maxHp = getBuildingMaxHp(type, 1);
    const isInstant = spec.buildDays <= 0;
    const newBuilding: BaseBuilding = {
      id: `${cityId}_${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type,
      level: 1,
      col,
      row,
      spanCols: effSpanCols,
      spanRows: effSpanRows,
      hp: maxHp,
      maxHp,
      status: isInstant ? 'active' : 'building',
      buildDaysRemaining: isInstant ? 0 : spec.buildDays,
      rotation,
    };

    set((s) => ({
      resources: {
        ...s.resources,
        gold: s.resources.gold - spec.goldCost,
        wood: Math.max(0, (s.resources.wood ?? 0) - spec.woodCost),
        food: s.resources.food - spec.foodCost,
      },
      regionLayouts: {
        ...s.regionLayouts,
        [cityId]: {
          ...layout,
          buildings: [...layout.buildings, newBuilding],
        },
      },
    }));

    return {
      success: true,
      message: isInstant
        ? `Đã dựng xong ${spec.name}!`
        : `Đang khởi công ${spec.name} (${spec.buildDays} ngày).`,
      building: newBuilding,
    };
  },

  upgradeBaseBuilding: (cityId, buildingId) => {
    const state = get();
    const layout = state.getOrCreateRegionLayout(cityId);
    const target = layout.buildings.find((b) => b.id === buildingId);
    if (!target) {
      return { success: false, message: 'Không tìm thấy công trình!' };
    }
    if (target.status !== 'active') {
      return { success: false, message: 'Công trình đang thi công hoặc đã bị phá hủy!' };
    }

    const spec = BASE_BUILDING_CATALOG[target.type];
    if (target.level >= spec.maxLevel) {
      return { success: false, message: `${spec.name} đã đạt cấp tối đa (${spec.maxLevel})!` };
    }

    if (target.type === 'main_hall') {
      const checks = checkMainHallUpgradeRequirements(layout.buildings, target.level + 1);
      const missing = checks.filter((c) => !c.met);
      if (missing.length > 0) {
        const first = missing[0];
        const reqName = BASE_BUILDING_CATALOG[first.req.type].name;
        return {
          success: false,
          message: `Chưa đủ điều kiện lên Cấp ${target.level + 1}! Cần ${first.req.count} ${reqName} (Lv.${first.req.minLevel}+), hiện có ${first.current}.`,
        };
      }
    }

    const mainHall = layout.buildings.find((b) => b.type === 'main_hall' && b.status !== 'destroyed');
    const mainHallLvl = mainHall?.level ?? 1;
    if (target.type !== 'main_hall' && target.level + 1 > mainHallLvl) {
      return {
        success: false,
        message: `Cần nâng Đại Bản Doanh lên cấp ${target.level + 1} trước!`,
      };
    }

    const cost = getUpgradeCost(target.type, target.level);
    if (
      state.resources.gold < cost.gold ||
      (state.resources.wood ?? 0) < cost.wood ||
      state.resources.food < cost.food
    ) {
      return {
        success: false,
        message: `Không đủ tài nguyên nâng cấp! Cần ${cost.gold} vàng, ${cost.wood} gỗ${cost.food > 0 ? ` và ${cost.food} lương` : ''}.`,
      };
    }

    set((s) => ({
      resources: {
        ...s.resources,
        gold: s.resources.gold - cost.gold,
        wood: Math.max(0, (s.resources.wood ?? 0) - cost.wood),
        food: s.resources.food - cost.food,
      },
      regionLayouts: {
        ...s.regionLayouts,
        [cityId]: {
          ...layout,
          buildings: layout.buildings.map((b) =>
            b.id === buildingId
              ? {
                  ...b,
                  status: 'upgrading',
                  buildDaysRemaining: cost.days,
                }
              : b
          ),
        },
      },
    }));

    return {
      success: true,
      message: `Đang nâng cấp ${spec.name} lên cấp ${target.level + 1} (${cost.days} ngày).`,
    };
  },

  moveBaseBuilding: (cityId, buildingId, newCol, newRow, rotation) => {
    const layout = get().getOrCreateRegionLayout(cityId);
    const target = layout.buildings.find((b) => b.id === buildingId);
    if (!target) {
      return { success: false, message: 'Không tìm thấy công trình!' };
    }
    const nextRot: 0 | 1 | 2 | 3 = rotation !== undefined ? rotation : target.rotation ?? 0;
    const baseSpec = BASE_BUILDING_CATALOG[target.type];
    const effSpanCols = nextRot % 2 === 1 ? baseSpec.spanRows : baseSpec.spanCols;
    const effSpanRows = nextRot % 2 === 1 ? baseSpec.spanCols : baseSpec.spanRows;
    const baseCity = get().cities.find((c) => c.id === cityId);
    const moveOpts = {
      allowOutside: true,
      basePctX: baseCity?.x ?? 50.8,
      basePctY: baseCity?.y ?? 47.6,
    };
    if (!canPlaceOnRegionGrid(layout.buildings, newCol, newRow, effSpanCols, effSpanRows, buildingId, moveOpts)) {
      return {
        success: false,
        message:
          target.type === 'main_hall'
            ? 'Không thể di dời Nhà Chính ra quá xa khiến công trình đã xây nằm ngoài phạm vi!'
            : 'Vị trí mới bị vướng công trình khác, nằm trên mặt nước hoặc vượt phạm vi Nhà Chính!',
      };
    }

    set((s) => ({
      regionLayouts: {
        ...s.regionLayouts,
        [cityId]: {
          ...layout,
          buildings: layout.buildings.map((b) =>
            b.id === buildingId
              ? { ...b, col: newCol, row: newRow, spanCols: effSpanCols, spanRows: effSpanRows, rotation: nextRot }
              : b
          ),
        },
      },
    }));
    return { success: true, message: 'Đã di chuyển công trình!' };
  },

  demolishBaseBuilding: (cityId, buildingId) => {
    const layout = get().getOrCreateRegionLayout(cityId);
    const target = layout.buildings.find((b) => b.id === buildingId);
    if (!target) return { success: false, message: 'Không tìm thấy công trình!' };
    if (target.type === 'main_hall') {
      return { success: false, message: 'Không thể tự phá hủy Đại Bản Doanh!' };
    }

    set((s) => ({
      regionLayouts: {
        ...s.regionLayouts,
        [cityId]: {
          ...layout,
          buildings: layout.buildings.filter((b) => b.id !== buildingId),
        },
      },
    }));
    return { success: true, message: `Đã tháo dỡ ${BASE_BUILDING_CATALOG[target.type].name}.` };
  },

  assignBuildingSupervisor: (cityId, buildingId, generalId) => {
    const state = get();
    const layout = state.getOrCreateRegionLayout(cityId);
    const target = layout.buildings.find((b) => b.id === buildingId);
    if (!target) return { success: false, message: 'Không tìm thấy công trình!' };

    if (generalId) {
      const gen = state.generals.find((g) => g.id === generalId && g.unlocked);
      if (!gen) return { success: false, message: 'Vị tướng này chưa sẵn sàng!' };

      // Đảm bảo 1 tướng chỉ giám sát 1 công trình tại một thời điểm
      const nextLayouts: Record<string, RegionLayout> = {};
      for (const [cid, lay] of Object.entries(state.regionLayouts)) {
        nextLayouts[cid] = {
          ...lay,
          buildings: lay.buildings.map((b) => {
            if (cid === cityId && b.id === buildingId) {
              return { ...b, supervisorGeneralId: generalId };
            }
            if (b.supervisorGeneralId === generalId) {
              return { ...b, supervisorGeneralId: null };
            }
            return b;
          }),
        };
      }
      set({ regionLayouts: nextLayouts });
      return {
        success: true,
        message: `Đã cắt cử ${gen.name} giám sát ${BASE_BUILDING_CATALOG[target.type].name}.`,
      };
    }

    set((s) => ({
      regionLayouts: {
        ...s.regionLayouts,
        [cityId]: {
          ...layout,
          buildings: layout.buildings.map((b) =>
            b.id === buildingId ? { ...b, supervisorGeneralId: null } : b
          ),
        },
      },
    }));
    return { success: true, message: 'Đã rút tướng giám sát khỏi công trình.' };
  },

  repairBaseBuilding: (cityId, buildingId) => {
    const state = get();
    const layout = state.getOrCreateRegionLayout(cityId);
    const target = layout.buildings.find((b) => b.id === buildingId);
    if (!target) return { success: false, message: 'Không tìm thấy công trình!' };
    if (target.hp >= target.maxHp) {
      return { success: false, message: 'Công trình vẫn đang nguyên vẹn!' };
    }

    const spec = BASE_BUILDING_CATALOG[target.type];
    const missingRatio = Math.max(0.05, (target.maxHp - target.hp) / Math.max(1, target.maxHp));
    const goldCost = Math.max(2, Math.ceil(spec.goldCost * 0.5 * missingRatio));
    const woodCost = Math.max(2, Math.ceil(spec.woodCost * 0.5 * missingRatio));

    if (state.resources.gold < goldCost || (state.resources.wood ?? 0) < woodCost) {
      return {
        success: false,
        message: `Không đủ tài nguyên sửa chữa! Cần ${goldCost} vàng và ${woodCost} gỗ.`,
      };
    }

    set((s) => ({
      resources: {
        ...s.resources,
        gold: s.resources.gold - goldCost,
        wood: Math.max(0, (s.resources.wood ?? 0) - woodCost),
      },
      regionLayouts: {
        ...s.regionLayouts,
        [cityId]: {
          ...layout,
          buildings: layout.buildings.map((b) =>
            b.id === buildingId
              ? { ...b, hp: b.maxHp, status: b.status === 'destroyed' ? 'active' : b.status }
              : b
          ),
        },
      },
    }));

    return {
      success: true,
      message: `Đã sửa chữa xong ${spec.name} (-${goldCost}V, -${woodCost} gỗ).`,
    };
  },

  promoteToEliteTroops: (cityId, count) => {
    const state = get();
    const layout = state.getOrCreateRegionLayout(cityId);
    const maxBarracksLvl = layout.buildings
      .filter((b) => b.type === 'barracks' && b.status === 'active')
      .reduce((m, b) => Math.max(m, b.level), 0);

    if (maxBarracksLvl < 3) {
      return { success: false, message: 'Cần Trại Luyện Binh Cấp 3 trở lên để huấn luyện quân Tinh Nhuệ!' };
    }

    const batchLimit = maxBarracksLvl >= 4 ? 30 : 15;
    const req = Math.min(batchLimit, Math.max(1, Math.floor(count)));
    const availRegular = Math.max(0, Math.floor(state.resources.troops - (state.resources.eliteTroops ?? 0)));
    if (availRegular < req) {
      return { success: false, message: `Không đủ Binh sĩ thường để thăng cấp (hiện có ${availRegular})!` };
    }

    const goldCost = req * 15;
    const weaponCost = req;
    if (state.resources.gold < goldCost || state.resources.weapons < weaponCost) {
      return {
        success: false,
        message: `Cần ${goldCost} vàng và ${weaponCost} khí giới để trang bị cho ${req} Tinh Nhuệ!`,
      };
    }

    set((s) => ({
      resources: {
        ...s.resources,
        gold: s.resources.gold - goldCost,
        eliteTroops: (s.resources.eliteTroops ?? 0) + req,
      },
    }));

    return {
      success: true,
      message: `Đã tinh tuyển thành công ${req} quân Tinh Nhuệ!`,
    };
  },

  tickRegionConstruction: () => {
    const state = get();
    const nextLayouts: Record<string, RegionLayout> = {};
    let changed = false;

    for (const [cityId, layout] of Object.entries(state.regionLayouts)) {
      let layoutChanged = false;
      const updatedBuildings = layout.buildings.map((b) => {
        if ((b.status === 'building' || b.status === 'upgrading') && typeof b.buildDaysRemaining === 'number') {
          layoutChanged = true;
          const nextDays = Math.max(0, b.buildDaysRemaining - 1);
          if (nextDays === 0) {
            const nextLevel = b.status === 'upgrading' ? b.level + 1 : b.level;
            const nextMaxHp = getBuildingMaxHp(b.type, nextLevel);
            return {
              ...b,
              level: nextLevel,
              maxHp: nextMaxHp,
              hp: nextMaxHp,
              status: 'active' as const,
              buildDaysRemaining: 0,
            };
          }
          return {
            ...b,
            buildDaysRemaining: nextDays,
          };
        }
        return b;
      });

      if (layoutChanged) {
        changed = true;
        nextLayouts[cityId] = { ...layout, buildings: updatedBuildings };
      } else {
        nextLayouts[cityId] = layout;
      }
    }

    if (changed) {
      set({ regionLayouts: nextLayouts });
    }
  },

  markRegionScouted: (cityId: string) => {
    const state = get();
    const layout = state.getOrCreateRegionLayout(cityId);
    const absoluteDay = state.year * 365 + state.month * 30 + state.day;
    set((s) => ({
      scoutedRegionIds: {
        ...s.scoutedRegionIds,
        [cityId]: absoluteDay,
      },
      regionLayouts: {
        ...s.regionLayouts,
        [cityId]: {
          ...layout,
          lastScoutedDay: absoluteDay,
        },
      },
    }));
  },

  setRegionLayout: (cityId: string, layout: RegionLayout) => {
    set((s) => ({
      regionLayouts: {
        ...s.regionLayouts,
        [cityId]: layout,
      },
    }));
  },

  startSiege3D: (targetCityId, formationId) => {
    const state = get();
    const city = state.cities.find((c) => c.id === targetCityId);
    const formation = state.formations.find((f) => f.id === formationId);
    if (!city || !formation) return;
    const layout = state.getOrCreateRegionLayout(targetCityId);
    const battle = createSiegeBattle(targetCityId, city.name, formation, layout, city.troops);
    state.enterAutoPause();
    set({ activeSiegeBattle: battle });
  },

  resolveSiege3D: (finalState) => {
    const state = get();
    const isVictory = finalState.status === 'victory';
    const nextCities = state.cities.map((c) => {
      if (c.id !== finalState.targetCityId) return c;
      if (isVictory && finalState.mainHallDestroyed) {
        return {
          ...c,
          faction: 'lam_son' as const,
          hasBase: true,
          troops: Math.max(40, Math.round(c.troops * 0.2)),
        };
      }
      return {
        ...c,
        troops: Math.max(0, Math.round(c.troops * (1 - finalState.destructionPercent / 140))),
      };
    });

    set((s) => ({
      activeSiegeBattle: null,
      cities: nextCities,
      regionLayouts: {
        ...s.regionLayouts,
        [finalState.targetCityId]: finalState.layout,
      },
      resources: {
        ...s.resources,
        food: s.resources.food + finalState.lootFood,
        weapons: s.resources.weapons + finalState.lootWeapons,
        gold: s.resources.gold + finalState.lootGold,
      },
    }));

    if (isVictory && finalState.mainHallDestroyed) {
      notify.success(`Chiếm lĩnh thành công ${finalState.targetCityName}! Thu được ${finalState.lootFood} lương, ${finalState.lootGold} vàng.`);
    } else if (isVictory) {
      notify.success(`Đánh phá ${finalState.targetCityName} (${finalState.destructionPercent}%)! Cướp được ${finalState.lootFood} lương, ${finalState.lootGold} vàng.`);
    } else {
      notify.warning(`Đợt công thành ${finalState.targetCityName} thất bại.`);
    }
    state.exitAutoPause();
  },

  closeSiege3D: () => {
    set({ activeSiegeBattle: null });
    get().exitAutoPause();
  },

  startAmbush3D: (formationId, districtName, mingTroops) => {
    const state = get();
    const formation = state.formations.find((f) => f.id === formationId);
    if (!formation) return;
    const battle = createAmbushBattle(formation, districtName, mingTroops);
    state.enterAutoPause();
    set({ activeAmbushBattle: battle });
  },

  resolveAmbush3D: (finalState) => {
    const state = get();
    const aliveSoldiers = finalState.units
      .filter((u) => u.faction === 'lam_son' && u.hp > 0)
      .reduce((sum, u) => sum + u.soldiers, 0);

    set((s) => ({
      activeAmbushBattle: null,
      formations: s.formations.map((f) => {
        if (f.id !== finalState.formationId) return f;
        if (finalState.status === 'defeat') {
          return { ...f, totalTroops: 0, status: 'retreating' as const };
        }
        return { ...f, totalTroops: Math.max(10, aliveSoldiers) };
      }),
    }));

    if (finalState.status === 'defeat') {
      notify.error(`Đạo quân bị đánh tan trong ổ phục kích tại ${finalState.districtName}!`);
    } else {
      set((s) => ({
        suspicionRateMultiplier: Number((s.suspicionRateMultiplier + 0.35).toFixed(2)),
      }));
      notify.success(`Đã đánh lui quân Minh tại ${finalState.districtName}! (Tốc độ nghi ngờ về sau tăng nhanh hơn)`);
    }
    state.exitAutoPause();
  },

  chooseMingRaidResponse: (choice) => {
    const state = get();
    const raid = state.pendingMingRaid;
    if (!raid) return;
    set({ pendingMingRaid: null });

    if (choice === 'evacuate') {
      const layout = state.getOrCreateRegionLayout(raid.cityId);
      const damagedBuildings = layout.buildings.map((b) =>
        b.type === 'road' || b.status === 'destroyed'
          ? b
          : { ...b, hp: Math.max(1, Math.round(b.maxHp * 0.35)) }
      );
      set((s) => ({
        evacuationDaysRemaining: 10,
        resources: {
          ...s.resources,
          food: Math.round(s.resources.food * 0.6),
          morale: Math.max(20, s.resources.morale - 8),
        },
        regionLayouts: {
          ...s.regionLayouts,
          [raid.cityId]: { ...layout, buildings: damagedBuildings },
        },
      }));
      state.exitAutoPause();
      notify.warning(
        `Đã sơ tán lên Trại Dã Chiến Chí Linh (10 ngày)! Căn cứ bị giặc tàn phá và mất 40% lương thực.`
      );
      return;
    }

    if (choice === 'ambush') {
      const formation =
        state.formations.find((f) => f.faction === 'lam_son' && f.totalTroops > 0) ||
        state.formations.find((f) => f.faction === 'lam_son');
      if (formation) {
        state.startAmbush3D(formation.id, raid.sourceName, raid.enemyTroops);
        return;
      }
    }

    state.startDefense3D(raid.cityId, raid.enemyTroops);
  },

  retreatAmbushToDefense: () => {
    const state = get();
    const ambush = state.activeAmbushBattle;
    if (!ambush) return;
    const baseCity =
      state.cities.find((c) => c.id === 'lam_son' && c.faction === 'lam_son') ||
      state.cities.find((c) => c.faction === 'lam_son' && c.hasBase);
    const remainingEnemy = ambush.units
      .filter((u) => u.faction === 'ming' && u.hp > 0)
      .reduce((sum, u) => sum + u.soldiers, 0);

    set((s) => ({
      activeAmbushBattle: null,
      resources: {
        ...s.resources,
        troops: Math.max(10, Math.round(s.resources.troops * 0.85)),
        morale: Math.max(15, s.resources.morale - 10),
      },
    }));

    if (baseCity) {
      notify.warning('Nghĩa quân rút về cố thủ trong căn cứ!');
      state.startDefense3D(baseCity.id, Math.max(20, remainingEnemy));
    } else {
      state.exitAutoPause();
    }
  },

  performEvacuationAction: (action) => {
    const state = get();
    if (state.evacuationDaysRemaining <= 0) {
      return { success: false, message: 'Không còn trong thời gian sơ tán!' };
    }
    const absDay = (state.year - 1416) * 365 + (state.month - 1) * 30 + state.day;
    if (state.evacuationLastActionDay >= absDay) {
      return { success: false, message: 'Hôm nay đã thực hiện hoạt động dã chiến rồi!' };
    }

    if (action === 'forage') {
      set((s) => ({
        evacuationLastActionDay: absDay,
        resources: {
          ...s.resources,
          food: s.resources.food + 75,
          morale: Math.min(100, s.resources.morale + 3),
        },
      }));
      return { success: true, message: 'Săn bắt dã chiến thu được +75 Lương và +3% Sĩ khí!' };
    }

    if (action === 'skirmish') {
      const loss = Math.min(4, Math.max(0, state.resources.troops - 10));
      set((s) => ({
        evacuationLastActionDay: absDay,
        resources: {
          ...s.resources,
          troops: Math.max(10, s.resources.troops - loss),
          gold: s.resources.gold + 30,
          swords: s.resources.swords + 8,
          weapons: s.resources.weapons + 8,
          morale: Math.min(100, s.resources.morale + 4),
        },
      }));
      return {
        success: true,
        message: `Tập kích toán tuần tra Minh: +30 Vàng, +8 Kiếm, +4% Sĩ khí${loss > 0 ? ` (-${loss} quân)` : ''}!`,
      };
    }

    set((s) => ({
      evacuationLastActionDay: absDay,
      resources: {
        ...s.resources,
        morale: Math.min(100, s.resources.morale + 10),
      },
    }));
    return { success: true, message: 'Nghỉ ngơi chỉnh đốn hàng ngũ: +10% Sĩ khí!' };
  },

  triggerPreUprisingVictory: () => {
    const state = get();
    const { troops, food, weapons, morale } = state.resources;
    const eliteTroops = state.resources.eliteTroops ?? 0;

    if (troops < 120 || food < 1500 || weapons < 100 || morale < 50) {
      return {
        success: false,
        message: 'Chưa đủ điều kiện tối thiểu để Phất Cờ Khởi Nghĩa (cần >= 120 quân, 1.500 lương, 100 khí giới, 50% sĩ khí)!',
      };
    }

    const scoutedCount = Object.keys(state.scoutedRegionIds ?? {}).length;
    const score =
      troops * 2 +
      eliteTroops * 5 +
      Math.round(food / 10) +
      weapons * 2 +
      scoutedCount * 40 +
      morale * 3;

    let rank: UprisingResult['rank'] = 'C';
    let title = 'Khởi Nghĩa Gian Nan';
    if (score >= 2200 && eliteTroops >= 20) {
      rank = 'S';
      title = 'Vạn Toàn Đại Nghĩa — Thế Như Chẻ Tre';
    } else if (score >= 1400) {
      rank = 'A';
      title = 'Bình Định Vương Xuất Chinh';
    } else if (score >= 850) {
      rank = 'B';
      title = 'Tụ Nghĩa Lam Sơn';
    }

    const result: UprisingResult = {
      rank,
      title,
      score,
      troops,
      eliteTroops,
      food: Math.round(food),
      weapons: Math.round(weapons),
      scoutedCount,
      dateStr: `${state.day}/${state.month}/${state.year}`,
    };

    set({
      uprisingResult: result,
      gameStatus: 'victory',
      isPaused: true,
    });
    notify.success(`Bình Định Vương Phất Cờ Khởi Nghĩa! Đạt bậc [${rank}] — ${title}`);
    return { success: true, message: `Phất cờ khởi nghĩa thành công (${rank})!` };
  },

  craftWeaponAtForge3D: (cityId, forgeId, weaponType) => {
    const state = get();
    const layout = state.getOrCreateRegionLayout(cityId);
    const forge = layout.buildings.find((b) => b.id === forgeId && b.type === 'forge' && b.status === 'active');
    if (!forge) return { success: false, message: 'Lò rèn chưa sẵn sàng!' };
    if ((weaponType === 'bow' || weaponType === 'spear') && forge.level < 2) {
      return { success: false, message: 'Cần Lò Rèn Cấp 2 trở lên để đúc Cung và Giáo!' };
    }
    const batch = [10, 18, 28, 42][Math.min(3, Math.max(0, forge.level - 1))];
    const costMult = forge.level >= 4 ? 0.75 : forge.level >= 2 ? 0.9 : 1;
    const oreCost = Math.max(1, Math.round(batch * costMult));
    const goldCost = Math.max(1, Math.round(batch * 1.5 * costMult));

    if ((state.resources.ironOre ?? 0) < oreCost || state.resources.gold < goldCost) {
      return {
        success: false,
        message: `Không đủ nguyên liệu! Cần ${oreCost} Quặng thô và ${goldCost} Vàng.`,
      };
    }

    const suspMult = forge.level >= 3 ? 0.8 : 1;
    const suspGain = Number((1.2 * suspMult).toFixed(2));
    const key = weaponType === 'sword' ? 'swords' : weaponType === 'bow' ? 'bows' : 'spears';
    const label = weaponType === 'sword' ? 'Kiếm' : weaponType === 'bow' ? 'Cung' : 'Giáo';

    set((s) => ({
      resources: {
        ...s.resources,
        ironOre: Math.max(0, (s.resources.ironOre ?? 0) - oreCost),
        gold: s.resources.gold - goldCost,
        [key]: s.resources[key] + batch,
        weapons: s.resources.weapons + batch,
      },
      suspicion: Math.min(100, s.suspicion + suspGain),
    }));

    return {
      success: true,
      message: `Lò Rèn Lv.${forge.level} đã đúc +${batch} ${label} (-${oreCost} Quặng, -${goldCost}V, +${suspGain}% nghi ngờ).`,
    };
  },

  startDefense3D: (cityId, mingAttackTroops) => {
    const state = get();
    const city = state.cities.find((c) => c.id === cityId);
    if (!city) return;
    const layout = state.getOrCreateRegionLayout(cityId);
    const battle = createDefenseBattle(city, layout, mingAttackTroops);
    state.enterAutoPause();
    set({ activeDefenseBattle: battle });
  },

  resolveDefense3D: (finalState) => {
    const state = get();
    const lamSonBases = state.cities.filter((c) => c.faction === 'lam_son');

    if (finalState.status === 'defeat') {
      if (lamSonBases.length <= 1) {
        set({
          activeDefenseBattle: null,
          gameStatus: 'defeat',
        });
        notify.error(`Căn cứ duy nhất ${finalState.cityName} đã bị đánh nát! Đại nghiệp sụp đổ.`);
        return;
      }

      // Căn cứ bị đánh nát -> bắt buộc di dời sang nơi khác
      set((s) => ({
        activeDefenseBattle: null,
        regionLayouts: {
          ...s.regionLayouts,
          [finalState.cityId]: generateLamSonStarterLayout(finalState.cityId),
        },
        resources: {
          ...s.resources,
          food: Math.round(s.resources.food * 0.6),
          gold: Math.round(s.resources.gold * 0.6),
        },
      }));
      useUIStore.getState().setBaseRelocateMode({ baseId: finalState.cityId });
      notify.warning(`${finalState.cityName} bị đánh nát! Hãy chọn vùng đất mới trên bản đồ để di dời căn cứ.`);
      state.exitAutoPause();
      return;
    }

    set((s) => ({
      activeDefenseBattle: null,
      suspicionRateMultiplier: Number((s.suspicionRateMultiplier + 0.35).toFixed(2)),
      regionLayouts: {
        ...s.regionLayouts,
        [finalState.cityId]: finalState.layout,
      },
    }));
    notify.success(`Đã đẩy lùi quân Minh, giữ vững căn cứ ${finalState.cityName}! (Lưu ý: Độ nghi ngờ về sau sẽ tăng nhanh hơn)`);
    state.exitAutoPause();
  },

  completeTerrainClearing: (cityId, key, kind) => {
    const rewardGold = kind === 'clear_forest' ? 35 : 8;
    const rewardFood = kind === 'clear_forest' ? 25 : 5;
    set((s) => {
      const prev = s.clearedTerrainKeys?.[cityId] ?? [];
      if (prev.includes(key)) return s;
      return {
        clearedTerrainKeys: {
          ...s.clearedTerrainKeys,
          [cityId]: [...prev, key],
        },
        resources: {
          ...s.resources,
          gold: s.resources.gold + rewardGold,
          food: s.resources.food + rewardFood,
        },
      };
    });
  },

  setBaseAutomation: (cityId, patch) => {
    set((s) => {
      const prev = s.baseAutomation?.[cityId] ?? {
        dayNightLock: 'auto',
        autoClean: false,
        autoRefugees: false,
        autoTrain: false,
      };
      return {
        baseAutomation: {
          ...s.baseAutomation,
          [cityId]: { ...prev, ...patch },
        },
      };
    });
  },

  clearBush: (cityId, bushId) => {
    set((s) => {
      const list = s.bushes?.[cityId] ?? [];
      if (!list.some((b) => b.id === bushId)) return s;
      return {
        bushes: {
          ...s.bushes,
          [cityId]: list.filter((b) => b.id !== bushId),
        },
        resources: {
          ...s.resources,
          gold: s.resources.gold + 3,
          food: s.resources.food + 3,
        },
      };
    });
  },

  toggleDefenseFormation: (cityId, formationId) => {
    set((s) => {
      const prev = s.defenseFormationIds?.[cityId] ?? [];
      const next = prev.includes(formationId)
        ? prev.filter((id) => id !== formationId)
        : [...prev, formationId];
      return {
        defenseFormationIds: {
          ...s.defenseFormationIds,
          [cityId]: next,
        },
      };
    });
  },

  startWatchtowerScout: (watchtowerId, targetId, targetName, days) => {
    const state = get();
    if (state.activeWatchtowerScouts?.[watchtowerId]) {
      return {
        success: false,
        message: 'Chòi canh này đang cử người đi do thám khu vực khác!',
      };
    }
    if (state.scoutedRegionIds?.[targetId]) {
      return {
        success: false,
        message: `${targetName} đã được do thám trước đó!`,
      };
    }
    const safeDays = Math.max(1, Math.round(days));
    set((s) => ({
      activeWatchtowerScouts: {
        ...s.activeWatchtowerScouts,
        [watchtowerId]: {
          targetId,
          targetName,
          totalDays: safeDays,
          daysRemaining: safeDays,
        },
      },
    }));
    return {
      success: true,
      message: `Đã cử trinh sát do thám ${targetName} (dự kiến ${safeDays} ngày).`,
    };
  },

  startWatchtowerNormalHunt: (cityId, watchtowerId, tier) => {
    const state = get();
    const layout = state.getOrCreateRegionLayout(cityId);
    const wt = layout.buildings.find((b) => b.id === watchtowerId && b.type === 'watchtower' && b.status === 'active');
    if (!wt) return { success: false, message: 'Chòi canh chưa sẵn sàng!' };
    if (wt.level < tier) {
      return { success: false, message: `Cần Chòi Canh Cấp ${tier} để đi săn Cấp ${tier}!` };
    }
    if (!wt.supervisorGeneralId) {
      return { success: false, message: 'Chòi canh cần có Tướng Giám Sát mới có thể phái đội đi săn Cấp 1–3!' };
    }
    if (state.activeNormalHunt?.[watchtowerId]) {
      return { success: false, message: 'Chòi canh đang có 1 đội đi săn Cấp 1–3 chưa trở về!' };
    }
    const days = tier === 1 ? 3 : tier === 2 ? 4 : 5;
    set((s) => ({
      activeNormalHunt: {
        ...s.activeNormalHunt,
        [watchtowerId]: { tier, totalDays: days, daysRemaining: days },
      },
    }));
    return {
      success: true,
      message: `Đã phái đội đi săn Cấp ${tier} (${days} ngày).`,
    };
  },

  startWatchtowerRareHunt: (cityId, watchtowerId, leaderGeneralId) => {
    const state = get();
    const layout = state.getOrCreateRegionLayout(cityId);
    const wt = layout.buildings.find((b) => b.id === watchtowerId && b.type === 'watchtower' && b.status === 'active');
    if (!wt) return { success: false, message: 'Chòi canh chưa sẵn sàng!' };
    if (wt.level < 4) {
      return { success: false, message: 'Cần Chòi Canh Cấp 4 để mở khóa Săn Bảo Vật Hiếm (Cấp 4)!' };
    }
    if (state.activeRareHunt?.[watchtowerId]) {
      return { success: false, message: 'Đội săn Cấp 4 đang trên đường trở về!' };
    }
    const absDay = (state.year - 1416) * 365 + (state.month - 1) * 30 + state.day;
    const lastRareDay = state.watchtowerLastRareHuntDay?.[watchtowerId] ?? -99;
    const daysSince = absDay - lastRareDay;
    if (daysSince < 7) {
      return {
        success: false,
        message: `Săn Cấp 4 chỉ được thực hiện 1 tuần/lần (còn ${7 - daysSince} ngày hồi)!`,
      };
    }
    const gen = state.generals.find((g) => g.id === leaderGeneralId && g.unlocked);
    if (!gen) return { success: false, message: 'Vui lòng chọn 1 vị tướng hợp lệ dẫn đội Cấp 4!' };

    // Nếu dùng chính tướng đang giám sát Chòi Canh đi Cấp 4 -> rút khỏi ghế giám sát
    const nextBuildings =
      wt.supervisorGeneralId === leaderGeneralId
        ? layout.buildings.map((b) => (b.id === watchtowerId ? { ...b, supervisorGeneralId: null } : b))
        : layout.buildings;

    set((s) => ({
      watchtowerLastRareHuntDay: {
        ...s.watchtowerLastRareHuntDay,
        [watchtowerId]: absDay,
      },
      activeRareHunt: {
        ...s.activeRareHunt,
        [watchtowerId]: {
          leaderGeneralId,
          leaderName: gen.name,
          totalDays: 6,
          daysRemaining: 6,
        },
      },
      regionLayouts: {
        ...s.regionLayouts,
        [cityId]: { ...layout, buildings: nextBuildings },
      },
    }));

    return {
      success: true,
      message: `${gen.name} đã dẫn đội xuất phát săn Bảo Vật Hiếm (Cấp 4 · 6 ngày)!`,
    };
  },

  buyFromDistrictMarket: (cityId, good, amount) => {
    const state = get();
    const qty = Math.max(1, Math.round(amount));
    const isLamSon = state.cities.find((c) => c.id === cityId)?.faction === 'lam_son';
    if (!isLamSon && !state.scoutedRegionIds?.[cityId]) {
      return { success: false, message: 'Cần do thám mở huyện thành này trước khi giao thương!' };
    }
    const unitPrice = good === 'wood' ? 1.4 : good === 'ironOre' ? 2.2 : 0.35;
    const totalGold = Math.max(1, Math.round(qty * unitPrice));
    if (state.resources.gold < totalGold) {
      return { success: false, message: `Không đủ vàng! Cần ${totalGold}V.` };
    }
    const suspicionGain = Math.min(8, Math.max(0.5, Number((qty * 0.04).toFixed(2))));
    const label = good === 'wood' ? 'Gỗ' : good === 'ironOre' ? 'Quặng thô' : 'Lương thực';

    set((s) => ({
      resources: {
        ...s.resources,
        gold: s.resources.gold - totalGold,
        [good]: (s.resources[good] ?? 0) + qty,
      },
      suspicion: Math.min(100, s.suspicion + suspicionGain),
    }));

    return {
      success: true,
      message: `Đã mua ${qty} ${label} (-${totalGold}V, +${suspicionGain}% nghi ngờ).`,
    };
  },

  forageFromWatchtower: (watchtowerId, watchtowerLevel, mode = 'gather') => {
    const state = get();
    const absDay = (state.year - 1418) * 365 + (state.month - 1) * 30 + state.day;
    const lastDay = state.watchtowerLastForageDay?.[watchtowerId] ?? -1;
    if (lastDay >= absDay) {
      return {
        success: false,
        message: 'Chòi canh này hôm nay đã cử người đi săn bắt hái lượm rồi! Hãy quay lại vào ngày mai.',
      };
    }

    if (mode === 'treasure' && state.resources.food < 10) {
      return {
        success: false,
        message: 'Chế độ Thám Bảo Cổ Tích cần 10 lương thực làm lộ phí!',
      };
    }

    const baseRare = 0.14 + watchtowerLevel * 0.1;
    const rareChance =
      mode === 'treasure'
        ? Math.min(0.85, baseRare * 1.9)
        : mode === 'hunt'
        ? Math.min(0.7, baseRare * 1.15)
        : Math.min(0.65, baseRare);
    const isRareRoll = Math.random() < rareChance;
    let pool = FORAGED_ITEM_CATALOG.filter((it) => it.rare === isRareRoll);
    if (mode === 'gather' && !isRareRoll) {
      pool = FORAGED_ITEM_CATALOG.filter((it) => it.id === 'thao_duoc' || it.id === 'mat_ong_rung');
    } else if (mode === 'hunt' && !isRareRoll) {
      pool = FORAGED_ITEM_CATALOG.filter((it) => it.id === 'da_thu' || it.id === 'mat_ong_rung');
    } else if (mode === 'treasure' && isRareRoll) {
      pool = FORAGED_ITEM_CATALOG.filter((it) => it.id === 'ngoc_bich' || it.id === 'tram_huong' || it.id === 'nhan_sam');
    }
    const picked = pool[Math.floor(Math.random() * pool.length)] ?? FORAGED_ITEM_CATALOG[0];

    const newItem: ForagedInventoryItem = {
      uid: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      itemId: picked.id,
      name: picked.name,
      rare: picked.rare,
      basePrice: picked.basePrice,
    };

    const foodDelta =
      mode === 'treasure'
        ? -10 + 4
        : mode === 'hunt'
        ? 12 + watchtowerLevel * 3
        : 8 + watchtowerLevel * 2;
    set((s) => ({
      watchtowerLastForageDay: {
        ...s.watchtowerLastForageDay,
        [watchtowerId]: absDay,
      },
      foragedInventory: [newItem, ...(s.foragedInventory ?? [])],
      resources: {
        ...s.resources,
        food: Math.max(0, s.resources.food + foodDelta),
      },
    }));

    const foodText = foodDelta >= 0 ? `+${foodDelta} lương` : `${foodDelta} lương lộ phí`;
    return {
      success: true,
      message: picked.rare
        ? `Thu được VẬT PHẨM HIẾM [${picked.name}] (${foodText})! Có thể đem bán hoặc đấu giá tại Chợ.`
        : `Thu được [${picked.name}] (${foodText})!`,
      item: newItem,
    };
  },

  sellForagedItem: (uid, cityId) => {
    const state = get();
    const item = (state.foragedInventory ?? []).find((it) => it.uid === uid);
    if (!item) return { success: false, message: 'Không tìm thấy vật phẩm!' };
    const layout = state.getOrCreateRegionLayout(cityId);
    const market = layout.buildings.find((b) => b.type === 'market' && b.status === 'active');
    const marketLvl = market?.level ?? 1;
    const price = Math.round(item.basePrice * (1 + (marketLvl - 1) * 0.15));

    set((s) => ({
      foragedInventory: (s.foragedInventory ?? []).filter((it) => it.uid !== uid),
      resources: {
        ...s.resources,
        gold: s.resources.gold + price,
      },
    }));

    return {
      success: true,
      message: `Đã bán [${item.name}] tại Chợ Phiên thu về +${price} vàng!`,
    };
  },

  sellBaseResourceAtMarket: (cityId, kind, amount) => {
    const state = get();
    const avail = state.resources[kind] ?? 0;
    if (avail < amount || amount <= 0) {
      return { success: false, message: 'Không đủ số lượng trong kho để bán!' };
    }

    const layout = state.getOrCreateRegionLayout(cityId);
    const market = layout.buildings.find((b) => b.type === 'market' && b.status === 'active');
    const marketLvl = market?.level ?? 1;
    const bonus = 1 + (marketLvl - 1) * 0.15;
    const unitBase = kind === 'food' ? 0.2 : kind === 'swords' ? 3 : kind === 'spears' ? 3.2 : 3.5;
    const goldGain = Math.max(1, Math.round(amount * unitBase * bonus));
    const label =
      kind === 'food' ? 'Lương thực' : kind === 'swords' ? 'Kiếm' : kind === 'spears' ? 'Giáo' : 'Cung';

    set((s) => ({
      resources: {
        ...s.resources,
        [kind]: s.resources[kind] - amount,
        gold: s.resources.gold + goldGain,
      },
    }));

    return {
      success: true,
      message: `Đã bán ${amount} ${label} tại Chợ Phiên thu về +${goldGain} vàng!`,
    };
  },

  sellMarketGoods: (cityId, payload) => {
    const state = get();
    const amount = Math.max(1, Math.round(payload.amount));
    const askPrice = Math.max(1, Math.round(payload.askPrice));
    const layout = state.getOrCreateRegionLayout(cityId);
    const market = layout.buildings.find((b) => b.type === 'market' && b.status === 'active');
    const marketLvl = market?.level ?? 1;
    const bonus = 1 + (marketLvl - 1) * 0.15;

    let itemName = '';
    let fairTotal = 0;
    let isRare = false;

    if (payload.kind === 'item') {
      const matching = (state.foragedInventory ?? []).filter((it) => it.itemId === payload.itemId);
      if (matching.length < amount) {
        return { success: false, message: 'Không đủ số lượng vật phẩm trong kho!' };
      }
      const sample = matching[0];
      itemName = `${amount} ${sample.name}`;
      fairTotal = Math.max(1, Math.round(sample.basePrice * amount * bonus));
      isRare = sample.rare;
    } else {
      const avail = state.resources[payload.kind] ?? 0;
      if (avail < amount) {
        return { success: false, message: 'Không đủ số lượng trong kho để bán!' };
      }
      const unitBase =
        payload.kind === 'food'
          ? 0.2
          : payload.kind === 'wood'
          ? 0.8
          : payload.kind === 'ironOre'
          ? 1.2
          : payload.kind === 'swords'
          ? 3
          : payload.kind === 'spears'
          ? 3.2
          : 3.5;
      fairTotal = Math.max(1, Math.round(amount * unitBase * bonus));
      const label =
        payload.kind === 'food'
          ? 'Lương thực'
          : payload.kind === 'wood'
          ? 'Gỗ'
          : payload.kind === 'ironOre'
          ? 'Quặng thô'
          : payload.kind === 'swords'
          ? 'Kiếm'
          : payload.kind === 'spears'
          ? 'Giáo'
          : 'Cung';
      itemName = `${amount} ${label}`;
    }

    const maxAcceptable = Math.max(fairTotal + 3, Math.round(fairTotal * (isRare ? 1.8 : 1.35)));
    if (askPrice > maxAcceptable) {
      return {
        success: false,
        message: `Thương nhân từ chối: Giá bán (${askPrice}V) quá cao so với giá thị trường (~${fairTotal}V, tối đa ~${maxAcceptable}V)!`,
      };
    }

    set((s) => {
      if (payload.kind === 'item') {
        let removed = 0;
        const nextInv = (s.foragedInventory ?? []).filter((it) => {
          if (it.itemId === payload.itemId && removed < amount) {
            removed++;
            return false;
          }
          return true;
        });
        return {
          foragedInventory: nextInv,
          resources: {
            ...s.resources,
            gold: s.resources.gold + askPrice,
          },
        };
      }
      return {
        resources: {
          ...s.resources,
          [payload.kind]: Math.max(0, (s.resources[payload.kind] ?? 0) - amount),
          gold: s.resources.gold + askPrice,
        },
      };
    });

    return {
      success: true,
      message: `Đã bán ${itemName} tại Chợ Phiên thu về +${askPrice} vàng!`,
    };
  },

  runMarketAuction: (cityId, payload) => {
    const state = get();
    const monthKey = `${state.year}-${state.month}`;
    if (state.lastAuctionMonthKey === monthKey) {
      return {
        success: false,
        message: 'Mỗi tháng chỉ được tổ chức đấu giá 1 lần! Hãy chờ sang tháng sau.',
      };
    }

    const layout = state.getOrCreateRegionLayout(cityId);
    const market = layout.buildings.find((b) => b.type === 'market' && b.status === 'active');
    const marketLvl = market?.level ?? 1;
    const bonus = 1 + (marketLvl - 1) * 0.15;

    let itemName = '';
    let fairValue = 0;
    let isRare = false;

    if (payload.kind === 'item') {
      if (payload.itemId) {
        const amt = Math.max(1, Math.round(payload.amount ?? 1));
        const matching = (state.foragedInventory ?? []).filter((it) => it.itemId === payload.itemId);
        if (matching.length < amt) {
          return { success: false, message: 'Không đủ số lượng vật phẩm để đấu giá!' };
        }
        const sample = matching[0];
        itemName = amt > 1 ? `${amt} ${sample.name}` : sample.name;
        fairValue = Math.max(1, Math.round(sample.basePrice * amt * bonus));
        isRare = sample.rare;
      } else {
        const item = (state.foragedInventory ?? []).find((it) => it.uid === payload.uid);
        if (!item) return { success: false, message: 'Không tìm thấy vật phẩm để đấu giá!' };
        itemName = item.name;
        fairValue = Math.round(item.basePrice * bonus);
        isRare = item.rare;
      }
    } else {
      const amt = payload.amount ?? 0;
      const avail = state.resources[payload.kind] ?? 0;
      if (amt <= 0 || avail < amt) {
        return { success: false, message: 'Không đủ số lượng hàng hóa để đưa lên sàn đấu giá!' };
      }
      const unitBase =
        payload.kind === 'food'
          ? 0.2
          : payload.kind === 'wood'
          ? 0.8
          : payload.kind === 'ironOre'
          ? 1.2
          : payload.kind === 'swords'
          ? 3
          : payload.kind === 'spears'
          ? 3.2
          : 3.5;
      fairValue = Math.max(5, Math.round(amt * unitBase * bonus));
      const label =
        payload.kind === 'food'
          ? 'Lương thực'
          : payload.kind === 'wood'
          ? 'Gỗ'
          : payload.kind === 'ironOre'
          ? 'Quặng thô'
          : payload.kind === 'swords'
          ? 'Kiếm'
          : payload.kind === 'spears'
          ? 'Giáo'
          : 'Cung';
      itemName = `${amt} ${label}`;
    }

    const startPrice = Math.max(1, Math.round(payload.startPrice));
    const bidStep = Math.max(1, Math.round(payload.bidStep));
    const targetPrice = Math.max(startPrice, Math.round(payload.targetPrice));

    // Bộ lọc định giá: tránh bán vật phẩm rẻ tiền với giá ảo quá cao
    const maxBuyerWillingness = Math.round(
      fairValue * (isRare ? 2.15 + Math.random() * 0.85 : 1.35 + Math.random() * 0.4)
    );

    if (startPrice > maxBuyerWillingness) {
      return {
        success: false,
        message: `Bộ lọc thị trường: Giá sàn (${startPrice}V) quá cao so với giá trị thực (~${fairValue}V) của [${itemName}], thương nhân không ai trả giá!`,
      };
    }

    let finalBid = startPrice;
    while (finalBid + bidStep <= targetPrice && finalBid + bidStep <= maxBuyerWillingness) {
      finalBid += bidStep;
    }

    set((s) => {
      if (payload.kind === 'item') {
        if (payload.itemId) {
          const amt = Math.max(1, Math.round(payload.amount ?? 1));
          let removed = 0;
          return {
            lastAuctionMonthKey: monthKey,
            foragedInventory: (s.foragedInventory ?? []).filter((it) => {
              if (it.itemId === payload.itemId && removed < amt) {
                removed++;
                return false;
              }
              return true;
            }),
            resources: {
              ...s.resources,
              gold: s.resources.gold + finalBid,
            },
          };
        }
        return {
          lastAuctionMonthKey: monthKey,
          foragedInventory: (s.foragedInventory ?? []).filter((it) => it.uid !== payload.uid),
          resources: {
            ...s.resources,
            gold: s.resources.gold + finalBid,
          },
        };
      }
      const amt = payload.amount ?? 0;
      return {
        lastAuctionMonthKey: monthKey,
        resources: {
          ...s.resources,
          [payload.kind]: Math.max(0, (s.resources[payload.kind] ?? 0) - amt),
          gold: s.resources.gold + finalBid,
        },
      };
    });

    const cappedNotice =
      targetPrice > maxBuyerWillingness
        ? ` (Bộ lọc định giá: thương nhân chỉ trả tối đa ${maxBuyerWillingness}V cho vật phẩm này)`
        : '';

    return {
      success: true,
      message: `Đấu giá thành công [${itemName}] (bước nhảy ${bidStep}V) chốt giá +${finalBid} vàng!${cappedNotice}`,
    };
  },

  tickBaseAutomationAndBushes: (day) => {
    const state = get();
    const lamSonBases = state.cities.filter((c) => c.faction === 'lam_son' && c.hasBase);

    for (const base of lamSonBases) {
      const layout = state.getOrCreateRegionLayout(base.id);
      const mainHall = layout.buildings.find((b) => b.type === 'main_hall' && b.status === 'active');
      const mainLevel = mainHall?.level ?? 1;
      const auto = state.baseAutomation?.[base.id];
      const nextSpawn = state.bushNextSpawnDay?.[base.id] ?? 3;
      const currentBushes = state.bushes?.[base.id] ?? [];

      // 1. Spawn bụi cây mới ở vùng đồng bằng xung quanh các công trình đã xây (3-4 ngày / bụi)
      if (day >= nextSpawn && currentBushes.length < 12 && layout.buildings.length > 0) {
        const half = (layout.gridSize || 32) / 2;
        const baseCell = coordToCell(base.x, base.y);
        let spawned: SpawnedBush | null = null;

        for (let attempt = 0; attempt < 12; attempt++) {
          const anchor = layout.buildings[Math.floor(Math.random() * layout.buildings.length)];
          const angle = Math.random() * Math.PI * 2;
          const dist = 4 + Math.random() * 6;
          const col = Math.round(anchor.col + anchor.spanCols / 2 + Math.cos(angle) * dist);
          const row = Math.round(anchor.row + anchor.spanRows / 2 + Math.sin(angle) * dist);
          const wx = col + 0.5 - half;
          const wz = row + 0.5 - half;

          const overlap = layout.buildings.some(
            (b) =>
              b.status !== 'destroyed' &&
              col >= b.col - 1 &&
              col <= b.col + b.spanCols &&
              row >= b.row - 1 &&
              row <= b.row + b.spanRows
          );
          if (overlap) continue;

          if (!isThanhHoaBuildable(base.x, base.y, col, row, 1, 1, layout.gridSize || 32)) continue;
          const c2d = baseCell.col + Math.round(wx / 3);
          const r2d = baseCell.row + Math.round(wz / 3);
          if (getGridTerrain(c2d, r2d) !== 'plains') continue;

          spawned = {
            id: `bush_${day}_${col}_${row}_${Math.floor(Math.random() * 1000)}`,
            col,
            row,
            wx,
            wz,
          };
          break;
        }

        set((s) => ({
          bushes: {
            ...s.bushes,
            [base.id]: spawned ? [...(s.bushes?.[base.id] ?? []), spawned] : s.bushes?.[base.id] ?? [],
          },
          bushNextSpawnDay: {
            ...s.bushNextSpawnDay,
            [base.id]: day + 3 + Math.floor(Math.random() * 2),
          },
        }));
      }

      // 2. Tự động dọn dẹp (Nhà Chính Lv.3+)
      if (mainLevel >= 3 && auto?.autoClean) {
        const latestBushes = get().bushes?.[base.id] ?? [];
        if (latestBushes.length > 0) {
          const count = latestBushes.length;
          set((s) => ({
            bushes: { ...s.bushes, [base.id]: [] },
            resources: {
              ...s.resources,
              gold: s.resources.gold + count * 3,
              food: s.resources.food + count * 3,
            },
          }));
        }
      }

      // 3. Tự động thu nhận lưu dân (Nhà Chính Lv.4+)
      if (mainLevel >= 4 && auto?.autoRefugees) {
        const pending = (get().pendingRefugees ?? []).filter(
          (w) => !w.departed && (w.daysRemaining ?? 0) > 0
        );
        for (const wave of pending) {
          get().acceptRefugeeWave(wave.id, 'full');
        }
      }

      // 4. Tự động luyện binh (Nhà Chính Lv.4+)
      if (mainLevel >= 4 && auto?.autoTrain) {
        const hasBarracks = layout.buildings.some(
          (b) => b.type === 'barracks' && b.status === 'active'
        );
        const res = get().resources;
        if (hasBarracks && res.gold >= 15 && res.food >= 10) {
          set((s) => ({
            resources: {
              ...s.resources,
              gold: s.resources.gold - 15,
              food: s.resources.food - 10,
              troops: s.resources.troops + 5,
            },
          }));
        }
      }
    }

    // 5. Cập nhật tiến độ do thám của các Chòi Canh
    const activeScouts = get().activeWatchtowerScouts ?? {};
    const scoutEntries = Object.entries(activeScouts);
    if (scoutEntries.length > 0) {
      const nextScouts: Record<string, WatchtowerScoutTask> = {};
      const completed: WatchtowerScoutTask[] = [];
      for (const [wtId, task] of scoutEntries) {
        const rem = task.daysRemaining - 1;
        if (rem <= 0) {
          completed.push(task);
        } else {
          nextScouts[wtId] = { ...task, daysRemaining: rem };
        }
      }
      set({ activeWatchtowerScouts: nextScouts });
      for (const done of completed) {
        get().markRegionScouted(done.targetId);
        notify.success(`Trinh sát đã hoàn tất do thám ${done.targetName}! Sương mù đã được vén mở.`);
      }
    }

    // 6. Cập nhật tiến độ Đi Săn Thường (Cấp 1-3)
    const normalHunts = get().activeNormalHunt ?? {};
    const normalEntries = Object.entries(normalHunts);
    if (normalEntries.length > 0) {
      const nextNormal: Record<string, WatchtowerNormalHuntTask> = {};
      const doneNormal: WatchtowerNormalHuntTask[] = [];
      for (const [wtId, task] of normalEntries) {
        const rem = task.daysRemaining - 1;
        if (rem <= 0) doneNormal.push(task);
        else nextNormal[wtId] = { ...task, daysRemaining: rem };
      }
      set({ activeNormalHunt: nextNormal });
      for (const done of doneNormal) {
        const foodGain = done.tier === 1 ? 110 : done.tier === 2 ? 135 : 160;
        const woodGain = done.tier >= 2 ? (done.tier === 2 ? 35 : 48) : 0;
        const oreGain = done.tier === 3 ? 24 : 0;
        set((s) => ({
          resources: {
            ...s.resources,
            food: s.resources.food + foodGain,
            wood: (s.resources.wood ?? 0) + woodGain,
            ironOre: (s.resources.ironOre ?? 0) + oreGain,
          },
        }));
        notify.success(
          `Đội săn Cấp ${done.tier} trở về: +${foodGain} Lương${woodGain ? `, +${woodGain} Gỗ` : ''}${oreGain ? `, +${oreGain} Quặng thô` : ''}!`
        );
      }
    }

    // 7. Cập nhật tiến độ Đi Săn Bảo Vật Hiếm (Cấp 4)
    const rareHunts = get().activeRareHunt ?? {};
    const rareEntries = Object.entries(rareHunts);
    if (rareEntries.length > 0) {
      const nextRare: Record<string, WatchtowerRareHuntTask> = {};
      const doneRare: WatchtowerRareHuntTask[] = [];
      for (const [wtId, task] of rareEntries) {
        const rem = task.daysRemaining - 1;
        if (rem <= 0) doneRare.push(task);
        else nextRare[wtId] = { ...task, daysRemaining: rem };
      }
      set({ activeRareHunt: nextRare });
      const rarePool = FORAGED_ITEM_CATALOG.filter((it) => it.rare);
      for (const done of doneRare) {
        const picked = rarePool[Math.floor(Math.random() * rarePool.length)] ?? FORAGED_ITEM_CATALOG[3];
        const newItem: ForagedInventoryItem = {
          uid: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          itemId: picked.id,
          name: picked.name,
          rare: true,
          basePrice: picked.basePrice,
        };
        set((s) => ({
          foragedInventory: [newItem, ...(s.foragedInventory ?? [])],
        }));
        notify.success(
          `${done.leaderName} hoàn tất săn Cấp 4, thu được BẢO VẬT HIẾM [${picked.name}]!`
        );
      }
    }

    // 8. Đếm ngược thời gian sơ tán (nếu đang ở Trại Dã Chiến)
    const evacDays = get().evacuationDaysRemaining ?? 0;
    if (evacDays > 0) {
      const nextEvac = evacDays - 1;
      set({ evacuationDaysRemaining: nextEvac });
      if (nextEvac === 0) {
        notify.success('Quân Minh đã rút khỏi vùng Lam Sơn! Nghĩa quân có thể trở về tái thiết căn cứ.');
      }
    }
  },
});
