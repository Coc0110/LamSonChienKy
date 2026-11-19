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

  // Đại Bản Doanh ở trung tâm (10..13, 10..13)
  add('main_hall', 10, 10, 1);

  // Khu quân sự & hậu cần quanh bản doanh
  add('barracks', 6, 10, 1);
  add('food_storage', 14, 10, 1);
  add('armory', 14, 13, 1);
  add('farm', 6, 14, 1);
  add('forge', 10, 14, 1);
  add('house', 10, 7, 1);
  add('house', 13, 7, 1);

  // Chòi canh 2 góc
  add('watchtower', 6, 6, 1);
  add('watchtower', 16, 16, 1);

  // Lũy tre bao quanh vòng trong (cột 5..18, hàng 5..18), chừa cổng ở phía Nam & Đông
  for (let c = 5; c <= 18; c++) {
    if (c === 11 || c === 12) continue;
    add('wall', c, 5, 1);
    if (c === 11) {
      add('gate', 11, 18, 1);
    } else if (c !== 12) {
      add('wall', c, 18, 1);
    }
  }
  add('gate', 11, 5, 1);

  for (let r = 6; r <= 17; r++) {
    if (r === 11 || r === 12) continue;
    add('wall', 5, r, 1);
    add('wall', 18, r, 1);
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

  // Phủ Đường / Thành chính
  add('main_hall', 10, 10, tier);

  // Doanh trại & kho quân nhu
  add('barracks', 6, 10, tier);
  add('barracks', 14, 10, tier);
  add('food_storage', 10, 6, tier);
  add('armory', 10, 14, tier);
  add('house', 6, 14, tier);
  add('house', 14, 14, tier);

  // Chòi canh cung 4 góc
  add('watchtower', 6, 6, tier);
  add('watchtower', 16, 6, tier);
  add('watchtower', 6, 16, tier);
  add('watchtower', 16, 16, tier);

  // Tường thành kiên cố bao quanh (4..19)
  const minWall = city.type === 'camp' ? 5 : 4;
  const maxWall = city.type === 'camp' ? 18 : 19;

  for (let c = minWall; c <= maxWall; c++) {
    if (c === 11 || c === 12) continue;
    add('wall', c, minWall, tier);
    add('wall', c, maxWall, tier);
  }
  add('gate', 11, minWall, tier);
  add('gate', 11, maxWall, tier);

  for (let r = minWall + 1; r <= maxWall - 1; r++) {
    if (r === 11 || r === 12) continue;
    add('wall', minWall, r, tier);
    add('wall', maxWall, r, tier);
  }

  // Bẫy chông trước cổng
  add('spike_trap', 11, maxWall + 1, tier);
  add('spike_trap', 12, maxWall + 1, tier);
  add('spike_trap', 11, minWall - 1, tier);

  const seed = city.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return {
    cityId: city.id,
    gridSize: REGION_GRID_SIZE,
    terrainSeed: seed,
    buildings,
  };
}
