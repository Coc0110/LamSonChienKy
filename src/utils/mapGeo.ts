import L from 'leaflet';

// Tọa độ hệ chuẩn Leaflet CRS.Simple tại Zoom 0:
export const MAP_COORD_W = 560;
export const MAP_COORD_H = 736;
export const TILE_SIZE = 512;

// Chuyển đổi tọa độ phần trăm % (0..100) sang Leaflet CRS.Simple [lat, lng]
export const percentToLatLng = (x: number, y: number): L.LatLng => {
  const lng = (x / 100) * MAP_COORD_W;
  const lat = -((y / 100) * MAP_COORD_H);
  return L.latLng(lat, lng);
};

// Chuyển đổi từ Leaflet LatLng ngược lại %
export const latLngToPercent = (latlng: L.LatLng): { x: number; y: number } => {
  const x = Math.max(0, Math.min(100, Math.round(((latlng.lng / MAP_COORD_W) * 100) * 1000) / 1000));
  const y = Math.max(0, Math.min(100, Math.round(((-latlng.lat / MAP_COORD_H) * 100) * 1000) / 1000));
  return { x, y };
};

// Thuật toán Ray-Casting kiểm tra điểm (x, y) có nằm trong đa giác hay không
export const pointInPolygon = (x: number, y: number, vs: [number, number][]): boolean => {
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

// Tra cứu huyện chứa tọa độ (x, y)
export const findDistrictForCoord = <T extends { id: string; name: string; center: [number, number]; polygon: [number, number][] }>(
  x: number,
  y: number,
  districts: T[]
): T | null => {
  for (const d of districts) {
    if (pointInPolygon(x, y, d.polygon)) {
      return d;
    }
  }
  // Nếu nằm ngoài ranh giới đa giác (sát viền), lấy huyện có tâm gần nhất
  let closest: T | null = null;
  let minDist = Infinity;
  for (const d of districts) {
    const dist = Math.hypot(d.center[0] - x, d.center[1] - y);
    if (dist < minDist) {
      minDist = dist;
      closest = d;
    }
  }
  return closest;
};
