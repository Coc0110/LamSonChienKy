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
import { BASE_BUILDING_CATALOG, getBuildingMaxHp, getUpgradeCost } from '../../data/regionBuildings';
import { canPlaceOnRegionGrid, generateEnemyCityLayout, generateLamSonStarterLayout } from '../../utils/regionLayoutGenerator';
import { createSiegeBattle } from '../../utils/siegeCombatEngine';
import { createAmbushBattle } from '../../utils/ambushCombatEngine';
import { createDefenseBattle } from '../../utils/defenseCombatEngine';
import { useUIStore } from '../uiStore';
import { notify } from '../dialogStore';
import { INITIAL_CITIES } from '../../data/mapData';

export interface RegionSlice {
  regionLayouts: Record<string, RegionLayout>;
  scoutedRegionIds: Record<string, number>; // cityId -> day last scouted
  activeSiegeBattle: SiegeBattleState | null;
  activeAmbushBattle: AmbushBattleState | null;
  activeDefenseBattle: DefenseBattleState | null;

  getOrCreateRegionLayout: (cityId: string) => RegionLayout;
  placeBaseBuilding: (
    cityId: string,
    type: BaseBuildingType,
    col: number,
    row: number
  ) => { success: boolean; message: string; building?: BaseBuilding };
  upgradeBaseBuilding: (
    cityId: string,
    buildingId: string
  ) => { success: boolean; message: string };
  moveBaseBuilding: (
    cityId: string,
    buildingId: string,
    newCol: number,
    newRow: number
  ) => { success: boolean; message: string };
  demolishBaseBuilding: (
    cityId: string,
    buildingId: string
  ) => { success: boolean; message: string };
  tickRegionConstruction: () => void;
  markRegionScouted: (cityId: string) => void;
  setRegionLayout: (cityId: string, layout: RegionLayout) => void;

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
  scoutedRegionIds: {},
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

  placeBaseBuilding: (cityId, type, col, row) => {
    const state = get();
    const layout = state.getOrCreateRegionLayout(cityId);
    const spec = BASE_BUILDING_CATALOG[type];

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

    if (!canPlaceOnRegionGrid(layout.buildings, col, row, spec.spanCols, spec.spanRows, undefined, placeOpts)) {
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
      spanCols: spec.spanCols,
      spanRows: spec.spanRows,
      hp: maxHp,
      maxHp,
      status: isInstant ? 'active' : 'building',
      buildDaysRemaining: isInstant ? 0 : spec.buildDays,
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

  moveBaseBuilding: (cityId, buildingId, newCol, newRow) => {
    const layout = get().getOrCreateRegionLayout(cityId);
    const target = layout.buildings.find((b) => b.id === buildingId);
    if (!target) {
      return { success: false, message: 'Không tìm thấy công trình!' };
    }
    const baseCity = get().cities.find((c) => c.id === cityId);
    const moveOpts = {
      allowOutside: true,
      basePctX: baseCity?.x ?? 50.8,
      basePctY: baseCity?.y ?? 47.6,
    };
    if (!canPlaceOnRegionGrid(layout.buildings, newCol, newRow, target.spanCols, target.spanRows, buildingId, moveOpts)) {
      return { success: false, message: 'Vị trí mới bị vướng công trình khác hoặc nằm trên mặt nước / ngoài Thanh Hóa!' };
    }

    set((s) => ({
      regionLayouts: {
        ...s.regionLayouts,
        [cityId]: {
          ...layout,
          buildings: layout.buildings.map((b) =>
            b.id === buildingId ? { ...b, col: newCol, row: newRow } : b
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
});
