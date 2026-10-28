import type { StateCreator } from 'zustand';
import { START_DAY, START_MONTH, START_YEAR } from '../../data/mapData';
import type { MilitaryNotice } from '../../types';
import { notify } from '../dialogStore';
import type { TimeSlice, GameStore } from './types';

export const getDaysInMonth = (month: number, year: number): number => {
  return new Date(year, month, 0).getDate();
};

export const createTimeSlice: StateCreator<GameStore, [], [], TimeSlice> = (set) => ({
  day: START_DAY,
  month: START_MONTH,
  year: START_YEAR,

  isPaused: false,
  gameSpeed: 1,

  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

  setSpeed: (speed) => set(() => {
    if (speed === 0) {
      return { isPaused: true };
    }
    return { gameSpeed: speed, isPaused: false };
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
      notify.warning('CẢNH BÁO QUÂN CƠ: Quân Minh tại thành Tây Đô đã dấy lên nghi ngờ cao độ! Mau chuẩn bị vàng đút lót trước khi giặc kéo quân lục soát!');
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
});
