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
  const x = Math.max(0, Math.min(100, Math.round((latlng.lng / MAP_COORD_W) * 1000) / 1000));
  const y = Math.max(0, Math.min(100, Math.round((-latlng.lat / MAP_COORD_H) * 1000) / 1000));
  return { x, y };
};
