import type { TroopType, CityNode, Connection } from '../types';
import type { TerrainType, TerrainProperties, TerrainZone, MarchCalculationResult } from '../types/terrain';
import { INITIAL_CONNECTIONS, INITIAL_CITIES } from './mapData';

// 1. ĐỊNH NGHĨA QUY TẮC CHI TIẾT TỪNG LOẠI ĐỊA HÌNH
export const TERRAIN_DEFINITIONS: Record<TerrainType, TerrainProperties> = {
  plains: {
    type: 'plains',
    name: 'Đồng Bằng / Bồn Địa',
    nameHanzi: '平原',
    description: 'Vùng đất canh tác bằng phẳng phù sa sông Mã và sông Chu. Tầm nhìn thoáng đãng, đường đi rộng rãi.',
    tacticalTip: 'Tốc độ hành quân tối đa. Kỵ binh xung phong dũng mãnh nhất (+25% công), nhưng hoàn toàn không thể ẩn nấp phục kích.',
    moveSpeedCost: 1.0,
    defenseBonus: 0,
    ambushSuccessRate: 10,
    troopModifier: {
      infantry: 1.0,
      cavalry: 1.25,
      archer: 1.0,
      elephant: 1.1,
      navy: 0.2
    },
    color: '#e5c07b',
    fillColor: 'rgba(229, 192, 123, 0.22)',
    badgeBg: 'bg-amber-900/80 text-amber-200 border-amber-600'
  },
  forest: {
    type: 'forest',
    name: 'Rừng Già Lam Sơn',
    nameHanzi: '密林',
    description: 'Rừng rậm nguyên sinh đại ngàn với tán cây cổ thụ che khuất ánh mặt trời, dây leo chằng chịt, sườn đồi thoai thoải.',
    tacticalTip: 'Giảm 45% tốc độ. Kỵ binh và xe vận lương bị cản trở nặng. Bộ binh Lam Sơn được ẩn thân, tỷ lệ phục kích cực cao (+40%).',
    moveSpeedCost: 1.8,
    defenseBonus: 30,
    ambushSuccessRate: 85,
    troopModifier: {
      infantry: 1.3,
      cavalry: 0.6,
      archer: 0.8,
      elephant: 0.5,
      navy: 0.1
    },
    color: '#4ade80',
    fillColor: 'rgba(74, 222, 128, 0.25)',
    badgeBg: 'bg-emerald-950/85 text-emerald-300 border-emerald-600'
  },
  mountain: {
    type: 'mountain',
    name: 'Núi Cao / Dãy Chí Linh',
    nameHanzi: '崇山',
    description: 'Địa hình núi đá cao vút trùng điệp, dốc đứng cheo leo. Mây mù bao phủ, khí hậu khắc nghiệt.',
    tacticalTip: 'Hành quân cực chậm (-65% tốc độ). Cấm tuyệt đối Kỵ binh và Tượng binh. Cung nỏ chiếm điểm cao bắn xuống gây sát thương chí mạng.',
    moveSpeedCost: 3.2,
    defenseBonus: 50,
    ambushSuccessRate: 70,
    troopModifier: {
      infantry: 1.1,
      cavalry: 0.2,
      archer: 1.4,
      elephant: 0.1,
      navy: 0.0
    },
    color: '#fb923c',
    fillColor: 'rgba(251, 146, 60, 0.28)',
    badgeBg: 'bg-orange-950/85 text-orange-300 border-orange-600'
  },
  cliff: {
    type: 'cliff',
    name: 'Hẻm Vực & Vách Đá Hiểm',
    nameHanzi: '絕壁',
    description: 'Vách đá vôi dựng đứng dọc bờ sông và các hẻm vực Ải Kình Lộng, Đèo Ống. Nơi một người giữ ải, vạn người khó qua.',
    tacticalTip: 'Cản đường hoàn toàn nếu không đi qua Ải / Đèo mở lối. Phòng thủ tăng vượt bậc (+60%). Địa điểm quyết chiến phục kích tiêu diệt tướng địch.',
    moveSpeedCost: 4.5,
    defenseBonus: 60,
    ambushSuccessRate: 90,
    troopModifier: {
      infantry: 1.2,
      cavalry: 0.1,
      archer: 1.5,
      elephant: 0.0,
      navy: 0.0
    },
    color: '#f87171',
    fillColor: 'rgba(248, 113, 113, 0.32)',
    badgeBg: 'bg-red-950/85 text-red-300 border-red-600'
  },
  swamp: {
    type: 'swamp',
    name: 'Đầm Lầy & Bãi Lau Sậy',
    nameHanzi: '沼澤',
    description: 'Vùng trũng ngập nước, bùn lầy sâu ven cửa biển Nga Sơn, Thần Phù và bãi bồi cửa sông. Lau sậy mọc rậm rạp.',
    tacticalTip: 'Tốc độ giảm 60%. Kỵ binh và tượng binh bị sa lầy (-50% sức công). Dễ nhiễm lam sơn chướng khí, hao hụt lương thảo và sĩ khí.',
    moveSpeedCost: 2.6,
    defenseBonus: 15,
    ambushSuccessRate: 65,
    troopModifier: {
      infantry: 0.9,
      cavalry: 0.4,
      archer: 1.0,
      elephant: 0.3,
      navy: 0.8
    },
    color: '#38bdf8',
    fillColor: 'rgba(56, 189, 248, 0.25)',
    badgeBg: 'bg-cyan-950/85 text-cyan-300 border-cyan-600'
  },
  water: {
    type: 'water',
    name: 'Sông Mã & Thủy Đạo',
    nameHanzi: '江河',
    description: 'Dòng nước chảy xiết của Sông Mã, Sông Chu và các phụ lưu. Giao thông huyết mạch đường thủy nối ra Biển Đông.',
    tacticalTip: 'Lục quân không thể vượt qua nếu không tại Bến Đò hoặc bắc cầu phao. Thủy quân làm chủ dòng nước (+40% hỏa lực thuyền chiến).',
    moveSpeedCost: 1.5,
    defenseBonus: 10,
    ambushSuccessRate: 40,
    troopModifier: {
      infantry: 0.3,
      cavalry: 0.1,
      archer: 0.9,
      elephant: 0.1,
      navy: 1.5
    },
    color: '#60a5fa',
    fillColor: 'rgba(96, 165, 250, 0.3)',
    badgeBg: 'bg-blue-950/85 text-blue-300 border-blue-600'
  }
};

// 2. PHÂN VÙNG ĐỊA HÌNH THỰC TẾ CHI TIẾT KHU VỰC CHIẾN SỰ THANH HÓA
export const THANH_HOA_TERRAIN_ZONES: TerrainZone[] = [
  // 1. Núi Chí Linh & Dãy Pù Rinh
  {
    id: 'chi_linh_mountains',
    name: 'Dãy Núi Chí Linh & Pù Rinh',
    type: 'mountain',
    description: 'Dãy núi hiểm trở bậc nhất phía Tây Nam Thanh Hóa, nơi Lê Lợi và nghĩa quân nhiều lần tuyệt lương cầm cự kháng Minh.',
    polygon: [
      [50.5, 45.2],
      [53.8, 45.0],
      [54.2, 47.4],
      [51.8, 48.0],
      [49.8, 46.8]
    ]
  },
  // 2. Rừng Căn Cứ Lam Sơn
  {
    id: 'lam_son_forest',
    name: 'Đại Ngàn Rừng Già Lam Sơn',
    type: 'forest',
    description: 'Vùng rừng rậm khởi phát đại nghiệp nghĩa quân Lam Sơn, bao bọc căn cứ Lam Sơn, Mường Một, Nga Lạc và Bồ Mộng.',
    polygon: [
      [54.2, 47.0],
      [57.0, 47.0],
      [57.2, 50.2],
      [54.5, 50.5],
      [53.8, 48.8]
    ]
  },
  // 3. Vách Đá Ải Kình Lộng & Đèo Ống
  {
    id: 'kinh_long_cliffs',
    name: 'Hẻm Vực Ải Kình Lộng - Đèo Ống',
    type: 'cliff',
    description: 'Vách đá vôi cao ngút ngàn kẹp hai bên hẻm núi hiểm trở. Nơi diễn ra các trận tập kích sinh tử giữa ta và giặc Minh.',
    polygon: [
      [51.8, 42.4],
      [55.2, 42.2],
      [55.4, 44.2],
      [52.0, 44.4]
    ]
  },
  // 4. Cao Nguyên Thượng Đạo Mường Thôi
  {
    id: 'muong_thoi_highlands',
    name: 'Vùng Thượng Đạo Mường Thôi',
    type: 'mountain',
    description: 'Vùng núi cao biên viễn hiểm trở phía Tây Bắc Thanh Hóa, địa bàn người Thái và Mường quy thuận nghĩa quân.',
    polygon: [
      [39.5, 40.5],
      [44.5, 40.0],
      [45.0, 43.5],
      [40.0, 44.0]
    ]
  },
  // 5. Bồn Địa Thành Tây Đô
  {
    id: 'tay_do_basin',
    name: 'Bồn Địa & Đồng Bằng Tây Đô',
    type: 'plains',
    description: 'Lưu vực sông Mã màu mỡ trung tâm kinh tế - quân sự của Thanh Hóa. Tọa lạc tòa thành đá kiên cố Thành Nhà Hồ.',
    polygon: [
      [57.0, 45.8],
      [61.5, 45.5],
      [62.0, 48.8],
      [57.2, 48.5]
    ]
  },
  // 6. Đầm Lầy Nga Sơn & Hạ Lưu
  {
    id: 'nga_son_swamps',
    name: 'Vùng Đầm Lầy & Bãi Lau Sậy Nga Sơn',
    type: 'swamp',
    description: 'Vùng trũng ngập mặn lau sậy rậm rạp giáp cửa biển Thần Phù và Tam Điệp. Kỵ binh sa lầy, chỉ thuyền nhỏ luồn lách được.',
    polygon: [
      [61.5, 44.2],
      [66.5, 45.0],
      [66.0, 49.5],
      [62.2, 48.8]
    ]
  },
  // 7. Thủy Đạo Sông Mã - Bến Lỗi Giang
  {
    id: 'song_ma_loi_giang',
    name: 'Lưu Vực Sông Mã & Bến Lỗi Giang',
    type: 'water',
    description: 'Thủy lộ chiến lược Sông Mã. Điểm huyết mạch vượt sông tại bến Lỗi Giang nối từ miền Tây về đồng bằng.',
    polygon: [
      [55.5, 43.8],
      [58.2, 43.6],
      [58.5, 45.5],
      [55.8, 45.5]
    ]
  }
];

// Helper: Kiểm tra điểm (x, y) nằm trong đa giác (Ray-casting Algorithm)
function pointInPolygon(x: number, y: number, vs: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// 3. HÀM TRA CỨU ĐỊA HÌNH TẠI TỌA ĐỘ BẤT KỲ TRÊN BẢN ĐỒ
export function getTerrainAt(x: number, y: number): TerrainProperties {
  // Quét qua các vùng địa hình đặc thù
  for (const zone of THANH_HOA_TERRAIN_ZONES) {
    if (pointInPolygon(x, y, zone.polygon)) {
      return TERRAIN_DEFINITIONS[zone.type];
    }
  }

  // Mặc định dựa trên tọa độ địa lý tổng quát vùng Thanh Hóa:
  // - Phía Tây (x < 53): Phần lớn là núi cao
  // - Vùng giữa (53 <= x <= 57): Rừng già và đồi núi
  // - Phía Đông (x > 57): Đồng bằng và đầm lầy ven biển
  if (x < 53) {
    return TERRAIN_DEFINITIONS.mountain;
  } else if (x <= 57.5) {
    return TERRAIN_DEFINITIONS.forest;
  } else if (x > 62.5) {
    return TERRAIN_DEFINITIONS.swamp;
  }
  return TERRAIN_DEFINITIONS.plains;
}

// 4. HÀM TÌM ĐƯỜNG HÀNH QUÂN THEO MẠNG LƯỚI QUÂN LỘ (BREADTH-FIRST SEARCH PATHFINDING)
export function findMarchPath(
  fromCityId: string,
  toCityId: string,
  cities: CityNode[] = INITIAL_CITIES,
  connections: Connection[] = INITIAL_CONNECTIONS
): [number, number][] {
  const cityMap = new Map<string, CityNode>();
  cities.forEach(c => cityMap.set(c.id, c));

  const fromCity = cityMap.get(fromCityId);
  const toCity = cityMap.get(toCityId);
  if (!fromCity || !toCity) return [];
  if (fromCityId === toCityId) return [[fromCity.x, fromCity.y]];

  // Xây dựng danh sách kề hai chiều
  const adj = new Map<string, { neighbor: string; waypoints?: [number, number][]; isReversed: boolean }[]>();
  for (const c of cities) {
    adj.set(c.id, []);
  }

  for (const conn of connections) {
    if (adj.has(conn.from) && adj.has(conn.to)) {
      adj.get(conn.from)!.push({ neighbor: conn.to, waypoints: conn.waypoints, isReversed: false });
      adj.get(conn.to)!.push({ neighbor: conn.from, waypoints: conn.waypoints, isReversed: true });
    }
  }

  // BFS tìm đường ngắn nhất theo số chặng
  const queue: string[] = [fromCityId];
  const visited = new Set<string>([fromCityId]);
  const parent = new Map<string, { prev: string; waypoints?: [number, number][]; isReversed: boolean }>();

  let found = false;
  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === toCityId) {
      found = true;
      break;
    }
    const neighbors = adj.get(curr) || [];
    for (const edge of neighbors) {
      if (!visited.has(edge.neighbor)) {
        visited.add(edge.neighbor);
        parent.set(edge.neighbor, { prev: curr, waypoints: edge.waypoints, isReversed: edge.isReversed });
        queue.push(edge.neighbor);
      }
    }
  }

  if (!found) {
    // Không tìm thấy đường qua mạng lưới quân lộ -> Tuyến đường dã ngoại thẳng
    return [
      [fromCity.x, fromCity.y],
      [toCity.x, toCity.y]
    ];
  }

  // Truy vết ngược đường đi
  const pathNodes: { id: string; waypoints?: [number, number][]; isReversed: boolean }[] = [];
  let curr = toCityId;
  while (curr !== fromCityId) {
    const p = parent.get(curr)!;
    pathNodes.push({ id: curr, waypoints: p.waypoints, isReversed: p.isReversed });
    curr = p.prev;
  }
  pathNodes.reverse();

  // Ghép toàn bộ tọa độ (bao gồm các trạm trung gian và waypoints)
  const fullPoints: [number, number][] = [[fromCity.x, fromCity.y]];
  for (const step of pathNodes) {
    if (step.waypoints && step.waypoints.length > 0) {
      const wps = step.isReversed ? [...step.waypoints].reverse() : step.waypoints;
      for (const wp of wps) {
        fullPoints.push([wp[0], wp[1]]);
      }
    }
    const node = cityMap.get(step.id);
    if (node) {
      fullPoints.push([node.x, node.y]);
    }
  }

  return fullPoints;
}

// 5. HÀM TÍNH TOÁN HÀNH QUÂN (PATHFINDING & TACTICAL MARCH CALCULATION)
export function calculateMarchRoute(
  fromCity: CityNode,
  toCity: CityNode,
  primaryTroop: TroopType = 'infantry',
  cities: CityNode[] = INITIAL_CITIES,
  connections: Connection[] = INITIAL_CONNECTIONS
): MarchCalculationResult {
  const pathPoints = findMarchPath(fromCity.id, toCity.id, cities, connections);

  // Tính tổng khoảng cách thực tế dọc tuyến đường
  let totalRawDistKm = 0;
  for (let i = 0; i < pathPoints.length - 1; i++) {
    const p1 = pathPoints[i];
    const p2 = pathPoints[i + 1];
    totalRawDistKm += Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * 4.2;
  }
  if (totalRawDistKm === 0) {
    totalRawDistKm = Math.hypot(toCity.x - fromCity.x, toCity.y - fromCity.y) * 4.2;
  }

  // Lấy mẫu địa hình dọc theo toàn bộ các đoạn của tuyến đường
  const terrainCounts: Record<TerrainType, number> = {
    plains: 0,
    forest: 0,
    mountain: 0,
    cliff: 0,
    swamp: 0,
    water: 0
  };

  let totalSpeedCost = 0;
  let totalSamples = 0;
  const hazards: string[] = [];

  for (let i = 0; i < pathPoints.length - 1; i++) {
    const p1 = pathPoints[i];
    const p2 = pathPoints[i + 1];
    const segSamples = 4; // Lấy 4 điểm mẫu trên mỗi chặng
    for (let s = 0; s < segSamples; s++) {
      const t = (s + 0.5) / segSamples;
      const sx = p1[0] + (p2[0] - p1[0]) * t;
      const sy = p1[1] + (p2[1] - p1[1]) * t;
      const terrain = getTerrainAt(sx, sy);
      terrainCounts[terrain.type] += 1;
      totalSpeedCost += terrain.moveSpeedCost;
      totalSamples += 1;

      if (terrain.type === 'cliff' && !hazards.includes('Vách đá hiểm trở chặn đường, nguy cơ sa bẫy')) {
        hazards.push('Vách đá hiểm trở chặn đường, nguy cơ sa bẫy');
      }
      if (terrain.type === 'swamp' && !hazards.includes('Đầm lầy ngập mặn gây sa lầy Kỵ binh và Tượng binh')) {
        hazards.push('Đầm lầy ngập mặn gây sa lầy Kỵ binh và Tượng binh');
      }
      if (terrain.type === 'forest' && !hazards.includes('Rừng già rậm rạp, thám mã khó quan sát địch từ xa')) {
        hazards.push('Rừng già rậm rạp, thám mã khó quan sát địch từ xa');
      }
    }
  }

  if (totalSamples === 0) totalSamples = 1;

  // Tỷ lệ % địa hình
  const terrainBreakdown: Record<TerrainType, number> = {
    plains: Math.round((terrainCounts.plains / totalSamples) * 100),
    forest: Math.round((terrainCounts.forest / totalSamples) * 100),
    mountain: Math.round((terrainCounts.mountain / totalSamples) * 100),
    cliff: Math.round((terrainCounts.cliff / totalSamples) * 100),
    swamp: Math.round((terrainCounts.swamp / totalSamples) * 100),
    water: Math.round((terrainCounts.water / totalSamples) * 100)
  };

  // Hệ số địa hình bình quân
  const avgTerrainFactor = totalSpeedCost / totalSamples;

  // Hệ số binh chủng theo địa hình nổi trội nhất
  let dominantTerrain: TerrainType = 'plains';
  let maxCount = -1;
  (Object.keys(terrainCounts) as TerrainType[]).forEach(k => {
    if (terrainCounts[k] > maxCount) {
      maxCount = terrainCounts[k];
      dominantTerrain = k;
    }
  });

  const troopFactor = TERRAIN_DEFINITIONS[dominantTerrain].troopModifier[primaryTroop] || 1.0;

  // Tốc độ cơ bản: Bộ binh ~ 20km/ngày, Kỵ binh ~ 32km/ngày, v.v.
  const baseSpeedKmPerDay = primaryTroop === 'cavalry' ? 32 : primaryTroop === 'navy' ? 28 : 20;

  // Thời gian hành quân thực tế
  const effectiveSpeed = (baseSpeedKmPerDay * troopFactor) / Math.max(0.5, avgTerrainFactor);
  const totalDays = Math.max(0.5, Math.round((totalRawDistKm / effectiveSpeed) * 10) / 10);

  // Đánh giá chiến thuật
  let tacticalAdvantage = '';
  if (terrainBreakdown.forest > 40) {
    tacticalAdvantage = 'Tuyến hành quân ẩn kín trong rừng già Lam Sơn, thích hợp tập kích bất ngờ.';
  } else if (terrainBreakdown.plains > 50) {
    tacticalAdvantage = 'Đường quang đãng tiến quân nhanh chóng, Kỵ binh phát huy uy lực lớn.';
  } else if (terrainBreakdown.cliff > 15 || terrainBreakdown.mountain > 35) {
    tacticalAdvantage = 'Địa hình hiểm trở có lợi cho phục kích đoạn hậu hoặc chặn viện binh giặc.';
  } else {
    tacticalAdvantage = 'Địa hình hỗn hợp, cần phân công đội hình tiền phong và thám mã cảnh giới.';
  }

  return {
    fromCityId: fromCity.id,
    toCityId: toCity.id,
    fromCityName: fromCity.name,
    toCityName: toCity.name,
    totalDistanceKm: Math.round(totalRawDistKm * 10) / 10,
    totalDays,
    primaryTroop,
    terrainBreakdown,
    segments: [],
    hazards,
    tacticalAdvantage,
    pathPoints
  };
}
