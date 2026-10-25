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
import { DistrictEditorBar } from './DistrictEditorBar';
import { ParchmentControls } from './ParchmentControls';

const DISTRICT_STORAGE_KEY = 'lam_son_district_polygons_custom_v1';

export const WorldMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const linesLayerRef = useRef<L.LayerGroup | null>(null);
  const labelsLayerRef = useRef<L.LayerGroup | null>(null);
  const vertexHandlesLayerRef = useRef<L.LayerGroup | null>(null);
  const parchmentCutoutRef = useRef<L.ImageOverlay | null>(null);
  const parchmentSheetRef = useRef<L.ImageOverlay | null>(null);
  const polygonsMapRef = useRef<Map<string, L.Polygon>>(new Map());

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

    // Pane riêng cho vector ranh giới huyện thành (zIndex: 450)
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
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false,
      });

      polyline.addTo(linesLayer);
    });
  }, [connections, cities, selectedCityId]);

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
            ? 'text-amber-400 font-black'
            : faction === 'ming'
            ? 'text-sky-400 font-black'
            : 'text-stone-300';

        const badgeBorder =
          faction === 'lam_son'
            ? 'border-amber-600/80 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
            : faction === 'ming'
            ? 'border-blue-600/80 shadow-[0_0_12px_rgba(59,130,246,0.5)]'
            : 'border-stone-600/60 shadow-[0_0_8px_rgba(0,0,0,0.6)]';

        const troopsBadge =
          troops > 0
            ? `<span class="ml-1.5 px-1.5 py-0.2 rounded text-[10px] bg-black/50 border border-stone-600/70 text-stone-200 font-mono">${troops.toLocaleString()}</span>`
            : '';

        const labelHtml = `
          <div class="pointer-events-none transform -translate-x-1/2 -translate-y-full pb-2 animate-in fade-in zoom-in-95 duration-150">
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

      {/* Thanh chuyển đổi chế độ xem Sa bàn Giấy Da Cừu */}
      <ParchmentControls
        parchmentMode={parchmentMode}
        onChangeMode={setParchmentMode}
        showDistricts={showDistricts}
        onToggleDistricts={() => setShowDistricts(prev => !prev)}
      />

      {/* Container của Leaflet Map */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full bg-[#16171a]"
      />
    </div>
  );
};
