import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import type { PlacedStructure } from '../../types';
import type { DistrictInfo, ParchmentMode } from '../../types/map';
import {
  percentToLatLng,
  latLngToPercent,
  findDistrictForCoord,
  MAP_COORD_W,
  MAP_COORD_H,
  TILE_SIZE,
} from '../../utils/mapGeo';
import districtData from '../../data/districtPolygons.json';
import {
  validateCellPlacement,
  coordToCell,
  cellToCoord,
} from '../../data/terrainGrid';
import { DistrictEditorBar } from './DistrictEditorBar';
import { ParchmentControls } from './ParchmentControls';
import { TerrainGridOverlay } from './TerrainGridOverlay';
import { TerrainTacticalPanel } from './TerrainTacticalPanel';
import { StructureDetailModal } from './StructureDetailModal';
import { PlacementControlBar } from './overlay/PlacementControlBar';
import { TerrainInspectHUD } from './overlay/TerrainInspectHUD';
import { useDistrictPolygons, DISTRICT_STORAGE_KEY } from './hooks/useDistrictPolygons';
import { useCityMarkers } from './hooks/useCityMarkers';
import { useStructureMarkers } from './hooks/useStructureMarkers';
import { useTacticalMarchLayer } from './hooks/useTacticalMarchLayer';
import { useMapPlacement } from './hooks/useMapPlacement';
import { notify } from '../../store/dialogStore';
import { cleanStructureName } from '../../utils/formatters';
import type { MarchCalculationResult } from '../../types/terrain';

export const WorldMap: React.FC = React.memo(() => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const linesLayerRef = useRef<L.LayerGroup | null>(null);
  const labelsLayerRef = useRef<L.LayerGroup | null>(null);
  const vertexHandlesLayerRef = useRef<L.LayerGroup | null>(null);
  const nodesLayerRef = useRef<L.LayerGroup | null>(null);
  const structuresLayerRef = useRef<L.LayerGroup | null>(null);
  const marchLayerRef = useRef<L.LayerGroup | null>(null);
  const previewLayerRef = useRef<L.LayerGroup | null>(null);
  const controlRadiusLayerRef = useRef<L.LayerGroup | null>(null);
  const parchmentCutoutRef = useRef<L.ImageOverlay | null>(null);
  const parchmentSheetRef = useRef<L.ImageOverlay | null>(null);
  const polygonsMapRef = useRef<Map<string, L.Polygon>>(new Map());

  const [parchmentMode, setParchmentMode] = useState<ParchmentMode>('cutout');
  const [showDistricts, setShowDistricts] = useState<boolean>(true);
  const [hoveredDistrictId, setHoveredDistrictId] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [showTacticalPanel, setShowTacticalPanel] = useState<boolean>(false);
  const [activeMarchRoute, setActiveMarchRoute] = useState<MarchCalculationResult | null>(null);

  // Danh sách polygon các huyện (hỗ trợ lưu chỉnh sửa vào localStorage)
  const [districtsList, setDistrictsList] = useState<DistrictInfo[]>(() => {
    const defaultDistricts: DistrictInfo[] = (districtData as any).districts || [];
    try {
      const saved = localStorage.getItem(DISTRICT_STORAGE_KEY);
      if (saved) {
        const parsed: DistrictInfo[] = JSON.parse(saved);
        let hasFixed = false;
        const repaired = parsed.map(d => {
          const defaultD = defaultDistricts.find(def => def.id === d.id);
          const repairedPolygon = d.polygon.map((pt, idx) => {
            if (defaultD && defaultD.polygon[idx] && (pt[0] < 5 || pt[1] < 5)) {
              const defPt = defaultD.polygon[idx];
              if (defPt[0] > 20 && defPt[1] > 20) {
                hasFixed = true;
                if (Math.abs(pt[0] * 100 - defPt[0]) < 10 && Math.abs(pt[1] * 100 - defPt[1]) < 10) {
                  return [Math.round(pt[0] * 100 * 1000) / 1000, Math.round(pt[1] * 100 * 1000) / 1000] as [number, number];
                }
                return defPt;
              }
            }
            return pt;
          });
          return {
            ...d,
            polygon: repairedPolygon,
          };
        });

        if (hasFixed) {
          try {
            localStorage.setItem(DISTRICT_STORAGE_KEY, JSON.stringify(repaired));
          } catch {
            // ignore
          }
        }
        return repaired;
      }
    } catch {
      // ignore
    }
    return defaultDistricts;
  });

  const cities = useGameStore(state => state.cities);
  const structures = useGameStore(state => state.structures);
  const placeStructure = useGameStore(state => state.placeStructure);
  const demolishStructure = useGameStore(state => state.demolishStructure);

  const isEditMode = useUIStore(state => state.isEditMode);
  const toggleEditMode = useUIStore(state => state.toggleEditMode);
  const selectedCityId = useUIStore(state => state.selectedCityId);
  const selectCity = useUIStore(state => state.selectCity);
  const selectBase = useUIStore(state => state.selectBase);
  const selectDistrict = useUIStore(state => state.selectDistrict);
  const placementMode = useUIStore(state => state.placementMode);
  const setPlacementMode = useUIStore(state => state.setPlacementMode);
  const baseRelocateMode = useUIStore(state => state.baseRelocateMode);
  const setBaseRelocateMode = useUIStore(state => state.setBaseRelocateMode);
  const showGrid = useUIStore(state => state.showGrid);
  const hoveredCell = useUIStore(state => state.hoveredCell);

  const [selectedStructureMenu, setSelectedStructureMenu] = useState<PlacedStructure | null>(null);

  // Xử lý đặt hoặc di dời công trình / căn cứ dùng chung cho mọi sự kiện click
  const handlePlacementAt = useCallback((latlng: L.LatLng) => {
    const currentBaseRelocate = useUIStore.getState().baseRelocateMode;
    if (currentBaseRelocate) {
      const { x, y } = latLngToPercent(latlng);
      const cell = coordToCell(x, y);
      const { minX, minY, maxX, maxY } = cellToCoord(cell.col, cell.row);
      const snappedX = Math.round(((minX + maxX) / 2) * 100) / 100;
      const snappedY = Math.round(((minY + maxY) / 2) * 100) / 100;

      const matchedDistrict = findDistrictForCoord(snappedX, snappedY, districtsList);
      const latestState = useGameStore.getState();
      const res = latestState.relocateBase(currentBaseRelocate.baseId, snappedX, snappedY, matchedDistrict?.id);
      if (res.success) {
        useUIStore.getState().setBaseRelocateMode(null);
        notify.success(res.message);
      } else {
        notify.error(res.message);
      }
      return;
    }

    const currentPlacement = useUIStore.getState().placementMode;
    if (!currentPlacement) return;

    const { x, y } = latLngToPercent(latlng);
    const latestState = useGameStore.getState();
    let gridSize = currentPlacement.gridSize;
    let farmTier = currentPlacement.farmTier;

    if (currentPlacement.relocateStructureId) {
      const relocating = latestState.structures.find(s => s.id === currentPlacement.relocateStructureId);
      if (relocating) {
        gridSize = gridSize || relocating.gridSize || (relocating.type === 'forge' ? 3 : (relocating.maxWorkers === 50 ? 7 : relocating.maxWorkers === 30 ? 6 : 5));
        farmTier = farmTier || (relocating.type === 'farm' ? (relocating.maxWorkers as 15 | 30 | 50) : undefined);
      }
    } else {
      gridSize = gridSize || (currentPlacement.type === 'forge' ? 3 : (currentPlacement.farmTier === 50 ? 7 : currentPlacement.farmTier === 30 ? 6 : 5));
      farmTier = farmTier || (currentPlacement.type === 'farm' ? (gridSize === 7 ? 50 : gridSize === 6 ? 30 : 15) : undefined);
    }

    const validation = validateCellPlacement(
      x,
      y,
      currentPlacement.type,
      currentPlacement.cityId,
      latestState.cities,
      latestState.structures,
      currentPlacement.relocateStructureId,
      gridSize
    );

    if (!validation.canBuild) {
      notify.warning(validation.reason || 'Vị trí này không hợp lệ để thi công!');
      return;
    }

    if (currentPlacement.relocateStructureId) {
      const res = latestState.relocateStructure(
        currentPlacement.relocateStructureId,
        validation.snappedX,
        validation.snappedY
      );
      if (res.success) {
        setPlacementMode(null);
        notify.success(res.message);
      } else {
        notify.error(res.message);
      }
    } else {
      const res = latestState.placeStructure(
        currentPlacement.cityId,
        currentPlacement.type,
        validation.snappedX,
        validation.snappedY,
        gridSize,
        farmTier
      );
      if (res.success) {
        setPlacementMode(null);
        notify.success(res.message);
      } else {
        notify.error(res.message);
      }
    }
  }, [setPlacementMode, districtsList]);

  const handlePlacementAtRef = useRef(handlePlacementAt);
  useEffect(() => {
    handlePlacementAtRef.current = handlePlacementAt;
  }, [handlePlacementAt]);

  // Khởi tạo Leaflet Map
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

    const mapContainer = mapContainerRef.current;
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    mapContainer.addEventListener('contextmenu', handleContextMenu);

    const draggable = (map.dragging as any)._draggable;
    if (draggable) {
      draggable.disable();
      const origOnDown = draggable._onDown;
      draggable._onDown = function (e: any) {
        const isTerrainPainting = useUIStore.getState().terrainEditMode;
        if (isTerrainPainting && !e.touches && (e.button === 0 || e.which === 1)) {
          return;
        }
        if (e.button === 2 || e.which === 3) {
          const fakeEvent = new Proxy(e, {
            get(target, prop) {
              if (prop === 'which' || prop === 'button') return 1;
              const val = (target as any)[prop];
              return typeof val === 'function' ? val.bind(target) : val;
            },
          });
          return origOnDown.call(this, fakeEvent);
        }
        return origOnDown.call(this, e);
      };
      draggable.enable();
    }

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

    map.createPane('districtsPane');
    const dPane = map.getPane('districtsPane');
    if (dPane) dPane.style.zIndex = '450';

    map.createPane('structuresPane');
    const sPane = map.getPane('structuresPane');
    if (sPane) {
      sPane.style.zIndex = '650';
      sPane.style.pointerEvents = 'auto';
    }

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
        const initialCenterPt = percentToLatLng(54.5, 47.5);
        const initialZoomVal = Math.max(minCoverZoom, minCoverZoom + 1.15);
        map.setView(initialCenterPt, initialZoomVal);
      } else if (map.getZoom() < minCoverZoom) {
        map.setZoom(minCoverZoom);
      }
    };

    const fullMapBounds = L.latLngBounds(
      percentToLatLng(0, 100),
      percentToLatLng(100, 0)
    );

    const riversOverlay = L.imageOverlay('/map_rivers.svg', fullMapBounds, {
      opacity: 0.95,
      interactive: false,
      zIndex: 15,
    }).addTo(map);

    const bordersOverlay = L.imageOverlay('/map_borders.svg', fullMapBounds, {
      opacity: 0.9,
      interactive: false,
      zIndex: 20,
    }).addTo(map);

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

    const linesLayer = L.layerGroup().addTo(map);
    const labelsLayer = L.layerGroup().addTo(map);
    const vertexHandlesLayer = L.layerGroup().addTo(map);
    const controlRadiusLayer = L.layerGroup().addTo(map);
    const nodesLayer = L.layerGroup().addTo(map);
    const structuresLayer = L.layerGroup().addTo(map);
    const marchLayer = L.layerGroup().addTo(map);
    const previewLayer = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    linesLayerRef.current = linesLayer;
    labelsLayerRef.current = labelsLayer;
    vertexHandlesLayerRef.current = vertexHandlesLayer;
    controlRadiusLayerRef.current = controlRadiusLayer;
    nodesLayerRef.current = nodesLayer;
    structuresLayerRef.current = structuresLayer;
    marchLayerRef.current = marchLayer;
    previewLayerRef.current = previewLayer;

    setMapInstance(map);

    const currentPolygonsMap = polygonsMapRef.current;
    return () => {
      isDisposed = true;
      mapContainer?.removeEventListener('contextmenu', handleContextMenu);
      clearTimeout(initTimer);
      window.removeEventListener('resize', handleResize);
      currentPolygonsMap.clear();
      map.remove();
      mapInstanceRef.current = null;
      setMapInstance(null);
    };
  }, []);

  // Chuyển đổi chế độ hiển thị Sa bàn Giấy Da Cừu
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

  // Lướt camera tới cứ điểm khi chọn từ danh sách Quân Thư
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

  // Hook quản lý Polygon ranh giới huyện
  const { resetSingleDistrict, importDistrictsList } = useDistrictPolygons({
    mapInstance,
    districtsList,
    setDistrictsList,
    showDistricts,
    parchmentMode,
    hoveredDistrictId,
    setHoveredDistrictId,
    selectedCityId,
    cities,
    isEditMode,
    selectDistrict,
    polygonsMapRef,
    labelsLayerRef,
    vertexHandlesLayerRef,
    handlePlacementAtRef,
  });

  // Hook quản lý Markers Căn cứ & Cứ điểm
  useCityMarkers({
    mapInstance,
    nodesLayerRef,
    cities,
    districtsList,
    selectBase,
    handlePlacementAtRef,
  });

  // Hook quản lý Markers Công trình (Ruộng nương & Lò rèn)
  useStructureMarkers({
    mapInstance,
    structuresLayerRef,
    structures,
    cities,
    onSelectStructureMenu: setSelectedStructureMenu,
    handlePlacementAtRef,
  });

  // Hook quản lý Tuyến đường Hành quân Chiến thuật
  useTacticalMarchLayer({
    marchLayerRef,
    activeMarchRoute,
  });

  // Hook quản lý Preview & Thao tác cắm mốc xây dựng / di dời
  useMapPlacement({
    mapInstance,
    previewLayerRef,
    controlRadiusLayerRef,
    placementMode,
    baseRelocateMode,
    districtsList,
    setPlacementMode,
    setBaseRelocateMode,
    handlePlacementAtRef,
  });

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
          onResetCurrentDistrict={resetSingleDistrict}
          onImportDistricts={importDistrictsList}
        />
      )}

      {/* Thanh điều khiển Chế độ Di dời Căn cứ & Cắm mốc Xây dựng */}
      <PlacementControlBar
        baseRelocateMode={baseRelocateMode}
        placementMode={placementMode}
        cities={cities}
        structures={structures}
        onCancelBaseRelocate={() => setBaseRelocateMode(null)}
        onCancelPlacement={() => setPlacementMode(null)}
        onSetPlacementGridSize={(gridSize, farmTier) => {
          if (placementMode) {
            setPlacementMode({
              ...placementMode,
              gridSize,
              farmTier,
            });
          }
        }}
      />

      {/* Modal thông tin chi tiết công trình dạng Giấy Dó */}
      {selectedStructureMenu && (
        <StructureDetailModal
          structure={selectedStructureMenu}
          onClose={() => setSelectedStructureMenu(null)}
          onRelocate={(s) => {
            setSelectedStructureMenu(null);
            setPlacementMode({
              type: s.type,
              cityId: s.cityId,
              gridSize: s.gridSize || (s.type === 'forge' ? 3 : (s.maxWorkers === 50 ? 7 : s.maxWorkers === 30 ? 6 : 5)),
              farmTier: s.type === 'farm' ? (s.maxWorkers as 15 | 30 | 50) : undefined,
              relocateStructureId: s.id,
            });
          }}
          onDemolish={(s) => {
            notify.confirm({
              title: 'Phá Dỡ Công Trình',
              message: `Bạn có chắc chắn muốn phá dỡ [${cleanStructureName(s.name)}]?\n\nBạn sẽ thu hồi 50% vàng phế liệu và giải phóng tráng phu về rảnh rỗi.`,
              confirmText: 'Phá Dỡ',
              cancelText: 'Giữ Lại',
              onConfirm: () => {
                setSelectedStructureMenu(null);
                const res = demolishStructure(s.id);
                if (res.success) notify.success(res.message);
                else notify.error(res.message);
              },
            });
          }}
          onOpenCity={(cityId) => {
            selectCity(cityId);
            setSelectedStructureMenu(null);
          }}
        />
      )}

      {/* Tấm Lưới Ô Địa Hình Canvas (Grid 0.5% & Sơn Địa Hình) */}
      <TerrainGridOverlay map={mapInstance} />

      {/* HUD Thông tin Ô Lưới Địa Hình & Tác Chiến khi rê chuột */}
      <TerrainInspectHUD
        showGrid={showGrid}
        hoveredCell={hoveredCell}
        placementMode={placementMode}
        isEditMode={isEditMode}
      />

      {/* Thanh chuyển đổi chế độ xem Sa bàn Giấy Da Cừu */}
      <ParchmentControls
        parchmentMode={parchmentMode}
        onChangeMode={setParchmentMode}
        showDistricts={showDistricts}
        onToggleDistricts={() => setShowDistricts(prev => !prev)}
        showTacticalPanel={showTacticalPanel}
        onToggleTacticalPanel={() => setShowTacticalPanel(prev => !prev)}
      />

      {/* Bảng Hành Quân Chiến Thuật và Phân Tích Địa Hình */}
      {showTacticalPanel && (
        <TerrainTacticalPanel
          selectedCity={cities.find(c => c.id === selectedCityId) || null}
          allCities={cities}
          onSelectCity={(cityId) => selectBase(cityId)}
          showTerrainZones={useUIStore.getState().showTerrainOverlay}
          onToggleTerrainZones={() => useUIStore.getState().toggleTerrainOverlay()}
          activeMarchRoute={activeMarchRoute}
          onSetMarchRoute={setActiveMarchRoute}
          onClose={() => setShowTacticalPanel(false)}
        />
      )}

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
            const gridSize = data.gridSize || (data.type === 'forge' ? 3 : (data.farmTier === 50 ? 7 : data.farmTier === 30 ? 6 : 5));
            const farmTier = data.farmTier || (data.type === 'farm' ? (gridSize === 7 ? 50 : gridSize === 6 ? 30 : 15) : undefined);

            const validation = validateCellPlacement(
              x,
              y,
              data.type,
              data.cityId,
              latestState.cities,
              latestState.structures,
              undefined,
              gridSize
            );

            if (!validation.canBuild) {
              notify.warning(validation.reason || 'Không thể cắm mốc tại ô này!');
              return;
            }

            const res = placeStructure(data.cityId, data.type, validation.snappedX, validation.snappedY, gridSize, farmTier);
            if (res.success) notify.success(res.message);
            else notify.error(res.message);
          } catch {
            // ignore
          }
        }}
      />
    </div>
  );
});

WorldMap.displayName = 'WorldMap';
