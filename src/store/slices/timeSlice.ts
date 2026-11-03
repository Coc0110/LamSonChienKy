import { CAMP_CAPACITY_BY_LEVEL } from '../../types';
import { isHarvestDay, rollSeasonClimate, rollFarmMicroEvent } from '../../utils/harvestSeasons';
import type { StateCreator } from 'zustand';
import { START_DAY, START_MONTH, START_YEAR } from '../../data/mapData';
import type { MilitaryNotice } from '../../types';
import { notify } from '../dialogStore';
import type { TimeSlice, GameStore } from './types';

export const getDaysInMonth = (month: number, year: number): number => {
  return new Date(year, month, 0).getDate();
};

export const createTimeSlice: StateCreator<GameStore, [], [], TimeSlice> = (set, get) => ({
  day: START_DAY,
  month: START_MONTH,
  year: START_YEAR,
  canhHour: 4, // Bắt đầu lúc Giờ Thìn (07:00 - 09:00 sớm mai)
  isWarMode: false,
  isPaused: false,
  gameSpeed: 1,

  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

  setSpeed: (speed) => set(() => {
    if (speed === 0) {
      return { isPaused: true };
    }
    return { gameSpeed: speed, isPaused: false };
  }),

  setWarMode: (active: boolean) => set(() => ({ isWarMode: active })),
  toggleWarMode: () => set((state) => ({ isWarMode: !state.isWarMode })),

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
      let citiesChanged = false;
      let structuresChanged = false;

      const updatedCities = state.cities.map(city => {
        if (!city.upgrading && !city.training) return city;
        citiesChanged = true;
        let c = { ...city };

        if (c.upgrading) {
          const nextDays = Math.max(0, Number((c.upgrading.remainingDays - deltaDayFraction).toFixed(3)));
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
          const nextDays = Math.max(0, Number((c.training.remainingDays - deltaDayFraction).toFixed(3)));
          if (nextDays <= 0) {
            const { traineesCount } = c.training;
            const pop = c.population ? { ...c.population, combatTroops: c.population.combatTroops + traineesCount } : c.population;
            c = {
              ...c,
              population: pop,
              training: null,
            };
            notify.success(`Đợt thao luyện ${traineesCount} nghĩa binh tại [${c.name}] đã hoàn tất!`);
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
        const nextDays = Math.max(0, Number((s.buildDaysRemaining - deltaDayFraction).toFixed(3)));
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
        cities: citiesChanged ? updatedCities : state.cities,
        structures: structuresChanged ? updatedStructures : state.structures,
      });
    }
  },

  setTimeDate: (targetDay: number, targetMonth: number, targetYear: number) => set((state) => {
    const targetVal = targetYear * 10000 + targetMonth * 100 + targetDay;
    const updatedGenerals = state.generals.map(g => {
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

    // 1. Cập nhật tiến độ thao luyện võ nghệ
    let citiesChanged = false;
    let trainedTroopsAdded = 0;
    const farmWorkersToReduceByCity = new Map<string, number>();

    const updatedCities = state.cities.map(city => {
      if (!city.population) return city;
      let pop = { ...city.population };
      let currentCity: typeof city = { ...city };

      // Cập nhật tiến trình nâng cấp căn cứ doanh trại
      if (currentCity.upgrading) {
        const nextDays = currentCity.upgrading.remainingDays - 1;
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
        const newRemaining = training.remainingDays - 1;
        if (newRemaining <= 0) {
          const { traineesCount, swappedCount = 0, takenFromFarm = 0, takenFromForge = 0 } = training;
          trainedTroopsAdded += traineesCount;

          if (takenFromFarm > 0) {
            farmWorkersToReduceByCity.set(city.id, takenFromFarm);
          }

          const combatReturned = Math.max(0, swappedCount - takenFromForge);

          return {
            ...currentCity,
            population: {
              ...pop,
              combatTroops: pop.combatTroops + combatReturned + traineesCount,
              forgeLaborers: pop.forgeLaborers + takenFromForge,
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

    let updatedStructures = state.structures.map(structure => {
      let currentStruct = structure;

      // Đồng bộ số nông đinh trên ruộng nếu đợt thao luyện vùng Cam vừa hoàn tất
      if (currentStruct.type === 'farm' && currentStruct.status === 'active' && farmWorkersToReduceByCity.has(currentStruct.cityId)) {
        const toReduce = farmWorkersToReduceByCity.get(currentStruct.cityId)!;
        if (toReduce > 0 && currentStruct.assignedWorkers > 0) {
          const deduct = Math.min(currentStruct.assignedWorkers, toReduce);
          currentStruct = { ...currentStruct, assignedWorkers: currentStruct.assignedWorkers - deduct };
          farmWorkersToReduceByCity.set(currentStruct.cityId, toReduce - deduct);
          structuresChanged = true;
        }
      }

      // Thi công xây dựng công trình mới
      if (currentStruct.status === 'building') {
        structuresChanged = true;
        const s = { ...currentStruct, buildDaysRemaining: currentStruct.buildDaysRemaining - 1 };
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
        const noiseFactor = isQuietTerrain ? 0.25 : 1.6;
        suspicionGain += order.assignedSmiths * 0.012 * noiseFactor;

        order.remainingDays -= 1;
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

    const updatedFormations = state.formations.map(f => {
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

    // 3. DÂN TỊ NẠN & HÀO KIỆT QUY PHỤ ĐỊNH KỲ (Đều đặn ngày 5, 12, 19, 26 hàng tháng)
    // Điều chỉnh quy mô gia tăng đạt ~2.000 người vào mốc tháng 2/1418 như sử sách ghi nhận
    const isRefugeeDay = (newDay === 5 || newDay === 12 || newDay === 19 || newDay === 26);
    const lamSonBaseIdx = updatedCities.findIndex(c => c.id === 'lam_son' && c.faction === 'lam_son');
    
    if (isRefugeeDay && lamSonBaseIdx !== -1 && updatedCities[lamSonBaseIdx].population) {
      const base = updatedCities[lamSonBaseIdx];
      const pop = base.population!;
      const baseCap = CAMP_CAPACITY_BY_LEVEL[base.level || 1] || 500;
      
      const currentBasePop = (pop.combatTroops || 0) + (pop.idleLaborers || 0) + (pop.farmLaborers || 0) + 
                             (pop.forgeLaborers || 0) + (pop.unfitPopulation || 0) + (pop.swappedCombatants || 0);
      const capAvailable = baseCap - currentBasePop;

      if (capAvailable > 0) {
        // Đón nhận 15 - 21 người mỗi đợt (~72 người/tháng, đạt mốc ~2.000 người sau 2 năm)
        const incomingCount = Math.min(capAvailable, Math.floor(Math.random() * 7) + 15);
        // Tỷ lệ già yếu giảm xuống chỉ còn ~15%, ~85% là tráng phu trai tráng tụ nghĩa
        const unfitIncoming = Math.max(1, Math.round(incomingCount * 0.15));
        const idleIncoming = incomingCount - unfitIncoming;
        const reliefFood = incomingCount * 1; // 1 thạch lương/người trợ cấp ban đầu

        const actualFoodDeducted = Math.min(state.resources.food, reliefFood);

        citiesChanged = true;
        updatedCities[lamSonBaseIdx] = {
          ...base,
          population: {
            ...pop,
            idleLaborers: pop.idleLaborers + idleIncoming,
            unfitPopulation: pop.unfitPopulation + unfitIncoming,
          },
        };

        if (actualFoodDeducted > 0) {
          seasonalFoodHarvested -= actualFoodDeducted;
        }

        newNotices.push({
          id: `refugee_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: 'general' as const,
          title: 'Lưu Dân & Hào Kiệt Quy Phụ',
          dateStr: `Ngày ${newDay}/${newMonth}/${newYear}`,
          description: `Đoàn ${incomingCount} người (${idleIncoming} tráng phu, ${unfitIncoming} già yếu) từ các châu huyện lân cận trốn chạy ách bạo ngược giặc Minh đã kéo về Lam Sơn tụ nghĩa. Doanh trại đã cưu mang họ!`,
          read: false,
          timestamp: Date.now(),
        });
      } else {
        // Căn cứ đã đầy (ví dụ 500/500) -> Thông báo cảnh báo quá tải
        if (Math.random() < 0.35) {
          newNotices.push({
            id: `camp_full_${Date.now()}`,
            type: 'build' as const,
            title: 'Căn Cứ Đã Đạt Trần Sức Chứa',
            dateStr: `Ngày ${newDay}/${newMonth}/${newYear}`,
            description: `Doanh trại Lam Sơn đã chật ních lán trại (${currentBasePop}/${baseCap} người)! Đoàn lưu dân không thể vào nương náu và buộc phải tản mát vào rừng núi lân cận. Hãy sớm mở rộng nâng cấp căn cứ để cưu mang thêm trăm họ!`,
            read: false,
            timestamp: Date.now(),
          });
        }
      }
    }

    const foodConsumption = Math.max(5, totalPopulation * 0.035);
    let newFood = Math.max(0, Math.round(state.resources.food + seasonalFoodHarvested + foragedFoodDaily + raidFoodDaily - foodConsumption));
    const newSwords = state.resources.swords + swordsProduced + Math.ceil(raidWeaponsDaily * 0.4);
    const newBows = state.resources.bows + bowsProduced + Math.floor(raidWeaponsDaily * 0.3);
    const newSpears =
      state.resources.spears +
      spearsProduced +
      (raidWeaponsDaily - Math.ceil(raidWeaponsDaily * 0.4) - Math.floor(raidWeaponsDaily * 0.3));
    const newWeapons = newSwords + newBows + newSpears;
    const newClothes = state.resources.clothes + armorProduced;
    const newGold = state.resources.gold + refundedQueueGold;
    let newMorale = state.resources.morale;

    if (newFood <= 0) {
      newFood = 0;
      newMorale = Math.max(0, newMorale - 0.5);
    } else if (newFood > 4000) {
      newMorale = Math.min(100, newMorale + 0.05);
    }

    // 4. Mức nghi ngờ: Tính từ tiếng búa lò rèn + Quy mô quân đội đã thao luyện
    let totalCombatTroops = 0;
    updatedCities.forEach(c => {
      totalCombatTroops += c.population?.combatTroops || 0;
    });
    state.formations.forEach(f => {
      totalCombatTroops += f.totalTroops || 0;
    });

    // Nếu quân số thao luyện vượt mốc 120 tên, mỗi ngày tăng nhẹ độ chú ý của giặc Minh
    if (totalCombatTroops > 120) {
      suspicionGain += (totalCombatTroops - 120) * 0.00035;
    }

    let nextSuspicion = Math.min(100, Math.max(0, state.suspicion + suspicionGain - 0.025));

    if (nextSuspicion >= 100) {
      // Giặc Minh tại thành Tây Đô mở cuộc hành quân càn quét bất ngờ vào Lam Sơn!
      nextSuspicion = 35; // Sau trận càn quét, địch rút quân tạm lắng, nghi ngờ hạ về 35%

      const baseIdx = updatedCities.findIndex(c => c.id === 'lam_son' && c.faction === 'lam_son');
      const baseCity = baseIdx !== -1 ? updatedCities[baseIdx] : null;

      const baseCombatTroops = baseCity?.population?.combatTroops || 0;
      const stationedFormationTroops = state.formations
        .filter(f => f.cityId === 'lam_son' && f.status === 'stationed')
        .reduce((sum, f) => sum + f.totalTroops, 0);
      const totalDefenders = baseCombatTroops + stationedFormationTroops;

      // Toán quân càn quét ngẫu nhiên 60 - 95 tên
      const enemyRaiders = Math.floor(Math.random() * 36) + 60;

      if (totalDefenders >= Math.round(enemyRaiders * 0.7)) {
        // Nghĩa quân phòng thủ vững chắc hoặc phục kích đánh tan toán càn quét!
        const enemyKilled = Math.min(enemyRaiders, Math.floor(enemyRaiders * 0.6) + 12);
        const ourLosses = Math.min(baseCombatTroops, Math.max(1, Math.floor(enemyKilled * 0.25)));
        const lootWeapons = Math.floor(enemyKilled * 0.35);
        const lootFood = Math.floor(enemyKilled * 1.4);

        if (baseIdx !== -1 && baseCity && baseCity.population) {
          citiesChanged = true;
          updatedCities[baseIdx] = {
            ...baseCity,
            troops: Math.max(0, baseCity.troops - ourLosses),
            population: {
              ...baseCity.population,
              combatTroops: Math.max(0, baseCity.population.combatTroops - ourLosses),
            },
          };
        }

        newFood += lootFood;
        newMorale = Math.min(100, newMorale + 4);

        notify.success(`⚔️ ĐẠI THẮNG ĐẨY LÙI QUÂN MINH CÀN QUÉT! Quân ta phục binh đánh tan ${enemyRaiders} quân Minh lục soát Lam Sơn! Diệt ${enemyKilled} giặc, thu ${lootWeapons} vũ khí & ${lootFood} lương!`);

        newNotices.push({
          id: `ming_raid_win_${Date.now()}`,
          type: 'combat' as const,
          title: 'Đẩy Lùi Quân Minh Càn Quét',
          dateStr: `Ngày ${newDay}/${newMonth}/${newYear}`,
          description: `Độ nghi ngờ chạm đỉnh khiến giặc Minh phái ${enemyRaiders} quân càn quét Lam Sơn. Nhờ có quân phòng thủ vững vàng, nghĩa quân đã đánh tan giặc, tiêu diệt ${enemyKilled} tên, thu chiến lợi phẩm dồi dào!`,
          read: false,
          timestamp: Date.now(),
        });
      } else {
        // Quân ta mỏng manh, không kịp phòng ngự, giặc cướp bóc một phần tài nguyên
        const foodPlundered = Math.min(newFood, Math.floor(newFood * 0.2) + 150);
        const weaponPlundered = Math.min(newWeapons, 25);
        newFood = Math.max(0, newFood - foodPlundered);
        newMorale = Math.max(0, newMorale - 12);

        if (baseIdx !== -1 && baseCity && baseCity.population) {
          const casualties = Math.min(baseCombatTroops, 10);
          citiesChanged = true;
          updatedCities[baseIdx] = {
            ...baseCity,
            troops: Math.max(0, baseCity.troops - casualties),
            population: {
              ...baseCity.population,
              combatTroops: Math.max(0, baseCity.population.combatTroops - casualties),
            },
          };
        }

        notify.error(`🚨 NGUY CẤP: Quân Minh bất ngờ càn quét Lam Sơn! Do quân số phòng thủ mỏng, giặc đã cướp mất ${foodPlundered} hộc lương, ${weaponPlundered} khí giới!`);

        newNotices.push({
          id: `ming_raid_loss_${Date.now()}`,
          type: 'combat' as const,
          title: 'Quân Minh Đột Kích Lam Sơn',
          dateStr: `Ngày ${newDay}/${newMonth}/${newYear}`,
          description: `Mức nghi ngờ đạt 100%, quan quân Tây Đô kéo đến càn quét bất ngờ! Ta thiếu quân phòng thủ, giặc cướp phá ${foodPlundered} lương thảo, ${weaponPlundered} vũ khí, sĩ khí nghĩa quân sa sút.`,
          read: false,
          timestamp: Date.now(),
        });
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
      recruitmentNotice: newNotice,
      militaryNotices: newNotices.length > 0
        ? [...newNotices, ...state.militaryNotices].slice(0, 100)
        : state.militaryNotices,
      suspicion: nextSuspicion,
      gameStatus: nextGameStatus,
    };
  })
});
