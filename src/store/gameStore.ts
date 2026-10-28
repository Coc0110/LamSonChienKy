import { useUIStore } from './uiStore';
import { create } from 'zustand';
import type {
  Resources,
  CityNode,
  Connection,
  General,
  RecruitmentEventNotice,
  MilitaryNotice,
    StructureType,
  WeaponCraftType,
  ForgeOrder,
  PlacedStructure,
} from '../types';
import {
  INITIAL_CITIES,
  INITIAL_CONNECTIONS,
  INITIAL_STRUCTURES,
  START_DAY,
  START_MONTH,
  START_YEAR,
} from '../data/mapData';
import { INITIAL_GENERALS } from '../data/generalsData';
import { TERRAIN_DEFINITIONS } from '../data/terrainData';
import { validateCellPlacement, validateBaseRelocate } from '../data/terrainGrid';

const COORDS_STORAGE_KEY = 'lam_son_coords_v3_districts';

const loadSavedCities = (): CityNode[] => {
  try {
    const raw = localStorage.getItem(COORDS_STORAGE_KEY);
    if (!raw) return INITIAL_CITIES;
    const savedCoords: Record<string, { x: number; y: number }> = JSON.parse(raw);
    return INITIAL_CITIES.map(city => {
      const saved = savedCoords[city.id];
      if (
        saved &&
        typeof saved.x === 'number' &&
        !isNaN(saved.x) &&
        typeof saved.y === 'number' &&
        !isNaN(saved.y)
      ) {
        return { ...city, x: saved.x, y: saved.y };
      }
      return city;
    });
  } catch {
    return INITIAL_CITIES;
  }
};

const saveCitiesCoords = (cities: CityNode[]) => {
  try {
    const coordsMap: Record<string, { x: number; y: number }> = {};
    cities.forEach(c => {
      coordsMap[c.id] = { x: c.x, y: c.y };
    });
    localStorage.setItem(COORDS_STORAGE_KEY, JSON.stringify(coordsMap));
  } catch {
    // Ignore storage errors
  }
};

interface GameState {
  day: number;
  month: number;
  year: number;
  
  isPaused: boolean;
  gameSpeed: number;
  
  resources: Resources;
  cities: CityNode[];
  connections: Connection[];
  generals: General[];
  structures: PlacedStructure[];
  recruitmentNotice: RecruitmentEventNotice | null;
  militaryNotices: MilitaryNotice[];

  // Chỉ số cảnh giác của giặc Minh (0 - 100%)
  suspicion: number;

  togglePause: () => void;
  setSpeed: (speed: number) => void;
  updateCityPosition: (id: string, x: number, y: number) => void;
  resetCityPositions: () => void;
  assignGeneralToCity: (generalId: string, cityId: string) => void;
  unlockGeneralManual: (generalId: string) => void;
  dismissRecruitmentNotice: () => void;
  addMilitaryNotice: (notice: Omit<MilitaryNotice, 'id' | 'read' | 'timestamp'>) => void;
  markNoticesAsRead: () => void;
  clearMilitaryNotices: () => void;

  // Quản lý Thao Luyện
  startTraining: (cityId: string, generalId: string, traineesCount: number, swappedCount: number, totalDays: number) => void;
  cancelTraining: (cityId: string) => void;

  // Quản lý Xây Dựng & Đồn Điền & Lò Rèn
  placeStructure: (cityId: string, type: StructureType, x: number, y: number, gridSize?: number, maxWorkers?: number) => { success: boolean; message: string };
  relocateStructure: (structureId: string, newX: number, newY: number) => { success: boolean; message: string };
  demolishStructure: (structureId: string) => { success: boolean; message: string };
  relocateBase: (baseId: string, newX: number, newY: number, newDistrictId?: string) => { success: boolean; message: string };
  demolishBase: (baseId: string) => { success: boolean; message: string };
  assignFarmWorkers: (structureId: string, delta: number) => { success: boolean; message: string };
  startForgeOrder: (structureId: string, order: { weaponType: WeaponCraftType; quantity: number; smiths: number }) => { success: boolean; message: string };
  cancelForgeOrder: (structureId: string) => void;

  // Giao Thương Lương Thảo lấy Ngân Khố
  tradeFoodForGold: (foodAmount: number) => { success: boolean; message: string };

  // Đút lót quan tướng giặc Minh
  bribeMingOfficials: () => void;

  // Legacy fallback
  buildStructure: (cityId: string, type: 'farms' | 'forges') => void;

  tick: () => void;
}

const getDaysInMonth = (month: number, year: number) => {
  return new Date(year, month, 0).getDate();
};

export const useGameStore = create<GameState>((set, get) => ({
  day: START_DAY,
  month: START_MONTH,
  year: START_YEAR,
  
  isPaused: false,
  gameSpeed: 1,

  // Tài nguyên ban đầu ngày 01/02/1416 (Thời điểm Hội thề Lũng Nhai)
  // Chỉ toàn bộ binh gia trang, chưa có ngựa chiến và voi chiến
  resources: {
    troops: 70,           // 50 quân ở Lam Sơn + 20 võ đinh ở Chí Linh
    horses: 0,            // Chưa có kỵ binh
    elephants: 0,         // Chưa có tượng binh
    food: 3500,           // Thóc lúa hào trưởng Lê Lợi tích trữ
    weapons: 150,         // Vũ khí tự rèn bí mật ban đầu
    clothes: 400,
    gold: 600,            // Vàng bạc để chi dụng và đút lót quan giặc
    morale: 95            // Sĩ khí kết nghĩa Lũng Nhai ngút trời
  },

  cities: loadSavedCities(),
  connections: INITIAL_CONNECTIONS,
  generals: INITIAL_GENERALS,
  structures: INITIAL_STRUCTURES,
  recruitmentNotice: null,
  militaryNotices: [],
  suspicion: 15,          // Mức nghi ngờ ban đầu của quan quân giặc Minh (15%)

  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
  
  setSpeed: (speed) => set(() => {
    if (speed === 0) {
      return { isPaused: true };
    }
    return { gameSpeed: speed, isPaused: false };
  }),

  updateCityPosition: (id, x, y) => set((state) => {
    const updatedCities = state.cities.map(city => city.id === id ? { ...city, x, y } : city);
    saveCitiesCoords(updatedCities);
    return { cities: updatedCities };
  }),

  resetCityPositions: () => set(() => {
    try {
      localStorage.removeItem(COORDS_STORAGE_KEY);
    } catch {
      // Ignore
    }
    return { cities: INITIAL_CITIES };
  }),

  assignGeneralToCity: (generalId, cityId) => set((state) => ({
    generals: state.generals.map(g => g.id === generalId ? { ...g, locationId: cityId } : g)
  })),

  unlockGeneralManual: (generalId) => set((state) => ({
    generals: state.generals.map(g => g.id === generalId ? { ...g, unlocked: true } : g)
  })),

  dismissRecruitmentNotice: () => set({ recruitmentNotice: null }),

  addMilitaryNotice: (notice) => set((state) => ({
    militaryNotices: [
      {
        ...notice,
        id: `notice_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        read: false,
        timestamp: Date.now(),
      },
      ...state.militaryNotices,
    ].slice(0, 100),
  })),

  markNoticesAsRead: () => set((state) => ({
    militaryNotices: state.militaryNotices.map((n) => ({ ...n, read: true })),
  })),

  clearMilitaryNotices: () => set({ militaryNotices: [] }),

  // Bắt đầu đợt thao luyện
  startTraining: (cityId, generalId, traineesCount, swappedCount, totalDays) => set((state) => {
    const targetCity = state.cities.find(c => c.id === cityId);
    if (!targetCity || !targetCity.population) return state;

    if (state.resources.weapons < traineesCount) {
      alert(`Quân khí không đủ! Cần ${traineesCount} vũ khí để trang bị thao luyện.`);
      return state;
    }

    const updatedCities = state.cities.map(c => {
      if (c.id !== cityId || !c.population) return c;

      const idleLaborers = c.population.idleLaborers;
      const farmLaborers = c.population.farmLaborers;
      const forgeLaborers = c.population.forgeLaborers;

      const takenFromIdle = Math.min(idleLaborers, traineesCount);
      const remainingNeeded = traineesCount - takenFromIdle;

      const newIdle = idleLaborers - takenFromIdle;
      let newFarm = farmLaborers;
      let newForge = forgeLaborers;

      if (remainingNeeded > 0) {
        const takeFarm = Math.min(newFarm, remainingNeeded);
        newFarm -= takeFarm;
        const takeForge = Math.min(newForge, remainingNeeded - takeFarm);
        newForge -= takeForge;
      }

      return {
        ...c,
        population: {
          ...c.population,
          idleLaborers: newIdle,
          farmLaborers: newFarm,
          forgeLaborers: newForge,
          swappedCombatants: (c.population.swappedCombatants || 0) + swappedCount,
        },
        training: {
          generalId,
          traineesCount,
          swappedCount,
          totalDays,
          remainingDays: totalDays,
        }
      };
    });

    return {
      cities: updatedCities,
      resources: {
        ...state.resources,
        weapons: state.resources.weapons - traineesCount,
      }
    };
  }),

  // Hủy đợt thao luyện
  cancelTraining: (cityId) => set((state) => {
    const targetCity = state.cities.find(c => c.id === cityId);
    if (!targetCity || !targetCity.training || !targetCity.population) return state;

    const { traineesCount, swappedCount } = targetCity.training;

    const updatedCities = state.cities.map(c => {
      if (c.id !== cityId || !c.population) return c;
      return {
        ...c,
        population: {
          ...c.population,
          idleLaborers: c.population.idleLaborers + traineesCount,
          swappedCombatants: Math.max(0, (c.population.swappedCombatants || 0) - swappedCount),
        },
        training: null,
      };
    });

    return {
      cities: updatedCities,
      resources: {
        ...state.resources,
        weapons: state.resources.weapons + traineesCount,
      }
    };
  }),

  // 1. KÉO THẢ / ĐẶT CÔNG TRÌNH LÊN BẢN ĐỒ (CƠ CHẾ Ô LƯỚI KHÔNG TRÙNG LẤN)
  placeStructure: (cityId, type, x, y, customGridSize, customMaxWorkers) => {
    const city = get().cities.find(c => c.id === cityId);
    if (!city) {
      return { success: false, message: 'Không tìm thấy căn cứ sở tại!' };
    }

    const gridSize = customGridSize || (type === 'forge' ? 3 : (customMaxWorkers === 50 ? 7 : customMaxWorkers === 30 ? 6 : 5));
    const maxWorkers = type === 'farm' ? (customMaxWorkers || (gridSize === 7 ? 50 : gridSize === 6 ? 30 : 15)) : 15;

    // Kiểm tra hợp lệ vị trí theo khối ô lưới không trùng lấn
    const val = validateCellPlacement(x, y, type, cityId, get().cities, get().structures, undefined, gridSize);
    if (!val.canBuild) {
      return { success: false, message: val.reason };
    }

    // Chi phí và nhân lực thi công theo từng mốc công trình
    let goldCost = 80;
    let reqWorkers = 10;
    let buildDays = 12;

    if (type === 'forge') {
      goldCost = 120;
      reqWorkers = 15;
      buildDays = 18;
    } else if (type === 'farm') {
      if (gridSize === 7) {
        goldCost = 240;
        reqWorkers = 25;
        buildDays = 20;
      } else if (gridSize === 6) {
        goldCost = 150;
        reqWorkers = 18;
        buildDays = 16;
      } else {
        goldCost = 80;
        reqWorkers = 10;
        buildDays = 12;
      }
    }

    if (get().resources.gold < goldCost) {
      return { success: false, message: `Ngân khố không đủ! Cần ${goldCost} Vàng để thi công.` };
    }

    if (!city.population || city.population.idleLaborers < reqWorkers) {
      return { success: false, message: `Thiếu tráng phu rảnh rỗi! Cần điều động ${reqWorkers} tráng phu tham gia thi công công trình.` };
    }

    const existingStructures = get().structures;
    const sameTypeCount = existingStructures.filter(s => s.cityId === cityId && s.type === type).length + 1;
    const tierName = type === 'farm' ? (gridSize === 7 ? 'Đại Điền' : gridSize === 6 ? 'Trung Điền' : 'Tiểu Điền') : 'Lò Rèn';

    const newStructure: PlacedStructure = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      cityId,
      type,
      name: `${tierName} ${city.name} ${sameTypeCount}`,
      x: val.snappedX,
      y: val.snappedY,
      gridSize,
      startCol: val.startCol,
      startRow: val.startRow,
      terrain: val.terrain,
      status: 'building',
      buildDaysTotal: buildDays,
      buildDaysRemaining: buildDays,
      builderWorkers: reqWorkers,
      assignedWorkers: 0,
      maxWorkers,
      cropDays: 0,
      cropCycleDays: 90,
      seasonCondition: Math.random() < 0.25 ? 'bountiful' : Math.random() < 0.2 ? 'poor' : 'normal',
      activeOrder: null,
      forgeQueue: [],
    };

    set(state => ({
      resources: {
        ...state.resources,
        gold: state.resources.gold - goldCost,
      },
      cities: state.cities.map(c => {
        if (c.id !== cityId || !c.population) return c;
        return {
          ...c,
          population: {
            ...c.population,
            idleLaborers: c.population.idleLaborers - reqWorkers,
          }
        };
      }),
      structures: [...state.structures, newStructure],
    }));

    return {
      success: true,
      message: type === 'farm'
        ? `Đã cắm mốc khai hoang [${newStructure.name}] (${gridSize}x${gridSize}). Cần ${buildDays} ngày thi công!`
        : `Đã khởi công dựng [${newStructure.name}] (3x3). Cần ${buildDays} ngày thi công!`,
    };
  },

  // 1.1 DI DỜI CƠ QUAN / CÔNG TRÌNH SANG VỊ TRÍ MỚI (THEO TẤM LƯỚI Ô ĐỊA HÌNH KHÔNG TRÙNG LẤN)
  relocateStructure: (structureId, newX, newY) => {
    const structure = get().structures.find(s => s.id === structureId);
    if (!structure) {
      return { success: false, message: 'Công trình không tồn tại!' };
    }

    const city = get().cities.find(c => c.id === structure.cityId);
    if (!city) {
      return { success: false, message: 'Không tìm thấy căn cứ sở tại!' };
    }

    // 1. Kiểm tra cự ly bảo hộ 14 dặm tới căn cứ quản hạt
    const dist = Math.hypot(city.x - newX, city.y - newY);
    if (dist > 14.0) {
      return { success: false, message: `Vị trí mới quá xa căn cứ ${city.name} (${dist.toFixed(1)} > 14 dặm)!` };
    }

    // 2. Xác định kích thước ô lưới của công trình cần di dời
    const gridSize = structure.gridSize || (structure.type === 'forge' ? 3 : (structure.maxWorkers === 50 ? 7 : structure.maxWorkers === 30 ? 6 : 5));

    // 3. Kiểm tra tính hợp lệ trên lưới địa hình (không đè lấn công trình/cứ điểm khác, đúng địa hình)
    const val = validateCellPlacement(
      newX,
      newY,
      structure.type,
      structure.cityId,
      get().cities,
      get().structures,
      structureId, // Bỏ qua chính nó khi kiểm tra va chạm ô lưới
      gridSize
    );

    if (!val.canBuild) {
      return { success: false, message: val.reason || 'Vị trí này không hợp lệ để di dời công trình!' };
    }

    const terrainInfo = TERRAIN_DEFINITIONS[val.terrain] || { name: 'Đất' };

    set(state => ({
      structures: state.structures.map(s => {
        if (s.id !== structureId) return s;
        return {
          ...s,
          x: val.snappedX,
          y: val.snappedY,
          startCol: val.startCol,
          startRow: val.startRow,
          gridSize,
          terrain: val.terrain,
        };
      }),
    }));

    return {
      success: true,
      message: `Đã di dời thành công [${structure.name}] sang vị trí mới (${terrainInfo.name})!`,
    };
  },

  // 1.2 PHÁ DỠ / DỠ BỎ CÔNG TRÌNH & THU HỒI TÀI NGUYÊN
  demolishStructure: (structureId) => {
    const structure = get().structures.find(s => s.id === structureId);
    if (!structure) {
      return { success: false, message: 'Công trình không tồn tại!' };
    }

    let refundGold = structure.type === 'farm' ? 40 : 60; // Thu hồi 50% vàng
    let returnedWorkers = 0;

    if (structure.status === 'building') {
      returnedWorkers = structure.builderWorkers;
      refundGold = structure.type === 'farm' ? 50 : 80;
    } else {
      returnedWorkers = structure.assignedWorkers;
    }

    set(state => ({
      resources: {
        ...state.resources,
        gold: state.resources.gold + refundGold,
      },
      cities: state.cities.map(c => {
        if (c.id !== structure.cityId || !c.population) return c;
        const currentPop = c.population;
        return {
          ...c,
          population: {
            ...currentPop,
            idleLaborers: currentPop.idleLaborers + returnedWorkers,
            farmLaborers: structure.type === 'farm'
              ? Math.max(0, (currentPop.farmLaborers || 0) - (structure.status === 'active' ? structure.assignedWorkers : 0))
              : currentPop.farmLaborers,
          },
          buildings: {
            farms: structure.type === 'farm' ? Math.max(0, (c.buildings?.farms || 1) - 1) : (c.buildings?.farms || 0),
            forges: structure.type === 'forge' ? Math.max(0, (c.buildings?.forges || 1) - 1) : (c.buildings?.forges || 0),
          }
        };
      }),
      structures: state.structures.filter(s => s.id !== structureId),
    }));

    return {
      success: true,
      message: `Đã phá dỡ [${structure.name}], thu hồi +${refundGold} Vàng và trả ${returnedWorkers} tráng phu về rảnh rỗi!`,
    };
  },

  // 1.3 DI DỜI CĂN CỨ SANG VỊ TRÍ MỚI (CƠ CHẾ Ô LƯỚI KHÔNG TRÙNG LẤN)
  relocateBase: (baseId: string, newX: number, newY: number, newDistrictId?: string) => {
    const base = get().cities.find(c => c.id === baseId);
    if (!base) {
      return { success: false, message: 'Căn cứ không tồn tại!' };
    }

    const val = validateBaseRelocate(baseId, newX, newY, get().cities, get().structures);
    if (!val.canBuild) {
      return { success: false, message: val.reason };
    }

    set(state => ({
      cities: state.cities.map(c => {
        if (c.id !== baseId) return c;
        return {
          ...c,
          x: val.snappedX,
          y: val.snappedY,
          gridSize: val.gridSize,
          startCol: val.startCol,
          startRow: val.startRow,
          districtId: newDistrictId || c.districtId,
        };
      }),
    }));

    // Cập nhật tọa độ lưu trữ
    try {
      const saved = localStorage.getItem(COORDS_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : {};
      parsed[baseId] = { x: val.snappedX, y: val.snappedY, gridSize: val.gridSize, startCol: val.startCol, startRow: val.startRow };
      localStorage.setItem(COORDS_STORAGE_KEY, JSON.stringify(parsed));
    } catch {
      // ignore
    }

    return {
      success: true,
      message: `Đã di dời thành công Căn cứ [${base.name}] sang vị trí mới (${val.gridSize}x${val.gridSize} ô)!`,
    };
  },

  // 1.4 PHÁ HỦY / GIẢI THỂ CĂN CỨ VÀ DỒN QUÂN VỀ CĂN CỨ GẦN NHẤT
  demolishBase: (baseId: string) => {
    const target = get().cities.find(c => c.id === baseId);
    if (!target) {
      return { success: false, message: 'Căn cứ không tồn tại!' };
    }

    if (target.faction !== 'lam_son') {
      return { success: false, message: 'Chỉ có thể giải thể căn cứ thuộc phe Lam Sơn!' };
    }

    // Đếm số căn cứ còn lại của Lam Sơn
    const lamSonBases = get().cities.filter(c => c.faction === 'lam_son' && (c.hasBase || c.type === 'camp') && c.id !== baseId);
    if (lamSonBases.length === 0) {
      return {
        success: false,
        message: 'Nghĩa quân cần ít nhất một căn cứ để duy trì đại nghiệp! Không thể giải thể bản doanh cuối cùng.',
      };
    }

    // Tìm căn cứ Lam Sơn gần nhất theo khoảng cách hình học
    let nearestBase = lamSonBases[0];
    let minDist = Infinity;
    for (const b of lamSonBases) {
      const dist = Math.hypot(b.x - target.x, b.y - target.y);
      if (dist < minDist) {
        minDist = dist;
        nearestBase = b;
      }
    }

    const troopsMoving = target.troops;
    const targetPop = target.population;

    set(state => {
      // 1. Hợp nhất quân số và dân cư vào căn cứ gần nhất
      const updatedCities = state.cities.map(c => {
        if (c.id === nearestBase.id) {
          const currentPop = c.population || {
            combatTroops: c.troops,
            idleLaborers: 0,
            farmLaborers: 0,
            forgeLaborers: 0,
            swappedCombatants: 0,
            unfitPopulation: 0,
          };
          return {
            ...c,
            troops: c.troops + troopsMoving,
            population: {
              combatTroops: currentPop.combatTroops + (targetPop?.combatTroops || troopsMoving) + (targetPop?.swappedCombatants || 0),
              idleLaborers: currentPop.idleLaborers + (targetPop?.idleLaborers || 0) + (targetPop?.farmLaborers || 0) + (targetPop?.forgeLaborers || 0),
              farmLaborers: currentPop.farmLaborers,
              forgeLaborers: currentPop.forgeLaborers,
              swappedCombatants: currentPop.swappedCombatants,
              unfitPopulation: currentPop.unfitPopulation + (targetPop?.unfitPopulation || 0),
            },
          };
        }
        if (c.id === baseId) {
          return {
            ...c,
            faction: 'neutral' as const,
            hasBase: false,
            troops: 0,
            population: undefined,
            buildings: undefined,
            training: null,
          };
        }
        return c;
      });

      // 2. Chuyển các tướng đóng tại căn cứ bị phá hủy về căn cứ gần nhất
      const updatedGenerals = state.generals.map(g => {
        if (g.locationId === baseId) {
          return { ...g, locationId: nearestBase.id };
        }
        return g;
      });

      // 3. Chuyển giao các cơ quan đồn điền/lò rèn về cho căn cứ gần nhất phụ trách
      const updatedStructures = state.structures.map(s => {
        if (s.cityId === baseId) {
          return { ...s, cityId: nearestBase.id };
        }
        return s;
      });

      return {
        cities: updatedCities,
        generals: updatedGenerals,
        structures: updatedStructures,
      };
    });

    // Chuyển chọn giao diện sang căn cứ mới
    useUIStore.getState().selectBase(nearestBase.id);

    return {
      success: true,
      message: `Đã giải thể Căn cứ [${target.name}]! Toàn bộ ${troopsMoving} quân binh, tráng phu và danh tướng đã bí mật rút về tụ hợp tại Căn cứ [${nearestBase.name}].`,
    };
  },

  // 2. PHÂN CÔNG NÔNG ĐINH CANH TÁC RUỘNG
  assignFarmWorkers: (structureId, delta) => {
    const structure = get().structures.find(s => s.id === structureId);
    if (!structure || structure.type !== 'farm' || structure.status !== 'active') {
      return { success: false, message: 'Đồn điền chưa hoàn tất khai hoang hoặc không tồn tại!' };
    }

    const city = get().cities.find(c => c.id === structure.cityId);
    if (!city || !city.population) {
      return { success: false, message: 'Không tìm thấy căn cứ!' };
    }

    const current = structure.assignedWorkers;
    const target = Math.max(0, Math.min(structure.maxWorkers, current + delta));
    const diff = target - current;

    if (diff === 0) {
      return {
        success: false,
        message: delta > 0 ? `Đồn điền đã đạt giới hạn tối đa (${structure.maxWorkers} nông đinh/khu ruộng)!` : 'Đã không còn nông đinh nào.',
      };
    }

    if (diff > 0 && city.population.idleLaborers < diff) {
      return { success: false, message: 'Không đủ tráng phu rảnh rỗi để cử thêm đi cày cấy!' };
    }

    set(state => ({
      cities: state.cities.map(c => {
        if (c.id !== structure.cityId || !c.population) return c;
        return {
          ...c,
          population: {
            ...c.population,
            idleLaborers: c.population.idleLaborers - diff,
            farmLaborers: c.population.farmLaborers + diff,
          }
        };
      }),
      structures: state.structures.map(s => {
        if (s.id !== structureId) return s;
        return { ...s, assignedWorkers: target };
      }),
    }));

    return { success: true, message: `Đã phân công ${target}/${structure.maxWorkers} tráng phu cày cấy ruộng.` };
  },

  // 3. ĐẶT MẺ RÈN VŨ KHÍ TẠI LÒ RÈN
  startForgeOrder: (structureId, order) => {
    const structure = get().structures.find(s => s.id === structureId);
    if (!structure || structure.type !== 'forge' || structure.status !== 'active') {
      return { success: false, message: 'Lò rèn chưa sẵn sàng!' };
    }

    // Cho phép xếp vào hàng chờ forgeQueue

    const city = get().cities.find(c => c.id === structure.cityId);
    if (!city || !city.population) {
      return { success: false, message: 'Không tìm thấy căn cứ!' };
    }

    const costPerItem = order.weaponType === 'spear' ? 1.0 : order.weaponType === 'sword' ? 2.0 : order.weaponType === 'armor' ? 3.0 : 1.5;
    const totalGold = Math.ceil(order.quantity * costPerItem);
    const smiths = Math.max(1, Math.min(15, order.smiths));

    if (get().resources.gold < totalGold) {
      return { success: false, message: `Ngân khố không đủ! Cần ${totalGold} Vàng để mua quặng và than củi cho ${order.quantity} khí giới.` };
    }

    if (!structure.activeOrder && city.population.idleLaborers < smiths) {
      return { success: false, message: `Không đủ thợ rèn! Cần điều động ${smiths} tráng phu rảnh rỗi vào lò rèn.` };
    }

    const workFactor = order.weaponType === 'spear' ? 1.0 : order.weaponType === 'sword' ? 1.8 : order.weaponType === 'armor' ? 2.2 : 1.4;
    const totalDays = Math.max(4, Math.ceil((order.quantity * workFactor * 1.5) / smiths));

    const weaponNames: Record<WeaponCraftType, string> = {
      sword: 'Kiếm Thép Lam Sơn',
      bow: 'Cung Nỏ Lam Sơn',
      spear: 'Giáo Mác Thao Thiết',
      armor: 'Thiết Giáp Nghĩa Binh',
      crossbow: 'Nỏ Ngắm Hẻm Núi',
    };

    const forgeOrder: ForgeOrder = {
      id: `order_${Date.now()}`,
      weaponType: order.weaponType,
      name: weaponNames[order.weaponType] || 'Khí Giới Lam Sơn',
      quantity: order.quantity,
      totalDays,
      remainingDays: totalDays,
      assignedSmiths: smiths,
      goldCost: totalGold,
    };

    if (structure.activeOrder) {
      set(state => ({
        resources: {
          ...state.resources,
          gold: state.resources.gold - totalGold,
        },
        structures: state.structures.map(s => {
          if (s.id !== structureId) return s;
          return {
            ...s,
            forgeQueue: [...(s.forgeQueue || []), forgeOrder],
          };
        }),
      }));

      return {
        success: true,
        message: `Đã xếp ${order.quantity} ${forgeOrder.name} vào hàng chờ của lò rèn!`,
      };
    }

    set(state => ({
      resources: {
        ...state.resources,
        gold: state.resources.gold - totalGold,
      },
      cities: state.cities.map(c => {
        if (c.id !== structure.cityId || !c.population) return c;
        return {
          ...c,
          population: {
            ...c.population,
            idleLaborers: c.population.idleLaborers - smiths,
            forgeLaborers: c.population.forgeLaborers + smiths,
          }
        };
      }),
      structures: state.structures.map(s => {
        if (s.id !== structureId) return s;
        return { ...s, activeOrder: forgeOrder };
      }),
    }));

    return {
      success: true,
      message: `Đã nổi lửa lò rèn! Bắt đầu đúc ${order.quantity} ${forgeOrder.name} trong ${totalDays} ngày.`,
    };
  },

  // Hủy mẻ rèn đang tiến hành
  cancelForgeOrder: (structureId) => {
    const structure = get().structures.find(s => s.id === structureId);
    if (!structure || !structure.activeOrder) return;

    const smiths = structure.activeOrder.assignedSmiths;
    const refundGold = Math.floor(structure.activeOrder.goldCost * 0.5);

    set(state => ({
      resources: {
        ...state.resources,
        gold: state.resources.gold + refundGold,
      },
      cities: state.cities.map(c => {
        if (c.id !== structure.cityId || !c.population) return c;
        return {
          ...c,
          population: {
            ...c.population,
            idleLaborers: c.population.idleLaborers + smiths,
            forgeLaborers: Math.max(0, c.population.forgeLaborers - smiths),
          }
        };
      }),
      structures: state.structures.map(s => {
        if (s.id !== structureId) return s;
        if (s.forgeQueue && s.forgeQueue.length > 0) {
          const [next, ...rest] = s.forgeQueue;
          return { ...s, activeOrder: next, forgeQueue: rest };
        }
        return { ...s, activeOrder: null };
      }),
    }));
  },

  // 4. GIAO THƯƠNG ĐỔI LƯƠNG LẤY NGÂN KHỐ (VÀNG)
  tradeFoodForGold: (foodAmount) => {
    if (foodAmount <= 0) return { success: false, message: 'Số lượng lương không hợp lệ.' };
    if (get().resources.food < foodAmount) {
      return { success: false, message: 'Kho lương không đủ để xuất bán!' };
    }

    // Tỷ giá quy đổi: 100 Lương -> 15 Vàng
    const goldEarned = Math.floor(foodAmount * 0.15);
    if (goldEarned <= 0) {
      return { success: false, message: 'Số lượng lương quá nhỏ để quy đổi nén vàng.' };
    }

    set(state => ({
      resources: {
        ...state.resources,
        food: state.resources.food - foodAmount,
        gold: state.resources.gold + goldEarned,
      }
    }));

    return {
      success: true,
      message: `Đã bí mật giao thương xuất bán ${foodAmount.toLocaleString()} thạch thóc lúa, thu về ${goldEarned.toLocaleString()} Vàng nạp vào ngân khố nghĩa quân!`,
    };
  },

  // Đút lót quan tướng giặc Minh để hạ Độ Nghi Ngờ
  bribeMingOfficials: () => set((state) => {
    const bribeCost = 100;
    if (state.resources.gold < bribeCost) {
      alert('Ngân lượng không đủ để chuẩn bị cống lễ đút lót!');
      return state;
    }
    const newSuspicion = Math.max(0, state.suspicion - 25);
    alert(`Đã bí mật cử sứ giả đem vàng bạc, sản vật tiến cống tướng Minh! Mức nghi ngờ giảm xuống còn ${newSuspicion.toFixed(0)}%.`);
    return {
      resources: {
        ...state.resources,
        gold: state.resources.gold - bribeCost,
      },
      suspicion: newSuspicion,
    };
  }),

  // Legacy build structure
  buildStructure: (cityId, type) => {
    const city = get().cities.find(c => c.id === cityId);
    if (!city) return;
    const structureType: StructureType = type === 'farms' ? 'farm' : 'forge';
    const offsetX = (Math.random() - 0.5) * 2;
    const offsetY = (Math.random() - 0.5) * 2;
    get().placeStructure(cityId, structureType, city.x + offsetX, city.y + offsetY);
  },

  tick: () => set((state) => {
    if (state.isPaused) return state;

    let newDay = state.day + 1;
    let newMonth = state.month;
    let newYear = state.year;

    if (newDay > getDaysInMonth(newMonth, newYear)) {
      newDay = 1;
      newMonth++;
      if (newMonth > 12) {
        newMonth = 1;
        newYear++;
      }
    }

    const newNotices: MilitaryNotice[] = [];

    // 1. Cập nhật tiến độ thao luyện võ nghệ & tính tổng dân số
    let citiesChanged = false;
    let totalPopulation = 0;
    const updatedCities = state.cities.map(city => {
      if (!city.population) return city;

      totalPopulation += (city.population.combatTroops || 0) +
        (city.population.idleLaborers || 0) +
        (city.population.farmLaborers || 0) +
        (city.population.forgeLaborers || 0) +
        (city.population.swappedCombatants || 0) +
        (city.population.unfitPopulation || 0);

      if (city.training) {
        citiesChanged = true;
        const newRemaining = city.training.remainingDays - 1;
        if (newRemaining <= 0) {
          return {
            ...city,
            population: {
              ...city.population,
              combatTroops: city.population.combatTroops + city.training.traineesCount,
              swappedCombatants: Math.max(0, city.population.swappedCombatants - city.training.swappedCount),
            },
            troops: city.troops + city.training.traineesCount,
            training: undefined,
          };
        } else {
          return {
            ...city,
            training: {
              ...city.training,
              remainingDays: newRemaining,
            },
          };
        }
      }
      return city;
    });

    // 2. Cập nhật tiến độ đồn điền & lò rèn theo ngày
    let structuresChanged = false;
    let seasonalFoodHarvested = 0;
    let totalWeaponsProduced = 0;
    let suspicionGain = 0;

    const updatedStructures = state.structures.map(structure => {
      // Thi công xây dựng công trình mới
      if (structure.status === 'building') {
        structuresChanged = true;
        const s = { ...structure, buildDaysRemaining: structure.buildDaysRemaining - 1 };
        if (s.buildDaysRemaining <= 0) {
          s.status = 'active';
          const workers = s.builderWorkers;
          s.builderWorkers = 0;

          const targetCityIdx = updatedCities.findIndex(c => c.id === s.cityId);
          if (targetCityIdx !== -1 && updatedCities[targetCityIdx].population) {
            citiesChanged = true;
            const targetCity = updatedCities[targetCityIdx];
            updatedCities[targetCityIdx] = {
              ...targetCity,
              population: {
                ...targetCity.population!,
                idleLaborers: targetCity.population!.idleLaborers + workers,
              },
              buildings: s.type === 'farm'
                ? {
                    farms: (targetCity.buildings?.farms || 0) + 1,
                    forges: targetCity.buildings?.forges || 0,
                  }
                : {
                    farms: targetCity.buildings?.farms || 0,
                    forges: (targetCity.buildings?.forges || 0) + 1,
                  },
            };
          }

          newNotices.push({
            id: `build_${Date.now()}_${s.id}_${Math.random().toString(36).substring(2, 6)}`,
            type: 'build',
            title: s.type === 'farm' ? 'Đồn Điền Khai Hoang Hoàn Tất' : 'Lò Rèn Binh Khí Đã Dựng Xong',
            dateStr: `Ngày ${newDay}/${newMonth}/${newYear}`,
            description: s.type === 'farm'
              ? `Khu ruộng [${s.name}] đã khai hoang xong trên bãi bồi, sẵn sàng đón nông đinh vào cày cấy!`
              : `Lò rèn [${s.name}] đã dựng xong bễ đúc và đe búa, sẵn sàng nhận lệnh rèn đúc!`,
            read: false,
            timestamp: Date.now(),
          });
        }
        return s;
      }

      // Ruộng lúa đang hoạt động: Tích lũy tiến độ vụ mùa (90 ngày ~ 1 quý / vụ)
      if (structure.type === 'farm' && structure.status === 'active') {
        if (structure.assignedWorkers > 0) {
          structuresChanged = true;
          const s = { ...structure, cropDays: structure.cropDays + 1 };
          if (s.cropDays >= s.cropCycleDays) {
            // MÙA THU HOẠCH LƯƠNG THỰC!
            const efficiency = s.gridSize === 7 ? 0.26 : s.gridSize === 6 ? 0.24 : 0.22;
            const weatherMult = s.seasonCondition === 'bountiful' ? 1.25 : s.seasonCondition === 'poor' ? 0.70 : 1.0;
            const baseFood = Math.round(s.assignedWorkers * 90 * efficiency * weatherMult);

            const matchedCity = updatedCities.find(c => c.id === s.cityId);
            const isMing = matchedCity?.faction === 'ming';
            const taxRate = isMing ? 0.50 : 0.10;
            const taxAmount = Math.round(baseFood * taxRate);
            const yieldFood = Math.max(0, baseFood - taxAmount);

            seasonalFoodHarvested += yieldFood;
            s.cropDays = 0;
            const condText = s.seasonCondition === 'bountiful' ? 'Được mùa (+25%)' : s.seasonCondition === 'poor' ? 'Mất mùa (-30%)' : 'Mưa thuận gió hòa';

            newNotices.push({
              id: `harvest_${Date.now()}_${s.id}_${Math.random().toString(36).substring(2, 6)}`,
              type: 'harvest',
              title: 'Vụ Mùa Gặt Lương Thảo',
              dateStr: `Ngày ${newDay}/${newMonth}/${newYear}`,
              description: `Đồn điền [${s.name}] đã gặt xong (${condText})! Thuế: ${taxAmount.toLocaleString()} thạch (${taxRate * 100}%). Thực thu nhập kho: ${yieldFood.toLocaleString()} thạch thóc!`,
              read: false,
              timestamp: Date.now(),
            });

            s.seasonCondition = Math.random() < 0.25 ? 'bountiful' : Math.random() < 0.20 ? 'poor' : 'normal';
          }
          return s;
        }
        return structure;
      }

      // Lò rèn đang hoạt động: Đang đúc mẻ vũ khí
      if (structure.type === 'forge' && structure.status === 'active' && structure.activeOrder) {
        structuresChanged = true;
        const s = { ...structure };
        const order = { ...structure.activeOrder };
        
        // Tiếng đe búa tạo độ nghi ngờ theo địa hình
        const isQuietTerrain = s.terrain === 'mountain' || s.terrain === 'forest';
        const noiseFactor = isQuietTerrain ? 0.25 : 1.6;
        suspicionGain += order.assignedSmiths * 0.012 * noiseFactor;

        order.remainingDays -= 1;
        if (order.remainingDays <= 0) {
          // Hoàn thành đợt rèn!
          totalWeaponsProduced += order.quantity;
          const smiths = order.assignedSmiths;

          const targetCityIdx = updatedCities.findIndex(c => c.id === s.cityId);
          if (targetCityIdx !== -1 && updatedCities[targetCityIdx].population) {
            citiesChanged = true;
            const targetCity = updatedCities[targetCityIdx];
            updatedCities[targetCityIdx] = {
              ...targetCity,
              population: {
                ...targetCity.population!,
                idleLaborers: targetCity.population!.idleLaborers + smiths,
                forgeLaborers: Math.max(0, targetCity.population!.forgeLaborers - smiths),
              },
            };
          }

          newNotices.push({
            id: `forge_${Date.now()}_${s.id}_${Math.random().toString(36).substring(2, 6)}`,
            type: 'forge',
            title: 'Hoàn Tất Mẻ Rèn Khí Giới',
            weaponType: order.weaponType,
            dateStr: `Ngày ${newDay}/${newMonth}/${newYear}`,
            description: `Lò rèn [${s.name}] đã hoàn tất đúc ${order.quantity} ${order.name}. Khí giới đã nhập kho bí mật!`,
            read: false,
            timestamp: Date.now(),
          });

          if (s.forgeQueue && s.forgeQueue.length > 0) {
            const [nextOrder, ...remainingQueue] = s.forgeQueue;
            s.activeOrder = nextOrder;
            s.forgeQueue = remainingQueue;
          } else {
            s.activeOrder = null;
          }
        } else {
          s.activeOrder = order;
        }
        return s;
      }

      return structure;
    });

    // 3. Tiêu hao lương thực theo ngày & Cộng thu hoạch mùa vụ
    const foodConsumption = Math.max(5, totalPopulation * 0.035);
    let newFood = state.resources.food + seasonalFoodHarvested - foodConsumption;
    let newWeapons = state.resources.weapons + totalWeaponsProduced;
    let newMorale = state.resources.morale;

    if (newFood <= 0) {
      newFood = 0;
      newMorale = Math.max(0, newMorale - 0.5);
    } else if (newFood > 4000) {
      newMorale = Math.min(100, newMorale + 0.05);
    }

    // 4. Mức nghi ngờ của quân Minh
    let newSuspicion = Math.min(100, Math.max(0, state.suspicion + suspicionGain - 0.02));
    if (newSuspicion >= 95 && Math.random() < 0.05) {
      alert('CẢNH BÁO QUÂN CƠ: Quân Minh tại thành Tây Đô đã dấy lên nghi ngờ cao độ! Mau chuẩn bị vàng đút lót trước khi giặc kéo quân lục soát!');
    }

    // 5. Kiểm tra tướng gia nhập
    const newlyJoined = state.generals.filter(
      g => !g.unlocked && g.joinYear === newYear && g.joinMonth === newMonth && g.joinDay === newDay
    );

    let updatedGenerals = state.generals;
    let newNotice = state.recruitmentNotice;
    let shouldPause = false;
    let bonusTroops = 0;
    let bonusElephants = 0;

    if (newlyJoined.length > 0) {
      const joinedIds = new Set(newlyJoined.map(g => g.id));
      updatedGenerals = state.generals.map(g =>
        joinedIds.has(g.id) ? { ...g, unlocked: true } : g
      );

      const generalNames = newlyJoined.map(g => g.name).join(', ');
      
      // Mở khóa các đơn vị đặc biệt tương ứng với từng tướng:
      if (newlyJoined.some(g => g.id === 'cam_lan')) {
        bonusTroops += 500;
        bonusElephants += 2;
      } else if (newlyJoined.some(g => g.id === 'cam_banh')) {
        bonusTroops += 300;
      }

      newNotice = {
        id: `notice_${Date.now()}`,
        title: 'Tụ Nghĩa Lam Sơn!',
        dateStr: `Ngày ${newDay}/${newMonth}/${newYear}`,
        description: `Danh tướng ${generalNames} đã quy tụ về cờ nghĩa Lam Sơn! Bắt đầu mở khóa và có thể điều động trong hàng ngũ chỉ huy.`,
        generalIds: newlyJoined.map(g => g.id),
      };
      shouldPause = true;

      newNotices.push({
        id: `general_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'general',
        title: 'Danh Tướng Tụ Nghĩa',
        dateStr: `Ngày ${newDay}/${newMonth}/${newYear}`,
        description: `Danh tướng ${generalNames} đã quy tụ về cờ nghĩa Lam Sơn!`,
        read: false,
        timestamp: Date.now(),
      });
    }

    return {
      day: newDay,
      month: newMonth,
      year: newYear,
      isPaused: shouldPause ? true : state.isPaused,
      resources: {
        ...state.resources,
        food: newFood,
        weapons: newWeapons,
        morale: newMorale,
        troops: state.resources.troops + bonusTroops,
        elephants: state.resources.elephants + bonusElephants,
      },
      cities: citiesChanged ? updatedCities : state.cities,
      structures: structuresChanged ? updatedStructures : state.structures,
      generals: updatedGenerals,
      recruitmentNotice: newNotice,
      militaryNotices: newNotices.length > 0
        ? [...newNotices, ...state.militaryNotices].slice(0, 100)
        : state.militaryNotices,
      suspicion: newSuspicion,
    };
  })
}));