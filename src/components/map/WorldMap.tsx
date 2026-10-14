import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import type { NodeType, Faction } from '../../types';

// Tọa độ hệ chuẩn Leaflet CRS.Simple tại Zoom 0:
// 8960 / 16 = 560
// 11776 / 16 = 736
// Tại Zoom 4 (Zoom gốc): 560 * 16 = 8960 px, 736 * 16 = 11776 px (100% độ phân giải gốc)
const MAP_COORD_W = 560;
const MAP_COORD_H = 736;
const TILE_SIZE = 512;

// Chuyển đổi tọa độ phần trăm % (0..100) sang Leaflet CRS.Simple [lat, lng]
const percentToLatLng = (x: number, y: number): L.LatLng => {
  const lng = (x / 100) * MAP_COORD_W;
  const lat = -((y / 100) * MAP_COORD_H);
  return L.latLng(lat, lng);
};

// Chuyển đổi từ Leaflet LatLng ngược lại %
const latLngToPercent = (latlng: L.LatLng): { x: number; y: number } => {
  const x = Math.max(0, Math.min(100, Math.round((latlng.lng / MAP_COORD_W) * 10000) / 100));
  const y = Math.max(0, Math.min(100, Math.round((-latlng.lat / MAP_COORD_H) * 10000) / 100));
  return { x, y };
};

// SVG Icon cho từng loại cứ điểm
const getIconSvg = (type: NodeType, size: number) => {
  if (type === 'city') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 20v-9H2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2Z"/><path d="M18 11V4H6v7"/><path d="M15 22v-4a3 3 0 0 0-3-3v0a3 3 0 0 0-3 3v4"/><path d="M22 11V9"/><path d="M2 11V9"/><path d="M6 4V2"/><path d="M18 4V2"/><path d="M10 4V2"/><path d="M14 4V2"/></svg>`;
  }
  if (type === 'chokepoint') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/><path d="m4.14 15.08 4.29-3.79 3.07 3.07"/></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 21 14 3"/><path d="M20.5 21 10 3"/><path d="M15.5 21 12 15l-3.5 6"/><path d="M2 21h20"/></svg>`;
};

const factionColors: Record<Faction, string> = {
  lam_son: 'bg-red-700 border-red-300 text-red-100',
  ming: 'bg-blue-800 border-blue-400 text-blue-100',
  neutral: 'bg-stone-600 border-stone-400 text-stone-200'
};

export const WorldMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const linesLayerRef = useRef<L.LayerGroup | null>(null);

  const cities = useGameStore(state => state.cities);
  const connections = useGameStore(state => state.connections);
  const updateCityPosition = useGameStore(state => state.updateCityPosition);

  const isEditMode = useUIStore(state => state.isEditMode);
  const selectedCityId = useUIStore(state => state.selectedCityId);
  const selectCity = useUIStore(state => state.selectCity);

  // 1. Khởi tạo Leaflet Map và Multi-resolution TileLayer
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const southWest = L.latLng(-MAP_COORD_H, 0);
    const northEast = L.latLng(0, MAP_COORD_W);
    const bounds = L.latLngBounds(southWest, northEast);

    // Khởi tạo bản đồ phẳng với CRS.Simple
    const map = L.map(mapContainerRef.current, {
      crs: L.CRS.Simple,
      minZoom: 0,
      maxZoom: 6,       // Cho phép zoom sâu tới mức 6 (phóng to sắc nét)
      zoomSnap: 0.1,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 100,
      maxBounds: bounds,
      maxBoundsViscosity: 1.0, // KHÓA CỨNG VIỀN: Không thể kéo trượt ra ngoài bản đồ
      attributionControl: false,
      zoomControl: false,
    });

    // TileLayer chuẩn nạp từ kim tự tháp tiles: /tiles/{z}/{x}/{y}.jpg
    // Zoom 0 -> Zoom 4 (Zoom 4 là 100% độ phân giải gốc 8960x11776)
    const tileLayer = L.tileLayer('/tiles/{z}/{x}/{y}.jpg', {
      minZoom: 0,
      maxZoom: 6,
      maxNativeZoom: 4, // Ảnh gốc đạt độ nét tối đa ở zoom 4, zoom 5 và 6 scale phần cứng siêu nét
      minNativeZoom: 0,
      tileSize: TILE_SIZE,
      noWrap: true,
      bounds: bounds,
    });

    tileLayer.addTo(map);

    // Tính toán mức Zoom tối thiểu sao cho bản đồ luôn PHỦ KÍN 100% màn hình (Cover mode)
    // Không bao giờ để lộ khoảng trống ở 2 bên trái/phải hay trên/dưới
    const calculateCoverZoom = () => {
      const size = map.getSize();
      if (!size.x || !size.y) return 0;
      const scaleX = size.x / MAP_COORD_W;
      const scaleY = size.y / MAP_COORD_H;
      const coverScale = Math.max(scaleX, scaleY);
      // log2(scale) chính là zoom level trong CRS.Simple, cộng 0.02 để triệt tiêu sai số làm tròn pixel
      return Math.log2(coverScale) + 0.02;
    };

    let isDisposed = false;

    const updateView = (isInitial = false) => {
      if (isDisposed || !mapContainerRef.current) return;
      const minCoverZoom = calculateCoverZoom();
      map.setMinZoom(minCoverZoom);

      if (isInitial) {
        // Mở game: Tập trung camera vào khu vực trung tâm chiến sự Thanh Hóa (Lam Sơn - Tây Đô)
        const initialCenter = percentToLatLng(55, 46);
        const initialZoom = Math.max(minCoverZoom, minCoverZoom + 1.0);
        map.setView(initialCenter, initialZoom);
      } else if (map.getZoom() < minCoverZoom) {
        map.setZoom(minCoverZoom);
      }
    };

    // Đợi một chút để kích thước DOM container ổn định
    const initTimer = setTimeout(() => {
      if (isDisposed) return;
      map.invalidateSize();
      updateView(true);
    }, 50);

    const handleResize = () => {
      if (isDisposed) return;
      map.invalidateSize();
      updateView(false);
    };
    window.addEventListener('resize', handleResize);

    // Khung tọa độ bao phủ 100% diện tích toàn bộ bản đồ sa bàn Việt Nam (0..100% X, 0..100% Y)
    const fullMapBounds = L.latLngBounds(
      percentToLatLng(0, 100), // South-West: [-736, 0]
      percentToLatLng(100, 0)  // North-East: [0, 560]
    );

    // 1. Lớp phủ hệ thống sông ngòi toàn quốc (Vector SVG siêu nét từ Figma)
    L.imageOverlay('/map_rivers.svg', fullMapBounds, {
      opacity: 0.95,
      interactive: false,
      zIndex: 15,
    }).addTo(map);

    // 2. Lớp phủ hệ thống biên giới, ranh giới toàn quốc (Vector SVG siêu nét từ Figma)
    L.imageOverlay('/map_borders.svg', fullMapBounds, {
      opacity: 0.9,
      interactive: false,
      zIndex: 20,
    }).addTo(map);

    // 3. Tạo các LayerGroup quản lý Marker và Đường nối
    const linesLayer = L.layerGroup().addTo(map);
    const markersLayer = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    linesLayerRef.current = linesLayer;
    markersLayerRef.current = markersLayer;

    return () => {
      isDisposed = true;
      clearTimeout(initTimer);
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const isFirstMountRef = useRef(true);

  // 1.1 Tự động lướt camera tới cứ điểm khi người chơi chọn từ danh sách Quân Thư
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    const map = mapInstanceRef.current;
    if (!selectedCityId || !map) return;
    try {
      const city = cities.find(c => c.id === selectedCityId);
      if (!city) return;
      const targetLatLng = percentToLatLng(city.x, city.y);
      const currentZoom = map.getZoom ? map.getZoom() : 2.2;
      map.flyTo(targetLatLng, Math.max(currentZoom, 2.2), {
        duration: 0.8,
        easeLinearity: 0.25,
      });
    } catch {
      // Bỏ qua nếu map chưa nạp xong view
    }
  }, [selectedCityId, cities]);

  // 2. Cập nhật các đường nối (Connections) đồng bộ trên Leaflet
  useEffect(() => {
    const linesLayer = linesLayerRef.current;
    if (!linesLayer) return;

    linesLayer.clearLayers();

    connections.forEach(conn => {
      const c1 = cities.find(c => c.id === conn.from);
      const c2 = cities.find(c => c.id === conn.to);
      if (!c1 || !c2) return;

      const p1 = percentToLatLng(c1.x, c1.y);
      const p2 = percentToLatLng(c2.x, c2.y);

      const latlngs: L.LatLng[] = [p1];
      if (conn.waypoints && conn.waypoints.length > 0) {
        conn.waypoints.forEach(wp => {
          latlngs.push(percentToLatLng(wp[0], wp[1]));
        });
      }
      latlngs.push(p2);

      const polyline = L.polyline(latlngs, {
        color: '#f59e0b',
        weight: 2,
        dashArray: '8, 8',
        opacity: 0.6,
        interactive: false,
      });

      polyline.addTo(linesLayer);
    });
  }, [cities, connections]);

  // 3. Cập nhật các Cứ điểm (Markers) & Tương tác kéo thả EditMode
  useEffect(() => {
    const markersLayer = markersLayerRef.current;
    if (!markersLayer) return;

    markersLayer.clearLayers();

    cities.forEach(city => {
      const latlng = percentToLatLng(city.x, city.y);
      const isSelected = selectedCityId === city.id;
      const isCity = city.type === 'city';
      const iconSize = isCity ? 20 : 16;
      const boxSize = isCity ? 'w-10 h-10' : 'w-8 h-8';
      const colorClass = factionColors[city.faction];

      const troopsBadge = city.troops > 0 && !isEditMode ? `
        <div class="absolute -top-3 -right-3 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded-full border border-stone-600 font-sans pointer-events-none">
          ${city.troops > 1000 ? `${(city.troops / 1000).toFixed(1)}k` : city.troops}
        </div>
      ` : '';

      const nameClass = isSelected && !isEditMode
        ? 'bg-amber-900/90 text-amber-100 ring-1 ring-amber-400'
        : 'bg-black/60 text-stone-200';

      const ringClass = isSelected && !isEditMode
        ? 'scale-125 ring-4 ring-amber-400'
        : isEditMode
        ? 'hover:scale-110 ring-2 ring-white/60'
        : 'hover:scale-110';

      const customIcon = L.divIcon({
        className: 'custom-map-node-wrapper',
        html: `
          <div class="flex flex-col items-center select-none transform -translate-x-1/2 -translate-y-1/2 ${isEditMode ? 'cursor-move' : 'cursor-pointer'}">
            <div class="relative rounded-full border-2 flex items-center justify-center shadow-lg transition-transform ${boxSize} ${colorClass} ${ringClass}">
              ${getIconSvg(city.type, iconSize)}
              ${troopsBadge}
            </div>
            <div class="mt-1 px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap drop-shadow-md pointer-events-none transition-colors ${nameClass}">
              ${city.name}
            </div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker(latlng, {
        icon: customIcon,
        draggable: isEditMode,
      });

      if (isEditMode) {
        marker.on('dragend', (e) => {
          const newPos = e.target.getLatLng();
          const { x, y } = latLngToPercent(newPos);
          updateCityPosition(city.id, x, y);
        });
      } else {
        marker.on('click', () => {
          selectCity(city.id);
        });
      }

      marker.addTo(markersLayer);
    });
  }, [cities, isEditMode, selectedCityId, selectCity, updateCityPosition]);

  return (
    <div className="absolute inset-0 z-0 bg-[#16171a] overflow-hidden">
      {/* Banner thông báo Chế độ sửa bản đồ */}
      {isEditMode && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] bg-red-900/90 text-white px-6 py-2 rounded-b-xl border-x-2 border-b-2 border-red-500 shadow-xl text-center pointer-events-none backdrop-blur-sm">
          <h3 className="font-bold">CHẾ ĐỘ TÙY CHỈNH BẢN ĐỒ (EDIT MODE) ĐANG BẬT</h3>
          <p className="text-sm">Kéo thả các Cứ điểm trực tiếp trên bản đồ.</p>
        </div>
      )}

      {/* Container của Leaflet Map - nền đen sạch, không dùng background tĩnh gây đứng hình */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full bg-[#16171a]"
      />
    </div>
  );
};
