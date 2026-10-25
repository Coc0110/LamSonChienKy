import { create } from 'zustand';
import type { Resources, CityNode, Connection, General, RecruitmentEventNotice } from '../types';
import { INITIAL_CITIES, INITIAL_CONNECTIONS, START_DAY, START_MONTH, START_YEAR } from '../data/mapData';
import { INITIAL_GENERALS } from '../data/generalsData';

const COORDS_STORAGE_KEY = 'lam_son_coords_v3_districts';

const loadSavedCities = (): CityNode[] => {
  try {
    const raw = localStorage.getItem(COORDS_STORAGE_KEY);
    if (!raw) return INITIAL_CITIES;
    const savedCoords: Record<string, { x: number; y: number }> = JSON.parse(raw);
    return INITIAL_CITIES.map(city =>
      savedCoords[city.id]
        ? { ...city, x: savedCoords[city.id].x, y: savedCoords[city.id].y }
        : city
    );
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
  recruitmentNotice: RecruitmentEventNotice | null;

  togglePause: () => void;
  setSpeed: (speed: number) => void;
  updateCityPosition: (id: string, x: number, y: number) => void;
  resetCityPositions: () => void;
  assignGeneralToCity: (generalId: string, cityId: string) => void;
  unlockGeneralManual: (generalId: string) => void;
  dismissRecruitmentNotice: () => void;
  tick: () => void;
}

const getDaysInMonth = (month: number, year: number) => {
  return new Date(year, month, 0).getDate();
};

export const useGameStore = create<GameState>((set) => ({
  day: START_DAY,
  month: START_MONTH,
  year: START_YEAR,
  
  isPaused: false,
  gameSpeed: 1,

  resources: {
    troops: 2000,
    horses: 100,
    elephants: 4,
    food: 5000,
    weapons: 2000,
    clothes: 2000,
    gold: 1000,
    morale: 90
  },

  cities: loadSavedCities(),
  connections: INITIAL_CONNECTIONS,
  generals: INITIAL_GENERALS,
  recruitmentNotice: null,

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

  unlockGeneralManual: (generalId) => set((state) => {
    const target = state.generals.find(g => g.id === generalId);
    if (!target || target.unlocked) return state;

    const updatedGenerals = state.generals.map(g =>
      g.id === generalId ? { ...g, unlocked: true } : g
    );

    return {
      generals: updatedGenerals,
      isPaused: true,
      recruitmentNotice: {
        id: `manual_${target.id}_${Date.now()}`,
        title: 'Hào Kiệt Tụ Nghĩa Dưới Cờ Lam Sơn',
        dateStr: `Ngày ${state.day}/${state.month}/${state.year}`,
        description: `${target.name} (${target.title} - ${target.epithet}) đã tìm về đại bản doanh Lam Sơn dốc lòng phò tá Bình Định Vương!`,
        generalIds: [target.id]
      }
    };
  }),

  dismissRecruitmentNotice: () => set({ recruitmentNotice: null }),

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

    const foodConsumption = state.resources.troops * 0.05;
    let newFood = state.resources.food - foodConsumption;
    let newMorale = state.resources.morale;

    if (newFood <= 0) {
      newFood = 0;
      newMorale = Math.max(0, newMorale - 1);
    } else if (newFood > state.resources.troops * 2) {
      newMorale = Math.min(100, newMorale + 0.1);
    }

    // Kiểm tra xem có vị tướng nào đến hạn tụ nghĩa vào ngày mới này không
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
      shouldPause = true;

      if (joinedIds.has('nguyen_chich')) {
        bonusTroops += 1500;
      }
      if (joinedIds.has('cam_quy')) {
        bonusTroops += 8000;
        bonusElephants += 10;
      }

      const namesList = newlyJoined.map(g => `${g.name} (${g.title})`).join(', ');
      newNotice = {
        id: `event_${newYear}_${newMonth}_${newDay}`,
        title: newlyJoined.length > 1 ? 'Quần Hùng Hội Tụ Nghĩa Kỳ' : 'Danh Tướng Đầu Quân Khởi Nghĩa',
        dateStr: `Ngày ${newDay} tháng ${newMonth} năm ${newYear}`,
        description: `Nghe tin Bình Định Vương Lê Lợi phất cờ đại nghĩa, hào kiệt bốn phương đã tìm về tụ nghĩa: ${namesList}!`,
        generalIds: newlyJoined.map(g => g.id),
      };
    }

    return {
      day: newDay,
      month: newMonth,
      year: newYear,
      isPaused: shouldPause ? true : state.isPaused,
      generals: updatedGenerals,
      recruitmentNotice: newNotice,
      resources: {
        ...state.resources,
        troops: state.resources.troops + bonusTroops,
        elephants: state.resources.elephants + bonusElephants,
        food: newFood,
        morale: Number(newMorale.toFixed(1))
      }
    };
  })
}));
