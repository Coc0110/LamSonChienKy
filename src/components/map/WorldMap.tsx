import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import type { DistrictInfo, ParchmentMode } from '../../types/map';
import {
  percentToLatLng,
  latLngToPercent,
  MAP_COORD_W,
  MAP_COORD_H,
  TILE_SIZE,
} from '../../utils/mapGeo';
import districtData from '../../data/districtPolygons.json';
import { TERRAIN_DEFINITIONS } from '../../data/terrainData';
import type { TerrainType } from '../../types/terrain';
import {
  validateCellPlacement,
  getGridTerrain,
  cellToCoord,
} from '../../data/terrainGrid';
import { DistrictEditorBar } from './DistrictEditorBar';
import { ParchmentControls } from './ParchmentControls';
import { TerrainGridOverlay } from './TerrainGridOverlay';

const TERRAIN_ICONS: Record<TerrainType, string> = {
  plains: '🌾',
  forest: '🌲',
  mountain: '⛰️',
  cliff: '🧗',
  swamp: '💧',
  water: '🌊',
};

const DISTRICT_STORAGE_KEY = 'lam_son_district_polygons_custom_v1';

export const WorldMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const linesLayerRef = useRef<L.LayerGroup | null>(null);
  const labelsLayerRef = useRef<L.LayerGroup | null>(null);
  const vertexHandlesLayerRef = useRef<L.LayerGroup | null>(null);
  const nodesLayerRef = useRef<L.LayerGroup | null>(null);
  const structuresLayerRef = useRef<L.LayerGroup | null>(null);
  const previewLayerRef = useRef<L.LayerGroup | null>(null);
  const controlRadiusLayerRef = useRef<L.LayerGroup | null>(null);
  const parchmentCutoutRef = useRef<L.ImageOverlay | null>(null);
  const parchmentSheetRef = useRef<L.ImageOverlay | null>(null);
  const polygonsMapRef = useRef<Map<string, L.Polygon>>(new Map());

  const [parchmentMode, setParchmentMode] = useState<ParchmentMode>('cutout');
  const [showDistricts, setShowDistricts] = useState<boolean>(true);
  const [hoveredDistrictId, setHoveredDistrictId] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

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
  const structures = useGameStore(state => state.structures);
  const placeStructure = useGameStore(state => state.placeStructure);

  const isEditMode = useUIStore(state => state.isEditMode);
  const toggleEditMode = useUIStore(state => state.toggleEditMode);
  const selectedCityId = useUIStore(state => state.selectedCityId);
  const selectCity = useUIStore(state => state.selectCity);
  const placementMode = useUIStore(state => state.placementMode);
  const setPlacementMode = useUIStore(state => state.setPlacementMode);
  const showGrid = useUIStore(state => state.showGrid);
  const hoveredCell = useUIStore(state => state.hoveredCell);

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

    // Thiết lập tâm và mức zoom khởi tạo ngay lập tức để map._loaded = true
    const initialCenter = percentToLatLng(54.5, 47.5);
    const initialZoom = 1.2;
    map.setView(initialCenter, initialZoom);

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

    // Pane riêng cho vector ranh giới huyện thành (zIndex: 450)
    map.createPane('districtsPane');
    const dPane = map.getPane('districtsPane');
    if (dPane) {
      dPane.style.zIndex = '450';
    }

    // Pane cho các công trình và cứ điểm trên bản đồ (zIndex: 650 - cao hơn mọi overlay và polygon)
    map.createPane('structuresPane');
    const sPane = map.getPane('structuresPane');
    if (sPane) {
      sPane.style.zIndex = '650';
      sPane.style.pointerEvents = 'auto';
    }

    // Pane cho nhãn tên địa danh (zIndex: 750 - trên cùng cao hơn cả các node và công trình)
    map.createPane('districtLabelsPane');
    const lPane = map.getPane('districtLabelsPane');
    if (lPane) {
      lPane.style.zIndex = '750';
      lPane.style.pointerEvents = 'none';
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

    const fullMapBounds = L.latLngBounds(
      percentToLatLng(0, 100),
      percentToLatLng(100, 0)
    );

    // 1. Sông ngòi toàn quốc
    const riversOverlay = L.imageOverlay('/map_rivers.svg', fullMapBounds, {
      opacity: 0.95,
      interactive: false,
      zIndex: 15,
    }).addTo(map);

    // 2. Biên giới toàn quốc
    const bordersOverlay = L.imageOverlay('/map_borders.svg', fullMapBounds, {
      opacity: 0.9,
      interactive: false,
      zIndex: 20,
    }).addTo(map);

    // 2.5 Bản đồ Sa bàn Giấy Da Cừu Thanh Hóa
    const thanhHoaBounds = L.latLngBounds(
      percentToLatLng(36.0, 59.0),
      percentToLatLng(70.0, 38.0)
    );

    const cutoutOverlay = L.imageOverlay('/thanh_hoa_parchment.png', thanhHoaBounds, {
      opacity: 1.0,
      interactive: false,
      zIndex: 25,
    }).addTo(map);

    const sheetOverlay = L.imageOverlay('/thanh_hoa_parchment_full.jpg', thanhHoaBounds, {
      opacity: 0,
      interactive: false,
      zIndex: 24,
    }).addTo(map);

    parchmentCutoutRef.current = cutoutOverlay;
    parchmentSheetRef.current = sheetOverlay;

    const initTimer = setTimeout(() => {
      if (isDisposed) return;
      map.invalidateSize();
      updateView(true);
      [riversOverlay, bordersOverlay, sheetOverlay, cutoutOverlay].forEach(o => {
        if (!(o as any)._map) (o as any)._layerAdd({ target: map });
      });
    }, 50);

    const handleResize = () => {
      if (isDisposed) return;
      map.invalidateSize();
      updateView(false);
    };
    window.addEventListener('resize', handleResize);

    // LayerGroups
    const linesLayer = L.layerGroup().addTo(map);
    const labelsLayer = L.layerGroup().addTo(map);
    const vertexHandlesLayer = L.layerGroup().addTo(map);
    const controlRadiusLayer = L.layerGroup().addTo(map);
    const nodesLayer = L.layerGroup().addTo(map);
    const structuresLayer = L.layerGroup().addTo(map);
    const previewLayer = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    linesLayerRef.current = linesLayer;
    labelsLayerRef.current = labelsLayer;
    vertexHandlesLayerRef.current = vertexHandlesLayer;
    controlRadiusLayerRef.current = controlRadiusLayer;
    nodesLayerRef.current = nodesLayer;
    structuresLayerRef.current = structuresLayer;
    previewLayerRef.current = previewLayer;

    setMapInstance(map);

    return () => {
      isDisposed = true;
      clearTimeout(initTimer);
      window.removeEventListener('resize', handleResize);
      polygonsMapRef.current.clear();
      map.remove();
      mapInstanceRef.current = null;
      setMapInstance(null);
    };
  }, []);

  // Cập nhật chế độ hiển thị Sa bàn Giấy Da Cừu
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

  // 1.1 Lướt camera tới cứ điểm khi chọn từ danh sách Quân Thư (chỉ chạy khi đổi selectedCityId, không chạy lại khi dữ liệu cities tick theo ngày)
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    const map = mapInstanceRef.current;
    if (!selectedCityId || !map) return;
    try {
      const currentCities = useGameStore.getState().cities;
      const city = currentCities.find(c => c.id === selectedCityId);
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
  }, [selectedCityId]);

  // 2. Cập nhật các đường nối hành quân
  useEffect(() => {
    if (!mapInstance) return;
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
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false,
      });

      polyline.addTo(linesLayer);
    });
  }, [mapInstance, connections, cities, selectedCityId]);

  // Cập nhật tọa độ polygon cho huyện
  const updateDistrictPolygonVertex = (districtId: string, vertexIndex: number, newX: number, newY: number) => {
    setDistrictsList(prev => {
      const next = prev.map(d => {
        if (d.id !== districtId) return d;
        const newPoly = [...d.polygon];
        newPoly[vertexIndex] = [newX, newY];
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
    if (!mapInstance) return;
    const map = mapInstance;

    // Xóa các polygon cũ
    polygonsMapRef.current.forEach(p => p.remove());
    polygonsMapRef.current.clear();

    districtsList.forEach(district => {
      const latlngs = district.polygon.map(pt => percentToLatLng(pt[0], pt[1]));
      const poly = L.polygon(latlngs, {
        fill: true,
        fillColor: '#ffffff',
        fillOpacity: 0.0001,
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

    const currentPolygons = polygonsMapRef.current;
    return () => {
      currentPolygons.forEach(p => p.remove());
      currentPolygons.clear();
    };
  }, [mapInstance, districtsList, selectCity]);

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
        poly.setStyle({
          color: '#991b1b',
          weight: 2.8,
          opacity: 1.0,
          fillOpacity: 0.0001,
        });
      } else if (isHovered) {
        poly.setStyle({
          color: '#c2410c',
          weight: 2.0,
          opacity: 1.0,
          fillOpacity: 0.0001,
        });
      } else {
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
  useEffect(() => {
    const handlesLayer = vertexHandlesLayerRef.current;
    if (!handlesLayer) return;

    handlesLayer.clearLayers();

    if (!isEditMode || !selectedCityId) return;

    const currentDistrict = districtsList.find(d => d.id === selectedCityId);
    if (!currentDistrict) return;

    currentDistrict.polygon.forEach((pt, idx) => {
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
    if (!mapInstance) return;
    const labelsLayer = labelsLayerRef.current;
    if (!labelsLayer) return;

    labelsLayer.clearLayers();

    if (!showDistricts || parchmentMode === 'off') return;

    districtsList.forEach(district => {
      const isSelected = selectedCityId === district.id;
      const isHovered = hoveredDistrictId === district.id;

      if (isSelected || isHovered) {
        const centerLatLng = percentToLatLng(district.center[0], district.center[1]);

        const cityNode = cities.find(c => c.id === district.id);
        const faction = cityNode ? cityNode.faction : district.faction;
        const troops = cityNode ? cityNode.troops : district.troops;

        const factionColor =
          faction === 'lam_son'
            ? 'text-amber-300'
            : faction === 'ming'
            ? 'text-sky-300'
            : 'text-[#fbf2e3]';

        const glowColor =
          faction === 'lam_son'
            ? 'rgba(245, 158, 11, 0.6)'
            : faction === 'ming'
            ? 'rgba(56, 189, 248, 0.6)'
            : 'rgba(0, 0, 0, 0.95)';

        const troopsBadge =
          troops > 0
            ? `<span class="ml-2 text-xs font-mono font-medium text-amber-200/90 tracking-normal" style="text-shadow: 0 1px 3px #000, 0 0 6px #000;">[${troops.toLocaleString()}]</span>`
            : '';

        const labelHtml = `
          <div class="pointer-events-none select-none flex items-center justify-center whitespace-nowrap font-serif font-black tracking-widest ${isSelected ? 'scale-115' : ''} transition-transform duration-150 animate-in fade-in zoom-in-95"
               style="font-size: 19px; transform: translate(-50%, calc(-70% - 14px)); text-align: center; text-shadow: -1.5px -1.5px 0 #180e06, 1.5px -1.5px 0 #180e06, -1.5px 1.5px 0 #180e06, 1.5px 1.5px 0 #180e06, 0 2px 8px rgba(0,0,0,0.95), 0 0 14px ${glowColor};">
            <span class="${factionColor}">${district.name}</span>
            ${troopsBadge}
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
          pane: 'districtLabelsPane',
        });

        labelMarker.addTo(labelsLayer);
      }
    });
  }, [mapInstance, showDistricts, parchmentMode, selectedCityId, hoveredDistrictId, cities, districtsList]);

  // 5.5 HIỂN THỊ CĂN CỨ NGHĨA QUÂN (CHẤM ĐỎ) & CỨ ĐIỂM QUÂN MINH (CHẤM XANH DƯƠNG) & SONG KIẾM LUYỆN BINH
  useEffect(() => {
    if (!mapInstance) return;
    const layer = nodesLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    cities.forEach(city => {
      const pos = percentToLatLng(city.x, city.y);
      const isLamSonBase = city.faction === 'lam_son' && (city.hasBase || city.id === 'lam_son');
      const isMing = city.faction === 'ming';

      // 1. Căn Cứ Nghĩa Quân (Chấm Đỏ Lam Sơn)
      if (isLamSonBase) {
        const hasTraining = !!(city.training && city.training.remainingDays > 0);

        const html = `
          <div class="relative w-full h-full flex items-center justify-center cursor-pointer select-none group">
            <!-- Vòng sóng nhấp nháy phát quang căn cứ Lam Sơn -->
            <div class="absolute w-9 h-9 rounded-full bg-red-600/35 animate-ping pointer-events-none"></div>
            <div class="absolute w-7 h-7 rounded-full bg-red-500/30 animate-pulse pointer-events-none"></div>

            <!-- Chấm đỏ căn cứ trung tâm -->
            <div class="w-5 h-5 rounded-full bg-red-600 border-2 border-amber-200 shadow-[0_0_14px_rgba(239,68,68,1)] flex items-center justify-center transform group-hover:scale-125 transition-transform duration-150 z-10">
              <div class="w-1.5 h-1.5 rounded-full bg-white shadow-xs"></div>
            </div>

            <!-- Icon Song Kiếm khi đang thao luyện -->
            ${hasTraining ? `
              <div class="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#2d1508] border-2 border-amber-400 rounded-full w-7 h-7 flex items-center justify-center shadow-xl animate-bounce z-20" title="Đang thao luyện nghĩa binh">
                <span class="text-xs">⚔️</span>
              </div>
            ` : ''}

            <!-- Nhãn tên Căn Cứ -->
            <div class="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/95 border border-red-500 text-[11px] font-serif font-black text-amber-200 whitespace-nowrap shadow-xl pointer-events-none z-20">
              Căn cứ ${city.name}
            </div>

            <!-- Tooltip chi tiết khi rê chuột -->
            <div class="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-[#1a0f08]/98 border border-red-500 shadow-2xl text-stone-200 text-xs whitespace-nowrap pointer-events-none z-30">
              <div class="font-serif font-bold text-red-400">Đại Bản Doanh ${city.name}</div>
              <div class="text-[11px] text-stone-300">Quân đồn trú: ${city.troops} nghĩa binh</div>
              ${hasTraining ? `<div class="text-[11px] text-amber-300 font-bold mt-0.5">⚔️ Đang thao luyện ${city.training!.traineesCount} tráng phu (còn ${city.training!.remainingDays} ngày)</div>` : ''}
            </div>
          </div>
        `;

        const marker = L.marker(pos, {
          icon: L.divIcon({
            className: 'base-node-marker',
            html,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
          pane: 'structuresPane',
        });

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          selectCity(city.id);
        });

        marker.addTo(layer);
      }

      // 2. Cứ Điểm Quân Minh (Chấm Xanh Dương to nhỏ phụ thuộc lượng quân)
      else if (isMing) {
        const troops = city.troops;
        const dotSize = Math.max(12, Math.min(28, Math.round(8 + Math.sqrt(troops / 13))));
        const isMainFortress = troops >= 8000;

        const html = `
          <div class="relative w-full h-full flex items-center justify-center cursor-pointer select-none group">
            ${isMainFortress ? `
              <div style="width: ${dotSize + 10}px; height: ${dotSize + 10}px;" class="absolute rounded-full bg-blue-500/35 animate-pulse pointer-events-none"></div>
            ` : ''}
            
            <div style="width: ${dotSize}px; height: ${dotSize}px;" 
                 class="rounded-full bg-blue-600 border-2 border-sky-300 shadow-[0_0_12px_rgba(37,99,235,0.9)] flex items-center justify-center hover:scale-130 transition-transform duration-150 z-10">
              ${dotSize >= 20 ? `<div class="w-2 h-2 rounded-full bg-white/90"></div>` : ''}
            </div>

            <!-- Tooltip chi tiết cứ điểm giặc Minh -->
            <div class="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded bg-[#0b1329]/98 border border-blue-500 shadow-2xl text-stone-200 text-xs whitespace-nowrap pointer-events-none z-30">
              <div class="font-serif font-bold text-sky-300">${city.name}</div>
              <div class="text-[11px] text-sky-200 font-mono">${troops.toLocaleString()} quân Minh đồn trú</div>
            </div>
          </div>
        `;

        const marker = L.marker(pos, {
          icon: L.divIcon({
            className: 'ming-node-marker',
            html,
            iconSize: [dotSize, dotSize],
            iconAnchor: [dotSize / 2, dotSize / 2],
          }),
          pane: 'structuresPane',
        });

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          selectCity(city.id);
        });

        marker.addTo(layer);
      }
    });
  }, [mapInstance, cities, selectCity]);

  // 6. HIỂN THỊ CÁC CÔNG TRÌNH: RUỘNG (CHẤM VÀNG) & LÒ RÈN (CHẤM ĐEN)
  useEffect(() => {
    if (!mapInstance) return;
    const layer = structuresLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    structures.forEach(structure => {
      const isFarm = structure.type === 'farm';
      const isBuilding = structure.status === 'building';
      const order = structure.activeOrder;
      const pos = percentToLatLng(structure.x, structure.y);

      let dotHtml = '';

      if (isFarm) {
        // Ruộng là chấm màu vàng
        dotHtml = `
          <div class="relative w-full h-full flex items-center justify-center cursor-pointer select-none group">
            <div class="w-4 h-4 rounded-full bg-amber-400 border-2 border-[#78350f] shadow-[0_0_10px_rgba(251,191,36,1)] hover:scale-140 transition-transform duration-150 z-10 ${isBuilding ? 'animate-pulse' : ''}">
              <div class="w-1.5 h-1.5 rounded-full bg-amber-100 mx-auto mt-0.5"></div>
            </div>

            <!-- Tooltip -->
            <div class="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 rounded-lg bg-[#1a1208]/98 border border-amber-500 shadow-2xl text-stone-200 text-[11px] whitespace-nowrap pointer-events-none z-30">
              <div class="font-serif font-bold text-amber-300">🌾 ${structure.name} (Ruộng lúa)</div>
              <div class="text-stone-300">
                ${isBuilding 
                  ? `Đang khai hoang (còn ${structure.buildDaysRemaining} ngày)`
                  : `${structure.assignedWorkers}/${structure.maxWorkers} nông đinh • Vụ lúa: ${structure.cropDays}/${structure.cropCycleDays} ngày`
                }
              </div>
            </div>
          </div>
        `;
      } else {
        // Lò rèn là chấm màu đen
        dotHtml = `
          <div class="relative w-full h-full flex items-center justify-center cursor-pointer select-none group">
            <div class="w-4 h-4 rounded-full bg-[#0a0a0c] border-2 ${order ? 'border-red-500 shadow-[0_0_12px_rgba(239,68,68,1)] ring-2 ring-red-500/50' : 'border-stone-300 shadow-[0_0_8px_rgba(0,0,0,0.9)]'} hover:scale-140 transition-transform duration-150 z-10">
              ${order ? '<div class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mx-auto mt-0.5"></div>' : ''}
            </div>

            <!-- Tooltip -->
            <div class="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 rounded-lg bg-[#141416]/98 border border-stone-500 shadow-2xl text-stone-200 text-[11px] whitespace-nowrap pointer-events-none z-30">
              <div class="font-serif font-bold text-stone-200">⚒️ ${structure.name} (Lò rèn)</div>
              <div class="text-stone-300">
                ${isBuilding 
                  ? `Đang dựng lò (còn ${structure.buildDaysRemaining} ngày)`
                  : order 
                  ? `Đang rèn ${order.quantity} ${order.name} (còn ${order.remainingDays} ngày)` 
                  : 'Lò rèn sẵn sàng nhận lệnh đúc'
                }
              </div>
            </div>
          </div>
        `;
      }

      const marker = L.marker(pos, {
        icon: L.divIcon({
          className: 'placed-dot-marker',
          html: dotHtml,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
        pane: 'structuresPane',
      });

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        selectCity(structure.cityId);
      });

      marker.addTo(layer);
    });
  }, [mapInstance, structures, selectCity]);

  // 7. CHẾ ĐỘ CHỌN VỊ TRÍ ĐẶT CÔNG TRÌNH & VÒNG BÁN KÍNH BẢO HỘ 14 DẶM
  useEffect(() => {
    if (!mapInstance) return;
    const map = mapInstance;
    const previewLayer = previewLayerRef.current;
    const controlLayer = controlRadiusLayerRef.current;
    if (!map || !previewLayer || !controlLayer) return;

    previewLayer.clearLayers();
    controlLayer.clearLayers();

    if (!placementMode) return;

    const currentCities = useGameStore.getState().cities;
    const targetCity = currentCities.find(c => c.id === placementMode.cityId);

    // Vẽ vòng tròn bán kính 14 dặm bao bọc căn cứ
    if (targetCity) {
      const baseLatLng = percentToLatLng(targetCity.x, targetCity.y);
      const radiusCRS = (14.0 / 100) * MAP_COORD_W;

      const controlCircle = L.circle(baseLatLng, {
        radius: radiusCRS,
        color: '#f59e0b',
        weight: 1.5,
        dashArray: '6, 6',
        fillColor: '#f59e0b',
        fillOpacity: 0.08,
        pane: 'structuresPane',
        interactive: false,
      });

      controlCircle.addTo(controlLayer);
    }

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      previewLayer.clearLayers();
      const { x, y } = latLngToPercent(e.latlng);
      const latestState = useGameStore.getState();

      const validation = validateCellPlacement(
        x,
        y,
        placementMode.type,
        placementMode.cityId,
        latestState.cities,
        latestState.structures
      );

      const isValid = validation.canBuild;
      const terrainInfo = TERRAIN_DEFINITIONS[validation.terrain];
      const color = isValid ? '#22c55e' : '#ef4444';
      const dotColor = placementMode.type === 'farm' ? 'bg-amber-400' : 'bg-stone-950 border-stone-400';

      const iconHtml = `
        <div class="pointer-events-none -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div class="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs shadow-xl"
               style="border-color: ${color}; background: ${isValid ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'};">
            <div class="w-3.5 h-3.5 rounded-full ${dotColor} border"></div>
          </div>
          <div class="mt-1 px-2 py-0.5 rounded text-[10px] font-bold text-white shadow whitespace-nowrap"
               style="background: ${isValid ? '#15803d' : '#b91c1c'};">
            ${isValid ? `✓ Hợp lệ [Ô ${validation.col},${validation.row}] (${terrainInfo.name})` : `✗ ${validation.reason}`}
          </div>
        </div>
      `;

      // Hút chặt vào tâm của ô vuông lưới (0.5% x 0.5%)
      const snappedPos = percentToLatLng(validation.snappedX, validation.snappedY);

      const previewMarker = L.marker(snappedPos, {
        icon: L.divIcon({
          className: 'placement-preview-marker',
          html: iconHtml,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        }),
        pane: 'structuresPane',
        interactive: false,
      });

      previewMarker.addTo(previewLayer);
    };

    const handleClick = (e: L.LeafletMouseEvent) => {
      const { x, y } = latLngToPercent(e.latlng);
      const latestState = useGameStore.getState();
      const validation = validateCellPlacement(
        x,
        y,
        placementMode.type,
        placementMode.cityId,
        latestState.cities,
        latestState.structures
      );

      if (!validation.canBuild) {
        alert(validation.reason || 'Vị trí này không hợp lệ để thi công!');
        return;
      }

      const res = placeStructure(placementMode.cityId, placementMode.type, validation.snappedX, validation.snappedY);
      if (res.success) {
        setPlacementMode(null);
      }
      alert(res.message);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPlacementMode(null);
      }
    };

    map.on('mousemove', handleMouseMove);
    map.on('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      map.off('mousemove', handleMouseMove);
      map.off('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
      previewLayer.clearLayers();
      controlLayer.clearLayers();
    };
  }, [mapInstance, placementMode, placeStructure, setPlacementMode]);

  return (
    <div className="absolute inset-0 z-0 bg-[#16171a] overflow-hidden">
      {/* Banner thông báo chế độ Sửa Map & Bộ công cụ tinh chỉnh ranh giới */}
      {isEditMode && (
        <DistrictEditorBar
          selectedCityId={selectedCityId}
          districtsList={districtsList}
          onSelectCity={selectCity}
          onToggleEditMode={toggleEditMode}
          storageKey={DISTRICT_STORAGE_KEY}
        />
      )}

      {/* Banner chế độ đang đặt công trình (Placement Mode) */}
      {placementMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-5 py-2.5 rounded-xl bg-[#1e120a]/95 border-2 border-amber-500 shadow-2xl backdrop-blur-md flex items-center gap-3 font-sans text-xs text-amber-200 animate-in fade-in slide-in-from-top-4">
          <span className="text-xl animate-bounce">
            {placementMode.type === 'farm' ? '🌾' : '⚒️'}
          </span>
          <div>
            <div className="font-bold text-amber-300">
              Đang chọn vị trí khai hoang {placementMode.type === 'farm' ? 'Ruộng Lúa Nước (chỉ đất Đồng Bằng)' : 'Lò Rèn Bí Mật (ưu tiên Rừng/Núi)'}
            </div>
            <div className="text-[11px] text-stone-300">
              Rê chuột trên bản đồ xem kiểm tra địa hình, nhấp chuột để cắm mốc xây dựng.
            </div>
          </div>
          <button
            onClick={() => setPlacementMode(null)}
            className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-[11px] transition cursor-pointer"
          >
            Hủy Bỏ (ESC)
          </button>
        </div>
      )}

      {/* Tấm Lưới Ô Địa Hình Canvas (Grid 0.5% & Sơn Địa Hình) */}
      <TerrainGridOverlay map={mapInstance} />

      {/* HUD Thông tin Ô Lưới Địa Hình & Tác Chiến khi rê chuột */}
      {showGrid && hoveredCell && !placementMode && !isEditMode && (() => {
        const terrainType = getGridTerrain(hoveredCell.col, hoveredCell.row);
        const terrain = TERRAIN_DEFINITIONS[terrainType];
        const { centerX, centerY } = cellToCoord(hoveredCell.col, hoveredCell.row);

        const speedText = terrainType === 'water' ? 'Không thể qua (sông nước)'
          : terrainType === 'cliff' ? 'Vách đá (-80% tốc độ)'
          : terrainType === 'swamp' ? 'Đầm lầy (-65% tốc độ)'
          : terrainType === 'mountain' ? 'Núi cao (-55% tốc độ)'
          : terrainType === 'forest' ? 'Rừng già (-30% tốc độ)'
          : 'Đồng bằng (100% tốc độ)';

        const tacticalText = terrainType === 'forest' ? '🌲 Phục kích & ẩn nấp: +40%'
          : terrainType === 'mountain' ? '⛰️ Phòng thủ & chốt chặn: +50%'
          : terrainType === 'swamp' ? '💧 Bẫy sa lầy kỵ binh: +35%'
          : terrainType === 'cliff' ? '🧗 Hẻm núi hiểm trở'
          : terrainType === 'plains' ? '🌾 Đất màu mỡ mở đồn điền'
          : '🌊 Dòng nước sông Mã tự nhiên';

        return (
          <div className="absolute bottom-6 left-6 z-30 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="px-3 py-2 rounded-lg bg-[#14120e]/95 border border-[#8a724d]/60 shadow-[0_8px_20px_rgba(0,0,0,0.8)] backdrop-blur-sm text-stone-200 font-sans text-xs min-w-[240px]">
              <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-[#524430]/60">
                <span className="font-serif font-bold text-[#f7e6c4] flex items-center gap-1.5">
                  <span className="text-base">{TERRAIN_ICONS[terrainType]}</span>
                  {terrain.name}
                </span>
                <span className="font-mono text-[10px] text-amber-300/80 bg-black/40 px-1.5 py-0.5 rounded">
                  Ô [{hoveredCell.col}, {hoveredCell.row}] • {centerX.toFixed(1)}%, {centerY.toFixed(1)}%
                </span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center justify-between text-stone-300">
                  <span className="text-stone-400">Hành quân:</span>
                  <span className="font-medium text-amber-200">{speedText}</span>
                </div>
                <div className="text-[11px] text-emerald-400/90 font-medium">
                  {tacticalText}
                </div>
                <div className="pt-1 flex gap-2 text-[10px] text-stone-400 border-t border-stone-800/60">
                  <span>Ruộng: {terrainType === 'plains' ? '🟢 Khả dụng' : '🔴 Cấm'}</span>
                  <span>Lò rèn: {terrainType !== 'water' && terrainType !== 'cliff' ? '🟢 Khả dụng' : '🔴 Cấm'}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Thanh chuyển đổi chế độ xem Sa bàn Giấy Da Cừu */}
      <ParchmentControls
        parchmentMode={parchmentMode}
        onChangeMode={setParchmentMode}
        showDistricts={showDistricts}
        onToggleDistricts={() => setShowDistricts(prev => !prev)}
      />

      {/* Container của Leaflet Map - Hỗ trợ kéo thả công trình từ panel */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full bg-[#16171a]"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={(e) => {
          e.preventDefault();
          const raw = e.dataTransfer.getData('text/plain');
          if (!raw) return;
          try {
            const data = JSON.parse(raw);
            if (!data.type || !data.cityId) return;
            const map = mapInstanceRef.current;
            const container = mapContainerRef.current;
            if (!map || !container) return;
            const rect = container.getBoundingClientRect();
            const pt = L.point(e.clientX - rect.left, e.clientY - rect.top);
            const latlng = map.containerPointToLatLng(pt);
            const { x, y } = latLngToPercent(latlng);

            const latestState = useGameStore.getState();
            const validation = validateCellPlacement(
              x,
              y,
              data.type,
              data.cityId,
              latestState.cities,
              latestState.structures
            );

            if (!validation.canBuild) {
              alert(validation.reason || 'Không thể cắm mốc tại ô này!');
              return;
            }

            const res = placeStructure(data.cityId, data.type, validation.snappedX, validation.snappedY);
            alert(res.message);
          } catch {
            // ignore
          }
        }}
      />
    </div>
  );
};
