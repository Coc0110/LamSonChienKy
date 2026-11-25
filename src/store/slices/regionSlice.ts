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
import { BASE_BUILDING_CATALOG, checkMainHallUpgradeRequirements, getBuildingMaxHp, getUpgradeCost } from '../../data/regionBuildings';
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

export interface RegionSlice {
  regionLayouts: Record<string, RegionLayout>;
  clearedTerrainKeys: Record<string, string[]>; // cityId -> array of "col,row" cleared keys
  baseAutomation: Record<string, BaseAutomationConfig>;
  bushes: Record<string, SpawnedBush[]>;
  bushNextSpawnDay: Record<string, number>;
  scoutedRegionIds: Record<string, number>; // cityId -> day last scouted
  defenseFormationIds: Record<string, string[]>; // cityId -> formationIds assigned to defense
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
  tickRegionConstruction: () => void;
  markRegionScouted: (cityId: string) => void;
  setRegionLayout: (cityId: string, layout: RegionLayout) => void;
  completeTerrainClearing: (cityId: string, key: string, kind: 'chop_tree' | 'clear_forest') => void;
  setBaseAutomation: (cityId: string, patch: Partial<BaseAutomationConfig>) => void;
  clearBush: (cityId: string, bushId: string) => void;
  tickBaseAutomationAndBushes: (day: number) => void;
  toggleDefenseFormation: (cityId: string, formationId: string) => void;

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
  defenseFormationIds: {},
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

    if (state.resources.gold < spec.goldCost || state.resources.food < spec.foodCost) {
      return {
        success: false,
        message: `Không đủ tài nguyên! Cần ${spec.goldCost} vàng và ${spec.foodCost} lương.`,
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
    if (state.resources.gold < cost.gold || state.resources.food < cost.food) {
      return {
        success: false,
        message: `Không đủ tài nguyên nâng cấp! Cần ${cost.gold} vàng và ${cost.food} lương.`,
      };
    }

    set((s) => ({
      resources: {
        ...s.resources,
        gold: s.resources.gold - cost.gold,
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
      notify.success(`Đã vượt qua phục kích tại ${finalState.districtName}, tiếp tục hành quân!`);
    }
    state.exitAutoPause();
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
      regionLayouts: {
        ...s.regionLayouts,
        [finalState.cityId]: finalState.layout,
      },
    }));
    notify.success(`Đã đẩy lùi quân Minh, giữ vững căn cứ ${finalState.cityName}!`);
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
  },
});
