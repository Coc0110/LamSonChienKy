import type { StateCreator } from 'zustand';
import { INITIAL_GENERALS } from '../../data/generalsData';
import { notify } from '../dialogStore';
import type { Resources, ScoutMission, PendingRefugeeWave } from '../../types';
import { CAMP_CAPACITY_BY_LEVEL } from '../../types';
import { findShortestScoutPath } from '../../utils/scoutPathfinding';
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

export const createMilitarySlice: StateCreator<GameStore, [], [], MilitarySlice> = (set, get) => ({
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
  scoutMissions: [],
  pendingRefugees: [],
  activeRefugeeModal: null,
  isRefugeeModalOpen: false,

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

  // Phái 1 do thám quân thâm nhập thành trì đối phương (chuyển tiếp qua dispatchScoutMission)
  dispatchScout: (cityId: string) => {
    return get().dispatchScoutMission('lam_son', cityId, 1);
  },

  // Phái đoàn thám mã (1 đến 5 quân) di chuyển theo lộ trình ngắn thời gian nhất
  dispatchScoutMission: (originCityId: string, targetCityId: string, scoutCount: number) => {
    let result = { success: false, message: '' };
    set((state) => {
      const validCount = Math.min(5, Math.max(1, Math.floor(scoutCount)));
      const originCity =
        state.cities.find(c => c.id === originCityId && c.faction === 'lam_son') ||
        state.cities.find(c => c.id === 'lam_son' && c.faction === 'lam_son') ||
        state.cities.find(c => c.faction === 'lam_son');
      const targetCity = state.cities.find(c => c.id === targetCityId);

      if (!originCity || !originCity.population) {
        result = { success: false, message: 'Không tìm thấy căn cứ nghĩa quân xuất phát!' };
        return state;
      }
      if (!targetCity) {
        result = { success: false, message: 'Thành trì mục tiêu không tồn tại!' };
        return state;
      }
      if (targetCity.faction === 'lam_son') {
        result = { success: false, message: 'Không thể phái thám mã vào căn cứ phe ta!' };
        return state;
      }

      if (originCity.population.idleLaborers < validCount) {
        const msg = `Căn cứ ${originCity.name} không đủ tráng phu nhàn rỗi! (Cần ${validCount}, hiện có ${originCity.population.idleLaborers})`;
        notify.error(msg);
        result = { success: false, message: msg };
        return state;
      }

      const foodCost = validCount * 30;
      if (state.resources.food < foodCost) {
        const msg = `Lương thảo không đủ! Cần ${foodCost} thạch lương làm lộ phí cho ${validCount} thám mã.`;
        notify.error(msg);
        result = { success: false, message: msg };
        return state;
      }

      // Tìm lộ trình ngắn thời gian nhất bằng thuật toán A* địa hình
      const { path, totalDays } = findShortestScoutPath(originCity, targetCity, validCount);
      const missionId = `scout_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const firstCell = path[0];

      const newMission: ScoutMission = {
        id: missionId,
        originCityId: originCity.id,
        originCityName: originCity.name,
        targetCityId: targetCity.id,
        targetCityName: targetCity.name,
        scoutCount: validCount,
        foodCost,
        path,
        currentCellIndex: 0,
        cellProgress: 0,
        currentPos: {
          x: firstCell.x,
          y: firstCell.y,
          col: firstCell.col,
          row: firstCell.row,
        },
        totalDays,
        daysRemaining: totalDays,
        status: 'traveling',
      };

      const updatedCities = state.cities.map(c => {
        if (c.id === originCity.id && c.population) {
          return {
            ...c,
            population: {
              ...c.population,
              idleLaborers: c.population.idleLaborers - validCount,
            },
          };
        }
        return c;
      });

      const canhs = Math.round(totalDays * 12);
      notify.success(
        `Đã phái ${validCount} thám mã từ ${originCity.name} hướng về ${targetCity.name}! Lộ trình ngắn nhất ~${totalDays.toFixed(1)} ngày đường (${canhs} canh).`
      );
      result = { success: true, message: 'Phái thám mã thành công!' };

      return {
        cities: updatedCities,
        resources: {
          ...state.resources,
          food: state.resources.food - foodCost,
        },
        scoutMissions: [...(state.scoutMissions || []), newMission],
      };
    });
    return result;
  },

  // Tiến bước cho các toán thám mã di chuyển trên bản đồ theo thời gian trôi
  stepScoutMissions: (deltaDays: number) => {
    if (deltaDays <= 0) return;
    const currentMissions = get().scoutMissions;
    if (!currentMissions || currentMissions.length === 0) return;

    set((prev) => {
      let citiesChanged = false;
      const citiesMap = new Map(prev.cities.map(c => [c.id, { ...c }]));
      const arrivedMissions: ScoutMission[] = [];

      const updatedMissions = prev.scoutMissions.map(m => {
        if (m.status !== 'traveling') return m;
        const path = m.path;
        if (path.length <= 1) {
          arrivedMissions.push(m);
          return null;
        }

        let curIdx = m.currentCellIndex;
        let curProg = m.cellProgress;
        let remainingDelta = deltaDays;
        let currentPos = { ...m.currentPos };

        while (remainingDelta > 0 && curIdx < path.length - 1) {
          const nextCell = path[curIdx + 1];
          const stepCost = Math.max(0.01, nextCell.moveCostDays);
          const daysNeeded = (1 - curProg) * stepCost;

          if (remainingDelta >= daysNeeded) {
            remainingDelta -= daysNeeded;
            curIdx += 1;
            curProg = 0;
            currentPos = {
              x: nextCell.x,
              y: nextCell.y,
              col: nextCell.col,
              row: nextCell.row,
            };
          } else {
            const progDelta = remainingDelta / stepCost;
            curProg += progDelta;
            remainingDelta = 0;
            const fromCell = path[curIdx];
            currentPos = {
              x: Number((fromCell.x + (nextCell.x - fromCell.x) * curProg).toFixed(4)),
              y: Number((fromCell.y + (nextCell.y - fromCell.y) * curProg).toFixed(4)),
              col: curProg >= 0.5 ? nextCell.col : fromCell.col,
              row: curProg >= 0.5 ? nextCell.row : fromCell.row,
            };
          }
        }

        const daysDone =
          path.slice(0, curIdx).reduce((acc, c) => acc + c.moveCostDays, 0) +
          (path[curIdx + 1] ? path[curIdx + 1].moveCostDays * curProg : 0);
        const daysRem = Math.max(0, Number((m.totalDays - daysDone).toFixed(2)));

        if (curIdx >= path.length - 1) {
          arrivedMissions.push({
            ...m,
            currentCellIndex: curIdx,
            cellProgress: 1,
            currentPos,
            daysRemaining: 0,
            status: 'arrived',
          });
          const target = citiesMap.get(m.targetCityId);
          if (target) {
            target.assignedScouts = (target.assignedScouts || 0) + m.scoutCount;
            citiesChanged = true;
          }
          return null;
        }

        return {
          ...m,
          currentCellIndex: curIdx,
          cellProgress: curProg,
          currentPos,
          daysRemaining: daysRem,
        };
      }).filter((m): m is ScoutMission => m !== null);

      if (arrivedMissions.length > 0) {
        arrivedMissions.forEach(arr => {
          notify.success(
            `Toán thám mã (${arr.scoutCount} quân) đã vượt đèo lội suối thâm nhập thành công vào ${arr.targetCityName}! Tình báo quân sự được mở rộng.`
          );
        });
      }

      return {
        scoutMissions: updatedMissions,
        cities: citiesChanged ? Array.from(citiesMap.values()) : prev.cities,
      };
    });
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

  openRefugeeModal: (wave) => set(s => ({
    isRefugeeModalOpen: true,
    activeRefugeeModal: wave || s.pendingRefugees[0] || null,
  })),
  closeRefugeeModal: () => set({
    isRefugeeModalOpen: false,
    activeRefugeeModal: null,
  }),
  setActiveRefugeeModal: (wave) => set({ activeRefugeeModal: wave }),

  // Tiếp nhận hoặc xử lý một đoàn lưu dân
  acceptRefugeeWave: (waveId, policy) => {
    const state = get();
    const wave = state.pendingRefugees.find(w => w.id === waveId);
    if (!wave) return { success: false, message: 'Không tìm thấy thông tin đoàn lưu dân!' };

    const city = state.cities.find(c => c.id === wave.cityId);
    if (!city || !city.population) return { success: false, message: 'Không tìm thấy căn cứ tiếp nhận!' };

    const pop = city.population;
    const currentCityPop = (pop.combatTroops || 0) + (pop.idleLaborers || 0) + (pop.farmLaborers || 0) + 
                           (pop.forgeLaborers || 0) + (pop.swappedCombatants || 0) + (pop.unfitPopulation || 0) + 
                           (city.training?.traineesCount || 0);
    const baseCap = CAMP_CAPACITY_BY_LEVEL[city.level || 1] || 500;
    const remainingCap = Math.max(0, baseCap - currentCityPop);

    if (policy === 'full') {
      if (state.resources.food < wave.foodCost) {
        return { success: false, message: `Kho lương không đủ cứu tế! Cần ${wave.foodCost} thạch lương (Kho có: ${Math.floor(state.resources.food)}).` };
      }
      if (remainingCap < wave.totalCount) {
        return { success: false, message: `Doanh trại không đủ sức chứa! Cần ${wave.totalCount} chỗ (Trại còn trống: ${remainingCap}). Hãy nâng cấp căn cứ!` };
      }

      set(curr => ({
        resources: {
          ...curr.resources,
          food: curr.resources.food - wave.foodCost,
        },
        cities: curr.cities.map(c => {
          if (c.id !== wave.cityId || !c.population) return c;
          return {
            ...c,
            population: {
              ...c.population,
              idleLaborers: c.population.idleLaborers + wave.idleCount,
              unfitPopulation: c.population.unfitPopulation + wave.unfitCount,
            },
          };
        }),
        pendingRefugees: curr.pendingRefugees.filter(w => w.id !== waveId),
        activeRefugeeModal: curr.pendingRefugees.filter(w => w.id !== waveId)[0] || null,
        isRefugeeModalOpen: curr.pendingRefugees.filter(w => w.id !== waveId).length > 0,
      }));

      notify.success(`Đã mở cổng cưu mang toàn bộ đoàn ${wave.totalCount} lưu dân từ ${wave.originName} (+${wave.idleCount} tráng phu, +${wave.unfitCount} già yếu)!`);
      return { success: true, message: `Đã tiếp nhận ${wave.totalCount} người vào căn cứ.` };
    }

    if (policy === 'able_bodied_only') {
      const halfFood = Math.max(1, Math.round(wave.foodCost * 0.5));
      if (state.resources.food < halfFood) {
        return { success: false, message: `Kho lương không đủ! Cần ${halfFood} thạch lương hỗ trợ lộ phí (Kho có: ${Math.floor(state.resources.food)}).` };
      }
      if (remainingCap < wave.idleCount) {
        return { success: false, message: `Doanh trại không đủ chỗ cho ${wave.idleCount} tráng phu (Trại còn trống: ${remainingCap})!` };
      }

      set(curr => ({
        resources: {
          ...curr.resources,
          food: curr.resources.food - halfFood,
        },
        cities: curr.cities.map(c => {
          if (c.id !== wave.cityId || !c.population) return c;
          return {
            ...c,
            population: {
              ...c.population,
              idleLaborers: c.population.idleLaborers + wave.idleCount,
            },
          };
        }),
        pendingRefugees: curr.pendingRefugees.filter(w => w.id !== waveId),
        activeRefugeeModal: curr.pendingRefugees.filter(w => w.id !== waveId)[0] || null,
        isRefugeeModalOpen: curr.pendingRefugees.filter(w => w.id !== waveId).length > 0,
      }));

      notify.success(`Đã chiêu nạp ${wave.idleCount} tráng phu sung sức từ ${wave.originName} vào hàng ngũ nghĩa quân, trợ cấp ${halfFood} lương cho gia quyến nương náu!`);
      return { success: true, message: `Đã chiêu nạp ${wave.idleCount} tráng phu.` };
    }

    if (policy === 'relief_only') {
      const reliefAmt = Math.min(5, Math.floor(state.resources.food));
      if (reliefAmt <= 0) {
        return { success: false, message: 'Kho lương đã cạn kiệt, không đủ phát chẩn!' };
      }

      set(curr => ({
        resources: {
          ...curr.resources,
          food: curr.resources.food - reliefAmt,
        },
        pendingRefugees: curr.pendingRefugees.filter(w => w.id !== waveId),
        activeRefugeeModal: curr.pendingRefugees.filter(w => w.id !== waveId)[0] || null,
        isRefugeeModalOpen: curr.pendingRefugees.filter(w => w.id !== waveId).length > 0,
      }));

      notify.info(`Đã xuất ${reliefAmt} thạch lương phát chẩn cứu đói thiện tâm và hướng dẫn đoàn lưu dân tạm lánh nạn an toàn.`);
      return { success: true, message: 'Đã phát chẩn cho đoàn lưu dân.' };
    }

    if (policy === 'reject') {
      set(curr => ({
        pendingRefugees: curr.pendingRefugees.filter(w => w.id !== waveId),
        activeRefugeeModal: curr.pendingRefugees.filter(w => w.id !== waveId)[0] || null,
        isRefugeeModalOpen: curr.pendingRefugees.filter(w => w.id !== waveId).length > 0,
      }));

      notify.warning(`Đã đóng cổng trại từ chối tiếp nhận đoàn lưu dân để giữ gìn bí mật cơ mật quân sự.`);
      return { success: true, message: 'Đã từ chối tiếp nhận đoàn lưu dân.' };
    }

    return { success: false, message: 'Chính sách không hợp lệ!' };
  },

  // Tiếp nhận nhanh toàn bộ các đoàn lưu dân đang chờ
  acceptAllRefugees: (policy) => {
    const state = get();
    if (state.pendingRefugees.length === 0) {
      return { success: false, message: 'Hiện không có đoàn lưu dân nào đang chờ!' };
    }

    let acceptedWaves = 0;
    let acceptedPeople = 0;
    const waves = [...state.pendingRefugees];

    for (const w of waves) {
      const res = get().acceptRefugeeWave(w.id, policy);
      if (res.success) {
        acceptedWaves++;
        acceptedPeople += (policy === 'able_bodied_only' ? w.idleCount : w.totalCount);
      } else {
        break; // Dừng lại khi hết lương hoặc hết chỗ chứa
      }
    }

    set({ isRefugeeModalOpen: false, activeRefugeeModal: null });
    if (acceptedWaves > 0) {
      return { success: true, message: `Đã tiếp nhận thành công ${acceptedWaves} đoàn lưu dân (${acceptedPeople} người)!` };
    }
    return { success: false, message: 'Không thể tiếp nhận (thiếu lương thực hoặc đầy sức chứa)!' };
  },

  // Chủ động cử người xuất lương đi chiêu mộ lưu dân ở các huyện lân cận
  dispatchRefugeeRecruit: (cityId) => {
    const state = get();
    if (state.resources.food < 20) {
      return { success: false, message: 'Cần ít nhất 20 thạch lương thảo làm lộ phí chiêu mộ hào kiệt!' };
    }

    const city = state.cities.find(c => c.id === cityId);
    if (!city) return { success: false, message: 'Không tìm thấy căn cứ sở tại!' };

    const totalCount = Math.floor(Math.random() * 8) + 16; // 16 - 23 người
    const unfitCount = Math.max(1, Math.round(totalCount * 0.15));
    const idleCount = totalCount - unfitCount;
    const foodCost = totalCount * 1;

    const origins = [
      { name: 'Triệu Hóa', story: 'Trốn chạy việc quan quân nhà Minh cưỡng bách dân phu đi đào vàng đãi bạc ở khe núi sâu...' },
      { name: 'Nông Cống', story: 'Trốn thuế khóa hà khắc và việc giặc vơ vét toàn bộ thóc giống đầu mùa...' },
      { name: 'Quảng Hóa', story: 'Hào kiệt và trai tráng trong làng rủ nhau vượt sông Chu tìm về Lam Sơn quy tụ dưới trướng Bình Định Vương...' },
      { name: 'Nga Sơn', story: 'Gia đình bị giặc Minh đốt phá lán trại vì không chịu nộp vải lụa, dắt díu nhau vượt núi tìm về nghĩa quân...' },
      { name: 'Cổ Lũng', story: 'Dân bản Mường cùng các tráng đinh nghe tiếng đức độ của Lê Lợi đã băng rừng tìm về nương náu...' },
      { name: 'Lương Giang', story: 'Thanh niên trai tráng căm thù giặc Minh tàn bạo, kết đoàn tìm đến căn cứ xin cầm gươm giáo giết giặc...' },
    ];
    const picked = origins[Math.floor(Math.random() * origins.length)];

    const newWave: PendingRefugeeWave = {
      id: `refugee_wave_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      cityId: city.id,
      cityName: city.name,
      dateStr: `Ngày ${state.day}/${state.month}/${state.year}`,
      totalCount,
      idleCount,
      unfitCount,
      foodCost,
      originName: picked.name,
      story: picked.story,
      timestamp: Date.now(),
      daysRemaining: 7,
    };

    set(curr => ({
      resources: {
        ...curr.resources,
        food: curr.resources.food - 20,
      },
      pendingRefugees: [newWave, ...curr.pendingRefugees],
    }));

    notify.success(`Nghĩa sĩ đã dẫn đường cho đoàn ${totalCount} người từ ${picked.name} về trước cổng trại Lam Sơn!`);
    return { success: true, message: `Đã chiêu tập được đoàn ${totalCount} người!` };
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
