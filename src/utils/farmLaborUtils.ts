import type { CityNode, PlacedStructure } from '../types';
import type { TacticalFormation } from '../types/armyFormation';

/**
 * Kiểm tra xem một đạo quân có đang rời căn cứ xuất chiến hay không
 * (Hành quân, truy đuổi, phục kích, giao chiến, do thám, thu thập lương...).
 * Khi đạo quân đang ở căn cứ (stationed / idle, không có lệnh hành quân, không giao tranh),
 * toàn bộ binh sĩ mặc định ở nhà làm ruộng theo quốc sách "Ngụ binh ư nông".
 */
export function isFormationOnCampaign(f: TacticalFormation): boolean {
  if (f.marchOrder) return true;
  if (f.combatState) return true;
  if (
    f.status === 'marching' ||
    f.status === 'retreating' ||
    f.status === 'engaging' ||
    f.status === 'ambushing' ||
    f.status === 'scouting' ||
    f.status === 'foraging' ||
    f.status === 'decoying'
  ) {
    return true;
  }
  return false;
}

export interface FarmLaborRecalcResult {
  cities: CityNode[];
  structures: PlacedStructure[];
  hasChanged: boolean;
}

/**
 * Tính toán và tự động điều phối nhân lực đồn điền:
 * - Trừ khi binh lính được biên chế phải ra chiến trận (hành quân/giao chiến),
 *   toàn bộ binh lính dự bị + binh lính trong đạo quân tại căn cứ + tráng phu nhàn rỗi
 *   mặc định tự động đi làm ruộng.
 * - Tự động lấp đầy các đồn điền thuộc căn cứ theo thứ tự cho đến khi đạt tối đa.
 */
export function recalculateFarmWorkers(
  cities: CityNode[],
  structures: PlacedStructure[],
  formations: TacticalFormation[]
): FarmLaborRecalcResult {
  let hasChanged = false;
  const newStructures = structures.map(s => ({ ...s }));
  const newCities = cities.map(c => ({
    ...c,
    population: c.population ? { ...c.population } : undefined,
  }));

  for (let cIdx = 0; cIdx < newCities.length; cIdx++) {
    const city = newCities[cIdx];
    if (!city.population) continue;

    // Chỉ áp dụng cho các căn cứ của nghĩa quân Lam Sơn
    if (city.faction !== 'lam_son') continue;

    // 1. Dân đinh / tráng phu nhàn rỗi (chưa biên chế quân ngũ)
    const idle = Math.max(0, city.population.idleLaborers || 0);
    // 2. Nghĩa binh dự bị tại căn cứ (đã thao luyện nhưng chưa vào đạo quân xuất trận)
    const reserve = Math.max(0, city.population.combatTroops || 0);
    // 3. Binh lính trong các đạo quân đang đóng quân tại căn cứ (không hành quân)
    const stationedTroops = formations
      .filter(f => f.cityId === city.id && f.faction === 'lam_son' && !isFormationOnCampaign(f))
      .reduce((sum, f) => sum + (f.totalTroops || 0), 0);

    let totalAvailable = idle + reserve + stationedTroops;
    let assignedTotal = 0;

    for (let fIdx = 0; fIdx < newStructures.length; fIdx++) {
      const s = newStructures[fIdx];
      if (s.type !== 'farm' || s.status !== 'active') continue;

      // Khớp theo căn cứ sở tại (hoặc nếu chưa gán cityId thì nhận căn cứ Lam Sơn đầu tiên)
      const matchesCity = s.cityId === city.id || (!s.cityId && city.id === 'lam_son');
      if (!matchesCity) continue;

      const max = s.maxWorkers || (s.gridSize === 7 ? 50 : s.gridSize === 6 ? 35 : 25);
      const allocated = Math.min(max, totalAvailable);
      totalAvailable -= allocated;
      assignedTotal += allocated;

      if (s.assignedWorkers !== allocated) {
        hasChanged = true;
        newStructures[fIdx].assignedWorkers = allocated;
      }
    }

    if (city.population.farmLaborers !== assignedTotal) {
      hasChanged = true;
      city.population.farmLaborers = assignedTotal;
    }
  }

  return { cities: newCities, structures: newStructures, hasChanged };
}
