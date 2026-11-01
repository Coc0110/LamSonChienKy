import type { StateCreator } from 'zustand';
import { INITIAL_GENERALS } from '../../data/generalsData';
import { notify } from '../dialogStore';
import type { Resources } from '../../types';
import type { MilitarySlice, GameStore } from './types';

// Công thức chuẩn tính số ngày thao luyện dựa trên chỉ số Thống Lĩnh và Võ Nghệ của tướng
export const calculateTrainingDays = (general?: { stats: { command: number; martial: number } } | null): number => {
  const baseDays = 25;
  const generalSkill = general
    ? (general.stats.command * 0.6 + general.stats.martial * 0.4)
    : 75;
  return Math.max(8, Math.round(baseDays - ((generalSkill - 70) * 0.35)));
};

// Trừ vũ khí từ kho (Kiếm, Cung, Giáo) theo tỷ lệ tồn kho thực tế và trả về số lượng từng loại đã lấy
export const deductWeaponsFromPool = (
  res: Pick<Resources, 'swords' | 'bows' | 'spears'>,
  amount: number
): { swords: number; bows: number; spears: number } => {
  let rem = Math.max(0, Math.floor(amount));
  const availSwords = Math.max(0, Math.floor(res.swords));
  const availBows = Math.max(0, Math.floor(res.bows));
  const availSpears = Math.max(0, Math.floor(res.spears));
  const totalAvail = availSwords + availBows + availSpears;

  if (rem === 0 || totalAvail === 0) {
    return { swords: 0, bows: 0, spears: 0 };
  }

  let takeSwords = Math.min(availSwords, Math.floor((rem * availSwords) / totalAvail));
  let takeBows = Math.min(availBows, Math.floor((rem * availBows) / totalAvail));
  let takeSpears = Math.min(availSpears, rem - takeSwords - takeBows);

  let left = rem - (takeSwords + takeBows + takeSpears);
  while (left > 0) {
    if (availSpears - takeSpears > 0) {
      takeSpears++;
      left--;
    } else if (availSwords - takeSwords > 0) {
      takeSwords++;
      left--;
    } else if (availBows - takeBows > 0) {
      takeBows++;
      left--;
    } else {
      break;
    }
  }

  return { swords: takeSwords, bows: takeBows, spears: takeSpears };
};

export const createMilitarySlice: StateCreator<GameStore, [], [], MilitarySlice> = (set) => ({
  resources: {
    troops: 70,           // 50 quân ở Lam Sơn (44 dự bị + 6 trong Tiên Phong Doanh) + 20 võ đinh ở Chí Linh
    horses: 0,            // Chưa có kỵ binh
    elephants: 0,         // Chưa có tượng binh
    food: 3500,           // Thóc lúa hào trưởng Lê Lợi tích trữ
    weapons: 150,         // Tổng vũ khí tự rèn bí mật ban đầu (52 kiếm + 38 cung + 60 giáo)
    swords: 52,
    bows: 38,
    spears: 60,
    clothes: 400,         // Giáp trụ / quân trang
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
  startTraining: (cityId, generalId, traineesCount, _swappedCount, totalDays) => set((state) => {
    const targetCity = state.cities.find(c => c.id === cityId);
    if (!targetCity || !targetCity.population) return state;
    if (targetCity.training) {
      notify.warning(`Căn cứ ${targetCity.name} đang có đợt thao luyện diễn ra!`);
      return state;
    }

    if (state.resources.weapons < traineesCount) {
      notify.error(`Quân khí không đủ! Cần ${traineesCount} vũ khí để trang bị thao luyện.`);
      return state;
    }

    const pop = targetCity.population;
    const takenFromIdle = Math.min(pop.idleLaborers, traineesCount);
    const remainingNeeded = Math.max(0, traineesCount - takenFromIdle);
    const takenFromFarm = Math.min(pop.farmLaborers, remainingNeeded);
    const takenFromForge = Math.min(pop.forgeLaborers, remainingNeeded - takenFromFarm);
    const actualSwapped = takenFromFarm + takenFromForge;

    if (takenFromIdle + actualSwapped < traineesCount) {
      notify.error('Không đủ tráng phu tại căn cứ để thao luyện!');
      return state;
    }

    if (pop.combatTroops < actualSwapped) {
      notify.error(`Cần ${actualSwapped} nghĩa binh rảnh tại căn cứ để thế chỗ tráng phu đang làm việc!`);
      return state;
    }

    const weaponsUsed = deductWeaponsFromPool(state.resources, traineesCount);
    const nextSwords = Math.max(0, state.resources.swords - weaponsUsed.swords);
    const nextBows = Math.max(0, state.resources.bows - weaponsUsed.bows);
    const nextSpears = Math.max(0, state.resources.spears - weaponsUsed.spears);

    const updatedCities = state.cities.map(c => {
      if (c.id !== cityId || !c.population) return c;

      return {
        ...c,
        population: {
          ...c.population,
          combatTroops: c.population.combatTroops - actualSwapped,
          idleLaborers: c.population.idleLaborers - takenFromIdle,
          farmLaborers: c.population.farmLaborers - takenFromFarm,
          forgeLaborers: c.population.forgeLaborers - takenFromForge,
          swappedCombatants: (c.population.swappedCombatants || 0) + actualSwapped,
        },
        training: {
          generalId,
          traineesCount,
          swappedCount: actualSwapped,
          takenFromFarm,
          takenFromForge,
          weaponsUsed,
          totalDays,
          remainingDays: totalDays,
        }
      };
    });

    return {
      cities: updatedCities,
      resources: {
        ...state.resources,
        swords: nextSwords,
        bows: nextBows,
        spears: nextSpears,
        weapons: nextSwords + nextBows + nextSpears,
      }
    };
  }),

  // Hủy đợt thao luyện
  cancelTraining: (cityId) => set((state) => {
    const targetCity = state.cities.find(c => c.id === cityId);
    if (!targetCity || !targetCity.training || !targetCity.population) return state;

    const { traineesCount, swappedCount, takenFromFarm = 0, takenFromForge = 0, weaponsUsed } = targetCity.training;
    const takenFromIdle = Math.max(0, traineesCount - takenFromFarm - takenFromForge);

    const updatedCities = state.cities.map(c => {
      if (c.id !== cityId || !c.population) return c;
      return {
        ...c,
        population: {
          ...c.population,
          combatTroops: c.population.combatTroops + swappedCount,
          idleLaborers: c.population.idleLaborers + takenFromIdle,
          farmLaborers: c.population.farmLaborers + takenFromFarm,
          forgeLaborers: c.population.forgeLaborers + takenFromForge,
          swappedCombatants: Math.max(0, (c.population.swappedCombatants || 0) - swappedCount),
        },
        training: null,
      };
    });

    const refundSwords = weaponsUsed ? weaponsUsed.swords : Math.floor(traineesCount * 0.35);
    const refundBows = weaponsUsed ? weaponsUsed.bows : Math.floor(traineesCount * 0.25);
    const refundSpears = weaponsUsed ? weaponsUsed.spears : (traineesCount - refundSwords - refundBows);

    const nextSwords = state.resources.swords + refundSwords;
    const nextBows = state.resources.bows + refundBows;
    const nextSpears = state.resources.spears + refundSpears;

    return {
      cities: updatedCities,
      resources: {
        ...state.resources,
        swords: nextSwords,
        bows: nextBows,
        spears: nextSpears,
        weapons: nextSwords + nextBows + nextSpears,
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
