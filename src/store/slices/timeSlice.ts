import { CAMP_CAPACITY_BY_LEVEL } from '../../types';
import { isHarvestDay, rollSeasonClimate, rollFarmMicroEvent } from '../../utils/harvestSeasons';
import type { StateCreator } from 'zustand';
import { START_DAY, START_MONTH, START_YEAR } from '../../data/mapData';
import type { MilitaryNotice, PendingRefugeeWave } from '../../types';
import { notify } from '../dialogStore';
import type { TimeSlice, GameStore } from './types';
import { calculateTrainingWeaponReturn } from './militarySlice';
import { deployMingForce } from './armySlice';
import { roundRemainingDays } from '../../utils/formatters';

export const getDaysInMonth = (month: number, year: number): number => {
  return new Date(year, month, 0).getDate();
};

export const createTimeSlice: StateCreator<GameStore, [], [], TimeSlice> = (set, get) => ({
  day: START_DAY,
  month: START_MONTH,
  year: START_YEAR,
  canhHour: 4, // Bắt đầu lúc Giờ Thìn (07:00 - 09:00 sớm mai)
  timeMode: 'day',
  previousActiveTimeMode: 'day',
  isAutoPaused: false,
  isWarMode: false,
  isPaused: false,
  gameSpeed: 1,

  setTimeMode: (mode) => set(() => {
    if (mode === 'pause') {
      return {
        timeMode: 'pause',
        isPaused: true,
        isAutoPaused: false,
      };
    }
    return {
      timeMode: mode,
      previousActiveTimeMode: mode,
      isPaused: false,
      isWarMode: mode === 'hour',
      isAutoPaused: false,
    };
  }),

  enterAutoPause: () => set((state) => {
    if (state.timeMode === 'pause') return {};
    return {
      previousActiveTimeMode: state.timeMode,
      isAutoPaused: true,
      timeMode: 'pause',
      isPaused: true,
    };
  }),

  exitAutoPause: () => set((state) => {
    if (!state.isAutoPaused) return {};
    const restoreMode = state.previousActiveTimeMode || 'day';
    return {
      isAutoPaused: false,
      timeMode: restoreMode,
      isPaused: false,
      isWarMode: restoreMode === 'hour',
    };
  }),

  togglePause: () => set((state) => {
    if (state.timeMode === 'pause') {
      const restoreMode = state.previousActiveTimeMode || 'day';
      return {
        timeMode: restoreMode,
        isPaused: false,
        isWarMode: restoreMode === 'hour',
        isAutoPaused: false,
      };
    }
    return {
      previousActiveTimeMode: state.timeMode,
      timeMode: 'pause',
      isPaused: true,
      isAutoPaused: false,
    };
  }),

  setSpeed: (speed) => set((state) => {
    if (speed === 0) {
      return {
        timeMode: 'pause',
        isPaused: true,
        isAutoPaused: false,
      };
    }
    const mode = state.timeMode === 'pause' ? state.previousActiveTimeMode : state.timeMode;
    return {
      timeMode: mode,
      isPaused: false,
      isWarMode: mode === 'hour',
      gameSpeed: 1,
      isAutoPaused: false,
    };
  }),

  setWarMode: (active: boolean) => set((state) => {
    const nextMode = active ? 'hour' : 'day';
    return {
      timeMode: state.timeMode === 'pause' ? 'pause' : nextMode,
      previousActiveTimeMode: nextMode,
      isWarMode: active,
    };
  }),

  toggleWarMode: () => set((state) => {
    const nextActive = !state.isWarMode;
    const nextMode = nextActive ? 'hour' : 'day';
    return {
      timeMode: state.timeMode === 'pause' ? 'pause' : nextMode,
      previousActiveTimeMode: nextMode,
      isWarMode: nextActive,
    };
  }),

  tickCanh: () => {
    const state = get();
    if (state.isPaused) return;

    const nextCanh = (state.canhHour + 1) % 12;
    if (nextCanh === 0) {
      // Đủ 12 canh giờ -> bước sang ngày mới và kích hoạt toàn bộ logic thường nhật
      set({ canhHour: 0 });
      get().tick();
    } else {
      // Trong Chế độ Chiến Sự: Mỗi canh giờ (1/12 ngày) trôi qua
      // Tiến bước đồng bộ cho nâng cấp doanh trại, thi công và thao luyện
      const deltaDayFraction = 1 / 12;
      let trainedTroopsAdded = 0;
      let returnedSwords = 0;
      let returnedBows = 0;
      let returnedSpears = 0;
      let citiesChanged = false;
      let structuresChanged = false;

      let updatedCities = state.cities.map(city => {
        if (!city.upgrading && !city.training) return city;
        citiesChanged = true;
        let c = { ...city };

        if (c.upgrading) {
          const nextDays = roundRemainingDays(c.upgrading.remainingDays - deltaDayFraction);
          if (nextDays <= 0) {
            const targetLevel = c.upgrading.targetLevel;
            const buildersReturned = c.upgrading.builders;
            const newCap = CAMP_CAPACITY_BY_LEVEL[targetLevel] || 1000;
            const pop = c.population ? { ...c.population, idleLaborers: c.population.idleLaborers + buildersReturned } : c.population;
            c = {
              ...c,
              level: targetLevel,
              population: pop,
              upgrading: null,
            };
            notify.success(`Công trình mở rộng doanh trại [${c.name}] lên Cấp ${targetLevel} (${newCap.toLocaleString()} người) đã hoàn tất!`);
          } else {
            c = {
              ...c,
              upgrading: {
                ...c.upgrading,
                remainingDays: nextDays,
              },
            };
          }
        }

        if (c.training) {
          const nextDays = roundRemainingDays(c.training.remainingDays - deltaDayFraction);
          if (nextDays <= 0) {
            const { traineesCount, swappedCount = 0 } = c.training;
            trainedTroopsAdded += traineesCount;
            const weaponReturn = calculateTrainingWeaponReturn(c.training.weaponsUsed);
            returnedSwords += weaponReturn.swords;
            returnedBows += weaponReturn.bows;
            returnedSpears += weaponReturn.spears;
            const pop = c.population
              ? {
                  ...c.population,
                  combatTroops: c.population.combatTroops + traineesCount,
                  swappedCombatants: Math.max(0, (c.population.swappedCombatants || 0) - swappedCount),
                }
              : c.population;
            c = { ...c, troops: c.troops + traineesCount };
            c = {
              ...c,
              population: pop,
              training: null,
            };
            const weaponSuffix =
              weaponReturn.totalReturned > 0
                ? ` (hoàn trả ${weaponReturn.totalReturned} binh khí${weaponReturn.totalWear > 0 ? `, hao mòn ${weaponReturn.totalWear}` : ''})`
                : '';
            notify.success(`Đợt thao luyện ${traineesCount} nghĩa binh tại [${c.name}] đã hoàn tất${weaponSuffix}!`);
          } else {
            c = {
              ...c,
              training: {
                ...c.training,
                remainingDays: nextDays,
              },
            };
          }
        }

        return c;
      });

      const updatedStructures = state.structures.map(s => {
        if (s.status !== 'building') return s;
        structuresChanged = true;
        const nextDays = roundRemainingDays(s.buildDaysRemaining - deltaDayFraction);
        if (nextDays <= 0) {
          notify.success(`Công trình [${s.name}] đã hoàn tất thi công và đi vào hoạt động!`);
          return {
            ...s,
            status: 'active' as const,
            buildDaysRemaining: 0,
            builderWorkers: 0,
          };
        }
        return {
          ...s,
          buildDaysRemaining: nextDays,
        };
      });

      set({
        canhHour: nextCanh,
        ...((trainedTroopsAdded > 0 || returnedSwords > 0 || returnedBows > 0 || returnedSpears > 0)
          ? {
              resources: {
                ...state.resources,
                troops: state.resources.troops + trainedTroopsAdded,
                swords: state.resources.swords + returnedSwords,
                bows: state.resources.bows + returnedBows,
                spears: state.resources.spears + returnedSpears,
                weapons:
                  state.resources.swords +
                  returnedSwords +
                  state.resources.bows +
                  returnedBows +
                  state.resources.spears +
                  returnedSpears,
              },
            }
          : {}),
        cities: citiesChanged ? updatedCities : state.cities,
        structures: structuresChanged ? updatedStructures : state.structures,
      });
    }
  },

  setTimeDate: (targetDay: number, targetMonth: number, targetYear: number) => set((state) => {
    const targetVal = targetYear * 10000 + targetMonth * 100 + targetDay;
    const updatedGenerals = state.generals.map(g => {
      // Nếu tướng đã mở khóa từ trước, luôn giữ nguyên trạng thái mở khóa
      if (g.unlocked) return g;
      // Các danh tướng lập thề Lũng Nhai ban đầu luôn mở khóa
      if (!g.joinYear || g.joinYear < 1416 || (g.joinYear === 1416 && (g.joinMonth || 1) <= 2)) {
        return { ...g, unlocked: true };
      }
      const gJoinVal = g.joinYear * 10000 + (g.joinMonth || 1) * 100 + (g.joinDay || 1);
      return {
        ...g,
        unlocked: targetVal >= gJoinVal,
      };
    });

    return {
      day: targetDay,
      month: targetMonth,
      year: targetYear,
      generals: updatedGenerals,
    };
  }),

  tick: () => {
    set((state) => {
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

    // 1. Cập nhật tiến độ thao luyện võ nghệ
    let citiesChanged = false;
    let trainedTroopsAdded = 0;
    let returnedSwords = 0;
    let returnedBows = 0;
    let returnedSpears = 0;
    
    let updatedCities = state.cities.map(city => {
      if (!city.population) return city;
      let pop = { ...city.population };
      let currentCity: typeof city = { ...city };

      // Cập nhật tiến trình nâng cấp căn cứ doanh trại
      if (currentCity.upgrading) {
        const nextDays = roundRemainingDays(currentCity.upgrading.remainingDays - 1);
        if (nextDays <= 0) {
          citiesChanged = true;
          const targetLevel = currentCity.upgrading.targetLevel;
          const buildersReturned = currentCity.upgrading.builders;
          const newCap = CAMP_CAPACITY_BY_LEVEL[targetLevel] || 1000;

          newNotices.push({
            id: `camp_upgrade_${Date.now()}_${city.id}`,
            type: 'build' as const,
            title: 'Mở Rộng Doanh Trại Hoàn Tất',
            dateStr: `Ngày ${newDay}/${newMonth}/${newYear}`,
            description: `Công trình nâng cấp doanh trại [${city.name}] lên Cấp ${targetLevel} đã hoàn tất! Sức chứa mở rộng lên ${newCap.toLocaleString()} người, ${buildersReturned} thợ thi công đã trở về trạng thái nhàn rỗi.`,
            read: false,
            timestamp: Date.now(),
          });

          pop.idleLaborers += buildersReturned;
          currentCity = {
            ...currentCity,
            level: targetLevel,
            upgrading: null,
          };
        } else {
          citiesChanged = true; // Đồng bộ trạng thái nâng cấp doanh trại
          currentCity = {
            ...currentCity,
            upgrading: {
              ...currentCity.upgrading,
              remainingDays: nextDays,
            },
          };
        }
      }

      if (currentCity.training) {
        citiesChanged = true;
        const training = currentCity.training;
        const newRemaining = roundRemainingDays(training.remainingDays - 1);
        if (newRemaining <= 0) {
          const { traineesCount, swappedCount = 0 } = training;
          const weaponReturn = calculateTrainingWeaponReturn(training.weaponsUsed);
          returnedSwords += weaponReturn.swords;
          returnedBows += weaponReturn.bows;
          returnedSpears += weaponReturn.spears;
          trainedTroopsAdded += traineesCount;

          // Thao luyện hoàn tất: Tráng phu tốt nghiệp thành nghĩa binh mới
          // Binh sĩ thế chỗ trước đó vẫn tiếp tục duy trì đồn điền/lò rèn không để đình trệ
          return {
            ...currentCity,
            population: {
              ...pop,
              combatTroops: pop.combatTroops + traineesCount,
              swappedCombatants: Math.max(0, (pop.swappedCombatants || 0) - swappedCount),
            },
            troops: currentCity.troops + traineesCount,
            training: null,
          };
        } else {
          return {
            ...currentCity,
            population: pop,
            training: {
              ...training,
              remainingDays: newRemaining,
            },
          };
        }
      }
      return {
        ...currentCity,
        population: pop,
      };
    });

    // 2. Cập nhật tiến độ đồn điền & lò rèn theo ngày
    let structuresChanged = false;
    let seasonalFoodHarvested = 0;
    let swordsProduced = 0;
    let bowsProduced = 0;
    let spearsProduced = 0;
    let armorProduced = 0;
    let refundedQueueGold = 0;
    let suspicionGain = 0;
    // Đếm lùi thời hạn của các đoàn lưu dân đang chờ ngoài cổng
    let nextPendingRefugees = (state.pendingRefugees || [])
      .map(w => {
        if (w.departed) return w;
        const nextDays = (w.daysRemaining ?? 30) - 1;
        if (nextDays <= 0) {
          return { ...w, daysRemaining: 0, departed: true };
        }
        return { ...w, daysRemaining: nextDays };
      });
    // Nếu người chơi KHÔNG mở xem chi tiết lưu dân, dọn dẹp các đoàn đã rời đi
    if (!state.isRefugeeModalOpen) {
      nextPendingRefugees = nextPendingRefugees.filter(w => !w.departed && (w.daysRemaining ?? 0) > 0);
    }

    let updatedStructures = state.structures.map(structure => {
      let currentStruct = structure;



      // Thi công xây dựng công trình mới
      if (currentStruct.status === 'building') {
        structuresChanged = true;
        const s = { ...currentStruct, buildDaysRemaining: roundRemainingDays(currentStruct.buildDaysRemaining - 1) };
        if (s.buildDaysRemaining <= 0) {
          s.status = 'active';
          const workers = s.builderWorkers;
          s.builderWorkers = 0;

          const targetCityIdx = updatedCities.findIndex(c => c.id === s.cityId);
          if (targetCityIdx !== -1 && updatedCities[targetCityIdx].population) {
            citiesChanged = true;
            const targetCity = updatedCities[targetCityIdx];
            let currentIdle = targetCity.population!.idleLaborers + workers;
            let currentFarmLaborers = targetCity.population!.farmLaborers || 0;

            // Đặt ruộng xuống mặc định cử tối đa nông đinh vào làm
            if (s.type === 'farm' && s.assignedWorkers < s.maxWorkers) {
              const needed = s.maxWorkers - s.assignedWorkers;
              const fill = Math.min(needed, currentIdle);
              s.assignedWorkers += fill;
              currentIdle -= fill;
              currentFarmLaborers += fill;
            }

            const wasUpgrading = s.isUpgrading;
            s.isUpgrading = undefined;

            updatedCities[targetCityIdx] = {
              ...targetCity,
              population: {
                ...targetCity.population!,
                idleLaborers: currentIdle,
                farmLaborers: currentFarmLaborers,
              },
              buildings: s.type === 'farm'
                ? {
                    farms: (targetCity.buildings?.farms || 0) + (wasUpgrading ? 0 : 1),
                    forges: targetCity.buildings?.forges || 0,
                  }
                : {
                    farms: targetCity.buildings?.farms || 0,
                    forges: (targetCity.buildings?.forges || 0) + 1,
                  },
            };
          }

          const wasUpgrading = s.isUpgrading;
          s.isUpgrading = undefined;

          newNotices.push({
            id: `build_${Date.now()}_${s.id}_${Math.random().toString(36).substring(2, 6)}`,
            type: 'build',
            title: s.type === 'farm' ? (wasUpgrading ? 'Mở Rộng Đồn Điền Hoàn Tất' : 'Đồn Điền Khai Hoang Hoàn Tất') : 'Lò Rèn Binh Khí Đã Dựng Xong',
            dateStr: `Ngày ${newDay}/${newMonth}/${newYear}`,
            description: s.type === 'farm'
              ? (wasUpgrading
                  ? `Khu ruộng [${s.name}] đã hoàn tất đắp bờ, mở rộng quy mô lên ${s.gridSize}x${s.gridSize} (${s.maxWorkers} nông đinh)!`
                  : `Khu ruộng [${s.name}] đã khai hoang xong trên bãi bồi, sẵn sàng đón nông đinh vào cày cấy!`)
              : `Lò rèn [${s.name}] đã dựng xong bễ đúc và đe búa, sẵn sàng nhận lệnh rèn đúc!`,
            read: false,
            timestamp: Date.now(),
          });
        }
        return s;
      }

      // Ruộng lúa đang hoạt động: Mỗi ngày tích lũy số ngày canh tác thực tế
      if (currentStruct.type === 'farm' && currentStruct.status === 'active') {
        if (currentStruct.assignedWorkers > 0) {
          structuresChanged = true;
          const s = { ...currentStruct, cropDays: (currentStruct.cropDays || 0) + 1 };
          return s;
        }
        return currentStruct;
      }

      // Lò rèn đang hoạt động: Đang đúc mẻ vũ khí
      if (currentStruct.type === 'forge' && currentStruct.status === 'active' && currentStruct.activeOrder) {
        structuresChanged = true;
        const s = { ...currentStruct };
        const order = { ...currentStruct.activeOrder };
        
        // Tiếng đe búa tạo độ nghi ngờ theo địa hình
        const isQuietTerrain = s.terrain === 'mountain' || s.terrain === 'forest';
        const noiseFactor = isQuietTerrain ? 0.6 : 1.5;
        suspicionGain += order.assignedSmiths * 0.05 * noiseFactor;

        order.remainingDays = roundRemainingDays(order.remainingDays - 1);
        if (order.remainingDays <= 0) {
          // Hoàn thành đợt rèn: Phân loại đúng từng nhóm khí giới / giáp trụ
          if (order.weaponType === 'sword') {
            swordsProduced += order.quantity;
          } else if (order.weaponType === 'bow' || order.weaponType === 'crossbow') {
            bowsProduced += order.quantity;
          } else if (order.weaponType === 'spear') {
            spearsProduced += order.quantity;
          } else if (order.weaponType === 'armor') {
            armorProduced += order.quantity;
          }

          const smiths = order.assignedSmiths;
          const targetCityIdx = updatedCities.findIndex(c => c.id === s.cityId);

          if (targetCityIdx !== -1 && updatedCities[targetCityIdx].population) {
            citiesChanged = true;
            const targetCity = updatedCities[targetCityIdx];
            const pop = targetCity.population!;
            const actualForgeReturn = Math.min(smiths, pop.forgeLaborers);
            const swappedForgeReturn = Math.max(0, smiths - actualForgeReturn);

            let nextIdle = pop.idleLaborers + actualForgeReturn;
            let nextForge = Math.max(0, pop.forgeLaborers - actualForgeReturn);
            const nextCombat = pop.combatTroops + swappedForgeReturn;
            const nextSwapped = Math.max(0, (pop.swappedCombatants || 0) - swappedForgeReturn);
            const nextTraining = targetCity.training && swappedForgeReturn > 0
              ? {
                  ...targetCity.training,
                  swappedCount: Math.max(0, targetCity.training.swappedCount - swappedForgeReturn),
                  takenFromForge: Math.max(0, (targetCity.training.takenFromForge || 0) - swappedForgeReturn),
                }
              : targetCity.training;

            // Nếu có đơn tiếp theo trong hàng chờ, điều động thợ rèn từ idleLaborers cho đơn mới
            if (s.forgeQueue && s.forgeQueue.length > 0) {
              const [nextOrderRaw, ...remainingQueue] = s.forgeQueue;
              const smithsForNext = Math.min(nextOrderRaw.assignedSmiths, nextIdle);
              if (smithsForNext > 0) {
                nextIdle -= smithsForNext;
                nextForge += smithsForNext;
                const workFactor = nextOrderRaw.weaponType === 'spear' ? 1.0 : nextOrderRaw.weaponType === 'sword' ? 1.8 : nextOrderRaw.weaponType === 'armor' ? 2.2 : 1.4;
                const recalcDays = Math.max(4, Math.ceil((nextOrderRaw.quantity * workFactor * 1.5) / smithsForNext));
                s.activeOrder = {
                  ...nextOrderRaw,
                  assignedSmiths: smithsForNext,
                  totalDays: recalcDays,
                  remainingDays: recalcDays,
                };
                s.forgeQueue = remainingQueue;
              } else {
                // Không còn tráng phu rảnh để chạy hàng chờ -> hoàn lại vàng
                refundedQueueGold += nextOrderRaw.goldCost + remainingQueue.reduce((acc, q) => acc + q.goldCost, 0);
                s.activeOrder = null;
                s.forgeQueue = [];
              }
            } else {
              s.activeOrder = null;
            }

            updatedCities[targetCityIdx] = {
              ...targetCity,
              population: {
                ...pop,
                combatTroops: nextCombat,
                idleLaborers: nextIdle,
                forgeLaborers: nextForge,
                swappedCombatants: nextSwapped,
              },
              training: nextTraining,
            };
          } else {
            s.activeOrder = null;
            s.forgeQueue = [];
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
        } else {
          s.activeOrder = order;
        }
        return s;
      }

      return currentStruct;
    });

    // 2.2. KIỂM TRA ĐẠI VỤ THU HOẠCH CỐ ĐỊNH TRONG NĂM (Vụ Chiêm 15/5, Vụ Mùa 15/10)
    const harvestInfo = isHarvestDay(newDay, newMonth);
    if (harvestInfo.isHarvest && harvestInfo.season) {
      const seasonClimate = rollSeasonClimate(harvestInfo.season.id);
      let totalSeasonYield = 0;
      const farmReportLines: string[] = [];

      updatedStructures = updatedStructures.map(struct => {
        if (struct.type !== 'farm' || struct.status !== 'active') return struct;
        structuresChanged = true;
        const s = { ...struct };

        // Số ngày thực tế ruộng đã hoạt động từ đầu vụ (hoặc từ khi thi công xong) đến ngày gặt
        const daysActive = s.cropDays || 0;
        if (daysActive <= 0 || s.assignedWorkers <= 0) {
          s.cropDays = 0;
          s.lastHarvestYield = 0;
          s.recentEvent = 'Chưa kịp canh tác';
          return s;
        }

        const microEvent = rollFarmMicroEvent();
        const efficiency = s.gridSize === 7 ? 0.26 : s.gridSize === 6 ? 0.24 : 0.22;
        const baseCrop = Math.round(s.assignedWorkers * daysActive * efficiency);
        const finalCrop = Math.max(0, Math.round(baseCrop * seasonClimate.mult * microEvent.mult));

        const matchedCity = updatedCities.find(c => c.id === s.cityId);
        const isMing = matchedCity?.faction === 'ming';
        const taxRate = isMing ? 0.50 : 0.10;
        const taxAmount = Math.round(finalCrop * taxRate);
        const netYield = Math.max(0, finalCrop - taxAmount);

        seasonalFoodHarvested += netYield;
        totalSeasonYield += netYield;

        s.cropDays = 0; // Đặt lại số ngày canh tác cho vụ mùa tiếp theo!
        s.lastHarvestYield = netYield;
        s.seasonCondition = seasonClimate.condition;
        s.recentEvent = microEvent.eventName;

        farmReportLines.push(`• [${s.name}]: +${netYield.toLocaleString()} thạch (${daysActive} ngày cấy - ${microEvent.eventName})`);
        return s;
      });

      if (totalSeasonYield > 0) {
        const seasonTitle = `Đại Vụ Thu Hoạch ${harvestInfo.season.name} (${newMonth === 5 ? 'Tháng 5' : 'Tháng 10'})`;
        const logPreview = farmReportLines.slice(0, 4).join('\n') + (farmReportLines.length > 4 ? `\n...và ${farmReportLines.length - 4} khu ruộng khác.` : '');

        newNotices.push({
          id: `season_harvest_${Date.now()}`,
          type: 'harvest',
          title: seasonTitle,
          dateStr: `Ngày 15/${newMonth}/${newYear}`,
          description: `Toàn quân thu hoạch +${totalSeasonYield.toLocaleString()} thạch thóc nhập kho!\nThời tiết: ${seasonClimate.label} (${seasonClimate.note})\n${logPreview}`,
          read: false,
          timestamp: Date.now(),
        });

        notify.success(`🌾 ${seasonTitle.toUpperCase()}: Toàn quân thu hoạch +${totalSeasonYield.toLocaleString()} thạch lương! (${seasonClimate.label})`);
      }
    }

    // 3. Tính tổng nhân khẩu thực tế (gồm dân cư căn cứ, người đang thao luyện, thợ đang xây dựng và quân trong các đạo quân)
    let totalPopulation = 0;
    updatedCities.forEach(city => {
      if (!city.population) return;
      totalPopulation +=
        (city.population.combatTroops || 0) +
        (city.population.idleLaborers || 0) +
        (city.population.farmLaborers || 0) +
        (city.population.forgeLaborers || 0) +
        (city.population.swappedCombatants || 0) +
        (city.population.unfitPopulation || 0) +
        (city.training?.traineesCount || 0);
    });
    updatedStructures.forEach(s => {
      if (s.status === 'building') {
        totalPopulation += s.builderWorkers || 0;
      }
    });
    state.formations.forEach(f => {
      totalPopulation += f.totalTroops || 0;
    });

    // Tiêu hao lương thực theo ngày & Cộng thu hoạch mùa vụ + Tích lương của các đạo quân (foraging) + Giao chiến (engaging)
    let foragedFoodDaily = 0;
    let raidWeaponsDaily = 0;
    let raidFoodDaily = 0;
    let formationsChanged = false;

    let triggerWarModeOnSuspicion = false;
    let updatedFormations = state.formations.map(f => {
      if (f.status === 'foraging' && f.totalTroops > 0) {
        const gain = Math.max(8, Math.round(f.totalTroops * 1.2));
        foragedFoodDaily += gain;
        formationsChanged = true;
        return {
          ...f,
          totalFoodCarried: f.totalFoodCarried + Math.round(gain * 0.5),
        };
      }
      if (f.status === 'engaging' && f.engagedTargetCityId && f.totalTroops > 0) {
        const enemyIdx = updatedCities.findIndex(
          c => c.id === f.engagedTargetCityId && c.faction === 'ming' && c.troops > 0
        );
        if (enemyIdx !== -1) {
          citiesChanged = true;
          const enemyCity = updatedCities[enemyIdx];
          const dmg = Math.min(enemyCity.troops, Math.max(5, Math.round(f.totalTroops * 0.45)));
          const nextEnemyTroops = Math.max(0, enemyCity.troops - dmg);
          raidFoodDaily += Math.round(dmg * 1.5);
          raidWeaponsDaily += Math.round(dmg * 0.35);

          if (nextEnemyTroops === 0) {
            updatedCities[enemyIdx] = {
              ...enemyCity,
              troops: 0,
              faction: 'lam_son',
              population: enemyCity.population || {
                idleLaborers: 60,
                farmLaborers: 0,
                forgeLaborers: 0,
                combatTroops: 0,
                swappedCombatants: 0,
                unfitPopulation: 40,
              },
            };
            notify.success(`🚩 GIẢI PHÓNG CỨ ĐIỂM: [${f.name}] đã tiêu diệt toàn bộ quân đồn trú Minh và giải phóng [${enemyCity.name}]!`);
            formationsChanged = true;
            return {
              ...f,
              status: 'stationed' as const,
              engagedTargetCityId: null,
            };
          } else {
            updatedCities[enemyIdx] = {
              ...enemyCity,
              troops: nextEnemyTroops,
            };
          }
        } else {
          formationsChanged = true;
          return {
            ...f,
            status: 'stationed' as const,
            engagedTargetCityId: null,
          };
        }
      }
      return f;
    });

    // 3. DÂN TỊ NẠN & HÀO KIỆT TÌM ĐẾN QUY PHỤ (CƠ CHẾ TƯƠNG TÁC THAY VÌ TỰ ĐỘNG)
    // Lưu dân tụ hội trước cổng trại Lam Sơn vào ngày 5, 12, 19, 26 hàng tháng
    const isRefugeeDay = (newDay === 5 || newDay === 12 || newDay === 19 || newDay === 26);
    const lamSonBase = updatedCities.find(c => c.id === 'lam_son' && c.faction === 'lam_son');
    
    if (isRefugeeDay && lamSonBase && lamSonBase.population) {
      // Giữ tối đa 5 đoàn lưu dân chờ cùng lúc trước cổng trại để tránh dồn ứ vô hạn
      if (nextPendingRefugees.filter(w => !w.departed && (w.daysRemaining ?? 0) > 0).length < 10) {
        const unfitCount = Math.floor(Math.random() * 5) + 2; // 2 - 6 lão, ấu
        const idleCount = Math.floor(Math.random() * 8) + 12; // 12 - 19 tráng phu
        const totalCount = idleCount + unfitCount; // Tổng số người (14 - 25)
        const goldContribution = Math.floor(Math.random() * 11) + 5; // 5 - 15 Vàng mang theo ủng hộ nghĩa quân


        const foodCost = totalCount * 1;

        const origins = [
          { name: 'Triệu Hóa', story: 'Trốn chạy việc quan quân nhà Minh cưỡng bức bắt phu đi đào vàng đãi bạc ở khe núi sâu...' },
          { name: 'Nông Cống', story: 'Trốn thuế khóa hà khắc và việc giặc vơ vét toàn bộ thóc giống đầu mùa...' },
          { name: 'Quảng Hóa', story: 'Hào kiệt và trai tráng trong làng rủ nhau vượt sông Chu tìm về Lam Sơn quy tụ dưới cờ Bình Định Vương...' },
          { name: 'Nga Sơn', story: 'Gia đình bị giặc Minh đốt nhà vì không chịu nộp vải lụa, dắt díu nhau vượt núi tìm về nghĩa quân...' },
          { name: 'Cổ Lũng', story: 'Dân bản Mường cùng các tráng đinh nghe tiếng đức độ của Lê Lợi đã băng rừng tìm về nương náu...' },
          { name: 'Lương Giang', story: 'Thanh niên trai tráng căm thù giặc Minh tàn bạo, kết đoàn tìm đến căn cứ xin cầm gươm giáo giết giặc...' },
        ];
        const picked = origins[Math.floor(Math.random() * origins.length)];

        const newWave: PendingRefugeeWave = {
          id: `refugee_wave_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          cityId: lamSonBase.id,
          cityName: lamSonBase.name,
          dateStr: `Ngày ${newDay}/${newMonth}/${newYear}`,
          totalCount,
          idleCount,
          unfitCount,
          foodCost,
          goldContribution,
          originName: picked.name,
          story: picked.story,
          timestamp: Date.now(),
          daysRemaining: 30,
        };

        nextPendingRefugees = [newWave, ...nextPendingRefugees];
      }
    }

    const foodConsumption = Math.max(5, totalPopulation * 0.035);
    let newFood = Math.max(0, Math.round(state.resources.food + seasonalFoodHarvested + foragedFoodDaily + raidFoodDaily - foodConsumption));
    const newSwords = state.resources.swords + swordsProduced + Math.ceil(raidWeaponsDaily * 0.4) + returnedSwords;
    const newBows = state.resources.bows + bowsProduced + Math.floor(raidWeaponsDaily * 0.3) + returnedBows;
    const newSpears =
      state.resources.spears +
      spearsProduced +
      (raidWeaponsDaily - Math.ceil(raidWeaponsDaily * 0.4) - Math.floor(raidWeaponsDaily * 0.3)) +
      returnedSpears;
    let newWeapons = newSwords + newBows + newSpears;
    const newClothes = state.resources.clothes + armorProduced;
    let newGold = state.resources.gold + refundedQueueGold;

    // Nguồn thu ngân khố:
    // 1. Dân chúng, tráng đinh nhàn rỗi khai thác mộc nhĩ, mật ong, sa khoáng Lam Sơn hàng ngày
    const lamSonBaseRevenue = updatedCities.find(c => c.id === 'lam_son' && c.faction === 'lam_son');
    if (lamSonBaseRevenue && lamSonBaseRevenue.population) {
      const dailyCraftGold = Math.max(1, Math.floor((lamSonBaseRevenue.population.idleLaborers || 0) * 0.015));
      newGold += dailyCraftGold;

      // 2. Thuế khóa định kỳ, lâm thổ sản & đóng góp từ hào tộc các lộ vào ngày mùng 1 hàng tháng
      if (newDay === 1) {
        const campTierGold = (lamSonBaseRevenue.level || 1) * 45;
        const craftMonthly = Math.floor((lamSonBaseRevenue.population.idleLaborers || 0) * 0.15);
        const gentryDonation = Math.floor(Math.random() * 25) + 20;
        const totalMonthlyRevenue = campTierGold + craftMonthly + gentryDonation;
        newGold += totalMonthlyRevenue;

        newNotices.push({
          id: `monthly_gold_${Date.now()}`,
          type: 'general' as const,
          title: 'Ngân Khố Đầu Tháng',
          dateStr: `Ngày 1/${newMonth}/${newYear}`,
          description: `Đầu tháng, căn cứ Lam Sơn thu thuế lâm thổ sản và hào kiệt quyên góp: +${totalMonthlyRevenue} Vàng nạp vào ngân khố.`,
          read: false,
          timestamp: Date.now(),
        });
      }
    }
    let newMorale = state.resources.morale;

    if (newFood <= 0) {
      newFood = 0;
      newMorale = Math.max(0, newMorale - 0.5);
    } else if (newFood > 4000) {
      newMorale = Math.min(100, newMorale + 0.05);
    }

    // 4. Mức nghi ngờ: Tính từ tiếng búa lò rèn + Thao luyện quân + Quy mô quân đội sẵn sàng
    // 4.1. Thao luyện tân binh: Tiếng hò reo, múa giáo, bắn cung tập kích khiến giặc chú ý
    updatedCities.forEach(c => {
      if (c.training) {
        const trainees = c.training.traineesCount || 0;
        const general = state.generals.find(g => g.id === c.training?.generalId);
        const commandSkill = general ? (general.stats.command || 70) : 70;
        const disciplineFactor = Math.max(0.5, 1.3 - (commandSkill / 130));
        suspicionGain += trainees * 0.013 * disciplineFactor;
      }
    });

    // 4.2. Quy mô quân đội đã thao luyện sẵn sàng chiến đấu
    let totalCombatTroops = 0;
    updatedCities.forEach(c => {
      totalCombatTroops += c.population?.combatTroops || 0;
    });
    state.formations.forEach(f => {
      totalCombatTroops += f.totalTroops || 0;
    });

    // Nếu quân số thao luyện vượt mốc 120 tên, mỗi ngày tăng nhẹ độ chú ý của giặc Minh
    if (totalCombatTroops > 60) {
      suspicionGain += (totalCombatTroops - 60) * 0.0015;
    }

    let nextSuspicion = Math.min(100, Math.max(0, state.suspicion + suspicionGain - 0.06));

    if (nextSuspicion >= 100) {
      // Độ nghi ngờ đạt 100%: Giặc Minh xuất thành tiến đánh căn cứ Lam Sơn trên bản đồ chiến dịch
      nextSuspicion = 35; // Sau khi phát binh càn quét, mức nghi ngờ tạm hạ về 35%

      const baseCity =
        updatedCities.find(c => c.id === 'lam_son' && c.faction === 'lam_son') ||
        updatedCities.find(c => c.faction === 'lam_son' && (c.hasBase || c.type === 'camp'));

      const mingSources = updatedCities.filter(c => c.faction === 'ming' && c.troops >= 5);
      const preferredTayDo = mingSources.find(c => c.id === 'tay_do');
      const sourceCity =
        preferredTayDo ||
        (baseCity
          ? [...mingSources].sort(
              (a, b) => Math.hypot(a.x - baseCity.x, a.y - baseCity.y) - Math.hypot(b.x - baseCity.x, b.y - baseCity.y)
            )[0]
          : mingSources[0]);

      if (baseCity && sourceCity) {
        const enemyRaiders = Math.min(
          sourceCity.troops,
          Math.max(80, Math.round(Math.max(70, totalCombatTroops) * 1.15))
        );
        const dep = deployMingForce(updatedCities, sourceCity.id, { x: baseCity.x, y: baseCity.y }, enemyRaiders);
        if (dep.spawned.length > 0) {
          updatedCities = dep.cities;
          citiesChanged = true;
          updatedFormations = [...updatedFormations, ...dep.spawned];
          formationsChanged = true;
          triggerWarModeOnSuspicion = true;

          newNotices.push({
            id: `ming_expedition_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            type: 'combat',
            title: 'Giặc Minh Xuất Binh Càn Quét!',
            dateStr: `Ngày ${newDay}/${newMonth}/${newYear}`,
            description: `Độ nghi ngờ đạt 100%! ${enemyRaiders.toLocaleString()} quân Minh từ [${sourceCity.name}] đang hành quân tiến đánh [${baseCity.name}]! Hãy điều quân đánh chặn, phục kích hoặc cắt đường lương của địch.`,
            read: false,
            timestamp: Date.now(),
          });
          notify.warning(
            `⚔️ CẢNH BÁO QUÂN CƠ: Độ nghi ngờ 100%! ${enemyRaiders} quân Minh từ [${sourceCity.name}] đang tiến đánh [${baseCity.name}]!`
          );
        }
      }
    } else if (nextSuspicion >= 85 && Math.random() < 0.06) {
      notify.warning('CẢNH BÁO QUÂN CƠ: Mật thám Tây Đô phát giác khói lửa lò rèn Lam Sơn! Nghi ngờ dâng cao, mau lo vàng đút lót trước khi giặc kéo quân càn quét!');
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

      // Cộng quân tiếp viện thực tế vào bản doanh Lam Sơn để người chơi có thể điều động
      if (bonusTroops > 0) {
        const baseIdx = updatedCities.findIndex(c => c.id === 'lam_son' && c.faction === 'lam_son' && c.population) !== -1
          ? updatedCities.findIndex(c => c.id === 'lam_son' && c.faction === 'lam_son' && c.population)
          : updatedCities.findIndex(c => c.faction === 'lam_son' && c.population);

        if (baseIdx !== -1) {
          citiesChanged = true;
          const baseCity = updatedCities[baseIdx];
          updatedCities[baseIdx] = {
            ...baseCity,
            troops: baseCity.troops + bonusTroops,
            population: {
              ...baseCity.population!,
              combatTroops: baseCity.population!.combatTroops + bonusTroops,
            },
          };
        }
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

    // 6. Kiểm tra Thắng / Bại (Victory & Defeat Conditions)
    let nextGameStatus = state.gameStatus;
    const tayDoCity = updatedCities.find(c => c.id === 'tay_do');
    const hasLamSonBase = updatedCities.some(c => c.faction === 'lam_son' && (c.hasBase || c.type === 'camp'));

    if (nextGameStatus === 'playing') {
      if (tayDoCity && tayDoCity.faction === 'lam_son') {
        nextGameStatus = 'victory';
        shouldPause = true;
        notify.success('🎉 ĐẠI THẮNG LỊCH SỬ: Nghĩa quân đã hạ thành Tây Đô, quét sạch giặc Minh khỏi phủ Thanh Hóa!');
      } else if (!hasLamSonBase || (newMorale <= 0 && state.resources.troops <= 0 && newFood <= 0)) {
        nextGameStatus = 'defeat';
        shouldPause = true;
        notify.error('💀 KHỞI NGHĨA THẤT BẠI: Toàn bộ căn cứ nghĩa quân thất thủ, khí số dở dang...');
      }
    }

    return {
      day: newDay,
      month: newMonth,
      year: newYear,
      isPaused: shouldPause ? true : state.isPaused,
      ...(triggerWarModeOnSuspicion && state.timeMode === 'day'
        ? { timeMode: 'hour' as const, previousActiveTimeMode: 'hour' as const, isWarMode: true }
        : {}),
      resources: {
        ...state.resources,
        food: newFood,
        swords: newSwords,
        bows: newBows,
        spears: newSpears,
        weapons: newWeapons,
        clothes: newClothes,
        gold: newGold,
        morale: newMorale,
        troops: state.resources.troops + trainedTroopsAdded + bonusTroops,
        elephants: state.resources.elephants + bonusElephants,
      },
      cities: citiesChanged ? updatedCities : state.cities,
      structures: structuresChanged ? updatedStructures : state.structures,
      formations: formationsChanged ? updatedFormations : state.formations,
      generals: updatedGenerals,
      pendingRefugees: nextPendingRefugees,
      recruitmentNotice: newNotice,
      militaryNotices: newNotices.length > 0
        ? [...newNotices, ...state.militaryNotices].slice(0, 100)
        : state.militaryNotices,
      suspicion: nextSuspicion,
      gameStatus: nextGameStatus,
    };
  });


  },
});
