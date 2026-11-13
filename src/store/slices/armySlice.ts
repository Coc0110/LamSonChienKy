import type { StateCreator } from 'zustand';
import type { 
  TacticalFormation, 
  TacticalPlacedUnit, 
  TacticalUnitType,
  MarchPathCell,
  MarchEndpointAction,
  PursuingEnemyGroup,
} from '../../types/armyFormation';
import { TACTICAL_UNIT_CONFIGS } from '../../types/armyFormation';
import type { ArmyRosterCounts, StratagemType } from '../../types/armyFormation';
import type { CityNode } from '../../types';
import {
  EMPTY_ROSTER,
  buildLayersFromRoster,
  calculateCommandCapacity,
  computeFormationSpeedAndVision,
  getCityTrainedRoster,
  mergeTrainedRoster,
  ensureFormationRosterAndLayers,
  rosterTotal,
} from '../../utils/armyCompositionUtils';
import { applyWorldStratagem, ENGAGEMENT_RADIUS_PCT, resolveWorldMapCombatTick } from '../../utils/worldMapCombatEngine';
import { recalculateFarmWorkers } from '../../utils/farmLaborUtils';
import { spawnMingFieldFormation, updateMingFormationsAI } from '../../utils/mingMapAI';
import { deductWeaponsFromPool } from './militarySlice';
import { getFormationMapPos, MARCH_ENDPOINT_ACTIONS } from '../../utils/marchPathUtils';
import { findShortestScoutPath } from '../../utils/scoutPathfinding';
import { getDistrictMarketMeta, getDistrictMarketPosition } from '../../utils/marketUtils';
import { coordToCell, getGridTerrain, getGridTerrainAt } from '../../data/terrainGrid';
import { TERRAIN_DEFINITIONS } from '../../data/terrainData';
import type { GameStore } from './types';
import { notify } from '../dialogStore';

export interface ArmySlice {
  formations: TacticalFormation[];
  activeFormationId: string | null;

  createFormation: (cityId: string, name?: string) => string;
  deleteFormation: (formationId: string) => { success: boolean; message: string };
  updateFormationName: (formationId: string, name: string) => void;
  updateFormationRoster: (formationId: string, targetRoster: ArmyRosterCounts) => { success: boolean; message: string };
  prepareTerrainTrap: (formationId: string, trapType: 'fire' | 'rockfall') => { success: boolean; message: string };
  triggerFormationStratagem: (formationId: string, targetFormationId: string, stratagem: StratagemType) => { success: boolean; message: string };
  setActiveFormationId: (id: string | null) => void;

  placeUnitOnGrid: (
    formationId: string, 
    row: number, 
    col: number, 
    unitType: TacticalUnitType, 
    generalId?: string,
    multiplier?: number
  ) => { success: boolean; message: string };

  removeUnitFromGrid: (
    formationId: string, 
    row: number, 
    col: number
  ) => { success: boolean; message: string };

  moveUnitOnGrid: (
    formationId: string, 
    fromRow: number, 
    fromCol: number, 
    toRow: number, 
    toCol: number
  ) => boolean;

  assignGeneralToFormation: (formationId: string, generalId: string) => { success: boolean; message: string };
  removeGeneralFromFormation: (formationId: string, generalId: string) => { success: boolean; message: string };
  setFormationCommander: (formationId: string, generalId: string | null) => void;

  startGridMarch: (
    formationId: string,
    cells: MarchPathCell[],
    endpointAction: MarchEndpointAction,
    retreatCells?: MarchPathCell[],
    isEmergencyRetreat?: boolean
  ) => { success: boolean; message: string };

  updateMarchEndpointAction: (
    formationId: string,
    endpointAction: MarchEndpointAction
  ) => { success: boolean; message: string };

  stopFormationMarch: (formationId: string) => { success: boolean; message: string };

  splitFormationDetachment: (
    formationId: string,
    detachmentRatio?: number,
    customName?: string
  ) => { success: boolean; message: string; newFormationId?: string };

  mergeFormationIntoParent: (formationId: string) => { success: boolean; message: string };

  dispatchArmyForMarketPickup: (formationId: string, districtId: string) => { success: boolean; message: string };

  stepArmies: (deltaDays: number) => void;
}

// Lưới chuẩn 32 hàng x 32 cột (1024 ô) hỗ trợ quy mô vạn quân
export const FORMATION_ROWS = 32;
export const FORMATION_COLS = 32;

const createEmptyGrid = (rows = FORMATION_ROWS, cols = FORMATION_COLS): (TacticalPlacedUnit | null)[][] => {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
};

// Tính lại tổng tài nguyên của các đơn vị độc nhất (dựa trên parentUnitId và multiplier)
const calculateFormationTotals = (grid: (TacticalPlacedUnit | null)[][]) => {
  const seenUnits = new Set<string>();
  let totalT = 0, totalW = 0, totalH = 0, totalE = 0, totalF = 0;
  let totalSwords = 0, totalBows = 0, totalSpears = 0;

  grid.forEach(rArr => {
    rArr.forEach(u => {
      if (u && !seenUnits.has(u.parentUnitId)) {
        seenUnits.add(u.parentUnitId);
        if (u.type !== 'general') {
          const c = TACTICAL_UNIT_CONFIGS[u.type].cost;
          const mult = u.multiplier || 1;
          totalT += c.combatTroops * mult;
          totalW += c.weapons * mult;
          totalH += c.horses * mult;
          totalE += c.elephants * mult;
          totalF += c.food * mult;

          if (u.weaponsBreakdown) {
            totalSwords += u.weaponsBreakdown.swords;
            totalBows += u.weaponsBreakdown.bows;
            totalSpears += u.weaponsBreakdown.spears;
          } else if (u.type === 'swordsman') {
            totalSwords += c.weapons * mult;
          } else if (u.type === 'archer') {
            totalBows += c.weapons * mult;
          } else if (u.type === 'spearman') {
            totalSpears += c.weapons * mult;
          } else {
            totalSpears += c.weapons * mult;
          }
        }
      }
    });
  });

  return { totalT, totalW, totalH, totalE, totalF, totalSwords, totalBows, totalSpears };
};

// Quy đổi biên chế sang kho vũ khí: Đao/Kỵ = kiếm, Giáo/Tượng/Thám mã = giáo, Cung = cung nỏ
const rosterWeaponNeeds = (r: ArmyRosterCounts) => ({
  totalSwords: r.swordsman + r.cavalry,
  totalSpears: r.spearman + r.elephant + r.scout,
  totalBows: r.archer,
});

const FOOD_PER_SUPPLY_CART = 150;
const MING_RESPONSE_CONVOY_DISTANCE_PCT = 3.5;
const ROUT_FLEE_SPEED_PCT_PER_CANH = 0.35;
const ROUT_ARRIVE_RADIUS_PCT = 0.6;
const MAX_COMBAT_TICKS_PER_STEP = 12;

// Số quân Minh xuất thành nghênh chiến mỗi đợt khi bị tập kích
const getMingSortieSize = (c: CityNode): number =>
  c.id === 'tay_do'
    ? Math.min(c.troops, Math.max(1500, Math.round(c.troops * 0.25)))
    : Math.min(c.troops, Math.max(120, Math.round(c.troops * 0.4)));

// Bộ đếm Canh Giờ: stepArmies chạy mỗi 50ms nên cộng dồn tới khi đủ 1 canh mới giao chiến 1 nhịp
let combatCanhAccumulator = 0;

// Điều quân Minh từ một thành ra bản đồ (trừ quân giữ thành, sinh thêm đoàn vận lương nếu đi xa)
export const deployMingForce = (
  cities: CityNode[],
  sourceCityId: string,
  targetPos: { x: number; y: number },
  troops: number
): { cities: CityNode[]; spawned: TacticalFormation[] } => {
  const city = cities.find(c => c.id === sourceCityId && c.faction === 'ming');
  if (!city) return { cities, spawned: [] };
  const n = Math.min(city.troops, Math.max(0, Math.round(troops)));
  if (n < 5) return { cities, spawned: [] };

  const spawned: TacticalFormation[] = [];
  const expedition = spawnMingFieldFormation(city, targetPos, n, 'ming_expedition');
  spawned.push(expedition);
  let used = n;

  if (Math.hypot(city.x - targetPos.x, city.y - targetPos.y) > MING_RESPONSE_CONVOY_DISTANCE_PCT) {
    const convoyTroops = Math.min(city.troops - n, Math.max(20, Math.round(n * 0.12)));
    if (convoyTroops >= 5) {
      const convoy = spawnMingFieldFormation(city, targetPos, convoyTroops, 'ming_convoy');
      convoy.parentFormationId = expedition.id;
      spawned.push(convoy);
      used += convoyTroops;
    }
  }

  return {
    cities: cities.map(c => (c.id === city.id ? { ...c, troops: Math.max(0, c.troops - used) } : c)),
    spawned,
  };
};
export const createArmySlice: StateCreator<GameStore, [], [], ArmySlice> = (set, get) => ({
  formations: [
    // Đạo quân Tiên Phong mặc định trên sa bàn 32x32 (1024 ô)
    {
      id: 'formation_tien_phong_1',
      name: 'Tiên Phong Doanh Lam Sơn',
      cityId: 'lam_son',
      rows: FORMATION_ROWS,
      cols: FORMATION_COLS,
      grid: (() => {
        const g = createEmptyGrid(FORMATION_ROWS, FORMATION_COLS);
        
        // Hàng 4: 1 Giáo binh + 1 Cung thủ cạnh nhau ở trung tâm tiền tuyến (Cột 15, 16)
        g[4][15] = {
          id: 'u_spear_1_4_15',
          parentUnitId: 'p_spear_1',
          type: 'spearman',
          name: 'Giáo Binh Tiên Phong',
          rootRow: 4,
          rootCol: 15,
          row: 4,
          col: 15,
          isRoot: true,
          offsetRow: 0,
          offsetCol: 0,
          multiplier: 1,
          weaponsBreakdown: { swords: 0, bows: 0, spears: 1 },
          hp: 65,
          maxHp: 65,
          morale: 95,
        };
        g[4][16] = {
          id: 'u_archer_1_4_16',
          parentUnitId: 'p_archer_1',
          type: 'archer',
          name: 'Thiện Xạ Cảnh Giới',
          rootRow: 4,
          rootCol: 16,
          row: 4,
          col: 16,
          isRoot: true,
          offsetRow: 0,
          offsetCol: 0,
          multiplier: 1,
          weaponsBreakdown: { swords: 0, bows: 1, spears: 0 },
          hp: 40,
          maxHp: 40,
          morale: 95,
        };

        // Hàng 5: 2 Đao binh che chắn (Cột 15, 16)
        g[5][15] = {
          id: 'u_sw_1_5_15',
          parentUnitId: 'p_sw_1',
          type: 'swordsman',
          name: 'Đao Khiên Tiền Quân',
          rootRow: 5,
          rootCol: 15,
          row: 5,
          col: 15,
          isRoot: true,
          offsetRow: 0,
          offsetCol: 0,
          multiplier: 1,
          weaponsBreakdown: { swords: 1, bows: 0, spears: 0 },
          hp: 70,
          maxHp: 70,
          morale: 95,
        };
        g[5][16] = {
          id: 'u_sw_2_5_16',
          parentUnitId: 'p_sw_2',
          type: 'swordsman',
          name: 'Đao Khiên Tiền Quân',
          rootRow: 5,
          rootCol: 16,
          row: 5,
          col: 16,
          isRoot: true,
          offsetRow: 0,
          offsetCol: 0,
          multiplier: 1,
          weaponsBreakdown: { swords: 1, bows: 0, spears: 0 },
          hp: 70,
          maxHp: 70,
          morale: 95,
        };

        // Hàng 6: 1 Giáo binh hộ vệ cánh trái (Cột 13)
        g[6][13] = {
          id: 'u_spear_2_6_13',
          parentUnitId: 'p_spear_2',
          type: 'spearman',
          name: 'Giáo Binh Hộ Vệ',
          rootRow: 6,
          rootCol: 13,
          row: 6,
          col: 13,
          isRoot: true,
          offsetRow: 0,
          offsetCol: 0,
          multiplier: 1,
          weaponsBreakdown: { swords: 0, bows: 0, spears: 1 },
          hp: 65,
          maxHp: 65,
          morale: 95,
        };

        // Tướng Lê Lai (Hàng 8, Cột 15)
        g[8][15] = {
          id: 'u_gen_le_lai',
          parentUnitId: 'p_gen_le_lai',
          type: 'general',
          name: 'Tướng Lê Lai',
          generalId: 'le_lai',
          rootRow: 8,
          rootCol: 15,
          row: 8,
          col: 15,
          isRoot: true,
          offsetRow: 0,
          offsetCol: 0,
          hp: 120,
          maxHp: 120,
          morale: 100,
        };

        // Xe Lương 4 ô (2 hàng x 2 cột: Hàng 24-25, Cột 15-16)
        const cartParent = 'p_cart_1';
        for (let ro = 0; ro < 2; ro++) {
          for (let co = 0; co < 2; co++) {
            g[24 + ro][15 + co] = {
              id: `u_cart_${ro}_${co}`,
              parentUnitId: cartParent,
              type: 'supply_cart',
              name: 'Xe Lương Hậu Cần',
              rootRow: 24,
              rootCol: 15,
              row: 24 + ro,
              col: 15 + co,
              isRoot: ro === 0 && co === 0,
              offsetRow: ro,
              offsetCol: co,
              multiplier: 1,
              weaponsBreakdown: { swords: 0, bows: 0, spears: 0 },
              hp: 50,
              maxHp: 50,
              morale: 95,
            };
          }
        }

        return g;
      })(),
      assignedGeneralIds: ['le_lai'],
      commanderGeneralId: 'le_lai',
      status: 'idle',
      createdAt: Date.now(),
      totalTroops: 6,
      totalWeapons: 5,
      totalHorses: 0,
      totalElephants: 0,
      totalFoodCarried: 190,
      faction: 'lam_son',
      armyRole: 'main',
      roster: { ...EMPTY_ROSTER, swordsman: 2, spearman: 2, archer: 1, supply_cart: 1 },
      layers: buildLayersFromRoster({ ...EMPTY_ROSTER, swordsman: 2, spearman: 2, archer: 1, supply_cart: 1 }),
      morale: 100,
      facingAngleDeg: 0,
    }
  ],

  activeFormationId: 'formation_tien_phong_1',

  createFormation: (cityId: string, name?: string) => {
    const state = get();
    const city = state.cities.find(c => c.id === cityId);
    const cityName = city?.name || 'Bản Doanh';
    const existingCount = state.formations.filter(f => f.cityId === cityId).length;
    const formationName = name || `Đạo Quân ${cityName} ${existingCount + 1}`;

    const newId = `formation_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newFormation: TacticalFormation = {
      id: newId,
      name: formationName,
      cityId,
      rows: FORMATION_ROWS,
      cols: FORMATION_COLS,
      grid: createEmptyGrid(FORMATION_ROWS, FORMATION_COLS),
      assignedGeneralIds: [],
      commanderGeneralId: null,
      status: 'idle',
      createdAt: Date.now(),
      totalTroops: 0,
      totalWeapons: 0,
      totalHorses: 0,
      totalElephants: 0,
      totalFoodCarried: 0,
      faction: 'lam_son',
      armyRole: 'main',
      roster: { ...EMPTY_ROSTER },
      layers: buildLayersFromRoster(EMPTY_ROSTER),
      morale: 100,
      facingAngleDeg: 0,
    };

    set(prev => ({
      formations: [...prev.formations, newFormation],
      activeFormationId: newId,
    }));

    notify.success(`Đã dựng xong doanh trướng 1024 ô: "${formationName}" sẵn sàng bố trận!`);
    return newId;
  },

  deleteFormation: (formationId: string) => {
    const state = get();
    const target = state.formations.find(f => f.id === formationId);
    if (!target) return { success: false, message: 'Không tìm thấy đạo quân!' };

    const { totalSwords, totalBows, totalSpears } = target.roster
      ? rosterWeaponNeeds(target.roster)
      : calculateFormationTotals(target.grid);

    set(prev => {
      const updatedCities = prev.cities.map(c => {
        if (c.id === target.cityId && c.population) {
          return {
            ...c,
            population: {
              ...c.population,
              combatTroops: c.population.combatTroops + target.totalTroops,
              trainedRoster: mergeTrainedRoster(
                getCityTrainedRoster(c.population),
                { ...ensureFormationRosterAndLayers(target).roster!, supply_cart: 0 },
                1
              ),
            }
          };
        }
        return c;
      });

      const nextSwords = prev.resources.swords + totalSwords;
      const nextBows = prev.resources.bows + totalBows;
      const nextSpears = prev.resources.spears + totalSpears;

      return {
        cities: updatedCities,
        resources: {
          ...prev.resources,
          swords: nextSwords,
          bows: nextBows,
          spears: nextSpears,
          weapons: nextSwords + nextBows + nextSpears,
          horses: prev.resources.horses + target.totalHorses,
          elephants: prev.resources.elephants + target.totalElephants,
          food: prev.resources.food + target.totalFoodCarried,
        },
        formations: prev.formations.filter(f => f.id !== formationId),
        activeFormationId: prev.activeFormationId === formationId ? null : prev.activeFormationId,
      };
    });

    notify.info(`Đã giải tán "${target.name}", hoàn trả đầy đủ quân lương khí giới về căn cứ.`);
    return { success: true, message: 'Đã giải tán đạo quân thành công!' };
  },

  updateFormationName: (formationId: string, name: string) => {
    set(prev => ({
      formations: prev.formations.map(f => f.id === formationId ? { ...f, name } : f)
    }));
  },

  updateFormationRoster: (formationId, targetRoster) => {
    const state = get();
    const target = state.formations.find(f => f.id === formationId);
    if (!target) return { success: false, message: 'Không tìm thấy đạo quân!' };
    if (target.status !== 'idle' && target.status !== 'stationed') {
      return { success: false, message: 'Chỉ có thể điều chỉnh biên chế khi đạo quân đang đóng tại căn cứ!' };
    }

    const keys = Object.keys(EMPTY_ROSTER) as (keyof ArmyRosterCounts)[];
    const next = { ...EMPTY_ROSTER };
    for (const k of keys) {
      const v = Number(targetRoster[k]);
      if (!Number.isFinite(v) || v < 0) return { success: false, message: 'Số lượng binh chủng không hợp lệ!' };
      next[k] = Math.floor(v);
    }

    const current = ensureFormationRosterAndLayers(target).roster!;
    const city = state.cities.find(c => c.id === target.cityId);
    if (!city || !city.population) return { success: false, message: 'Không tìm thấy thông tin căn cứ!' };

    const commander = state.generals.find(g => g.id === target.commanderGeneralId);
    const deputies = target.assignedGeneralIds
      .filter(id => id !== target.commanderGeneralId)
      .slice(0, 2)
      .map(id => state.generals.find(g => g.id === id))
      .filter((g): g is NonNullable<typeof g> => !!g);
    const capacity = calculateCommandCapacity(commander, deputies);
    const nextTotal = rosterTotal(next);
    if (nextTotal > capacity) {
      return { success: false, message: `Vượt sức chứa chỉ huy! Ban chỉ huy chỉ thống lĩnh tối đa ${capacity} quân (yêu cầu ${nextTotal}).` };
    }

    const curNeeds = rosterWeaponNeeds(current);
    const nextNeeds = rosterWeaponNeeds(next);
    const dTroops = nextTotal - rosterTotal(current);
    const dSwords = nextNeeds.totalSwords - curNeeds.totalSwords;
    const dSpears = nextNeeds.totalSpears - curNeeds.totalSpears;
    const dBows = nextNeeds.totalBows - curNeeds.totalBows;
    const dHorses = next.cavalry + next.scout - (current.cavalry + current.scout);
    const dElephants = next.elephant - current.elephant;
    const dFood = (next.supply_cart - current.supply_cart) * FOOD_PER_SUPPLY_CART;
    const res = state.resources;

    const trainedRoster = getCityTrainedRoster(city.population);
    for (const k of keys) {
      if (k === 'supply_cart') continue; // Xe lương không cần huấn luyện
      const need = next[k] - current[k];
      if (need > trainedRoster[k]) {
        return {
          success: false,
          message: `Căn cứ ${city.name} chỉ còn ${trainedRoster[k]} ${TACTICAL_UNIT_CONFIGS[k].name} đã thao luyện (cần thêm ${need})!`,
        };
      }
    }
    if (dTroops > city.population.combatTroops) {
      return { success: false, message: `Căn cứ ${city.name} chỉ còn ${city.population.combatTroops} nghĩa binh dự bị (cần thêm ${dTroops})!` };
    }
    if (dSwords > Math.floor(res.swords)) return { success: false, message: `Kho chỉ còn ${Math.floor(res.swords)} đao kiếm (cần thêm ${dSwords})!` };
    if (dSpears > Math.floor(res.spears)) return { success: false, message: `Kho chỉ còn ${Math.floor(res.spears)} trường giáo (cần thêm ${dSpears})!` };
    if (dBows > Math.floor(res.bows)) return { success: false, message: `Kho chỉ còn ${Math.floor(res.bows)} cung nỏ (cần thêm ${dBows})!` };
    if (dHorses > Math.floor(res.horses)) return { success: false, message: `Chuồng chỉ còn ${Math.floor(res.horses)} chiến mã (cần thêm ${dHorses})!` };
    if (dElephants > Math.floor(res.elephants)) return { success: false, message: `Chỉ còn ${Math.floor(res.elephants)} voi chiến (cần thêm ${dElephants})!` };
    if (dFood > Math.floor(res.food)) return { success: false, message: `Kho chỉ còn ${Math.floor(res.food)} lương (cần thêm ${dFood})!` };

    set(prev => {
      const swords = Math.max(0, prev.resources.swords - dSwords);
      const spears = Math.max(0, prev.resources.spears - dSpears);
      const bows = Math.max(0, prev.resources.bows - dBows);
      return {
        cities: prev.cities.map(c =>
          c.id === target.cityId && c.population
            ? {
                ...c,
                population: {
                  ...c.population,
                  combatTroops: Math.max(0, c.population.combatTroops - dTroops),
                  trainedRoster: (() => {
                    const out = { ...getCityTrainedRoster(c.population) };
                    for (const k of keys) {
                      if (k === 'supply_cart') continue;
                      out[k] = Math.max(0, out[k] - (next[k] - current[k]));
                    }
                    return out;
                  })(),
                },
              }
            : c
        ),
        resources: {
          ...prev.resources,
          swords,
          spears,
          bows,
          weapons: swords + spears + bows,
          horses: Math.max(0, prev.resources.horses - dHorses),
          elephants: Math.max(0, prev.resources.elephants - dElephants),
          food: Math.max(0, prev.resources.food - dFood),
        },
        formations: prev.formations.map(f =>
          f.id === formationId
            ? {
                ...f,
                roster: next,
                layers: buildLayersFromRoster(next),
                morale: f.morale ?? 100,
                totalTroops: nextTotal,
                totalWeapons: nextNeeds.totalSwords + nextNeeds.totalSpears + nextNeeds.totalBows,
                totalHorses: next.cavalry + next.scout,
                totalElephants: next.elephant,
                totalFoodCarried: Math.max(0, f.totalFoodCarried + dFood),
              }
            : f
        ),
      };
    });

    return { success: true, message: `Đã lưu biên chế ${target.name}: ${nextTotal} quân (sức chứa ${capacity}).` };
  },

  prepareTerrainTrap: (formationId, trapType) => {
    const state = get();
    const target = state.formations.find(f => f.id === formationId);
    if (!target) return { success: false, message: 'Không tìm thấy đạo quân!' };
    if (target.status === 'marching' || target.status === 'engaging' || target.status === 'retreating') {
      return { success: false, message: 'Đạo quân phải dừng chân mới dựng được bẫy!' };
    }
    const pos = getFormationMapPos(target, state.cities);
    const terrain = getGridTerrainAt(pos.x, pos.y);
    if (trapType === 'fire' && terrain !== 'forest') {
      return { success: false, message: 'Bẫy hỏa công chỉ dựng được trong rừng già!' };
    }
    if (trapType === 'rockfall' && terrain !== 'cliff' && terrain !== 'mountain') {
      return { success: false, message: 'Bẫy đá lăn chỉ dựng được ở vách núi hoặc hẻm núi!' };
    }
    set(prev => ({
      formations: prev.formations.map(f => (f.id === formationId ? { ...f, preparedTrap: trapType } : f)),
    }));
    return {
      success: true,
      message: trapType === 'fire' ? '🔥 Đã dựng xong bẫy hỏa công trong rừng!' : '🪨 Đã chuẩn bị bẫy đá lăn trên vách núi!',
    };
  },

  triggerFormationStratagem: (formationId, targetFormationId, stratagem) => {
    const state = get();
    const actor = state.formations.find(f => f.id === formationId);
    const target = state.formations.find(f => f.id === targetFormationId);
    if (!actor || !target) return { success: false, message: 'Không tìm thấy đạo quân!' };
    if ((actor.faction ?? 'lam_son') === (target.faction ?? 'lam_son')) {
      return { success: false, message: 'Mưu kế chỉ dùng được với quân địch!' };
    }
    if (!target.mapPosition) return { success: false, message: 'Mục tiêu chưa xuất hiện trên bản đồ!' };

    const a = ensureFormationRosterAndLayers(actor);
    const tPos = target.mapPosition;
    const terrain = getGridTerrainAt(tPos.x, tPos.y);
    const result = applyWorldStratagem(a, ensureFormationRosterAndLayers(target), stratagem, state.generals, terrain);
    if (!result.success) return { success: false, message: result.message };

    set(prev => ({
      formations: prev.formations.map(f => {
        if (f.id === formationId) return result.actor;
        if (f.id === targetFormationId) return result.target;
        return f;
      }),
    }));
    return { success: true, message: result.message };
  },
  setActiveFormationId: (id: string | null) => {
    set({ activeFormationId: id });
  },

  placeUnitOnGrid: (formationId, row, col, unitType, generalId, multiplier = 1) => {
    const state = get();
    const target = state.formations.find(f => f.id === formationId);
    if (!target) return { success: false, message: 'Không tìm thấy đạo quân!' };

    const cfg = TACTICAL_UNIT_CONFIGS[unitType];
    const city = state.cities.find(c => c.id === target.cityId);
    if (!city || !city.population) return { success: false, message: 'Không tìm thấy thông tin căn cứ!' };

    // Kiểm tra giới hạn biên của lưới theo diện tích ô (spanRows x spanCols)
    const spanR = cfg.spanRows;
    const spanC = cfg.spanCols;

    if (row + spanR > FORMATION_ROWS || col + spanC > FORMATION_COLS) {
      return { 
        success: false, 
        message: `${cfg.name} chiếm ${cfg.totalCells} ô (${spanR} hàng × ${spanC} cột), không đủ khoảng trống sát mép sa bàn!` 
      };
    }

    // Kiểm tra xem các ô mục tiêu có bị vướng đơn vị khác không
    for (let ro = 0; ro < spanR; ro++) {
      for (let co = 0; co < spanC; co++) {
        const curCell = target.grid[row + ro][col + co];
        if (curCell !== null) {
          return {
            success: false,
            message: `Ô Hàng ${row + ro + 1}, Cột ${col + co + 1} đã có ${curCell.name}! Vui lòng gỡ trước khi đặt ${cfg.name}.`
          };
        }
      }
    }

    // Nếu là đặt Tướng
    if (unitType === 'general') {
      if (!generalId) return { success: false, message: 'Chưa chọn vị tướng!' };
      const gen = state.generals.find(g => g.id === generalId);
      if (!gen) return { success: false, message: 'Tướng lĩnh không tồn tại!' };
      if (!gen.unlocked) return { success: false, message: 'Vị tướng này chưa đầu quân Lam Sơn!' };

      let alreadyPlaced = false;
      target.grid.forEach(rArr => {
        rArr.forEach(cell => {
          if (cell && cell.type === 'general' && cell.generalId === generalId) {
            alreadyPlaced = true;
          }
        });
      });
      if (alreadyPlaced) return { success: false, message: `${gen.name} đã được bố trí trên sa bàn!` };

      const parentUnitId = `p_gen_${generalId}_${Date.now()}`;
      const newGrid = target.grid.map((rArr, rIdx) => rIdx === row ? [...rArr] : rArr);
      newGrid[row][col] = {
        id: `u_gen_${generalId}_${Date.now()}`,
        parentUnitId,
        type: 'general',
        name: gen.name,
        generalId,
        rootRow: row,
        rootCol: col,
        row,
        col,
        isRoot: true,
        offsetRow: 0,
        offsetCol: 0,
        multiplier: 1,
        hp: 120,
        maxHp: 120,
        morale: 100,
      };

      const assignedGenerals = target.assignedGeneralIds.includes(generalId)
        ? target.assignedGeneralIds
        : [...target.assignedGeneralIds, generalId];

      set(prev => ({
        formations: prev.formations.map(f => f.id === formationId ? {
          ...f,
          grid: newGrid,
          assignedGeneralIds: assignedGenerals,
          commanderGeneralId: f.commanderGeneralId || generalId,
        } : f)
      }));

      notify.success(`Đã bố trí Tướng ${gen.name} vào Hàng ${row + 1}, Cột ${col + 1}!`);
      return { success: true, message: 'Đã bố trí tướng thành công!' };
    }

    // Kiểm tra tài nguyên kho căn cứ (có tính hệ số multiplier 1 hoặc 10)
    const mult = multiplier || 1;
    const cost = cfg.cost;
    const reqTroops = cost.combatTroops * mult;
    const reqWeapons = cost.weapons * mult;
    const reqHorses = cost.horses * mult;
    const reqElephants = cost.elephants * mult;
    const reqFood = cost.food * mult;

    if (city.population.combatTroops < reqTroops) {
      return { success: false, message: `Căn cứ ${city.name} không còn đủ ${reqTroops} nghĩa binh dự bị!` };
    }

    const swordCount = Math.floor(state.resources.swords);
    const bowCount = Math.floor(state.resources.bows);
    const spearCount = Math.floor(state.resources.spears);

    if (unitType === 'archer' && bowCount < reqWeapons) {
      return { success: false, message: `Lượng cung nỏ trong kho không đủ! Cần ${reqWeapons} cây cung (kho hiện có ${bowCount}).` };
    }
    if (unitType === 'swordsman' && swordCount < reqWeapons) {
      return { success: false, message: `Lượng đao kiếm trong kho không đủ! Cần ${reqWeapons} thanh kiếm (kho hiện có ${swordCount}).` };
    }
    if (unitType === 'spearman' && spearCount < reqWeapons) {
      return { success: false, message: `Lượng trường giáo trong kho không đủ! Cần ${reqWeapons} ngọn giáo (kho hiện có ${spearCount}).` };
    }

    if (state.resources.weapons < reqWeapons) {
      return { success: false, message: `Quân khí trong kho không đủ! Cần ${reqWeapons} vũ khí.` };
    }
    if (state.resources.horses < reqHorses) {
      return { success: false, message: `Chiến mã trong trại không đủ! Cần ${reqHorses} ngựa.` };
    }
    if (state.resources.elephants < reqElephants) {
      return { success: false, message: `Voi chiến không đủ! Cần ${reqElephants} voi.` };
    }
    if (state.resources.food < reqFood) {
      return { success: false, message: `Lương thảo không đủ! Cần ${reqFood} hộc lương.` };
    }

    // Xác định loại vũ khí thực tế xuất kho cho đơn vị này
    let unitWeapons = { swords: 0, bows: 0, spears: 0 };
    if (reqWeapons > 0) {
      if (unitType === 'swordsman') {
        unitWeapons = { swords: reqWeapons, bows: 0, spears: 0 };
      } else if (unitType === 'archer') {
        unitWeapons = { swords: 0, bows: reqWeapons, spears: 0 };
      } else if (unitType === 'spearman') {
        unitWeapons = { swords: 0, bows: 0, spears: reqWeapons };
      } else {
        unitWeapons = deductWeaponsFromPool(state.resources, reqWeapons);
      }
    }

    // Đặt đơn vị mới lên lưới (chiếm spanR x spanC ô) - CHỈ CLONE CÁC HÀNG BỊ ẢNH HƯỞNG
    const parentUnitId = `p_${unitType}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    const newGrid = target.grid.map((rArr, rIdx) => {
      if (rIdx >= row && rIdx < row + spanR) {
        return [...rArr];
      }
      return rArr;
    });

    for (let ro = 0; ro < spanR; ro++) {
      for (let co = 0; co < spanC; co++) {
        const curR = row + ro;
        const curC = col + co;
        newGrid[curR][curC] = {
          id: `u_${unitType}_${curR}_${curC}_${Date.now()}`,
          parentUnitId,
          type: unitType,
          name: mult > 1 ? `${cfg.name} (×${mult})` : cfg.name,
          rootRow: row,
          rootCol: col,
          row: curR,
          col: curC,
          isRoot: ro === 0 && co === 0,
          offsetRow: ro,
          offsetCol: co,
          multiplier: mult,
          weaponsBreakdown: unitWeapons,
          hp: cfg.baseStats.hp * mult,
          maxHp: cfg.baseStats.hp * mult,
          morale: 95,
        };
      }
    }

    const totalT = target.totalTroops + reqTroops;
    const totalW = target.totalWeapons + reqWeapons;
    const totalH = target.totalHorses + reqHorses;
    const totalE = target.totalElephants + reqElephants;
    const totalF = target.totalFoodCarried + reqFood;

    set(prev => {
      const nextSwords = Math.max(0, prev.resources.swords - unitWeapons.swords);
      const nextBows = Math.max(0, prev.resources.bows - unitWeapons.bows);
      const nextSpears = Math.max(0, prev.resources.spears - unitWeapons.spears);

      return {
        cities: prev.cities.map(c => {
          if (c.id === target.cityId && c.population) {
            return {
              ...c,
              population: {
                ...c.population,
                combatTroops: Math.max(0, c.population.combatTroops - reqTroops),
              }
            };
          }
          return c;
        }),
        resources: {
          ...prev.resources,
          swords: nextSwords,
          bows: nextBows,
          spears: nextSpears,
          weapons: nextSwords + nextBows + nextSpears,
          horses: Math.max(0, prev.resources.horses - reqHorses),
          elephants: Math.max(0, prev.resources.elephants - reqElephants),
          food: Math.max(0, prev.resources.food - reqFood),
        },
        formations: prev.formations.map(f => f.id === formationId ? {
          ...f,
          grid: newGrid,
          totalTroops: totalT,
          totalWeapons: totalW,
          totalHorses: totalH,
          totalElephants: totalE,
          totalFoodCarried: totalF,
        } : f)
      };
    });

    return { 
      success: true, 
      message: `Đã đặt ${mult > 1 ? `toán ${mult}` : '1'} ${cfg.name} (${cfg.totalCells} ô: ${spanR}×${spanC}) tại Hàng ${row + 1}, Cột ${col + 1}!` 
    };
  },

  removeUnitFromGrid: (formationId, row, col) => {
    const state = get();
    const target = state.formations.find(f => f.id === formationId);
    if (!target) return { success: false, message: 'Không tìm thấy đạo quân!' };

    const targetCell = target.grid[row][col];
    if (!targetCell) return { success: false, message: 'Ô này vốn trống!' };

    const parentId = targetCell.parentUnitId;
    const unitType = targetCell.type;
    const cfg = TACTICAL_UNIT_CONFIGS[unitType];

    // Hoàn trả tài nguyên của đơn vị này theo multiplier và weaponsBreakdown
    let refundCombatants = 0;
    let refundSwords = 0;
    let refundBows = 0;
    let refundSpears = 0;
    let refundHorses = 0;
    let refundElephants = 0;
    let refundFood = 0;

    if (unitType !== 'general') {
      const mult = targetCell.multiplier || 1;
      const reqWeapons = cfg.cost.weapons * mult;
      refundCombatants = cfg.cost.combatTroops * mult;
      refundHorses = cfg.cost.horses * mult;
      refundElephants = cfg.cost.elephants * mult;
      refundFood = cfg.cost.food * mult;

      if (targetCell.weaponsBreakdown) {
        refundSwords = targetCell.weaponsBreakdown.swords;
        refundBows = targetCell.weaponsBreakdown.bows;
        refundSpears = targetCell.weaponsBreakdown.spears;
      } else if (unitType === 'swordsman') {
        refundSwords = reqWeapons;
      } else if (unitType === 'archer') {
        refundBows = reqWeapons;
      } else {
        refundSpears = reqWeapons;
      }
    }

    // Xóa TOÀN BỘ các ô có chung parentUnitId - CHỈ CLONE CÁC HÀNG CÓ CHỨA ĐƠN VỊ NÀY
    const newGrid = target.grid.map(rArr => {
      const hasTarget = rArr.some(cell => cell && cell.parentUnitId === parentId);
      if (!hasTarget) return rArr;
      return rArr.map(cell => (cell && cell.parentUnitId === parentId ? null : cell));
    });

    const totalT = Math.max(0, target.totalTroops - refundCombatants);
    const totalW = Math.max(0, target.totalWeapons - (refundSwords + refundBows + refundSpears));
    const totalH = Math.max(0, target.totalHorses - refundHorses);
    const totalE = Math.max(0, target.totalElephants - refundElephants);
    const totalF = Math.max(0, target.totalFoodCarried - refundFood);

    set(prev => {
      const nextSwords = prev.resources.swords + refundSwords;
      const nextBows = prev.resources.bows + refundBows;
      const nextSpears = prev.resources.spears + refundSpears;

      return {
        cities: prev.cities.map(c => {
          if (c.id === target.cityId && c.population) {
            return {
              ...c,
              population: {
                ...c.population,
                combatTroops: c.population.combatTroops + refundCombatants,
              }
            };
          }
          return c;
        }),
        resources: {
          ...prev.resources,
          swords: nextSwords,
          bows: nextBows,
          spears: nextSpears,
          weapons: nextSwords + nextBows + nextSpears,
          horses: prev.resources.horses + refundHorses,
          elephants: prev.resources.elephants + refundElephants,
          food: prev.resources.food + refundFood,
        },
        formations: prev.formations.map(f => f.id === formationId ? {
          ...f,
          grid: newGrid,
          totalTroops: totalT,
          totalWeapons: totalW,
          totalHorses: totalH,
          totalElephants: totalE,
          totalFoodCarried: totalF,
        } : f)
      };
    });

    return { success: true, message: `Đã rút ${cfg.name} (${cfg.totalCells} ô) về căn cứ!` };
  },

  moveUnitOnGrid: (_formationId, _fromRow, _fromCol, _toRow, _toCol) => {
    return false;
  },

  assignGeneralToFormation: (formationId, generalId) => {
    const state = get();
    const target = state.formations.find(f => f.id === formationId);
    if (!target) return { success: false, message: 'Không tìm thấy đạo quân!' };

    if (target.assignedGeneralIds.includes(generalId)) {
      return { success: false, message: 'Vị tướng này đã ở trong ban chỉ huy đạo quân!' };
    }

    set(prev => ({
      formations: prev.formations.map(f => f.id === formationId ? {
        ...f,
        assignedGeneralIds: [...f.assignedGeneralIds, generalId],
        commanderGeneralId: f.commanderGeneralId || generalId,
      } : f)
    }));
    return { success: true, message: 'Đã bổ nhiệm tướng vào ban chỉ huy!' };
  },

  removeGeneralFromFormation: (formationId, generalId) => {
    const state = get();
    const target = state.formations.find(f => f.id === formationId);
    if (!target) return { success: false, message: 'Không tìm thấy đạo quân!' };

    const newGrid = target.grid.map(rArr => 
      rArr.map(cell => (cell && cell.type === 'general' && cell.generalId === generalId ? null : cell))
    );

    const nextAssigned = target.assignedGeneralIds.filter(id => id !== generalId);
    const nextCommander = target.commanderGeneralId === generalId ? (nextAssigned[0] || null) : target.commanderGeneralId;

    set(prev => ({
      formations: prev.formations.map(f => f.id === formationId ? {
        ...f,
        grid: newGrid,
        assignedGeneralIds: nextAssigned,
        commanderGeneralId: nextCommander,
      } : f)
    }));
    return { success: true, message: 'Đã miễn nhiệm tướng khỏi đạo quân!' };
  },

  setFormationCommander: (formationId, generalId) => {
    set(prev => ({
      formations: prev.formations.map(f => f.id === formationId ? {
        ...f,
        commanderGeneralId: generalId
      } : f)
    }));
  },

  startGridMarch: (formationId, cells, endpointAction, retreatCells, isEmergencyRetreat = false) => {
    const state = get();
    const target = state.formations.find(f => f.id === formationId);
    if (!target) return { success: false, message: 'Không tìm thấy đạo quân!' };
    if (target.totalTroops <= 0) {
      return { success: false, message: 'Đạo quân chưa có binh sĩ nào trên sa bàn!' };
    }
    if (!cells || cells.length < 2) {
      return { success: false, message: 'Vui lòng vẽ lộ trình hành quân qua ít nhất 2 ô lưới!' };
    }

    const totalMainDays = cells.slice(1).reduce((s, c) => s + c.moveCostDays, 0);
    const totalRetreatDays = retreatCells ? retreatCells.slice(1).reduce((s, c) => s + c.moveCostDays, 0) : 0;
    const totalDays = Math.max(0.1, Number((totalMainDays + totalRetreatDays).toFixed(2)));
    const totalFoodCost = Math.ceil(
      cells.slice(1).reduce((s, c) => s + c.foodCost, 0) +
      (retreatCells ? retreatCells.slice(1).reduce((s, c) => s + c.foodCost, 0) : 0)
    );

    // Nếu là Trá bại rút lui khẩn cấp khi đang giao chiến hoặc rút lui gần đồn địch -> Kéo một toán quân Minh đuổi theo
    let pursuingEnemy: PursuingEnemyGroup | null = null;
    if (isEmergencyRetreat) {
      const startCell = cells[0];
      let enemyCity = target.engagedTargetCityId
        ? state.cities.find(c => c.id === target.engagedTargetCityId && c.faction === 'ming' && c.troops > 0)
        : undefined;

      if (!enemyCity) {
        let minDist = Infinity;
        for (const c of state.cities) {
          if (c.faction === 'ming' && c.troops > 0) {
            const d = Math.hypot(c.x - startCell.x, c.y - startCell.y);
            if (d <= 5.0 && d < minDist) {
              minDist = d;
              enemyCity = c;
            }
          }
        }
      }

      if (enemyCity) {
        const luredTroops = Math.min(
          Math.max(10, Math.floor(enemyCity.troops * 0.45)),
          Math.max(15, target.totalTroops * 3)
        );
        pursuingEnemy = {
          sourceCityId: enemyCity.id,
          sourceCityName: enemyCity.name,
          troops: luredTroops,
          x: startCell.x,
          y: startCell.y,
          col: startCell.col,
          row: startCell.row,
        };
      }
    }

    const firstCell = cells[0];
    const actionMeta = MARCH_ENDPOINT_ACTIONS[endpointAction];

    set(prev => ({
      formations: prev.formations.map(f =>
        f.id === formationId
          ? {
              ...f,
              status: isEmergencyRetreat ? 'retreating' : 'marching',
              engagedTargetCityId: null,
              mapPosition: {
                x: firstCell.x,
                y: firstCell.y,
                col: firstCell.col,
                row: firstCell.row,
              },
              marchOrder: {
                cells,
                retreatCells: retreatCells && retreatCells.length > 1 ? retreatCells : undefined,
                currentCellIndex: 0,
                cellProgress: 0,
                isInRetreatPhase: isEmergencyRetreat,
                endpointAction,
                totalDays,
                elapsedDays: 0,
                totalFoodCost,
                pursuingEnemy: null,
              },
            }
          : f
      ),
    }));

    // Cập nhật nhân lực làm ruộng theo "Ngụ binh ư nông" khi đạo quân xuất kích
    const farmSyncAfterMarch = recalculateFarmWorkers(get().cities, get().structures, get().formations);
    if (farmSyncAfterMarch.hasChanged) {
      set({ cities: farmSyncAfterMarch.cities, structures: farmSyncAfterMarch.structures });
    }

    // Trá bại: quân Minh xuất thành thành đạo quân thật trên bản đồ (không mở màn hình giao chiến riêng)
    if (isEmergencyRetreat && pursuingEnemy) {
      const lured = pursuingEnemy;
      const lastCell = (retreatCells && retreatCells.length > 1 ? retreatCells : cells)[(retreatCells && retreatCells.length > 1 ? retreatCells : cells).length - 1];
      set(prev => {
        const dep = deployMingForce(prev.cities, lured.sourceCityId, { x: lastCell.x, y: lastCell.y }, lured.troops);
        return { cities: dep.cities, formations: [...prev.formations, ...dep.spawned] };
      });
    }

    if (isEmergencyRetreat && pursuingEnemy) {      return {
        success: true,
        message: `🏳️ [${target.name}] vờ thua tháo chạy! Đã dụ được ${pursuingEnemy.troops} quân Minh từ ${pursuingEnemy.sourceCityName} đuổi theo!`,
      };
    }

    return {
      success: true,
      message: `🚩 [${target.name}] đã xuất phát (${cells.length - 1} ô ~ ${totalDays} ngày) • Lệnh điểm cuối: ${actionMeta.name}!`,
    };
  },

  updateMarchEndpointAction: (formationId, endpointAction) => {
    const state = get();
    const target = state.formations.find(f => f.id === formationId);
    if (!target) return { success: false, message: 'Không tìm thấy đạo quân!' };

    const actionMeta = MARCH_ENDPOINT_ACTIONS[endpointAction];

    // Nếu đạo quân đang hành quân -> Cập nhật lệnh điểm cuối trong marchOrder
    if (target.status === 'marching' && target.marchOrder) {
      set(prev => ({
        formations: prev.formations.map(f =>
          f.id === formationId && f.marchOrder
            ? {
                ...f,
                marchOrder: {
                  ...f.marchOrder,
                  endpointAction,
                },
              }
            : f
        ),
      }));
      return {
        success: true,
        message: `Đã đổi lệnh điểm cuối của [${target.name}] thành: ${actionMeta.icon} ${actionMeta.name}!`,
      };
    }

    // Nếu đạo quân đã dừng tại chỗ -> Áp dụng ngay trạng thái chiến thuật mới tại vị trí hiện tại
    const pos = getFormationMapPos(target, state.cities);
    let nextStatus: TacticalFormation['status'] = 'stationed';
    let engagedTargetCityId: string | null = null;

    if (endpointAction === 'ambush') nextStatus = 'ambushing';
    else if (endpointAction === 'scout') nextStatus = 'scouting';
    else if (endpointAction === 'forage') nextStatus = 'foraging';
    else if (endpointAction === 'decoy') nextStatus = 'decoying';
    else if (endpointAction === 'raid') {
      let nearestMing = null;
      let minDist = Infinity;
      for (const c of state.cities) {
        if (c.faction === 'ming' && c.troops > 0) {
          const d = Math.hypot(c.x - pos.x, c.y - pos.y);
          if (d <= 3.0 && d < minDist) {
            minDist = d;
            nearestMing = c;
          }
        }
      }
      if (nearestMing) {
        nextStatus = 'engaging';
        engagedTargetCityId = nearestMing.id;
      } else {
        return {
          success: false,
          message: 'Không có đồn trại quân Minh nào trong tầm tập kích quanh vị trí này! Hãy vẽ đường tiến sát đồn địch trước.',
        };
      }
    } else {
      nextStatus = 'stationed';
    }

    set(prev => ({
      formations: prev.formations.map(f =>
        f.id === formationId
          ? {
              ...f,
              status: nextStatus,
              mapPosition: pos,
              engagedTargetCityId,
            }
          : f
      ),
    }));

    return {
      success: true,
      message: `[${target.name}] đã chuyển sang trạng thái: ${actionMeta.icon} ${actionMeta.name}!`,
    };
  },

  stopFormationMarch: (formationId) => {
    const state = get();
    const target = state.formations.find(f => f.id === formationId);
    if (!target) return { success: false, message: 'Không tìm thấy đạo quân!' };

    const pos = getFormationMapPos(target, state.cities);
    set(prev => ({
      formations: prev.formations.map(f =>
        f.id === formationId
          ? {
              ...f,
              status: 'stationed',
              mapPosition: pos,
              marchOrder: null,
              engagedTargetCityId: null,
            }
          : f
      ),
    }));

    return {
      success: true,
      message: `⛺ [${target.name}] đã dừng chân hạ trại tại ô (${pos.col}, ${pos.row})!`,
    };
  },

  splitFormationDetachment: (formationId, detachmentRatio = 0.3, customName) => {
    const state = get();
    const parent = state.formations.find(f => f.id === formationId);
    if (!parent) return { success: false, message: 'Không tìm thấy đạo quân gốc!' };

    // Tìm toàn bộ các đơn vị lính (không tính tướng) trên sa bàn của đạo quân gốc
    const rootUnits: { row: number; col: number; unit: TacticalPlacedUnit }[] = [];
    parent.grid.forEach((rArr, rIdx) => {
      rArr.forEach((cell, cIdx) => {
        if (cell && cell.isRoot && cell.type !== 'general') {
          rootUnits.push({ row: rIdx, col: cIdx, unit: cell });
        }
      });
    });

    if (rootUnits.length < 2) {
      return {
        success: false,
        message: 'Đạo quân cần ít nhất 2 đơn vị lính trên sa bàn để có thể tách đội nhỏ!',
      };
    }

    // Ưu tiên tách các đơn vị nhẹ cơ động (scout, swordsman, archer, spearman, cavalry) ở tiền tuyến trước
    const sortedUnits = [...rootUnits].sort((a, b) => {
      const priority = (t: TacticalUnitType) =>
        t === 'scout' ? 1 : t === 'cavalry' ? 2 : t === 'swordsman' ? 3 : t === 'spearman' ? 4 : t === 'archer' ? 5 : 6;
      return priority(a.unit.type) - priority(b.unit.type);
    });

    const detachCount = Math.max(1, Math.min(rootUnits.length - 1, Math.round(rootUnits.length * detachmentRatio)));
    const unitsToDetach = new Set(sortedUnits.slice(0, detachCount).map(u => u.unit.parentUnitId));

    const parentNewGrid = createEmptyGrid(FORMATION_ROWS, FORMATION_COLS);
    const childNewGrid = createEmptyGrid(FORMATION_ROWS, FORMATION_COLS);

    parent.grid.forEach((rArr, rIdx) => {
      rArr.forEach((cell, cIdx) => {
        if (!cell) return;
        if (unitsToDetach.has(cell.parentUnitId)) {
          childNewGrid[rIdx][cIdx] = { ...cell };
        } else {
          parentNewGrid[rIdx][cIdx] = { ...cell };
        }
      });
    });

    const parentTotals = calculateFormationTotals(parentNewGrid);
    const childTotals = calculateFormationTotals(childNewGrid);
    const parentPos = getFormationMapPos(parent, state.cities);

    const newFormationId = `formation_detach_${Date.now()}`;
    const newFormationName = customName || `Đội Tiên Phong (${parent.name.slice(0, 12)})`;

    const childFormation: TacticalFormation = {
      id: newFormationId,
      name: newFormationName,
      cityId: parent.cityId,
      rows: FORMATION_ROWS,
      cols: FORMATION_COLS,
      grid: childNewGrid,
      assignedGeneralIds: [],
      commanderGeneralId: null,
      status: 'stationed',
      mapPosition: { ...parentPos },
      marchOrder: null,
      engagedTargetCityId: null,
      parentFormationId: parent.id,
      createdAt: Date.now(),
      totalTroops: childTotals.totalT,
      totalWeapons: childTotals.totalW,
      totalHorses: childTotals.totalH,
      totalElephants: childTotals.totalE,
      totalFoodCarried: childTotals.totalF,
    };

    set(prev => ({
      formations: [
        ...prev.formations.map(f =>
          f.id === formationId
            ? {
                ...f,
                grid: parentNewGrid,
                totalTroops: parentTotals.totalT,
                totalWeapons: parentTotals.totalW,
                totalHorses: parentTotals.totalH,
                totalElephants: parentTotals.totalE,
                totalFoodCarried: parentTotals.totalF,
              }
            : f
        ),
        childFormation,
      ],
      activeFormationId: newFormationId,
    }));

    return {
      success: true,
      message: `⚡ Đã tách [${newFormationName}] (${childTotals.totalT} binh) từ [${parent.name}]! Hãy vẽ lộ trình khiêu khích / dụ địch cho đội này.`,
      newFormationId,
    };
  },

  mergeFormationIntoParent: (formationId) => {
    const state = get();
    const child = state.formations.find(f => f.id === formationId);
    if (!child) return { success: false, message: 'Không tìm thấy đội quân!' };

    // Tìm đạo quân đích để hội quân (ưu tiên parentFormationId hoặc đạo quân cùng căn cứ gần nhất)
    let parent = child.parentFormationId
      ? state.formations.find(f => f.id === child.parentFormationId)
      : undefined;

    if (!parent) {
      const childPos = getFormationMapPos(child, state.cities);
      parent = state.formations.find(f => {
        if (f.id === child.id) return false;
        const pPos = getFormationMapPos(f, state.cities);
        return Math.hypot(pPos.col - childPos.col, pPos.row - childPos.row) <= 8;
      });
    }

    if (!parent) {
      return {
        success: false,
        message: 'Không tìm thấy đại quân đồng minh nào ở gần (bán kính 8 ô) để hội quân!',
      };
    }

    const mergedGrid = parent.grid.map(rArr => [...rArr]);
    const childRoots: TacticalPlacedUnit[] = [];
    child.grid.forEach(rArr => {
      rArr.forEach(cell => {
        if (cell && cell.isRoot && cell.type !== 'general') {
          childRoots.push(cell);
        }
      });
    });

    for (const unit of childRoots) {
      const cfg = TACTICAL_UNIT_CONFIGS[unit.type];
      const sR = cfg.spanRows;
      const sC = cfg.spanCols;

      // Tìm vị trí trống đầu tiên trên lưới của đại quân
      let placed = false;
      for (let r = 0; r <= FORMATION_ROWS - sR && !placed; r++) {
        for (let c = 0; c <= FORMATION_COLS - sC && !placed; c++) {
          let fits = true;
          for (let ro = 0; ro < sR; ro++) {
            for (let co = 0; co < sC; co++) {
              if (mergedGrid[r + ro][c + co] !== null) {
                fits = false;
                break;
              }
            }
          }
          if (fits) {
            const newParentUnitId = `p_merged_${unit.type}_${r}_${c}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            for (let ro = 0; ro < sR; ro++) {
              for (let co = 0; co < sC; co++) {
                mergedGrid[r + ro][c + co] = {
                  ...unit,
                  id: `u_merged_${r + ro}_${c + co}_${Date.now()}`,
                  parentUnitId: newParentUnitId,
                  rootRow: r,
                  rootCol: c,
                  row: r + ro,
                  col: c + co,
                  isRoot: ro === 0 && co === 0,
                  offsetRow: ro,
                  offsetCol: co,
                };
              }
            }
            placed = true;
          }
        }
      }
    }

    const mergedTotals = calculateFormationTotals(mergedGrid);

    set(prev => ({
      formations: prev.formations
        .filter(f => f.id !== child.id)
        .map(f =>
          f.id === parent!.id
            ? {
                ...f,
                grid: mergedGrid,
                totalTroops: mergedTotals.totalT,
                totalWeapons: mergedTotals.totalW,
                totalHorses: mergedTotals.totalH,
                totalElephants: mergedTotals.totalE,
                totalFoodCarried: mergedTotals.totalF,
              }
            : f
        ),
      activeFormationId: parent.id,
    }));

    return {
      success: true,
      message: `🤝 [${child.name}] đã hội quân thành công vào [${parent.name}] (Tổng: ${mergedTotals.totalT} binh)!`,
    };
  },

  dispatchArmyForMarketPickup: (formationId, districtId) => {
    const state = get();
    const form = state.formations.find(f => f.id === formationId && (f.faction ?? 'lam_son') === 'lam_son');
    if (!form) return { success: false, message: 'Không tìm thấy đạo quân nghĩa quân!' };
    if (form.status !== 'idle' && form.status !== 'stationed') {
      return { success: false, message: 'Đạo quân đang bận hành quân hoặc giao chiến!' };
    }
    if (form.totalTroops <= 0) {
      return { success: false, message: 'Đạo quân chưa có binh sĩ!' };
    }
    const awaiting = state.pendingMarketOrders.filter(
      o => o.districtId === districtId && o.status === 'awaiting_pickup'
    );
    if (awaiting.length === 0) {
      return { success: false, message: 'Chợ này không có đơn hàng nào đang chờ lấy!' };
    }
    const homeCity = state.cities.find(c => c.id === form.cityId) ?? state.cities.find(c => c.faction === 'lam_son');
    if (!homeCity) return { success: false, message: 'Không tìm thấy bản doanh xuất phát!' };

    const startPos = getFormationMapPos(form, state.cities);
    const marketPos = getDistrictMarketPosition(districtId);
    const meta = getDistrictMarketMeta(districtId, state.cities);
    const { path } = findShortestScoutPath(
      { ...homeCity, x: startPos.x, y: startPos.y },
      { ...homeCity, x: marketPos.x, y: marketPos.y },
      1
    );
    const cells = path.length > 0 ? path : [{
      col: marketPos.col,
      row: marketPos.row,
      x: marketPos.x,
      y: marketPos.y,
      terrain: getGridTerrain(marketPos.col, marketPos.row),
      moveCostDays: 0.1,
      cumulativeDays: 0.1,
      foodCost: 1,
    }];
    const totalDays = cells[cells.length - 1]?.cumulativeDays ?? 0.5;
    const totalFoodCost = Number(cells.reduce((s, c) => s + (c.foodCost || 0), 0).toFixed(2));

    set(prev => ({
      formations: prev.formations.map(f =>
        f.id === formationId
          ? {
              ...f,
              status: 'marching' as const,
              mapPosition: startPos,
              marchOrder: {
                cells,
                currentCellIndex: 0,
                cellProgress: 0,
                endpointAction: 'market_pickup' as const,
                totalDays,
                elapsedDays: 0,
                totalFoodCost,
              },
            }
          : f
      ),
    }));

    return {
      success: true,
      message: `Đã cử [${form.name}] hành quân tới ${meta.marketName} lấy hàng về bản doanh!`,
    };
  },

  stepArmies: (deltaDays) => {
    if (deltaDays <= 0) return;
    const state = get();
    const hasMovingArmy = state.formations.some(
      f => (f.status === 'marching' || f.status === 'retreating') && f.marchOrder
    );
    const hasCombatActors = state.formations.some(
      f => f.faction === 'ming' || f.status === 'engaging' || f.status === 'ambushing' || f.isRouting
    );
    if (!hasMovingArmy && !hasCombatActors) {
      combatCanhAccumulator = 0;
      return;
    }

    // Giao chiến theo nhịp Canh Giờ (1 ngày = 12 canh), tách khỏi nhịp di chuyển 50ms
    combatCanhAccumulator += deltaDays * 12;
    const wholeCanh = Math.floor(combatCanhAccumulator);
    combatCanhAccumulator -= wholeCanh;
    const combatTicks = Math.min(MAX_COMBAT_TICKS_PER_STEP, wholeCanh);
    if (!hasMovingArmy && combatTicks === 0) return;

    const toastsToEmit: { type: 'success' | 'warning' | 'info'; text: string }[] = [];

    set(prev => {
      let foodConsumedTotal = 0;
      const captured = { food: 0, gold: 0, swords: 0, bows: 0, spears: 0, clothes: 0, horses: 0 };
      let nextPendingOrders = prev.pendingMarketOrders;
      const plundered = { food: 0, weapons: 0, morale: 0 };
      let cities = prev.cities;
      const spawned: TacticalFormation[] = [];
      const deploy = (cityId: string, targetPos: { x: number; y: number }, troops: number) => {
        const dep = deployMingForce(cities, cityId, targetPos, troops);
        cities = dep.cities;
        spawned.push(...dep.spawned);
        return dep.spawned.length > 0;
      };

      const ambushingFormations = prev.formations.filter(
        f => f.status === 'ambushing' && f.totalTroops > 0 && (f.faction ?? 'lam_son') === 'lam_son'
      );

      // ===== 1. Di chuyển mượt theo vector (x, y) =====
      let formations = prev.formations.map(rawForm => {
        const form = ensureFormationRosterAndLayers(rawForm);
        if ((form.status !== 'marching' && form.status !== 'retreating') || !form.marchOrder) {
          return form;
        }

        const isMing = form.faction === 'ming';
        const order = form.marchOrder;
        const activeCells =
          order.isInRetreatPhase && order.retreatCells && order.retreatCells.length > 1
            ? order.retreatCells
            : order.cells;

        if (activeCells.length < 2) {
          return { ...form, status: 'stationed' as const, marchOrder: null };
        }

        let curIdx = order.currentCellIndex;
        let curProg = order.cellProgress;
        let remainingDelta = deltaDays;
        const startPos = form.mapPosition || {
          x: activeCells[0].x,
          y: activeCells[0].y,
          col: activeCells[0].col,
          row: activeCells[0].row,
        };
        let currentPos = startPos;

        while (remainingDelta > 0 && curIdx < activeCells.length - 1) {
          const nextCell = activeCells[curIdx + 1];
          const stepCost = Math.max(0.01, nextCell.moveCostDays);
          const daysNeededForCell = (1 - curProg) * stepCost;

          if (remainingDelta >= daysNeededForCell) {
            remainingDelta -= daysNeededForCell;
            foodConsumedTotal += isMing ? 0 : nextCell.foodCost * (1 - curProg);
            curIdx += 1;
            curProg = 0;
            currentPos = { x: nextCell.x, y: nextCell.y, col: nextCell.col, row: nextCell.row };
          } else {
            const progDelta = remainingDelta / stepCost;
            curProg += progDelta;
            foodConsumedTotal += isMing ? 0 : nextCell.foodCost * progDelta;
            remainingDelta = 0;

            const fromCell = activeCells[curIdx];
            currentPos = {
              x: Number((fromCell.x + (nextCell.x - fromCell.x) * curProg).toFixed(4)),
              y: Number((fromCell.y + (nextCell.y - fromCell.y) * curProg).toFixed(4)),
              col: curProg >= 0.5 ? nextCell.col : fromCell.col,
              row: curProg >= 0.5 ? nextCell.row : fromCell.row,
            };
          }
        }

        // Hướng mặt theo vector di chuyển
        const mdx = currentPos.x - startPos.x;
        const mdy = currentPos.y - startPos.y;
        const facingAngleDeg = Math.hypot(mdx, mdy) > 1e-6 ? (Math.atan2(mdy, mdx) * 180) / Math.PI : form.facingAngleDeg;
        const moved = { ...form, facingAngleDeg, isStealthed: false };

        if (curIdx >= activeCells.length - 1) {
          // Trá bại: hết chặng 1 -> vờ thua rút lui, quân Minh xuất thành thành đạo quân thật trên bản đồ
          if (
            order.endpointAction === 'feigned_retreat' &&
            !order.isInRetreatPhase &&
            order.retreatCells &&
            order.retreatCells.length > 1
          ) {
            const provokePoint = activeCells[activeCells.length - 1];
            let targetMingCity: CityNode | null = null;
            let minDist = Infinity;
            for (const c of cities) {
              if (c.faction === 'ming' && c.troops > 0) {
                const d = Math.hypot(c.x - provokePoint.x, c.y - provokePoint.y);
                if (d <= 6.0 && d < minDist) {
                  minDist = d;
                  targetMingCity = c;
                }
              }
            }

            if (targetMingCity) {
              const luredCount = Math.min(
                Math.max(12, Math.floor(targetMingCity.troops * 0.45)),
                Math.max(20, form.totalTroops * 3)
              );
              const trapPoint = order.retreatCells[order.retreatCells.length - 1];
              if (deploy(targetMingCity.id, { x: trapPoint.x, y: trapPoint.y }, luredCount)) {
                toastsToEmit.push({
                  type: 'warning',
                  text: `🏳️ [${form.name}] đã chạm trán khiêu khích và vờ thua rút chạy! ${luredCount} quân Minh từ ${targetMingCity.name} đang hăng máu đuổi theo!`,
                });
              }
            }

            return {
              ...moved,
              status: 'retreating' as const,
              mapPosition: currentPos,
              marchOrder: {
                ...order,
                isInRetreatPhase: true,
                currentCellIndex: 0,
                cellProgress: 0,
                pursuingEnemy: null,
              },
            };
          }

          // Quân Minh tới đích thì dừng chân chờ giao chiến
          if (isMing) {
            return { ...moved, status: 'stationed' as const, mapPosition: currentPos, marchOrder: null };
          }

          // Hoàn thành lộ trình -> thực thi lệnh điểm cuối
          const act = order.endpointAction;
          let finalStatus: TacticalFormation['status'] = 'stationed';
          let engagedTargetCityId: string | null = null;

          if (act === 'market_pickup') {
            const matchedOrders = nextPendingOrders.filter(
              o => o.status === 'awaiting_pickup' && Math.hypot(o.x - currentPos.x, o.y - currentPos.y) <= 4.0
            );
            const homeCity = cities.find(c => c.id === form.cityId) ?? cities.find(c => c.faction === 'lam_son');
            if (matchedOrders.length > 0 && homeCity) {
              const matchedIds = new Set(matchedOrders.map(o => o.id));
              nextPendingOrders = nextPendingOrders.map(o =>
                matchedIds.has(o.id)
                  ? { ...o, status: 'in_transit' as const, carryingFormationId: form.id }
                  : o
              );
              const { path } = findShortestScoutPath(
                { ...homeCity, x: currentPos.x, y: currentPos.y },
                homeCity,
                1
              );
              const retCells = path.length > 0 ? path : [{
                col: coordToCell(homeCity.x, homeCity.y).col,
                row: coordToCell(homeCity.x, homeCity.y).row,
                x: homeCity.x,
                y: homeCity.y,
                terrain: getGridTerrain(coordToCell(homeCity.x, homeCity.y).col, coordToCell(homeCity.x, homeCity.y).row),
                moveCostDays: 0.1,
                cumulativeDays: 0.1,
                foodCost: 1,
              }];
              toastsToEmit.push({
                type: 'info',
                text: `📦 [${form.name}] đã nhận ${matchedOrders.length} kiện hàng tại chợ và đang áp tải về bản doanh!`,
              });
              return {
                ...moved,
                status: 'marching' as const,
                mapPosition: currentPos,
                marchOrder: {
                  cells: retCells,
                  currentCellIndex: 0,
                  cellProgress: 0,
                  endpointAction: 'market_return' as const,
                  totalDays: retCells[retCells.length - 1]?.cumulativeDays ?? 0.5,
                  elapsedDays: 0,
                  totalFoodCost: Number(retCells.reduce((s, c) => s + (c.foodCost || 0), 0).toFixed(2)),
                },
              };
            }
          } else if (act === 'market_return') {
            const carried = nextPendingOrders.filter(
              o => o.status === 'in_transit' && o.carryingFormationId === form.id
            );
            if (carried.length > 0) {
              const summaryParts: string[] = [];
              for (const o of carried) {
                captured[o.goodKey] += o.quantity;
                summaryParts.push(`${o.quantity.toLocaleString()} ${o.goodLabel}`);
              }
              const carriedIds = new Set(carried.map(o => o.id));
              nextPendingOrders = nextPendingOrders.filter(o => !carriedIds.has(o.id));
              finalStatus = 'idle';
              toastsToEmit.push({
                type: 'success',
                text: `✅ [${form.name}] đã chở hàng về bản doanh an toàn: ${summaryParts.join(', ')}!`,
              });
            } else {
              finalStatus = 'idle';
            }
          } else if (act === 'ambush') {
            finalStatus = 'ambushing';
            const tDef = TERRAIN_DEFINITIONS[currentPos ? getGridTerrain(currentPos.col, currentPos.row) : 'forest'];
            toastsToEmit.push({
              type: 'success',
              text: `🌲 [${form.name}] đã tới điểm đích và lập trận địa Mai Phục tại ${tDef.name} (Tỷ lệ phục kích: ${tDef.ambushSuccessRate}%)!`,
            });
          } else if (act === 'scout') {
            finalStatus = 'scouting';
            toastsToEmit.push({
              type: 'info',
              text: `👁️ [${form.name}] đã thiết lập trạm Thám Thính tại ô (${currentPos.col}, ${currentPos.row}), mở rộng tầm nhìn quân cơ!`,
            });
          } else if (act === 'forage') {
            finalStatus = 'foraging';
            toastsToEmit.push({
              type: 'success',
              text: `🌾 [${form.name}] bắt đầu Thu Thập & Tích Lương tại chỗ cho đại quân!`,
            });
          } else if (act === 'decoy') {
            finalStatus = 'decoying';
            let nearMing: CityNode | null = null;
            let minDist = Infinity;
            for (const c of cities) {
              if (c.faction === 'ming' && c.troops > 0) {
                const d = Math.hypot(c.x - currentPos.x, c.y - currentPos.y);
                if (d <= 5.5 && d < minDist) {
                  minDist = d;
                  nearMing = c;
                }
              }
            }
            const nearAmbush = ambushingFormations.find(amb => {
              if (amb.id === form.id) return false;
              const ambPos = getFormationMapPos(amb, cities);
              return Math.hypot(ambPos.col - currentPos.col, ambPos.row - currentPos.row) <= 12;
            });

            if (nearMing && nearAmbush) {
              const ambPos = getFormationMapPos(nearAmbush, cities);
              const lured = Math.max(12, Math.round(nearAmbush.totalTroops * 1.4));
              if (deploy(nearMing.id, { x: ambPos.x, y: ambPos.y }, lured)) {
                toastsToEmit.push({
                  type: 'success',
                  text: `🔥 NGHI BINH! [${form.name}] đốt lửa hư trương thanh thế, dụ quân Minh từ ${nearMing.name} tiến vào ổ phục kích của [${nearAmbush.name}]!`,
                });
              }
            } else {
              toastsToEmit.push({
                type: 'info',
                text: `🔥 [${form.name}] đã dựng cờ đốt lửa Nghi Binh tại ô (${currentPos.col}, ${currentPos.row})!`,
              });
            }
          } else if (act === 'raid') {
            let nearMing: CityNode | null = null;
            let minDist = Infinity;
            for (const c of cities) {
              if (c.faction === 'ming' && c.troops > 0) {
                const d = Math.hypot(c.x - currentPos.x, c.y - currentPos.y);
                if (d <= 1.2 && d < minDist) {
                  minDist = d;
                  nearMing = c;
                }
              }
            }
            if (nearMing) {
              finalStatus = 'engaging';
              engagedTargetCityId = nearMing.id;
              // Quân Minh trong thành xuất kích nghênh chiến ngay trên bản đồ (không mở màn hình riêng)
              deploy(nearMing.id, { x: currentPos.x, y: currentPos.y }, getMingSortieSize(nearMing));
              toastsToEmit.push({
                type: 'warning',
                text: `⚔️ [${form.name}] tập kích ${nearMing.name}! Quân Minh xuất thành nghênh chiến.`,
              });
            } else {
              toastsToEmit.push({
                type: 'info',
                text: `⛺ [${form.name}] đã tới điểm đích tại ô (${currentPos.col}, ${currentPos.row}) và hạ trại (Vị trí không có thành trì giặc để tập kích).`,
              });
            }
          } else {
            toastsToEmit.push({
              type: 'info',
              text: `⛺ [${form.name}] đã hành quân tới đích tại ô (${currentPos.col}, ${currentPos.row}) và hạ trại!`,
            });
          }

          return {
            ...moved,
            status: finalStatus,
            mapPosition: currentPos,
            marchOrder: null,
            engagedTargetCityId,
          };
        }

        return {
          ...moved,
          mapPosition: currentPos,
          marchOrder: {
            ...order,
            currentCellIndex: curIdx,
            cellProgress: curProg,
            elapsedDays: Number((order.elapsedDays + deltaDays).toFixed(2)),
            pursuingEnemy: null,
          },
        };
      });

      const justSpawned: TacticalFormation[] = [];
      if (spawned.length > 0) justSpawned.push(...spawned.splice(0));

      let activeFormationIdReset = false;
      const returnedTroops = new Map<string, number>();
      let liberatedCityIds: string[] = [];

      // ===== 2. Hệ thống tác chiến theo Canh Giờ =====
      if (combatTicks > 0) {
        // 2a. Ẩn thân tự động khi mai phục trong rừng / núi / hẻm vực
        formations = formations.map(f => {
          if (!f.mapPosition) return f;
          if (f.status === 'ambushing' && f.roster) {
            const terrain = getGridTerrainAt(f.mapPosition.x, f.mapPosition.y);
            const stealth = computeFormationSpeedAndVision(f.roster, terrain).canStealthInCover;
            return stealth === !!f.isStealthed ? f : { ...f, isStealthed: stealth };
          }
          if (f.isStealthed && f.status !== 'engaging') return { ...f, isStealthed: false };
          return f;
        });

        // 2b. AI quân Minh: đứt đường lương, chặn đoàn vận lương
        const ai = updateMingFormationsAI(formations, cities, combatTicks / 12);
        formations = ai.formations;
        captured.food += ai.interceptedFood;
        captured.swords += Math.ceil(ai.interceptedWeapons * 0.4);
        captured.bows += Math.floor(ai.interceptedWeapons * 0.3);
        captured.spears += ai.interceptedWeapons - Math.ceil(ai.interceptedWeapons * 0.4) - Math.floor(ai.interceptedWeapons * 0.3);
        ai.notices.slice(0, 2).forEach(text => toastsToEmit.push({ type: 'success', text }));

        // 2c. Thành bị tập kích tiếp tục xuất các đợt quân khi đợt trước đã bị diệt
        for (const f of formations) {
          if (!f.engagedTargetCityId || !f.mapPosition || f.totalTroops <= 0 || (f.faction ?? 'lam_son') !== 'lam_son') continue;
          const city = cities.find(c => c.id === f.engagedTargetCityId && c.faction === 'ming' && c.troops > 0);
          if (!city) continue;
          const hasLiveSortie =
            formations.some(m => m.faction === 'ming' && m.armyRole === 'ming_expedition' && m.cityId === city.id && m.totalTroops > 0) ||
            spawned.some(m => m.cityId === city.id) ||
            justSpawned.some(m => m.cityId === city.id);
          if (!hasLiveSortie) deploy(city.id, { x: f.mapPosition.x, y: f.mapPosition.y }, getMingSortieSize(city));
        }
        if (spawned.length > 0) justSpawned.push(...spawned.splice(0));

        // 2d. Giao chiến liên tục (chỉ đánh với các đạo quân đã hiện diện trước nhịp xuất thành này)
        const hadExplicitPos = new Set<string>();
        formations = formations.map(f => {
          if (f.mapPosition) {
            hadExplicitPos.add(f.id);
            return f;
          }
          if (f.totalTroops > 0 && (f.faction ?? 'lam_son') === 'lam_son') {
            const pos = getFormationMapPos(f, cities);
            return { ...f, mapPosition: { x: pos.x, y: pos.y, col: pos.col, row: pos.row } };
          }
          return f;
        });
        const getTerrainAtPos = (x: number, y: number) => getGridTerrainAt(x, y);
        const combatLogs: string[] = [];
        for (let i = 0; i < combatTicks; i++) {
          const res = resolveWorldMapCombatTick(formations, prev.generals, getTerrainAtPos);
          formations = res.formations;
          combatLogs.push(...res.logs);
          captured.food += res.capturedResources.food;
          captured.gold += res.capturedResources.gold;
          captured.swords += res.capturedResources.swords;
          captured.bows += res.capturedResources.bows;
          captured.spears += res.capturedResources.spears;
        }
        Array.from(new Set(combatLogs))
          .slice(0, 3)
          .forEach(text => toastsToEmit.push({ type: 'warning', text }));

        // 2e. Đạo quân vỡ trận tháo chạy về thành nhà
        formations = formations.map(f => {
          if (!f.isRouting || !f.mapPosition || f.totalTroops <= 0) return f;
          const homeId = f.faction === 'ming' ? f.supplySourceCityId ?? f.cityId : f.cityId;
          const home = cities.find(c => c.id === homeId);
          if (!home) return f;
          const dx = home.x - f.mapPosition.x;
          const dy = home.y - f.mapPosition.y;
          const dist = Math.hypot(dx, dy);
          const step = combatTicks * ROUT_FLEE_SPEED_PCT_PER_CANH;

          if (dist <= ROUT_ARRIVE_RADIUS_PCT + step) {
            if (f.faction === 'ming') {
              returnedTroops.set(home.id, (returnedTroops.get(home.id) ?? 0) + f.totalTroops);
              return { ...f, totalTroops: 0, combatState: null };
            }
            const homePos = getFormationMapPos({ ...f, mapPosition: undefined }, cities);
            return {
              ...f,
              isRouting: false,
              morale: 40,
              status: 'stationed' as const,
              mapPosition: homePos,
              marchOrder: null,
              combatState: null,
              isStealthed: false,
              engagedTargetCityId: null,
            };
          }

          const nx = f.mapPosition.x + (dx / dist) * step;
          const ny = f.mapPosition.y + (dy / dist) * step;
          const cell = coordToCell(nx, ny);
          return {
            ...f,
            marchOrder: null,
            status: 'retreating' as const,
            facingAngleDeg: (Math.atan2(dy, dx) * 180) / Math.PI,
            mapPosition: { x: nx, y: ny, col: cell.col, row: cell.row },
          };
        });

        // 2f. Dọn các đạo quân đã bị tiêu diệt / về tới thành (đoàn vận lương để AI thu giữ ở nhịp sau)
        const isGone = (f: TacticalFormation) =>
          f.totalTroops <= 0 && f.armyRole !== 'ming_convoy' && (f.faction === 'ming' || f.isRouting === true);
        const wiped = formations.filter(f => isGone(f) && (f.faction ?? 'lam_son') === 'lam_son');
        wiped.forEach(f => {
          toastsToEmit.push({ type: 'warning', text: `💀 [${f.name}] đã bị tiêu diệt hoàn toàn!` });
          if (prev.activeFormationId === f.id) activeFormationIdReset = true;
        });
        formations = formations.filter(f => !isGone(f));

        // 2f-bis. Quân Minh viễn chinh tới sát căn cứ Lam Sơn nhưng không có đạo quân nào chốt giữ -> cướp phá rồi rút về thành
        const unopposedMingIds = new Set<string>();
        const lamSonBases = cities.filter(c => c.faction === 'lam_son' && (c.hasBase || c.type === 'camp'));
        const activeLamSonPos = formations
          .filter(f => (f.faction ?? 'lam_son') === 'lam_son' && f.totalTroops > 0 && !f.isRouting && f.mapPosition)
          .map(f => f.mapPosition!);

        for (const f of formations) {
          if (
            f.faction !== 'ming' ||
            f.armyRole !== 'ming_expedition' ||
            f.status !== 'stationed' ||
            f.marchOrder ||
            f.combatState ||
            f.isRouting ||
            f.totalTroops <= 0 ||
            !f.mapPosition
          ) {
            continue;
          }
          const hitBase = lamSonBases.find(b => Math.hypot(b.x - f.mapPosition!.x, b.y - f.mapPosition!.y) <= 0.85);
          if (!hitBase) continue;
          const hasDefender = activeLamSonPos.some(
            p => Math.hypot(p.x - f.mapPosition!.x, p.y - f.mapPosition!.y) <= ENGAGEMENT_RADIUS_PCT
          );
          if (hasDefender) continue;

          const homeId = f.supplySourceCityId ?? f.cityId;
          returnedTroops.set(homeId, (returnedTroops.get(homeId) ?? 0) + f.totalTroops);
          unopposedMingIds.add(f.id);

          const availFood = Math.max(0, prev.resources.food - plundered.food);
          const availWeapons = Math.max(0, prev.resources.weapons - plundered.weapons);
          const raidFood = Math.min(availFood, Math.floor(availFood * 0.2) + 150);
          const raidWeapons = Math.min(availWeapons, 25);
          plundered.food += raidFood;
          plundered.weapons += raidWeapons;
          plundered.morale += 12;

          toastsToEmit.push({
            type: 'warning',
            text: `🔥 GIẶC MINH TẬP KÍCH [${hitBase.name}]! Không có đạo quân chốt giữ, bị cướp ${raidFood} lương & ${raidWeapons} binh khí trước khi địch rút lui!`,
          });
        }

        // Thu hồi đoàn vận lương khi đạo quân viễn chinh mẹ đã rút hoặc bị tiêu diệt
        for (const f of formations) {
          if (f.armyRole !== 'ming_convoy' || f.totalTroops <= 0) continue;
          const parentDeadOrRetreated =
            !!f.parentFormationId &&
            (unopposedMingIds.has(f.parentFormationId) ||
              !formations.some(p => p.id === f.parentFormationId && p.totalTroops > 0));
          if (parentDeadOrRetreated && f.status === 'stationed' && !f.marchOrder && !f.combatState) {
            const homeId = f.supplySourceCityId ?? f.cityId;
            returnedTroops.set(homeId, (returnedTroops.get(homeId) ?? 0) + f.totalTroops);
            unopposedMingIds.add(f.id);
          }
        }

        if (unopposedMingIds.size > 0) {
          formations = formations.filter(f => !unopposedMingIds.has(f.id));
        }

        formations = formations.map(f =>
          !hadExplicitPos.has(f.id) && f.status === 'idle' && !f.combatState && !f.isRouting && f.totalTroops > 0
            ? { ...f, mapPosition: undefined }
            : f
        );

        // 2g. Giải phóng thành khi hết quân giữ thành và không còn đợt xuất kích nào
        liberatedCityIds = cities
          .filter(c => {
            if (c.faction !== 'ming' || c.troops > 0 || (returnedTroops.get(c.id) ?? 0) > 0) return false;
            const besieged = formations.some(f => f.engagedTargetCityId === c.id && f.totalTroops > 0);
            const liveSortie = formations.some(m => m.faction === 'ming' && m.cityId === c.id && m.totalTroops > 0);
            return besieged && !liveSortie;
          })
          .map(c => c.id);
        if (liberatedCityIds.length > 0) {
          formations = formations.map(f =>
            f.engagedTargetCityId && liberatedCityIds.includes(f.engagedTargetCityId)
              ? { ...f, engagedTargetCityId: null, status: 'stationed' as const }
              : f
          );
        }
      }

      // ===== 3. Cập nhật thành trì & kho =====
      const updatedCities = cities.map(c => {
        const back = returnedTroops.get(c.id) ?? 0;
        if (liberatedCityIds.includes(c.id)) {
          toastsToEmit.push({
            type: 'success',
            text: `🚩 GIẢI PHÓNG CỨ ĐIỂM: Quân Minh tại [${c.name}] đã bị tiêu diệt hoàn toàn! Nghĩa quân Lam Sơn tiếp quản ${c.name}!`,
          });
          return {
            ...c,
            troops: 0,
            faction: 'lam_son' as const,
            population: c.population || {
              idleLaborers: 60,
              farmLaborers: 0,
              forgeLaborers: 0,
              combatTroops: 0,
              swappedCombatants: 0,
              unfitPopulation: 40,
            },
          };
        }
        return back > 0 && c.faction === 'ming' ? { ...c, troops: c.troops + back } : c;
      });

      if (justSpawned.length > 0) formations = [...formations, ...justSpawned];

      // Khi có chiến sự ngoài đồng (xuất quân Minh hoặc giao chiến), tự động chuyển sang nhịp Canh Giờ (1 canh/giây)
      const hasLiveCombat = formations.some(f => f.status === 'engaging' || !!f.combatState || f.faction === 'ming');
      const switchToWarMode = hasLiveCombat && prev.timeMode === 'day';

      const weaponLoss = plundered.weapons > 0
        ? deductWeaponsFromPool(
            {
              swords: prev.resources.swords + captured.swords,
              bows: prev.resources.bows + captured.bows,
              spears: prev.resources.spears + captured.spears,
            },
            plundered.weapons
          )
        : { swords: 0, bows: 0, spears: 0 };
      const nextSwords = Math.max(0, prev.resources.swords + captured.swords - weaponLoss.swords);
      const nextBows = Math.max(0, prev.resources.bows + captured.bows - weaponLoss.bows);
      const nextSpears = Math.max(0, prev.resources.spears + captured.spears - weaponLoss.spears);

      // Đồng bộ nhân lực ruộng nương theo "Ngụ binh ư nông"
      const farmSyncAtStep = recalculateFarmWorkers(updatedCities, prev.structures, formations);
      const finalCities = farmSyncAtStep.hasChanged ? farmSyncAtStep.cities : updatedCities;
      const finalStructures = farmSyncAtStep.hasChanged ? farmSyncAtStep.structures : prev.structures;

      return {
        formations,
        cities: finalCities,
        structures: finalStructures,
        activeFormationId: activeFormationIdReset ? null : prev.activeFormationId,
        pendingMarketOrders: nextPendingOrders,
        ...(switchToWarMode
          ? { timeMode: 'hour' as const, previousActiveTimeMode: 'hour' as const, isWarMode: true }
          : {}),
        resources: {
          ...prev.resources,
          food: Math.max(0, Math.round(prev.resources.food - foodConsumedTotal + captured.food - plundered.food)),
          morale: Math.max(0, prev.resources.morale - plundered.morale),
          clothes: prev.resources.clothes + captured.clothes,
          horses: prev.resources.horses + captured.horses,
          gold: prev.resources.gold + captured.gold,
          swords: nextSwords,
          bows: nextBows,
          spears: nextSpears,
          weapons: nextSwords + nextBows + nextSpears,
        },
      };
    });

    toastsToEmit.forEach(t => {
      if (t.type === 'success') notify.success(t.text);
      else if (t.type === 'warning') notify.warning(t.text);
      else notify.info(t.text);
    });
  },
});
