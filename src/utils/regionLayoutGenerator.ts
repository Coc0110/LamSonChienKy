import type { CityNode } from '../types';
import type { BaseBuilding, BaseBuildingType, RegionLayout } from '../types/region';
import { BASE_BUILDING_CATALOG, REGION_GRID_SIZE, getBuildingMaxHp } from '../data/regionBuildings';

function makeBuilding(
  idPrefix: string,
  idx: number,
  type: BaseBuildingType,
  col: number,
  row: number,
  level = 1
): BaseBuilding {
  const spec = BASE_BUILDING_CATALOG[type];
  const maxHp = getBuildingMaxHp(type, level);
  return {
    id: `${idPrefix}_${type}_${idx}`,
    type,
    level,
    col,
    row,
    spanCols: spec.spanCols,
    spanRows: spec.spanRows,
    hp: maxHp,
    maxHp,
    status: 'active',
  };
}

export function canPlaceOnRegionGrid(
  buildings: BaseBuilding[],
  col: number,
  row: number,
  spanCols: number,
  spanRows: number,
  ignoreId?: string
): boolean {
  if (col < 0 || row < 0 || col + spanCols > REGION_GRID_SIZE || row + spanRows > REGION_GRID_SIZE) {
    return false;
  }
  for (const b of buildings) {
    if (b.id === ignoreId || b.status === 'destroyed') continue;
    const overlapX = col < b.col + b.spanCols && col + spanCols > b.col;
    const overlapY = row < b.row + b.spanRows && row + spanRows > b.row;
    if (overlapX && overlapY) return false;
  }
  return true;
}

export function generateLamSonStarterLayout(cityId = 'lam_son'): RegionLayout {
  const buildings: BaseBuilding[] = [];
  let idx = 1;
  const add = (type: BaseBuildingType, col: number, row: number, level = 1) => {
    const spec = BASE_BUILDING_CATALOG[type];
    if (canPlaceOnRegionGrid(buildings, col, row, spec.spanCols, spec.spanRows)) {
      buildings.push(makeBuilding(cityId, idx++, type, col, row, level));
    }
  };

  // Nhà Chính 5x5 ở trung tâm (13..17, 13..17)
  add('main_hall', 13, 13, 1);

  // Khu quân sự & hậu cần quanh nhà chính
  add('barracks', 8, 13, 1);       // 3x3 (8..10, 13..15)
  add('food_storage', 19, 13, 1);  // 3x3 (19..21, 13..15)
  add('armory', 19, 17, 1);        // 3x3 (19..21, 17..19)
  add('farm', 7, 19, 1);           // 5x5 (7..11, 19..23)
  add('forge', 14, 20, 1);         // 3x3 (14..16, 20..22)
  add('house', 11, 9, 1);          // 2x2
  add('house', 15, 9, 1);          // 2x2

  // Chòi canh 2x2
  add('watchtower', 7, 7, 1);
  add('watchtower', 22, 22, 1);

  // Tường rào tre/gỗ lim (cột 5..26, hàng 5..26), chừa Cổng Thành 3x1 ở phía Bắc & Nam (14..16)
  for (let c = 5; c <= 26; c++) {
    if (c >= 14 && c <= 16) continue;
    add('wall', c, 5, 1);
    add('wall', c, 26, 1);
  }
  add('gate', 14, 5, 1);
  add('gate', 14, 26, 1);

  for (let r = 6; r <= 25; r++) {
    if (r >= 14 && r <= 16) continue;
    add('wall', 5, r, 1);
    add('wall', 26, r, 1);
  }

  return {
    cityId,
    gridSize: REGION_GRID_SIZE,
    terrainSeed: 1418,
    buildings,
  };
}

export function generateEnemyCityLayout(city: CityNode): RegionLayout {
  const buildings: BaseBuilding[] = [];
  let idx = 1;
  const troops = city.troops || 300;
  const tier = troops >= 1800 ? 3 : troops >= 900 ? 2 : 1;

  const add = (type: BaseBuildingType, col: number, row: number, level = tier) => {
    const spec = BASE_BUILDING_CATALOG[type];
    if (canPlaceOnRegionGrid(buildings, col, row, spec.spanCols, spec.spanRows)) {
      buildings.push(makeBuilding(city.id, idx++, type, col, row, Math.min(spec.maxLevel, level)));
    }
  };

  // Phủ Đường 5x5 trung tâm
  add('main_hall', 13, 13, tier);

  // Doanh trại & kho 3x3
  add('barracks', 8, 13, tier);
  add('barracks', 20, 13, tier);
  add('food_storage', 14, 8, tier);
  add('armory', 14, 20, tier);
  add('house', 9, 19, tier);
  add('house', 20, 19, tier);

  // Chòi canh cung 4 góc
  add('watchtower', 7, 7, tier);
  add('watchtower', 23, 7, tier);
  add('watchtower', 7, 23, tier);
  add('watchtower', 23, 23, tier);

  // Tường thành kiên cố bao quanh (4..27)
  const minWall = city.type === 'camp' ? 5 : 4;
  const maxWall = city.type === 'camp' ? 26 : 27;

  for (let c = minWall; c <= maxWall; c++) {
    if (c >= 14 && c <= 16) continue;
    add('wall', c, minWall, tier);
    add('wall', c, maxWall, tier);
  }
  add('gate', 14, minWall, tier);
  add('gate', 14, maxWall, tier);

  for (let r = minWall + 1; r <= maxWall - 1; r++) {
    if (r >= 14 && r <= 16) continue;
    add('wall', minWall, r, tier);
    add('wall', maxWall, r, tier);
  }

  // Bẫy chông trước cổng
  add('spike_trap', 14, maxWall + 1, tier);
  add('spike_trap', 15, maxWall + 1, tier);
  add('spike_trap', 16, maxWall + 1, tier);
  add('spike_trap', 15, minWall - 1, tier);

  const seed = city.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return {
    cityId: city.id,
    gridSize: REGION_GRID_SIZE,
    terrainSeed: seed,
    buildings,
  };
}
