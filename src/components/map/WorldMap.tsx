import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
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
import { StructureDetailModal } from './StructureDetailModal';
import { PlacementControlBar } from './overlay/PlacementControlBar';
import { TerrainInspectHUD } from './overlay/TerrainInspectHUD';
import { MarchRouteDrawerOverlay } from './overlay/MarchRouteDrawerOverlay';
import { WorldCombatHUD } from './overlay/WorldCombatHUD';
import { useDistrictPolygons, DISTRICT_STORAGE_KEY } from './hooks/useDistrictPolygons';
import { useCityMarkers } from './hooks/useCityMarkers';
import { useStructureMarkers } from './hooks/useStructureMarkers';
import { useMapPlacement } from './hooks/useMapPlacement';
import { useArmyMarchLayer } from './hooks/useArmyMarchLayer';
import { notify } from '../../store/dialogStore';
import { cleanStructureName } from '../../utils/formatters';

export const WorldMap: React.FC = React.memo(() => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const linesLayerRef = useRef<L.LayerGroup | null>(null);
  const labelsLayerRef = useRef<L.LayerGroup | null>(null);
  const vertexHandlesLayerRef = useRef<L.LayerGroup | null>(null);
  const nodesLayerRef = useRef<L.LayerGroup | null>(null);
  const structuresLayerRef = useRef<L.LayerGroup | null>(null);
  const armyLayerRef = useRef<L.LayerGroup | null>(null);
  const previewLayerRef = useRef<L.LayerGroup | null>(null);
  const controlRadiusLayerRef = useRef<L.LayerGroup | null>(null);
  const parchmentCutoutRef = useRef<L.ImageOverlay | null>(null);
  const parchmentSheetRef = useRef<L.ImageOverlay | null>(null);
  const bordersOverlayRef = useRef<L.ImageOverlay | null>(null);
  const satelliteOverlayRef = useRef<L.ImageOverlay | null>(null);
  const polygonsMapRef = useRef<Map<string, L.Polygon>>(new Map());

  const [parchmentMode, setParchmentMode] = useState<ParchmentMode>('cutout');
  const [showDistricts, setShowDistricts] = useState<boolean>(true);
  const [showCountryBorders, setShowCountryBorders] = useState<boolean>(true);
  const [showSatelliteRef, setShowSatelliteRef] = useState<boolean>(false);
  const [satelliteOpacity, setSatelliteOpacity] = useState<number>(0.55);
  const [hoveredDistrictId, setHoveredDistrictId] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [isTransformAllMode, setIsTransformAllMode] = useState<boolean>(false);
  const isTransformAllRef = useRef<boolean>(false);
  const [transformTarget, setTransformTarget] = useState<'all' | 'districts' | 'borders' | 'satellite'>('all');
  const transformTargetRef = useRef<'all' | 'districts' | 'borders' | 'satellite'>('all');
  const [transformState, setTransformState] = useState<{ offsetX: number; offsetY: number; scale: number }>({
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  });
  const transformBaseRef = useRef<DistrictInfo[] | null>(null);
  const transformPivotRef = useRef<[number, number]>([50, 50]);
  const districtsListRef = useRef<DistrictInfo[]>([]);

  const BORDERS_BOUNDS_STORAGE_KEY = 'lam_son_borders_bounds_v2';
  const SATELLITE_BOUNDS_STORAGE_KEY = 'lam_son_satellite_bounds_v2';
  const DEFAULT_BORDERS_BOUNDS = { xMin: -0.874, yMin: 16.565, xMax: 101.126, yMax: 83.593 };
  const [bordersBounds, setBordersBounds] = useState<{ xMin: number; yMin: number; xMax: number; yMax: number }>(() => {
    try {
      const saved = localStorage.getItem(BORDERS_BOUNDS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.xMin === 'number' && typeof parsed.yMin === 'number' && typeof parsed.xMax === 'number' && typeof parsed.yMax === 'number') {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return (districtData as any).bordersBounds || DEFAULT_BORDERS_BOUNDS;
  });
  const bordersBaseRef = useRef<{ xMin: number; yMin: number; xMax: number; yMax: number } | null>(null);
  const bordersBoundsRef = useRef(bordersBounds);

  const [satelliteBounds, setSatelliteBounds] = useState<{ xMin: number; yMin: number; xMax: number; yMax: number }>(() => {
    try {
      const saved = localStorage.getItem(SATELLITE_BOUNDS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.xMin === 'number' && typeof parsed.yMin === 'number' && typeof parsed.xMax === 'number' && typeof parsed.yMax === 'number') {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_BORDERS_BOUNDS;
  });
  const satelliteBaseRef = useRef<{ xMin: number; yMin: number; xMax: number; yMax: number } | null>(null);
  const satelliteBoundsRef = useRef(satelliteBounds);

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
  const selectedStructureMenu = useUIStore(state => state.selectedStructureModal);
  const setSelectedStructureMenu = useUIStore(state => state.setSelectedStructureModal);

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
        gridSize = gridSize || relocating.gridSize || (relocating.type === 'forge' ? 3 : (relocating.maxWorkers === 50 ? 7 : (relocating.maxWorkers === 35 || relocating.maxWorkers === 30) ? 6 : 5));
        farmTier = farmTier || (relocating.type === 'farm' ? (relocating.maxWorkers as 25 | 35 | 50) : undefined);
      }
    } else {
      gridSize = gridSize || (currentPlacement.type === 'forge' ? 3 : (currentPlacement.farmTier === 50 ? 7 : currentPlacement.farmTier === 35 ? 6 : 5));
      farmTier = farmTier || (currentPlacement.type === 'farm' ? (gridSize === 7 ? 50 : gridSize === 6 ? 35 : 25) : undefined);
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
        const uiState = useUIStore.getState();
        const isLeftMouseDrawActive =
          uiState.terrainEditMode ||
          Boolean(uiState.marchDrawMode) ||
          (uiState.isEditMode && isTransformAllRef.current);
        if (isLeftMouseDrawActive && !e.touches && (e.button === 0 || e.which === 1)) {
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

    map.on('zoomend', () => {
      const z = map.getZoom();
      if (z < 4.2) return;
      const ui = useUIStore.getState();
      if (ui.activeRegion3D || ui.placementMode || ui.baseRelocateMode || ui.marchDrawMode) return;
      const centerPct = latLngToPercent(map.getCenter());
      const gs = useGameStore.getState();
      let nearest: (typeof gs.cities)[number] | null = null;
      let minDist = Infinity;
      for (const c of gs.cities) {
        const d = Math.hypot(c.x - centerPct.x, c.y - centerPct.y);
        if (d < 8 && d < minDist) {
          minDist = d;
          nearest = c;
        }
      }
      if (!nearest) return;
      if (nearest.faction === 'lam_son' || nearest.hasBase) {
        map.setZoom(3.2, { animate: false });
        ui.setActiveRegion3D({ cityId: nearest.id, mode: 'base_build' });
      } else if (gs.scoutedRegionIds[nearest.id] || (nearest.assignedScouts || 0) > 0) {
        map.setZoom(3.2, { animate: false });
        ui.setActiveRegion3D({ cityId: nearest.id, mode: 'scout_view' });
      }
    });

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

    const initSat = satelliteBoundsRef.current;
    const satelliteOverlay = L.imageOverlay(
      '/satellite_reference.jpg',
      L.latLngBounds(
        percentToLatLng(initSat.xMin, initSat.yMax),
        percentToLatLng(initSat.xMax, initSat.yMin)
      ),
      {
        opacity: 0,
        interactive: false,
        zIndex: 15,
      }
    ).addTo(map);
    satelliteOverlayRef.current = satelliteOverlay;

    const initBorders = bordersBoundsRef.current;
    const bordersOverlay = L.imageOverlay(
      '/map_borders.svg',
      L.latLngBounds(
        percentToLatLng(initBorders.xMin, initBorders.yMax),
        percentToLatLng(initBorders.xMax, initBorders.yMin)
      ),
      {
        opacity: 0.9,
        interactive: false,
        zIndex: 20,
      }
    ).addTo(map);
    bordersOverlayRef.current = bordersOverlay;

    const initTimer = setTimeout(() => {
      if (isDisposed) return;
      map.invalidateSize();
      updateView(true);
      if (!(satelliteOverlay as any)._map) (satelliteOverlay as any)._layerAdd({ target: map });
      if (!(bordersOverlay as any)._map) (bordersOverlay as any)._layerAdd({ target: map });
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
    const armyLayer = L.layerGroup().addTo(map);
    const previewLayer = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    linesLayerRef.current = linesLayer;
    labelsLayerRef.current = labelsLayer;
    vertexHandlesLayerRef.current = vertexHandlesLayer;
    controlRadiusLayerRef.current = controlRadiusLayer;
    nodesLayerRef.current = nodesLayer;
    structuresLayerRef.current = structuresLayer;
    armyLayerRef.current = armyLayer;
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

  // Lướt camera tới tọa độ được yêu cầu từ thanh lệnh hoặc bảng quản lý
  const flyToTarget = useUIStore(state => state.flyToTarget);
  const setFlyToTarget = useUIStore(state => state.setFlyToTarget);

  useEffect(() => {
    if (!flyToTarget) return;
    const map = mapInstanceRef.current;
    if (!map) return;
    try {
      const targetLatLng = percentToLatLng(flyToTarget.x, flyToTarget.y);
      map.flyTo(targetLatLng, Math.max(map.getZoom(), 2.4), { duration: 0.8 });
    } catch {
      // ignore
    }
    setFlyToTarget(null);
  }, [flyToTarget, setFlyToTarget]);

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

  const applyTransformState = useCallback((nextTransform: { offsetX: number; offsetY: number; scale: number }) => {
    const round3 = (n: number) => Math.round(n * 1000) / 1000;
    const { offsetX, offsetY, scale } = nextTransform;
    const target = transformTargetRef.current;

    if (target === 'all' || target === 'districts') {
      const base = transformBaseRef.current;
      if (base) {
        const [pivotX, pivotY] = transformPivotRef.current;
        const next = base.map(d => ({
          ...d,
          center: [
            round3(pivotX + (d.center[0] - pivotX) * scale + offsetX),
            round3(pivotY + (d.center[1] - pivotY) * scale + offsetY),
          ] as [number, number],
          polygon: d.polygon.map(([px, py]) => [
            round3(pivotX + (px - pivotX) * scale + offsetX),
            round3(pivotY + (py - pivotY) * scale + offsetY),
          ] as [number, number]),
        }));
        setDistrictsList(next);
        try {
          localStorage.setItem(DISTRICT_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
      }
    }

    if (target === 'all' || target === 'borders') {
      const baseBorders = bordersBaseRef.current;
      if (baseBorders) {
        const [px, py] = target === 'all'
          ? transformPivotRef.current
          : [(baseBorders.xMin + baseBorders.xMax) / 2, (baseBorders.yMin + baseBorders.yMax) / 2];
        const nextBorders = {
          xMin: round3(px + (baseBorders.xMin - px) * scale + offsetX),
          yMin: round3(py + (baseBorders.yMin - py) * scale + offsetY),
          xMax: round3(px + (baseBorders.xMax - px) * scale + offsetX),
          yMax: round3(py + (baseBorders.yMax - py) * scale + offsetY),
        };
        setBordersBounds(nextBorders);
        try {
          localStorage.setItem(BORDERS_BOUNDS_STORAGE_KEY, JSON.stringify(nextBorders));
        } catch {
          // ignore
        }
      }
    }

    if (target === 'satellite') {
      const baseSat = satelliteBaseRef.current;
      if (!baseSat) return;
      const px = (baseSat.xMin + baseSat.xMax) / 2;
      const py = (baseSat.yMin + baseSat.yMax) / 2;
      const nextSat = {
        xMin: round3(px + (baseSat.xMin - px) * scale + offsetX),
        yMin: round3(py + (baseSat.yMin - py) * scale + offsetY),
        xMax: round3(px + (baseSat.xMax - px) * scale + offsetX),
        yMax: round3(py + (baseSat.yMax - py) * scale + offsetY),
      };
      setSatelliteBounds(nextSat);
      try {
        localStorage.setItem(SATELLITE_BOUNDS_STORAGE_KEY, JSON.stringify(nextSat));
      } catch {
        // ignore
      }
    }
  }, []);

  const captureTransformSnapshot = useCallback((sourceList: DistrictInfo[]) => {
    transformBaseRef.current = sourceList.map(d => ({
      ...d,
      center: [...d.center] as [number, number],
      polygon: d.polygon.map(pt => [...pt] as [number, number]),
    }));
    bordersBaseRef.current = { ...bordersBoundsRef.current };
    satelliteBaseRef.current = { ...satelliteBoundsRef.current };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const d of sourceList) {
      for (const [px, py] of d.polygon) {
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
    }
    transformPivotRef.current = Number.isFinite(minX)
      ? [(minX + maxX) / 2, (minY + maxY) / 2]
      : [50, 50];
    setTransformState({ offsetX: 0, offsetY: 0, scale: 1 });
  }, []);

  // Kéo thả chuột trái & giữ Shift + cuộn chuột để di chuyển và thu phóng lớp đang chọn (chuột phải luôn kéo di chuyển bản đồ)
  useEffect(() => {
    isTransformAllRef.current = isTransformAllMode;
    const map = mapInstanceRef.current;
    const container = mapContainerRef.current;
    if (!map || !container) return;

    const activeTransform = isEditMode && isTransformAllMode;
    if (!activeTransform) {
      container.style.cursor = '';
      transformBaseRef.current = null;
      return;
    }

    if (!transformBaseRef.current) {
      captureTransformSnapshot(districtsListRef.current);
    }

    container.style.cursor = 'move';

    let isDragging = false;
    let lastClientX = 0;
    let lastClientY = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      isDragging = true;
      lastClientX = e.clientX;
      lastClientY = e.clientY;
      container.style.cursor = 'grabbing';
      container.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const rect = container.getBoundingClientRect();
      const prevPt = L.point(lastClientX - rect.left, lastClientY - rect.top);
      const currPt = L.point(e.clientX - rect.left, e.clientY - rect.top);
      const prevLatLng = map.containerPointToLatLng(prevPt);
      const currLatLng = map.containerPointToLatLng(currPt);

      const dLng = currLatLng.lng - prevLatLng.lng;
      const dLat = currLatLng.lat - prevLatLng.lat;

      lastClientX = e.clientX;
      lastClientY = e.clientY;

      setTransformState(prev => {
        const next = {
          ...prev,
          offsetX: Math.round((prev.offsetX + (dLng / MAP_COORD_W) * 100) * 1000) / 1000,
          offsetY: Math.round((prev.offsetY - (dLat / MAP_COORD_H) * 100) * 1000) / 1000,
        };
        applyTransformState(next);
        return next;
      });
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      container.style.cursor = 'move';
      if (container.hasPointerCapture(e.pointerId)) {
        container.releasePointerCapture(e.pointerId);
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!e.shiftKey) return;
      e.preventDefault();
      e.stopPropagation();
      const factor = e.deltaY < 0 ? 1.04 : 1 / 1.04;
      setTransformState(prev => {
        const next = {
          ...prev,
          scale: Math.max(0.2, Math.min(5.0, Math.round(prev.scale * factor * 1000) / 1000)),
        };
        applyTransformState(next);
        return next;
      });
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      map.dragging.enable();
      container.style.cursor = '';
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);
      container.removeEventListener('wheel', onWheel);
    };
  }, [isEditMode, isTransformAllMode, applyTransformState, captureTransformSnapshot]);

  // Hook quản lý Quân kỳ Đạo quân & Lộ trình hành quân trên lưới
  useArmyMarchLayer({
    mapInstance,
    armyLayerRef,
  });

  useEffect(() => {
    districtsListRef.current = districtsList;
  }, [districtsList]);

  useEffect(() => {
    satelliteBoundsRef.current = satelliteBounds;
    const overlay = satelliteOverlayRef.current;
    if (!overlay) return;
    overlay.setBounds(
      L.latLngBounds(
        percentToLatLng(satelliteBounds.xMin, satelliteBounds.yMax),
        percentToLatLng(satelliteBounds.xMax, satelliteBounds.yMin)
      )
    );
    overlay.setOpacity(isEditMode && showSatelliteRef ? satelliteOpacity : 0);
  }, [satelliteBounds, isEditMode, showSatelliteRef, satelliteOpacity]);

  useEffect(() => {
    transformTargetRef.current = transformTarget;
    if (isEditMode && isTransformAllMode) {
      captureTransformSnapshot(districtsListRef.current);
    }
  }, [transformTarget, isEditMode, isTransformAllMode, captureTransformSnapshot]);

  useEffect(() => {
    bordersBoundsRef.current = bordersBounds;
    const overlay = bordersOverlayRef.current;
    if (!overlay) return;
    overlay.setBounds(
      L.latLngBounds(
        percentToLatLng(bordersBounds.xMin, bordersBounds.yMax),
        percentToLatLng(bordersBounds.xMax, bordersBounds.yMin)
      )
    );
    overlay.setOpacity(showCountryBorders && showDistricts ? 0.9 : 0);
  }, [bordersBounds, showCountryBorders, showDistricts]);

  return (
    <div className="absolute inset-0 z-0 bg-[#16171a] overflow-hidden">
      {/* Giao diện Vẽ Đường Hành Quân Tự Do Trên Lưới & Bảng Lệnh Đạo Quân */}
      <MarchRouteDrawerOverlay map={mapInstance} />
      {/* Bảng Chỉ Huy Chiến Trường Thời Gian Thực */}
      <WorldCombatHUD />
      {/* Banner thông báo chế độ Sửa Map & Bộ công cụ tinh chỉnh ranh giới */}
      {isEditMode && (
        <DistrictEditorBar
          selectedCityId={selectedCityId}
          districtsList={districtsList}
          onSelectCity={selectCity}
          onToggleEditMode={() => {
            setIsTransformAllMode(false);
            toggleEditMode();
          }}
          storageKey={DISTRICT_STORAGE_KEY}
          onResetCurrentDistrict={resetSingleDistrict}
          onImportDistricts={importDistrictsList}
          onChangeTransformAllMode={setIsTransformAllMode}
          transformState={transformState}
          onUpdateTransformState={(updater) => {
            setTransformState(prev => {
              const next = typeof updater === 'function' ? updater(prev) : updater;
              applyTransformState(next);
              return next;
            });
          }}
          onResetTransform={() => {
            const next = { offsetX: 0, offsetY: 0, scale: 1 };
            setTransformState(next);
            applyTransformState(next);
          }}
          showCountryBorders={showCountryBorders}
          onToggleCountryBorders={() => setShowCountryBorders(prev => !prev)}
          bordersBounds={bordersBounds}
          transformTarget={transformTarget}
          onChangeTransformTarget={(t) => {
            setTransformTarget(t);
            if (t === 'satellite') setShowSatelliteRef(true);
            if (t === 'borders') setShowCountryBorders(true);
          }}
          showSatelliteRef={showSatelliteRef}
          onToggleSatelliteRef={() => setShowSatelliteRef(prev => !prev)}
          satelliteOpacity={satelliteOpacity}
          onChangeSatelliteOpacity={setSatelliteOpacity}
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
              gridSize: s.gridSize || (s.type === 'forge' ? 3 : (s.maxWorkers === 50 ? 7 : (s.maxWorkers === 35 || s.maxWorkers === 30) ? 6 : 5)),
              farmTier: s.type === 'farm' ? (s.maxWorkers as 25 | 35 | 50) : undefined,
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
            const gridSize = data.gridSize || (data.type === 'forge' ? 3 : (data.farmTier === 50 ? 7 : data.farmTier === 35 ? 6 : 5));
            const farmTier = data.farmTier || (data.type === 'farm' ? (gridSize === 7 ? 50 : gridSize === 6 ? 35 : 25) : undefined);

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
