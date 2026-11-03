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
  bribeCount: 0,         // Số lần đã đút lót (tính lạm phát giá)

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

  // Đút lót quan tướng giặc Minh (Cơ chế lạm phát giá & giảm hiệu quả lũy tiến)
  bribeMingOfficials: (cityId?: string) => {
    let result = { success: false, message: '', cost: 0, reducedSuspicion: 0 };
    set((state) => {
      const targetCity = cityId ? state.cities.find(c => c.id === cityId) : null;
      const targetName = targetCity ? targetCity.name : 'thành Tây Đô';

      // Tính chi phí & hiệu quả theo số lần đút lót
      const currentCount = state.bribeCount || 0;
      const cost = 100 + currentCount * 60;
      const reduction = Math.max(8, 22 - currentCount * 3);

      if (state.resources.gold < cost) {
        const msg = `Ngân khố không đủ! Cần ${cost} Vàng để chuẩn bị lễ vật cống nạp quan tướng ${targetName}.`;
        notify.error(msg);
        result = { success: false, message: msg, cost, reducedSuspicion: 0 };
        return state;
      }

      const newSuspicion = Math.max(0, state.suspicion - reduction);
      const nextCount = currentCount + 1;

      notify.success(
        `Đã cử sứ giả đem ${cost} Vàng và lâm thổ sản tiến cống quan tướng ${targetName}! Mức nghi ngờ giảm ${reduction}%, hiện còn ${newSuspicion.toFixed(0)}% (Lũ giặc ngày càng vòi vĩnh nhiều hơn!).`
      );

      result = {
        success: true,
        message: `Đút lót thành công (-${cost} Vàng, -${reduction}% nghi ngờ)`,
        cost,
        reducedSuspicion: reduction,
      };

      return {
        resources: {
          ...state.resources,
          gold: state.resources.gold - cost,
        },
        suspicion: newSuspicion,
        bribeCount: nextCount,
      };
    });
    return result;
  },

  // Phái 1 do thám quân thâm nhập thành trì đối phương
  dispatchScout: (cityId: string) => {
    let result = { success: false, message: '' };
    set((state) => {
      const targetCity = state.cities.find(c => c.id === cityId);
      if (!targetCity) {
        result = { success: false, message: 'Thành trì không tồn tại!' };
        return state;
      }

      const isEnemy = targetCity.faction === 'ming';
      if (!isEnemy) {
        result = { success: false, message: 'Không thể phái thám mã vào căn cứ phe ta!' };
        return state;
      }

      // Kiểm tra trần do thám cần thiết của thành này
      const maxScouts = targetCity.troops >= 8000 ? 4 : targetCity.troops >= 2000 ? 3 : 2;
      const currentScouts = targetCity.assignedScouts || 0;

      if (currentScouts >= maxScouts) {
        const msg = `Đã phái đủ tối đa ${maxScouts} thám mã cắm chốt tại ${targetCity.name}! Tình báo đã tường tận.`;
        notify.warning(msg);
        result = { success: false, message: msg };
        return state;
      }

      // Tìm căn cứ Lam Sơn có tráng phu nhàn rỗi
      const baseLamSon = state.cities.find(c => c.id === 'lam_son' && c.faction === 'lam_son') || state.cities.find(c => c.faction === 'lam_son');
      if (!baseLamSon || !baseLamSon.population || baseLamSon.population.idleLaborers < 1) {
        const msg = 'Căn cứ Lam Sơn không còn tráng phu nhàn rỗi để điều động đi do thám!';
        notify.error(msg);
        result = { success: false, message: msg };
        return state;
      }

      const scoutFoodCost = 30; // Lộ phí mang theo
      if (state.resources.food < scoutFoodCost) {
        const msg = `Lương thảo không đủ! Cần ${scoutFoodCost} thạch lương làm lộ phí cho thám mã.`;
        notify.error(msg);
        result = { success: false, message: msg };
        return state;
      }

      // Điều động 1 tráng phu từ Lam Sơn làm thám mã
      const updatedCities = state.cities.map(c => {
        if (c.id === baseLamSon.id && c.population) {
          return {
            ...c,
            population: {
              ...c.population,
              idleLaborers: c.population.idleLaborers - 1,
            },
          };
        }
        if (c.id === cityId) {
          return {
            ...c,
            assignedScouts: (c.assignedScouts || 0) + 1,
          };
        }
        return c;
      });

      notify.success(`Đã cử 1 thám mã bí mật trà trộn vào vùng ngoại vi ${targetCity.name} để thám thính tình hình quân giặc!`);
      result = { success: true, message: 'Phái thám mã thành công!' };

      return {
        cities: updatedCities,
        resources: {
          ...state.resources,
          food: state.resources.food - scoutFoodCost,
        },
      };
    });
    return result;
  },

  // Rút 1 thám mã từ thành giặc trở về doanh trại Lam Sơn
  recallScout: (cityId: string) => {
    let result = { success: false, message: '' };
    set((state) => {
      const targetCity = state.cities.find(c => c.id === cityId);
      if (!targetCity || !targetCity.assignedScouts || targetCity.assignedScouts <= 0) {
        result = { success: false, message: 'Không có thám mã nào đang cắm chốt tại đây!' };
        return state;
      }

      const baseLamSon = state.cities.find(c => c.id === 'lam_son' && c.faction === 'lam_son') || state.cities.find(c => c.faction === 'lam_son');

      const updatedCities = state.cities.map(c => {
        if (c.id === cityId) {
          return {
            ...c,
            assignedScouts: Math.max(0, (c.assignedScouts || 0) - 1),
          };
        }
        if (baseLamSon && c.id === baseLamSon.id && c.population) {
          return {
            ...c,
            population: {
              ...c.population,
              idleLaborers: c.population.idleLaborers + 1,
            },
          };
        }
        return c;
      });

      notify.info(`Đã triệu hồi 1 thám mã từ ${targetCity.name} an toàn trở về doanh trại Lam Sơn.`);
      result = { success: true, message: 'Triệu hồi thám mã thành công!' };

      return {
        cities: updatedCities,
      };
    });
    return result;
  },

  // Nâng cấp căn cứ doanh trại (Cấp 1: 500, Cấp 2: 1000, Cấp 3: 2000, Cấp 4: 5000)
  upgradeCamp: (cityId: string) => {
    let result = { success: false, message: '' };
    set((state) => {
      const city = state.cities.find(c => c.id === cityId);
      if (!city || city.faction !== 'lam_son') {
        result = { success: false, message: 'Chỉ có thể nâng cấp doanh trại của nghĩa quân Lam Sơn!' };
        return state;
      }

      const currentLevel = city.level || 1;
      if (currentLevel >= 4) {
        notify.warning('Doanh trại đã đạt cấp độ tối đa (Cấp 4 - Sức chứa 5.000 người)!');
        result = { success: false, message: 'Đã đạt cấp tối đa' };
        return state;
      }

      if (city.upgrading) {
        notify.warning(`Doanh trại đang trong quá trình nâng cấp lên Cấp ${city.upgrading.targetLevel} (còn ${city.upgrading.remainingDays} ngày)!`);
        result = { success: false, message: 'Đang thi công' };
        return state;
      }

      const nextLevel = currentLevel + 1;
      const upgradeReqs: Record<number, { gold: number; food: number; workers: number; days: number }> = {
        2: { gold: 120, food: 300, workers: 25, days: 25 },
        3: { gold: 250, food: 600, workers: 40, days: 40 },
        4: { gold: 500, food: 1200, workers: 60, days: 60 },
      };

      const req = upgradeReqs[nextLevel];
      if (!req) return state;

      if (state.resources.gold < req.gold) {
        notify.error(`Ngân khố không đủ! Cần ${req.gold} Vàng để mua gỗ đá, vật liệu mở rộng doanh trại.`);
        result = { success: false, message: 'Thiếu vàng' };
        return state;
      }

      if (state.resources.food < req.food) {
        notify.error(`Quân lương không đủ! Cần ${req.food} thạch lương nuôi thợ thi công.`);
        result = { success: false, message: 'Thiếu lương' };
        return state;
      }

      if (!city.population || city.population.idleLaborers < req.workers) {
        notify.error(`Không đủ nhân lực! Cần ${req.workers} tráng phu nhàn rỗi để thi công mở rộng căn cứ.`);
        result = { success: false, message: 'Thiếu nhân lực' };
        return state;
      }

      const updatedCities = state.cities.map(c => {
        if (c.id !== cityId || !c.population) return c;
        return {
          ...c,
          population: {
            ...c.population,
            idleLaborers: c.population.idleLaborers - req.workers,
          },
          upgrading: {
            targetLevel: nextLevel,
            remainingDays: req.days,
            totalDays: req.days,
            builders: req.workers,
          },
        };
      });

      notify.success(`Bắt đầu thi công nâng cấp [${city.name}] lên Cấp ${nextLevel}! Dự kiến hoàn tất sau ${req.days} ngày.`);
      result = { success: true, message: 'Bắt đầu nâng cấp căn cứ!' };

      return {
        cities: updatedCities,
        resources: {
          ...state.resources,
          gold: state.resources.gold - req.gold,
          food: state.resources.food - req.food,
        },
      };
    });
    return result;
  },

  // Phất cờ khởi nghĩa (Dựng cờ Bình Định Vương - Bước ngoặt lịch sử)
  triggerUprising: () => {
    let result = { success: false, message: '' };
    set((state) => {
      // Mở khóa toàn bộ danh tướng gia nhập đợt Khởi nghĩa 1418
      const updatedGenerals = state.generals.map(g => {
        if (!g.joinYear || g.joinYear <= 1418) {
          return { ...g, unlocked: true };
        }
        return g;
      });

      notify.success('🚩 BÌNH ĐỊNH VƯƠNG LÊ LỢI PHẤT CỜ KHỞI NGHĨA LAM SƠN! Toàn quân sĩ khí ngút trời, thề đánh đuổi giặc Minh giành lại non sông đất nước!');

      const notice = {
        id: `uprising_${Date.now()}`,
        type: 'combat' as const,
        title: 'Phất Cờ Khởi Nghĩa Lam Sơn (Mậu Tuất 1418)',
        dateStr: `Ngày ${state.day}/${state.month}/${state.year}`,
        description: 'Lê Lợi xưng Bình Định Vương, truyền Hịch Khởi Nghĩa khắp bốn phương! Các anh hùng hào kiệt Đinh Liệt, Lê Thạch, Lê Khôi, Nguyễn Xí... đồng loạt tụ nghĩa dưới ngọn cờ Lam Sơn. Toàn quân bước vào Thời Chiến toàn diện!',
        read: false,
        timestamp: Date.now(),
      };

      result = { success: true, message: 'Phất cờ khởi nghĩa thành công!' };

      return {
        isWarMode: true,
        generals: updatedGenerals,
        resources: {
          ...state.resources,
          morale: 100,
        },
        militaryNotices: [notice, ...state.militaryNotices],
      };
    });
    return result;
  },
});
