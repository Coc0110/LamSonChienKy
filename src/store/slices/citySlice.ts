import type { StateCreator } from 'zustand';
import type { CityNode } from '../../types';
import { INITIAL_CITIES, INITIAL_CONNECTIONS } from '../../data/mapData';
import { validateBaseRelocate } from '../../data/terrainGrid';
import { useUIStore } from '../uiStore';
import type { CitySlice, GameStore } from './types';

export const COORDS_STORAGE_KEY = 'lam_son_coords_v3_districts';

export const loadSavedCities = (): CityNode[] => {
  try {
    const raw = localStorage.getItem(COORDS_STORAGE_KEY);
    if (!raw) return INITIAL_CITIES;
    const savedCoords: Record<string, Partial<CityNode>> = JSON.parse(raw);
    return INITIAL_CITIES.map(city => {
      const saved = savedCoords[city.id];
      if (
        saved &&
        typeof saved.x === 'number' &&
        !isNaN(saved.x) &&
        typeof saved.y === 'number' &&
        !isNaN(saved.y)
      ) {
        return {
          ...city,
          x: saved.x,
          y: saved.y,
          gridSize: typeof saved.gridSize === 'number' ? saved.gridSize : city.gridSize,
          startCol: typeof saved.startCol === 'number' ? saved.startCol : city.startCol,
          startRow: typeof saved.startRow === 'number' ? saved.startRow : city.startRow,
          districtId: saved.districtId || city.districtId,
        };
      }
      return city;
    });
  } catch {
    return INITIAL_CITIES;
  }
};

export const saveCitiesCoords = (cities: CityNode[]) => {
  try {
    const coordsMap: Record<string, Partial<CityNode>> = {};
    cities.forEach(c => {
      coordsMap[c.id] = {
        x: c.x,
        y: c.y,
        gridSize: c.gridSize,
        startCol: c.startCol,
        startRow: c.startRow,
        districtId: c.districtId,
      };
    });
    localStorage.setItem(COORDS_STORAGE_KEY, JSON.stringify(coordsMap));
  } catch {
    // Ignore storage errors
  }
};

export const createCitySlice: StateCreator<GameStore, [], [], CitySlice> = (set, get) => ({
  cities: loadSavedCities(),
  connections: INITIAL_CONNECTIONS,

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

  // Di dời căn cứ sang vị trí mới
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

  // Phá hủy / giải thể căn cứ và dồn quân về căn cứ gần nhất
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
});
