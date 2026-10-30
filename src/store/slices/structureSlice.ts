import type { StateCreator } from 'zustand';
import type { PlacedStructure, StructureType, WeaponCraftType, ForgeOrder } from '../../types';
import { INITIAL_STRUCTURES } from '../../data/mapData';
import { TERRAIN_DEFINITIONS } from '../../data/terrainData';
import { validateCellPlacement, FARM_BASE_RADIUS_PCT } from '../../data/terrainGrid';
import { MAP_COORD_W, MAP_COORD_H } from '../../utils/mapGeo';
import type { StructureSlice, GameStore } from './types';

export const createStructureSlice: StateCreator<GameStore, [], [], StructureSlice> = (set, get) => ({
  structures: INITIAL_STRUCTURES,

  // Kéo thả / đặt công trình lên bản đồ
  placeStructure: (cityId, type, x, y, customGridSize, customMaxWorkers) => {
    const city = get().cities.find(c => c.id === cityId);
    if (!city) {
      return { success: false, message: 'Không tìm thấy căn cứ sở tại!' };
    }

    const gridSize = customGridSize || (type === 'forge' ? 3 : (customMaxWorkers === 50 ? 7 : customMaxWorkers === 35 ? 6 : 5));
    const maxWorkers = type === 'farm' ? (customMaxWorkers || (gridSize === 7 ? 50 : gridSize === 6 ? 35 : 25)) : 15;

    // Kiểm tra hợp lệ vị trí theo khối ô lưới không trùng lấn
    const val = validateCellPlacement(x, y, type, cityId, get().cities, get().structures, undefined, gridSize);
    if (!val.canBuild) {
      return { success: false, message: val.reason };
    }

    // Chi phí và nhân lực thi công theo từng mốc công trình
    let goldCost = 80;
    let reqWorkers = 10;
    let buildDays = 12;

    if (type === 'forge') {
      goldCost = 120;
      reqWorkers = 15;
      buildDays = 18;
    } else if (type === 'farm') {
      if (gridSize === 7) {
        goldCost = 240;
        reqWorkers = 25;
        buildDays = 20;
      } else if (gridSize === 6) {
        goldCost = 150;
        reqWorkers = 18;
        buildDays = 16;
      } else {
        goldCost = 80;
        reqWorkers = 10;
        buildDays = 12;
      }
    }

    if (get().resources.gold < goldCost) {
      return { success: false, message: `Ngân khố không đủ! Cần ${goldCost} Vàng để thi công.` };
    }

    if (!city.population || city.population.idleLaborers < reqWorkers) {
      return { success: false, message: `Thiếu tráng phu rảnh rỗi! Cần điều động ${reqWorkers} tráng phu tham gia thi công công trình.` };
    }

    const existingStructures = get().structures;
    const sameTypeCount = existingStructures.filter(s => s.cityId === cityId && s.type === type).length + 1;
    const tierName = type === 'farm' ? (gridSize === 7 ? 'Đại Điền' : gridSize === 6 ? 'Trung Điền' : 'Tiểu Điền') : 'Lò Rèn';

    const newStructure: PlacedStructure = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      cityId,
      type,
      name: `${tierName} ${city.name} ${sameTypeCount}`,
      x: val.snappedX,
      y: val.snappedY,
      gridSize,
      startCol: val.startCol,
      startRow: val.startRow,
      terrain: val.terrain,
      status: 'building',
      buildDaysTotal: buildDays,
      buildDaysRemaining: buildDays,
      builderWorkers: reqWorkers,
      assignedWorkers: 0,
      maxWorkers,
      cropDays: 0,
      cropCycleDays: 90,
      seasonCondition: Math.random() < 0.25 ? 'bountiful' : Math.random() < 0.2 ? 'poor' : 'normal',
      activeOrder: null,
      forgeQueue: [],
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
        ? `Đã cắm mốc khai hoang [${newStructure.name}] (${gridSize}x${gridSize}). Cần ${buildDays} ngày thi công!`
        : `Đã khởi công dựng [${newStructure.name}] (3x3). Cần ${buildDays} ngày thi công!`,
    };
  },

  // Di dời cơ quan / công trình sang vị trí mới
  relocateStructure: (structureId, newX, newY) => {
    const structure = get().structures.find(s => s.id === structureId);
    if (!structure) {
      return { success: false, message: 'Công trình không tồn tại!' };
    }

    const city = get().cities.find(c => c.id === structure.cityId);
    if (!city) {
      return { success: false, message: 'Không tìm thấy căn cứ sở tại!' };
    }

    // 1. Kiểm tra cự ly bảo hộ tới căn cứ quản hạt đối với ruộng nương
    if (structure.type === 'farm') {
      const dLng = ((newX - city.x) / 100) * MAP_COORD_W;
      const dLat = ((newY - city.y) / 100) * MAP_COORD_H;
      const distUnits = Math.hypot(dLng, dLat);
      const maxUnits = (FARM_BASE_RADIUS_PCT / 100) * MAP_COORD_W;
      if (distUnits > maxUnits) {
        return { success: false, message: `Vị trí mới quá xa căn cứ ${city.name} (vượt quá bán kính bảo hộ ${FARM_BASE_RADIUS_PCT}%)!` };
      }
    }

    // 2. Xác định kích thước ô lưới của công trình cần di dời
    const gridSize = structure.gridSize || (structure.type === 'forge' ? 3 : (structure.maxWorkers === 50 ? 7 : structure.maxWorkers === 30 ? 6 : 5));

    // 3. Kiểm tra tính hợp lệ trên lưới địa hình
    const val = validateCellPlacement(
      newX,
      newY,
      structure.type,
      structure.cityId,
      get().cities,
      get().structures,
      structureId,
      gridSize
    );

    if (!val.canBuild) {
      return { success: false, message: val.reason || 'Vị trí này không hợp lệ để di dời công trình!' };
    }

    const terrainInfo = TERRAIN_DEFINITIONS[val.terrain] || { name: 'Đất' };

    set(state => ({
      structures: state.structures.map(s => {
        if (s.id !== structureId) return s;
        return {
          ...s,
          x: val.snappedX,
          y: val.snappedY,
          startCol: val.startCol,
          startRow: val.startRow,
          gridSize,
          terrain: val.terrain,
        };
      }),
    }));

    return {
      success: true,
      message: `Đã di dời thành công [${structure.name}] sang vị trí mới (${terrainInfo.name})!`,
    };
  },

  // Phá dỡ / dỡ bỏ công trình & thu hồi tài nguyên
  demolishStructure: (structureId) => {
    const structure = get().structures.find(s => s.id === structureId);
    if (!structure) {
      return { success: false, message: 'Công trình không tồn tại!' };
    }

    let refundGold = structure.type === 'farm' ? 40 : 60;
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

  // Phân công nông đinh canh tác ruộng
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


  // Điều chỉnh trực tiếp số lượng nông đinh qua thanh kéo thả
  setFarmWorkers: (structureId, targetCount) => {
    const structure = get().structures.find(s => s.id === structureId);
    if (!structure || structure.type !== 'farm' || structure.status !== 'active') {
      return { success: false, message: 'Đồn điền chưa sẵn sàng hoặc không tồn tại!' };
    }

    const city = get().cities.find(c => c.id === structure.cityId);
    if (!city || !city.population) {
      return { success: false, message: 'Không tìm thấy căn cứ sở tại!' };
    }

    const current = structure.assignedWorkers || 0;
    const max = structure.maxWorkers || 25;
    let desired = Math.max(0, Math.min(max, targetCount));
    let diff = desired - current;

    if (diff > 0) {
      const available = city.population.idleLaborers;
      if (available < diff) {
        desired = current + available;
        diff = available;
      }
    }

    if (diff === 0) {
      return { success: true, message: `Nông đinh: ${desired}/${max}` };
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
        return { ...s, assignedWorkers: desired };
      }),
    }));

    return { success: true, message: `Đã điều động ${desired}/${max} nông đinh.` };
  },

  // Đặt mẻ rèn vũ khí tại lò rèn
  startForgeOrder: (structureId, order) => {
    const structure = get().structures.find(s => s.id === structureId);
    if (!structure || structure.type !== 'forge' || structure.status !== 'active') {
      return { success: false, message: 'Lò rèn chưa sẵn sàng!' };
    }

    const city = get().cities.find(c => c.id === structure.cityId);
    if (!city || !city.population) {
      return { success: false, message: 'Không tìm thấy căn cứ!' };
    }

    const costPerItem = order.weaponType === 'spear' ? 1.0 : order.weaponType === 'sword' ? 2.0 : order.weaponType === 'armor' ? 3.0 : 1.5;
    const totalGold = Math.ceil(order.quantity * costPerItem);
    const smiths = Math.max(1, Math.min(15, order.smiths));

    if (get().resources.gold < totalGold) {
      return { success: false, message: `Ngân khố không đủ! Cần ${totalGold} Vàng để mua quặng và than củi cho ${order.quantity} khí giới.` };
    }

    if (!structure.activeOrder && city.population.idleLaborers < smiths) {
      return { success: false, message: `Không đủ thợ rèn! Cần điều động ${smiths} tráng phu rảnh rỗi vào lò rèn.` };
    }

    const workFactor = order.weaponType === 'spear' ? 1.0 : order.weaponType === 'sword' ? 1.8 : order.weaponType === 'armor' ? 2.2 : 1.4;
    const totalDays = Math.max(4, Math.ceil((order.quantity * workFactor * 1.5) / smiths));

    const weaponNames: Record<WeaponCraftType, string> = {
      sword: 'Kiếm Thép Lam Sơn',
      bow: 'Cung Nỏ Lam Sơn',
      spear: 'Giáo Mác Thao Thiết',
      armor: 'Thiết Giáp Nghĩa Binh',
      crossbow: 'Nỏ Ngắm Hẻm Núi',
    };

    const forgeOrder: ForgeOrder = {
      id: `order_${Date.now()}`,
      weaponType: order.weaponType,
      name: weaponNames[order.weaponType] || 'Khí Giới Lam Sơn',
      quantity: order.quantity,
      totalDays,
      remainingDays: totalDays,
      assignedSmiths: smiths,
      goldCost: totalGold,
    };

    if (structure.activeOrder) {
      set(state => ({
        resources: {
          ...state.resources,
          gold: state.resources.gold - totalGold,
        },
        structures: state.structures.map(s => {
          if (s.id !== structureId) return s;
          return {
            ...s,
            forgeQueue: [...(s.forgeQueue || []), forgeOrder],
          };
        }),
      }));

      return {
        success: true,
        message: `Đã xếp ${order.quantity} ${forgeOrder.name} vào hàng chờ của lò rèn!`,
      };
    }

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
        if (s.forgeQueue && s.forgeQueue.length > 0) {
          const [next, ...rest] = s.forgeQueue;
          return { ...s, activeOrder: next, forgeQueue: rest };
        }
        return { ...s, activeOrder: null };
      }),
    }));
  },

  // Giao thương đổi lương lấy ngân khố (vàng)
  tradeFoodForGold: (foodAmount) => {
    if (foodAmount <= 0) return { success: false, message: 'Số lượng lương không hợp lệ.' };
    if (get().resources.food < foodAmount) {
      return { success: false, message: 'Kho lương không đủ để xuất bán!' };
    }

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

  // Legacy build structure
  buildStructure: (cityId, type) => {
    const city = get().cities.find(c => c.id === cityId);
    if (!city) return;
    const structureType: StructureType = type === 'farms' ? 'farm' : 'forge';
    const offsetX = (Math.random() - 0.5) * 2;
    const offsetY = (Math.random() - 0.5) * 2;
    get().placeStructure(cityId, structureType, city.x + offsetX, city.y + offsetY);
  },
});
