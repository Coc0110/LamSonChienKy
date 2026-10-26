import { create } from 'zustand';
import type {
  Resources,
  CityNode,
  Connection,
  General,
  RecruitmentEventNotice,
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
import { getGridTerrainAt } from '../data/terrainGrid';

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

  // Chỉ số cảnh giác của giặc Minh (0 - 100%)
  suspicion: number;

  togglePause: () => void;
  setSpeed: (speed: number) => void;
  updateCityPosition: (id: string, x: number, y: number) => void;
  resetCityPositions: () => void;
  assignGeneralToCity: (generalId: string, cityId: string) => void;
  unlockGeneralManual: (generalId: string) => void;
  dismissRecruitmentNotice: () => void;

  // Quản lý Thao Luyện
  startTraining: (cityId: string, generalId: string, traineesCount: number, swappedCount: number, totalDays: number) => void;
  cancelTraining: (cityId: string) => void;

  // Quản lý Xây Dựng & Đồn Điền & Lò Rèn
  placeStructure: (cityId: string, type: StructureType, x: number, y: number) => { success: boolean; message: string };
  relocateStructure: (structureId: string, newX: number, newY: number) => { success: boolean; message: string };
  demolishStructure: (structureId: string) => { success: boolean; message: string };
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
  suspicion: 15,          // Mức nghi ngờ ban đầu của quan quân giặc Minh (15%)

  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
  
  setSpeed: (speed) => set({ gameSpeed: speed, isPaused: false }),

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

  // 1. KÉO THẢ / ĐẶT CÔNG TRÌNH LÊN BẢN ĐỒ
  placeStructure: (cityId, type, x, y) => {
    const city = get().cities.find(c => c.id === cityId);
    if (!city) {
      return { success: false, message: 'Không tìm thấy căn cứ sở tại!' };
    }

    // Kiểm tra khoảng cách đến căn cứ (nới rộng lên 14.0 dặm để bao quát toàn bộ vùng đồng bằng bãi bồi ven Lam Sơn)
    const distToCity = Math.hypot(city.x - x, city.y - y);
    if (distToCity > 14.0) {
      return { success: false, message: `Vị trí quá xa căn cứ ${city.name} (khoảng cách: ${distToCity.toFixed(1)} dặm, giới hạn bảo hộ: 14 dặm)! Nghĩa quân chưa thể quản lý ngoài phạm vi này.` };
    }

    // Kiểm tra khoảng cách tối thiểu giữa các công trình (tránh spam)
    const existingStructures = get().structures;
    for (const s of existingStructures) {
      const dist = Math.hypot(s.x - x, s.y - y);
      if (dist < 2.2) {
        return { success: false, message: `Vị trí này quá gần '${s.name}' (cần cách tối thiểu 2.2 dặm)! Vui lòng chọn địa điểm thoáng đãng hơn.` };
      }
    }

    // Kiểm tra tính phù hợp của địa hình
    const terrainType = getGridTerrainAt(x, y);
    const terrainInfo = TERRAIN_DEFINITIONS[terrainType];
    if (type === 'farm') {
      if (terrainType !== 'plains') {
        return { success: false, message: `Ruộng lúa nước bắt buộc phải khai hoang tại đất bãi phù sa Đồng Bằng! Địa hình nơi đây là ${terrainInfo.name}, không thể cày cấy.` };
      }
    } else if (type === 'forge') {
      if (terrainType === 'water') {
        return { success: false, message: 'Không thể dựng lò rèn trên sông ngòi, dòng chảy!' };
      }
      if (terrainType === 'cliff') {
        return { success: false, message: 'Vách đá dốc đứng hiểm trở, không có mặt bằng dựng lò rèn!' };
      }
    }

    // Chi phí và nhân lực thi công
    const goldCost = type === 'farm' ? 80 : 120;
    const reqWorkers = type === 'farm' ? 10 : 15;
    const buildDays = type === 'farm' ? 12 : 18;

    if (get().resources.gold < goldCost) {
      return { success: false, message: `Ngân khố không đủ! Cần ${goldCost} Vàng để khai hoang/dựng lò.` };
    }

    if (!city.population || city.population.idleLaborers < reqWorkers) {
      return { success: false, message: `Thiếu tráng phu rảnh rỗi! Cần điều động ${reqWorkers} tráng phu tham gia thi công công trình.` };
    }

    const sameTypeCount = existingStructures.filter(s => s.cityId === cityId && s.type === type).length + 1;
    const newStructure: PlacedStructure = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      cityId,
      type,
      name: type === 'farm' ? `Đồn Điền ${city.name} ${sameTypeCount}` : `Lò Rèn ${city.name} ${sameTypeCount}`,
      x,
      y,
      terrain: terrainType,
      status: 'building',
      buildDaysTotal: buildDays,
      buildDaysRemaining: buildDays,
      builderWorkers: reqWorkers,
      assignedWorkers: 0,
      maxWorkers: 15,
      cropDays: 0,
      cropCycleDays: 90,
      activeOrder: null,
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
        ? `Đã cắm mốc khai hoang [${newStructure.name}] tại đồng bằng. Cần 12 ngày thi công!`
        : `Đã khởi công dựng [${newStructure.name}] tại ${terrainInfo.name}. Cần 18 ngày thi công!`,
    };
  },

  // 1.1 DI DỜI CƠ QUAN / CÔNG TRÌNH SANG VỊ TRÍ MỚI
  relocateStructure: (structureId, newX, newY) => {
    const structure = get().structures.find(s => s.id === structureId);
    if (!structure) {
      return { success: false, message: 'Công trình không tồn tại!' };
    }

    const city = get().cities.find(c => c.id === structure.cityId);
    if (!city) {
      return { success: false, message: 'Không tìm thấy căn cứ sở tại!' };
    }

    // Kiểm tra cự ly bảo hộ 14 dặm
    const dist = Math.hypot(city.x - newX, city.y - newY);
    if (dist > 14.0) {
      return { success: false, message: `Vị trí mới quá xa căn cứ ${city.name} (${dist.toFixed(1)} > 14 dặm)!` };
    }

    // Kiểm tra khoảng cách với các công trình khác
    for (const s of get().structures) {
      if (s.id === structureId) continue;
      if (Math.hypot(s.x - newX, s.y - newY) < 1.5) {
        return { success: false, message: `Vị trí quá gần [${s.name}] (cần cách ít nhất 1.5 dặm)!` };
      }
    }

    const terrain = getGridTerrainAt(newX, newY);
    const terrainInfo = TERRAIN_DEFINITIONS[terrain];
    if (structure.type === 'farm' && terrain !== 'plains') {
      return { success: false, message: `Ruộng lúa nước chỉ có thể canh tác trên đất Đồng Bằng! Vị trí này là ${terrainInfo.name}.` };
    }
    if (structure.type === 'forge' && (terrain === 'water' || terrain === 'cliff')) {
      return { success: false, message: 'Không thể di dời lò rèn vào vùng sông nước hoặc vách đá!' };
    }

    set(state => ({
      structures: state.structures.map(s => {
        if (s.id !== structureId) return s;
        return {
          ...s,
          x: newX,
          y: newY,
          terrain,
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

    if (structure.activeOrder) {
      return { success: false, message: 'Lò rèn đang đỏ lửa mẻ đúc khác, chưa thể nhận đơn mới!' };
    }

    const city = get().cities.find(c => c.id === structure.cityId);
    if (!city || !city.population) {
      return { success: false, message: 'Không tìm thấy căn cứ!' };
    }

    const costPerItem = order.weaponType === 'spear' ? 1.0 : order.weaponType === 'sword' ? 2.0 : 1.5;
    const totalGold = Math.ceil(order.quantity * costPerItem);
    const smiths = Math.max(1, Math.min(15, order.smiths));

    if (get().resources.gold < totalGold) {
      return { success: false, message: `Ngân khố không đủ! Cần ${totalGold} Vàng để mua quặng và than củi cho ${order.quantity} khí giới.` };
    }

    if (city.population.idleLaborers < smiths) {
      return { success: false, message: `Không đủ thợ rèn! Cần điều động ${smiths} tráng phu rảnh rỗi vào lò rèn.` };
    }

    const workFactor = order.weaponType === 'spear' ? 1.0 : order.weaponType === 'sword' ? 1.8 : 1.4;
    const totalDays = Math.max(4, Math.ceil((order.quantity * workFactor * 1.5) / smiths));

    const weaponNames: Record<WeaponCraftType, string> = {
      spear: 'Giáo Mác Thao Thiết',
      sword: 'Kiếm Thép Lam Sơn',
      crossbow: 'Nỏ Ngắm Hẻm Núi',
    };

    const forgeOrder: ForgeOrder = {
      id: `order_${Date.now()}`,
      weaponType: order.weaponType,
      name: weaponNames[order.weaponType],
      quantity: order.quantity,
      totalDays,
      remainingDays: totalDays,
      assignedSmiths: smiths,
      goldCost: totalGold,
    };

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

    let finishedNotice: RecruitmentEventNotice | null = null;
    let seasonalFoodHarvested = 0;
    let totalWeaponsProduced = 0;
    let totalPopulation = 0;
    let suspicionGain = 0;

    let citiesChanged = false;
    let structuresChanged = false;

    // 1. Cập nhật các Cứ điểm Lam Sơn & Nhân khẩu
    const updatedCities = state.cities.map(city => {
      if (city.faction !== 'lam_son' || !city.population) return city;

      const pop = city.population;

      // Đếm tổng nhân khẩu cứ điểm để tính ăn uống
      const cityTotalPop =
        pop.combatTroops +
        pop.idleLaborers +
        pop.farmLaborers +
        pop.forgeLaborers +
        pop.unfitPopulation;
      totalPopulation += cityTotalPop;

      if (!city.training) {
        return city;
      }

      citiesChanged = true;
      let nextPop = { ...pop };
      let training: CityNode['training'] = { ...city.training };
      let cityTroops = city.troops;

      // Xử lý đợt thao luyện
      const isMountainOrForest = city.type === 'camp' || city.type === 'chokepoint';
      const noiseFactor = isMountainOrForest ? 0.3 : 1.0;
      suspicionGain += training.traineesCount * 0.01 * noiseFactor;
      training.remainingDays -= 1;

      if (training.remainingDays <= 0) {
        // Thao luyện hoàn tất: Tráng phu tốt nghiệp thành Nghĩa Binh!
        const newGraduates = training.traineesCount;
        const coachGeneralId = training.generalId;
        nextPop.combatTroops += newGraduates;
        cityTroops += newGraduates;

        // Trả lại số nghĩa binh thế chỗ về quân ngũ
        if (nextPop.swappedCombatants > 0) {
          nextPop.farmLaborers += Math.floor(nextPop.swappedCombatants * 0.7);
          nextPop.forgeLaborers += Math.ceil(nextPop.swappedCombatants * 0.3);
          nextPop.swappedCombatants = 0;
        }

        const coachGeneral = state.generals.find(g => g.id === coachGeneralId);
        finishedNotice = {
          id: `train_done_${Date.now()}`,
          title: 'Thao Luyện Nghĩa Binh Hoàn Tất!',
          dateStr: `Ngày ${newDay}/${newMonth}/${newYear}`,
          description: `${coachGeneral ? coachGeneral.name : 'Vị tướng'} đã rèn đúc thành công ${newGraduates} tráng đinh trở thành Nghĩa Binh dũng cảm, sẵn sàng cầm gươm giáo vì đại nghĩa!`,
          generalIds: coachGeneral ? [coachGeneral.id] : [],
        };

        training = null;
      }

      return {
        ...city,
        troops: cityTroops,
        population: nextPop,
        training,
      };
    });

    // 2. Xử lý Tiến độ Công trình (Ruộng lúa & Lò rèn)
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

          if (!finishedNotice) {
            finishedNotice = {
              id: `build_done_${Date.now()}_${s.id}`,
              title: s.type === 'farm' ? 'Đồn Điền Khai Hoang Hoàn Tất!' : 'Lò Rèn Binh Khí Đã Dựng Xong!',
              dateStr: `Ngày ${newDay}/${newMonth}/${newYear}`,
              description: s.type === 'farm'
                ? `Khu ruộng [${s.name}] đã khai hoang xong trên vùng bãi bồi, sẵn sàng đón nông đinh vào cày cấy vụ lúa!`
                : `Lò rèn [${s.name}] đã dựng xong bễ đúc và đe búa, sẵn sàng nhận lệnh rèn vũ khí!`,
              generalIds: [],
            };
          }
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
            const yieldFood = Math.round(s.assignedWorkers * 90 * 0.22);
            seasonalFoodHarvested += yieldFood;
            s.cropDays = 0;

            if (!finishedNotice) {
              finishedNotice = {
                id: `harvest_${Date.now()}_${s.id}`,
                title: '🌾 Vụ Mùa Gặt Bội Thu Lương Thảo!',
                dateStr: `Ngày ${newDay}/${newMonth}/${newYear}`,
                description: `Đồn điền [${s.name}] đã đến kỳ gặt lúa! ${s.assignedWorkers} nông đinh đã thu hoạch ${yieldFood.toLocaleString()} thạch thóc lúa nhập thẳng vào kho lương nghĩa quân!`,
                generalIds: [],
              };
            }
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

          if (!finishedNotice) {
            finishedNotice = {
              id: `craft_done_${Date.now()}_${s.id}`,
              title: '⚒️ Hoàn Tất Mẻ Rèn Khí Giới!',
              dateStr: `Ngày ${newDay}/${newMonth}/${newYear}`,
              description: `Lò rèn [${s.name}] đã hoàn tất đúc ${order.quantity} ${order.name}. Vũ khí đã được nhập kho, sẵn sàng trang bị xung trận!`,
              generalIds: [],
            };
          }

          s.activeOrder = null;
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
    let newNotice = finishedNotice || state.recruitmentNotice;
    let shouldPause = finishedNotice ? true : false;
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
      suspicion: newSuspicion,
    };
  })
}));