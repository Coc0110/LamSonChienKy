import type { StateCreator } from 'zustand';
import { INITIAL_GENERALS } from '../../data/generalsData';
import { notify } from '../dialogStore';
import type { MilitarySlice, GameStore } from './types';

export const createMilitarySlice: StateCreator<GameStore, [], [], MilitarySlice> = (set) => ({
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

  generals: INITIAL_GENERALS,
  recruitmentNotice: null,
  militaryNotices: [],
  suspicion: 15,          // Mức nghi ngờ ban đầu của quan quân giặc Minh (15%)

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
      notify.error(`Quân khí không đủ! Cần ${traineesCount} vũ khí để trang bị thao luyện.`);
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

  // Đút lót quan tướng giặc Minh để hạ Độ Nghi Ngờ
  bribeMingOfficials: () => set((state) => {
    const bribeCost = 100;
    if (state.resources.gold < bribeCost) {
      notify.error('Ngân lượng không đủ để chuẩn bị cống lễ đút lót!');
      return state;
    }
    const newSuspicion = Math.max(0, state.suspicion - 25);
    notify.success(`Đã bí mật cử sứ giả đem vàng bạc, sản vật tiến cống tướng Minh! Mức nghi ngờ giảm xuống còn ${newSuspicion.toFixed(0)}%.`);
    return {
      resources: {
        ...state.resources,
        gold: state.resources.gold - bribeCost,
      },
      suspicion: newSuspicion,
    };
  }),
});
