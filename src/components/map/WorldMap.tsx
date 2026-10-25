import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import type { Faction } from '../../types';
import districtData from '../../data/districtPolygons.json';

// Tọa độ hệ chuẩn Leaflet CRS.Simple tại Zoom 0:
const MAP_COORD_W = 560;
const MAP_COORD_H = 736;
const TILE_SIZE = 512;

const DISTRICT_STORAGE_KEY = 'lam_son_district_polygons_custom_v1';

// Chuyển đổi tọa độ phần trăm % (0..100) sang Leaflet CRS.Simple [lat, lng]
const percentToLatLng = (x: number, y: number): L.LatLng => {
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

type ParchmentMode = 'cutout' | 'sheet' | 'off';

interface DistrictInfo {
  id: string;
  name: string;
  chau: string;
  faction: Faction;
  type: string;
  troops: number;
  center: [number, number];
  polygon: [number, number][];
}

export const WorldMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const linesLayerRef = useRef<L.LayerGroup | null>(null);
  const labelsLayerRef = useRef<L.LayerGroup | null>(null);
  const vertexHandlesLayerRef = useRef<L.LayerGroup | null>(null);
  const parchmentCutoutRef = useRef<L.ImageOverlay | null>(null);
  const parchmentSheetRef = useRef<L.ImageOverlay | null>(null);

  const [parchmentMode, setParchmentMode] = useState<ParchmentMode>('cutout');
  const [showDistricts, setShowDistricts] = useState<boolean>(true);
  const [hoveredDistrictId, setHoveredDistrictId] = useState<string | null>(null);

  // Danh sách polygon các huyện (hỗ trợ lưu chỉnh sửa vào localStorage)
  const [districtsList, setDistrictsList] = useState<DistrictInfo[]>(() => {
    try {
      const saved = localStorage.getItem(DISTRICT_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return (districtData as any).districts || [];
  });

  const cities = useGameStore(state => state.cities);
  const connections = useGameStore(state => state.connections);

  const isEditMode = useUIStore(state => state.isEditMode);
  const toggleEditMode = useUIStore(state => state.toggleEditMode);
  const selectedCityId = useUIStore(state => state.selectedCityId);
  const selectCity = useUIStore(state => state.selectCity);

  // 1. Khởi tạo Leaflet Map và Multi-resolution TileLayer
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const southWest = L.latLng(-MAP_COORD_H, 0);
    const northEast = L.latLng(0, MAP_COORD_W);
    const bounds = L.latLngBounds(southWest, northEast);

    const map = L.map(mapContainerRef.current, {
      crs: L.CRS.Simple,
      minZoom: 0,
      maxZoom: 6,
      zoomSnap: 0.1,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 100,
      maxBounds: bounds,
      maxBoundsViscosity: 1.0,
      attributionControl: false,
      zoomControl: false,
    });

    const tileLayer = L.tileLayer('/tiles/{z}/{x}/{y}.jpg', {
      minZoom: 0,
      maxZoom: 6,
      maxNativeZoom: 4,
      minNativeZoom: 0,
      tileSize: TILE_SIZE,
      noWrap: true,
      bounds: bounds,
    });

    tileLayer.addTo(map);

    // Pane riêng cho vector ranh giới huyện thành (zIndex: 450) để luôn nổi trên nền tranh vẽ sa bàn
    map.createPane('districtsPane');
    const dPane = map.getPane('districtsPane');
    if (dPane) {
      dPane.style.zIndex = '450';
    }

    const calculateCoverZoom = () => {
      const size = map.getSize();
      if (!size.x || !size.y) return 0;
      const scaleX = size.x / MAP_COORD_W;
      const scaleY = size.y / MAP_COORD_H;
      const coverScale = Math.max(scaleX, scaleY);
      return Math.log2(coverScale) + 0.02;
    };

    let isDisposed = false;

    const updateView = (isInitial = false) => {
      if (isDisposed || !mapContainerRef.current) return;
      const minCoverZoom = calculateCoverZoom();
      map.setMinZoom(minCoverZoom);

      if (isInitial) {
        const initialCenter = percentToLatLng(54.5, 47.5);
        const initialZoom = Math.max(minCoverZoom, minCoverZoom + 1.15);
        map.setView(initialCenter, initialZoom);
      } else if (map.getZoom() < minCoverZoom) {
        map.setZoom(minCoverZoom);
      }
    };

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

    const fullMapBounds = L.latLngBounds(
      percentToLatLng(0, 100),
      percentToLatLng(100, 0)
    );

    // 1. Sông ngòi toàn quốc
    L.imageOverlay('/map_rivers.svg', fullMapBounds, {
      opacity: 0.95,
      interactive: false,
      zIndex: 15,
    }).addTo(map);

    // 2. Biên giới toàn quốc
    L.imageOverlay('/map_borders.svg', fullMapBounds, {
      opacity: 0.9,
      interactive: false,
      zIndex: 20,
    }).addTo(map);

    // 2.5 Bản đồ Sa bàn Giấy Da Cừu Thanh Hóa
    const thanhHoaBounds = L.latLngBounds(
      percentToLatLng(36.0, 59.0),
      percentToLatLng(70.0, 38.0)
    );

    // Lớp Bản đồ Sa bàn Giấy Da Cừu Thanh Hóa (Đặt trong overlayPane với zIndex 25, hiển thị chuẩn trên vệ tinh và dưới nét ranh giới)
    const cutoutOverlay = L.imageOverlay('/thanh_hoa_parchment.png', thanhHoaBounds, {
      opacity: parchmentMode === 'cutout' ? 1.0 : 0,
      interactive: false,
      zIndex: 25,
    }).addTo(map);

    const sheetOverlay = L.imageOverlay('/thanh_hoa_parchment_full.jpg', thanhHoaBounds, {
      opacity: parchmentMode === 'sheet' ? 1.0 : 0,
      interactive: false,
      zIndex: 24,
    }).addTo(map);

    parchmentCutoutRef.current = cutoutOverlay;
    parchmentSheetRef.current = sheetOverlay;

    // LayerGroups
    const linesLayer = L.layerGroup().addTo(map);
    const labelsLayer = L.layerGroup().addTo(map);
    const vertexHandlesLayer = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    linesLayerRef.current = linesLayer;
    labelsLayerRef.current = labelsLayer;
    vertexHandlesLayerRef.current = vertexHandlesLayer;

    return () => {
      isDisposed = true;
      clearTimeout(initTimer);
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Cập nhật chế độ hiển thị lớp Sa bàn Giấy Da Cừu
  useEffect(() => {
    const cutout = parchmentCutoutRef.current;
    const sheet = parchmentSheetRef.current;
    if (!cutout || !sheet) return;

    if (parchmentMode === 'cutout') {
      cutout.setOpacity(1.0);
      sheet.setOpacity(0);
    } else if (parchmentMode === 'sheet') {
      cutout.setOpacity(0);
      sheet.setOpacity(1.0);
    } else {
      cutout.setOpacity(0);
      sheet.setOpacity(0);
    }
  }, [parchmentMode]);

  const isFirstMountRef = useRef(true);

  // 1.1 Lướt camera tới cứ điểm khi chọn từ danh sách Quân Thư
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
      map.panTo(targetLatLng, {
        animate: true,
        duration: 0.6,
        easeLinearity: 0.25,
      });
    } catch {
      // ignore
    }
  }, [selectedCityId, cities]);

  // 2. Cập nhật các đường nối hành quân
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

      const isConnectedToSelected = selectedCityId === conn.from || selectedCityId === conn.to;

      const polyline = L.polyline(latlngs, {
        color: isConnectedToSelected ? '#f59e0b' : '#a87c4f',
        weight: isConnectedToSelected ? 2.5 : 1.5,
        dashArray: isConnectedToSelected ? '6, 6' : '4, 4',
        opacity: isConnectedToSelected ? 0.85 : 0.45,
        interactive: false,
      });

      polyline.addTo(linesLayer);
    });
  }, [cities, connections, selectedCityId]);

  // 3. QUẢN LÝ CÁC ĐỐI TƯỢNG POLYGON HUYỆN THÀNH
  const polygonsMapRef = useRef<Map<string, L.Polygon>>(new Map());

  // Cập nhật tọa độ polygon cho huyện
  const updateDistrictPolygonVertex = (districtId: string, vertexIndex: number, newX: number, newY: number) => {
    setDistrictsList(prev => {
      const next = prev.map(d => {
        if (d.id !== districtId) return d;
        const newPoly = [...d.polygon];
        newPoly[vertexIndex] = [newX, newY];
        // Nếu là điểm đầu/cuối của vòng khép kín
        if (vertexIndex === 0) newPoly[newPoly.length - 1] = [newX, newY];
        if (vertexIndex === newPoly.length - 1) newPoly[0] = [newX, newY];
        return { ...d, polygon: newPoly };
      });
      try {
        localStorage.setItem(DISTRICT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Xóa các polygon cũ
    polygonsMapRef.current.forEach(p => p.remove());
    polygonsMapRef.current.clear();

    districtsList.forEach(district => {
      const latlngs = district.polygon.map(pt => percentToLatLng(pt[0], pt[1]));
      const poly = L.polygon(latlngs, {
        fill: true,
        fillColor: '#ffffff',
        fillOpacity: 0.0001, // 100% không phủ màu để lộ trọn vẹn nét vẽ sa bàn
        color: '#4a2810',
        weight: 1.1,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
        smoothFactor: 1.0,
        pane: 'districtsPane',
        interactive: true,
      });

      poly.on('mouseover', () => {
        setHoveredDistrictId(district.id);
      });

      poly.on('mouseout', () => {
        setHoveredDistrictId(prev => (prev === district.id ? null : prev));
      });

      poly.on('click', () => {
        selectCity(district.id);
      });

      poly.addTo(map);
      polygonsMapRef.current.set(district.id, poly);
    });

    return () => {
      polygonsMapRef.current.forEach(p => p.remove());
      polygonsMapRef.current.clear();
    };
  }, [districtsList, selectCity]);

  // Cập nhật Style highlight trực tiếp (0ms latency, không redraw)
  useEffect(() => {
    polygonsMapRef.current.forEach((poly, did) => {
      const isSelected = selectedCityId === did;
      const isHovered = hoveredDistrictId === did;

      if (!showDistricts || parchmentMode === 'off') {
        poly.setStyle({ opacity: 0, fillOpacity: 0 });
        return;
      }

      if (isSelected) {
        // Nổi bật nét mực Chu Sa cổ (TUYỆT ĐỐI KHÔNG FILL MÀU)
        poly.setStyle({
          color: '#991b1b',
          weight: 2.8,
          opacity: 1.0,
          fillOpacity: 0.0001,
        });
      } else if (isHovered) {
        // Rê chuột: nét hổ phách ấm (TUYỆT ĐỐI KHÔNG FILL MÀU)
        poly.setStyle({
          color: '#c2410c',
          weight: 2.0,
          opacity: 1.0,
          fillOpacity: 0.0001,
        });
      } else {
        // Bình thường: nét mực sepia mỏng
        poly.setStyle({
          color: '#4a2810',
          weight: 1.1,
          opacity: 0.85,
          fillOpacity: 0.0001,
        });
      }
    });
  }, [selectedCityId, hoveredDistrictId, showDistricts, parchmentMode]);

  // 4. CHẾ ĐỘ CHỈNH SỬA RANH GIỚI BẰNG TAY (Edit Mode)
  // Khi bật SỬA MAP, các điểm mốc (Vertex Handles) của huyện đang chọn sẽ hiện ra cho phép kéo thả trực tiếp
  useEffect(() => {
    const handlesLayer = vertexHandlesLayerRef.current;
    if (!handlesLayer) return;

    handlesLayer.clearLayers();

    if (!isEditMode || !selectedCityId) return;

    const currentDistrict = districtsList.find(d => d.id === selectedCityId);
    if (!currentDistrict) return;

    currentDistrict.polygon.forEach((pt, idx) => {
      // Bỏ qua điểm cuối nếu trùng điểm đầu
      if (idx === currentDistrict.polygon.length - 1 && idx > 0) return;

      const latlng = percentToLatLng(pt[0], pt[1]);

      const handleIcon = L.divIcon({
        className: 'district-vertex-handle-marker',
        html: '<div style="width: 14px; height: 14px; background: #fbbf24; border: 2.5px solid #991b1b; border-radius: 50%; box-shadow: 0 0 6px rgba(0,0,0,0.9); cursor: crosshair; touch-action: none;"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const handleMarker = L.marker(latlng, {
        icon: handleIcon,
        draggable: true,
      });

      handleMarker.on('drag', (e) => {
        const newPos = e.target.getLatLng();
        // Cập nhật polygon hiển thị ngay lập tức khi kéo
        const poly = polygonsMapRef.current.get(currentDistrict.id);
        if (poly) {
          const currentLatLngs = poly.getLatLngs()[0] as L.LatLng[];
          if (currentLatLngs && currentLatLngs[idx]) {
            currentLatLngs[idx] = newPos;
            if (idx === 0) currentLatLngs[currentLatLngs.length - 1] = newPos;
            poly.setLatLngs([currentLatLngs]);
          }
        }
      });

      handleMarker.on('dragend', (e) => {
        const newPos = e.target.getLatLng();
        const { x, y } = latLngToPercent(newPos);
        updateDistrictPolygonVertex(currentDistrict.id, idx, x, y);
      });

      handleMarker.addTo(handlesLayer);
    });
  }, [isEditMode, selectedCityId, districtsList]);

  // 5. HIỂN THỊ CHỮ THẺ BÀI NỔI KHI RÊ CHUỘT HOẶC CHỌN HUYỆN
  useEffect(() => {
    const labelsLayer = labelsLayerRef.current;
    if (!labelsLayer) return;

    labelsLayer.clearLayers();

    if (!showDistricts || parchmentMode === 'off') return;

    districtsList.forEach(district => {
      const isSelected = selectedCityId === district.id;
      const isHovered = hoveredDistrictId === district.id;

      if (isSelected || isHovered) {
        const liveCity = cities.find(c => c.id === district.id);
        const faction: Faction = liveCity ? liveCity.faction : district.faction;
        const troops = liveCity ? liveCity.troops : district.troops;

        const centerLatLng = percentToLatLng(district.center[0], district.center[1]);

        const badgeBorder = isSelected
          ? 'border-amber-400 ring-2 ring-amber-500/80'
          : 'border-[#a87c4f]/80';

        const factionColor = faction === 'lam_son'
          ? 'text-red-400'
          : faction === 'ming'
          ? 'text-blue-300'
          : 'text-amber-200';

        const troopsBadge = troops > 0 ? `
          <span class="ml-1.5 px-1.5 py-0.5 bg-black/60 text-[10px] rounded font-mono text-amber-300 border border-amber-600/40">
            ${troops > 1000 ? `${(troops / 1000).toFixed(1)}k` : troops}
          </span>
        ` : '';

        const labelHtml = `
          <div class="pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-150 ${isSelected ? 'scale-115 -translate-y-2' : ''}">
            <div class="px-3 py-1 rounded-md bg-[#1e130a]/92 border ${badgeBorder} shadow-2xl backdrop-blur-sm flex items-center whitespace-nowrap font-serif font-bold text-xs tracking-wide text-[#f5ebd9]"
                 style="box-shadow: 0 4px 16px rgba(0,0,0,0.65);">
              <span class="${factionColor}">${district.name}</span>
              ${troopsBadge}
            </div>
            ${isSelected ? `
              <div class="w-2.5 h-2.5 bg-[#a87c4f] mx-auto rotate-45 -mt-1.5 shadow-md"></div>
            ` : ''}
          </div>
        `;

        const labelIcon = L.divIcon({
          className: 'district-floating-label',
          html: labelHtml,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        const labelMarker = L.marker(centerLatLng, {
          icon: labelIcon,
          interactive: false,
        });

        labelMarker.addTo(labelsLayer);
      }
    });
  }, [showDistricts, parchmentMode, selectedCityId, hoveredDistrictId, cities, districtsList]);

  return (
    <div className="absolute inset-0 z-0 bg-[#16171a] overflow-hidden">
      {/* Banner thông báo chế độ Sửa Map & Bộ công cụ tinh chỉnh ranh giới (Tự co giãn, không tràn màn hình) */}
      {isEditMode && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] w-[95vw] max-w-2xl bg-[#221008]/96 text-[#f5ebd7] px-4 py-3 rounded-xl border-2 border-amber-500 shadow-2xl backdrop-blur-md flex flex-col items-center gap-2 pointer-events-auto">
          <div className="flex flex-wrap items-center justify-center gap-2 w-full">
            <span className="font-bold font-serif text-xs md:text-sm tracking-wider text-amber-300 uppercase whitespace-nowrap">
              ✦ Chế độ nắn ranh giới Huyện Thành ✦
            </span>
            <select
              value={selectedCityId || ''}
              onChange={(e) => selectCity(e.target.value)}
              className="bg-[#382013] text-amber-200 border border-amber-600/80 rounded px-2.5 py-1 text-xs font-serif font-bold cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              {districtsList.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.chau})</option>
              ))}
            </select>
            <button
              onClick={() => {
                const custom = localStorage.getItem('lam_son_district_polygons_custom_v1');
                if (custom) {
                  navigator.clipboard.writeText(custom);
                  alert('Đã copy toàn bộ dữ liệu ranh giới huyện thành vào Clipboard!');
                } else {
                  alert('Chưa có chỉnh sửa ranh giới mới nào!');
                }
              }}
              className="px-2.5 py-1 bg-[#2f4d66] hover:bg-[#3d6385] text-white rounded text-xs font-bold border border-[#5282ad] shadow cursor-pointer transition hover:scale-105 whitespace-nowrap"
            >
              Copy Ranh Giới
            </button>
            <button
              onClick={() => {
                if (confirm('Khôi phục lại toàn bộ ranh giới huyện thành về mặc định ban đầu?')) {
                  localStorage.removeItem('lam_son_district_polygons_custom_v1');
                  window.location.reload();
                }
              }}
              className="px-2.5 py-1 bg-[#5c2419] hover:bg-[#783021] text-amber-100 rounded text-xs font-bold border border-[#963e2c] shadow cursor-pointer transition hover:scale-105 whitespace-nowrap"
            >
              Làm Lại Gốc
            </button>
            <button
              onClick={toggleEditMode}
              className="px-2.5 py-1 bg-[#22543d] hover:bg-[#276749] text-emerald-100 rounded text-xs font-bold border border-[#38a169] shadow cursor-pointer transition hover:scale-105 whitespace-nowrap"
            >
              ✓ Xong Sửa
            </button>
          </div>
          <p className="text-[11px] md:text-xs text-stone-300 text-center">
            {selectedCityId
              ? `Đang nắn: ${districtsList.find(d => d.id === selectedCityId)?.name || selectedCityId} — Kéo các nút tròn vàng viền đỏ trên đường ranh giới để nắn hình.`
              : 'Click chọn một huyện thành trên bản đồ hoặc chọn từ danh sách ở trên để bắt đầu nắn ranh giới.'}
          </p>
        </div>
      )}

      {/* Thanh chuyển đổi chế độ xem Sa bàn Giấy Da Cừu (Khu vực Thanh Hóa) */}
      <div className="absolute bottom-5 left-5 z-[900] flex items-center gap-1.5 bg-[#1e130a]/90 border border-[#a87c4f]/70 rounded-lg p-1.5 shadow-2xl backdrop-blur-sm text-xs font-serif">
        <span className="px-2 py-1 text-[#ebd0a7] font-bold tracking-wider uppercase">
          Sa bàn Thanh Hóa:
        </span>
        <button
          onClick={() => setParchmentMode('cutout')}
          className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
            parchmentMode === 'cutout'
              ? 'bg-[#8c5828] text-[#fff3db] border border-[#deb887] font-bold shadow'
              : 'text-[#c9a679] hover:bg-[#332010]'
          }`}
        >
          Chỉ vùng Thanh Hóa
        </button>
        <button
          onClick={() => setParchmentMode('sheet')}
          className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
            parchmentMode === 'sheet'
              ? 'bg-[#8c5828] text-[#fff3db] border border-[#deb887] font-bold shadow'
              : 'text-[#c9a679] hover:bg-[#332010]'
          }`}
        >
          Nguyên tấm Da Cừu
        </button>
        <button
          onClick={() => setParchmentMode('off')}
          className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
            parchmentMode === 'off'
              ? 'bg-[#8c5828] text-[#fff3db] border border-[#deb887] font-bold shadow'
              : 'text-[#c9a679] hover:bg-[#332010]'
          }`}
        >
          Vệ tinh gốc
        </button>
        <div className="h-4 w-[1px] bg-[#a87c4f]/40 mx-1" />
        <button
          onClick={() => setShowDistricts(prev => !prev)}
          className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
            showDistricts && parchmentMode !== 'off'
              ? 'bg-[#6e2214] text-[#fff3db] border border-[#e6a87c] font-bold shadow'
              : 'text-[#c9a679] hover:bg-[#332010]'
          }`}
          title="Bật/tắt ranh giới và vùng tương tác huyện thành"
        >
          Địa bàn Huyện Thành: {showDistricts ? 'Bật' : 'Tắt'}
        </button>
      </div>

      {/* Container của Leaflet Map */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full bg-[#16171a]"
      />
    </div>
  );
};
