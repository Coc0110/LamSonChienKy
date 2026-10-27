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
import { TERRAIN_DEFINITIONS } from '../../data/terrainData';
import type { TerrainType } from '../../types/terrain';
import {
  GRID_CELL_W_PCT,
  GRID_CELL_H_PCT,
  validateCellPlacement,
  validateBaseRelocate,
  coordToCell,
  getGridTerrain,
  cellToCoord,
  getCampGridSize,
  getCityGridSize,
  getStructureGridSize,
  getEntityCellBounds,
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
    const defaultDistricts: DistrictInfo[] = (districtData as any).districts || [];
    try {
      const saved = localStorage.getItem(DISTRICT_STORAGE_KEY);
      if (saved) {
        const parsed: DistrictInfo[] = JSON.parse(saved);
        // Tự động kiểm tra và phục hồi các đỉnh bị lỗi văng ra góc trên bên trái do bug chia 100
        let hasFixed = false;
        const repaired = parsed.map(d => {
          const defaultD = defaultDistricts.find(def => def.id === d.id);
          const repairedPolygon = d.polygon.map((pt, idx) => {
            if (defaultD && defaultD.polygon[idx] && (pt[0] < 5 || pt[1] < 5)) {
              const defPt = defaultD.polygon[idx];
              if (defPt[0] > 20 && defPt[1] > 20) {
                hasFixed = true;
                // Nếu tọa độ x * 100 gần bằng defPt[0], khôi phục giá trị đã scale 100
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
  const connections = useGameStore(state => state.connections);
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

  // Popover thao tác nhanh khi nhấp chọn cơ quan/công trình trên bản đồ
  const [selectedStructureMenu, setSelectedStructureMenu] = useState<PlacedStructure | null>(null);

  // Hàm xử lý đặt hoặc di dời công trình / căn cứ dùng chung cho mọi sự kiện click (polygon, marker, base map)
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
      }
      alert(res.message);
      return;
    }

    const currentPlacement = useUIStore.getState().placementMode;
    if (!currentPlacement) return;

    const { x, y } = latLngToPercent(latlng);
    const latestState = useGameStore.getState();
    const validation = validateCellPlacement(
      x,
      y,
      currentPlacement.type,
      currentPlacement.cityId,
      latestState.cities,
      latestState.structures,
      currentPlacement.relocateStructureId
    );

    if (!validation.canBuild) {
      alert(validation.reason || 'Vị trí này không hợp lệ để thi công!');
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
      }
      alert(res.message);
    } else {
      const res = latestState.placeStructure(
        currentPlacement.cityId,
        currentPlacement.type,
        validation.snappedX,
        validation.snappedY
      );
      if (res.success) {
        setPlacementMode(null);
      }
      alert(res.message);
    }
  }, [setPlacementMode]);

  const handlePlacementAtRef = useRef(handlePlacementAt);
  useEffect(() => {
    handlePlacementAtRef.current = handlePlacementAt;
  }, [handlePlacementAt]);

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

    // Chuyển thao tác kéo di chuyển bản đồ:
    // - Khi ở chế độ Sơn Địa Hình (terrainEditMode): chuột trái dùng để sơn vẽ ô lưới, chuột phải kéo map
    // - Bình thường / Nắn ranh giới: Chuột trái hoặc Chuột phải đều kéo di chuyển bản đồ mượt mà
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

        // Nếu đang trong chế độ Sơn Vẽ Địa Hình và bấm chuột trái -> bỏ qua để chuột trái sơn ô lưới
        if (isTerrainPainting && !e.touches && (e.button === 0 || e.which === 1)) {
          return;
        }

        // Hỗ trợ kéo di chuyển bản đồ bằng chuột phải (Right-click drag)
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

        // Chuột trái thông thường và cảm ứng màn hình -> kéo bản đồ bình thường
        return origOnDown.call(this, e);
      };
      draggable.enable();
    }

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
      mapContainer?.removeEventListener('contextmenu', handleContextMenu);
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

  // Khôi phục ranh giới của một huyện về mặc định ban đầu
  const resetSingleDistrict = (districtId: string) => {
    const defaultDistricts: DistrictInfo[] = (districtData as any).districts || [];
    const defaultD = defaultDistricts.find(d => d.id === districtId);
    if (!defaultD) return;

    setDistrictsList(prev => {
      const next = prev.map(d => (d.id === districtId ? { ...defaultD, polygon: [...defaultD.polygon] } : d));
      try {
        localStorage.setItem(DISTRICT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Thêm đỉnh mới khi nhấp chuột lên đoạn đường viền ranh giới (bẻ gãy đường kẻ)
  const insertDistrictPolygonVertex = (districtId: string, clickX: number, clickY: number) => {
    setDistrictsList(prev => {
      const next = prev.map(d => {
        if (d.id !== districtId) return d;
        const poly = d.polygon;
        if (poly.length < 2) return d;

        let bestSegIdx = 0;
        let minDistance = Infinity;
        let bestProjectedPt: [number, number] = [clickX, clickY];

        for (let i = 0; i < poly.length - 1; i++) {
          const a = poly[i];
          const b = poly[i + 1];

          const abX = b[0] - a[0];
          const abY = b[1] - a[1];
          const lenSq = abX * abX + abY * abY;

          let t = lenSq === 0 ? 0 : ((clickX - a[0]) * abX + (clickY - a[1]) * abY) / lenSq;
          t = Math.max(0, Math.min(1, t));

          const projX = a[0] + t * abX;
          const projY = a[1] + t * abY;
          const dist = Math.hypot(clickX - projX, clickY - projY);

          if (dist < minDistance) {
            minDistance = dist;
            bestSegIdx = i;
            bestProjectedPt = [
              Math.round(projX * 1000) / 1000,
              Math.round(projY * 1000) / 1000,
            ];
          }
        }

        const newPoly = [...poly];
        newPoly.splice(bestSegIdx + 1, 0, bestProjectedPt);
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

  // Xóa / Gộp đỉnh khi kéo chồng 2 nút lên nhau
  const deleteDistrictPolygonVertex = (districtId: string, vertexIndex: number) => {
    setDistrictsList(prev => {
      const next = prev.map(d => {
        if (d.id !== districtId) return d;
        if (d.polygon.length <= 4) {
          // Cần tối thiểu 3 đỉnh duy nhất + 1 đỉnh khép vòng
          alert('Không thể gộp: Đa giác cần có tối thiểu 3 đỉnh!');
          return d;
        }

        let newPoly = [...d.polygon];
        const lastIdx = newPoly.length - 1;

        if (vertexIndex === 0 || vertexIndex === lastIdx) {
          newPoly.splice(0, 1);
          newPoly[newPoly.length - 1] = [...newPoly[0]];
        } else {
          newPoly.splice(vertexIndex, 1);
        }

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

  // Nhập dữ liệu ranh giới từ JSON (mang từ máy khác sang)
  const importDistrictsList = (importedData: DistrictInfo[]) => {
    setDistrictsList(importedData);
    try {
      localStorage.setItem(DISTRICT_STORAGE_KEY, JSON.stringify(importedData));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!mapInstance) return;
    const map = mapInstance;

    // Xóa các polygon cũ trước khi vẽ lại
    polygonsMapRef.current.forEach(p => p.remove());
    polygonsMapRef.current.clear();

    districtsList.forEach(district => {
      const latlngs = district.polygon.map(pt => percentToLatLng(pt[0], pt[1]));
      const poly = L.polygon(latlngs, {
        className: 'district-polygon-interactive',
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

      poly.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (useUIStore.getState().placementMode || useUIStore.getState().baseRelocateMode) {
          handlePlacementAtRef.current(e.latlng);
          return;
        }
        selectDistrict(district.id);
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

    const boundaryLatLngs = currentDistrict.polygon.map(pt => percentToLatLng(pt[0], pt[1]));

    // 1. Đường viền nét đứt vàng nổi bật báo hiệu đa giác đang được chỉnh sửa
    const visualLine = L.polyline(boundaryLatLngs, {
      color: '#f59e0b',
      weight: 3.5,
      opacity: 0.95,
      dashArray: '6, 6',
      pane: 'districtsPane',
      interactive: false,
    });
    visualLine.addTo(handlesLayer);

    // 2. Vùng bấm vô hình (hit-box dày 22px) để nhấp chuột bẻ gãy đường và sinh đỉnh mới
    const hitLine = L.polyline(boundaryLatLngs, {
      color: '#ffffff',
      weight: 22,
      opacity: 0.0001,
      pane: 'districtsPane',
      interactive: true,
      className: 'district-line-add-vertex-hit',
    });

    hitLine.bindTooltip('✦ Nhấp chuột trái để thêm đỉnh mới (bẻ gãy đường)', {
      sticky: true,
      direction: 'top',
      className: 'district-add-vertex-tooltip',
    });

    hitLine.on('click', (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);
      const { x, y } = latLngToPercent(e.latlng);
      insertDistrictPolygonVertex(currentDistrict.id, x, y);
    });

    hitLine.addTo(handlesLayer);

    // 3. Các nút đỉnh (vertex handle markers) & Hỗ trợ kéo chồng lên nhau để Gộp/Xóa
    const defaultIcon = L.divIcon({
      className: 'district-vertex-handle-marker',
      html: '<div style="width: 14px; height: 14px; background: #fbbf24; border: 2.5px solid #991b1b; border-radius: 50%; box-shadow: 0 0 6px rgba(0,0,0,0.9); cursor: crosshair; touch-action: none; transition: transform 0.15s ease, background-color 0.15s ease;"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    currentDistrict.polygon.forEach((pt, idx) => {
      if (idx === currentDistrict.polygon.length - 1 && idx > 0) return;

      const latlng = percentToLatLng(pt[0], pt[1]);

      const handleMarker = L.marker(latlng, {
        icon: defaultIcon,
        draggable: true,
      });

      let snapTargetIdx: number | null = null;
      let isMergingState = false;

      handleMarker.on('drag', (e) => {
        const newPos = e.target.getLatLng();
        snapTargetIdx = null;

        // Kiểm tra xem vị trí mới có đang chồng lên đỉnh nào khác không (ngưỡng 16 pixel trên màn hình)
        if (mapInstance) {
          const pCurrent = mapInstance.latLngToContainerPoint(newPos);

          for (let j = 0; j < currentDistrict.polygon.length - 1; j++) {
            if (j === idx) continue;
            const otherPt = currentDistrict.polygon[j];
            const pOther = mapInstance.latLngToContainerPoint(percentToLatLng(otherPt[0], otherPt[1]));
            const pixelDist = Math.hypot(pCurrent.x - pOther.x, pCurrent.y - pOther.y);

            if (pixelDist <= 16) {
              snapTargetIdx = j;
              break;
            }
          }
        }

        // Đổi giao diện nút mượt mà bằng cách cập nhật style trực tiếp, KHÔNG gọi setIcon()
        // vì setIcon() sẽ hủy và tạo lại DOM node làm đứt đoạn thao tác kéo chuột
        const shouldMerge = snapTargetIdx !== null && currentDistrict.polygon.length > 4;
        if (shouldMerge !== isMergingState) {
          isMergingState = shouldMerge;
          const markerEl = handleMarker.getElement();
          if (markerEl) {
            const inner = markerEl.firstElementChild as HTMLElement;
            if (inner) {
              if (shouldMerge) {
                inner.style.background = '#ef4444';
                inner.style.borderColor = '#ffffff';
                inner.style.boxShadow = '0 0 14px #ef4444';
                inner.style.transform = 'scale(1.35)';
                inner.innerHTML = '<span style="color:#fff;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;height:100%;line-height:1;">✕</span>';
              } else {
                inner.style.background = '#fbbf24';
                inner.style.borderColor = '#991b1b';
                inner.style.boxShadow = '0 0 6px rgba(0,0,0,0.9)';
                inner.style.transform = 'scale(1)';
                inner.innerHTML = '';
              }
            }
          }
        }

        const poly = polygonsMapRef.current.get(currentDistrict.id);
        if (poly) {
          const currentLatLngs = poly.getLatLngs()[0] as L.LatLng[];
          if (currentLatLngs && currentLatLngs[idx]) {
            currentLatLngs[idx] = newPos;
            if (idx === 0) currentLatLngs[currentLatLngs.length - 1] = newPos;
            poly.setLatLngs([currentLatLngs]);
          }
        }

        if (visualLine) {
          const lineLatLngs = visualLine.getLatLngs() as L.LatLng[];
          if (lineLatLngs && lineLatLngs[idx]) {
            lineLatLngs[idx] = newPos;
            if (idx === 0) lineLatLngs[lineLatLngs.length - 1] = newPos;
            visualLine.setLatLngs(lineLatLngs);
          }
        }
      });

      handleMarker.on('dragend', (e) => {
        if (snapTargetIdx !== null && currentDistrict.polygon.length > 4) {
          // Người chơi thả chuột khi 2 nút đang chồng lên nhau -> GỘP VÀ XÓA NÚT!
          setTimeout(() => {
            deleteDistrictPolygonVertex(currentDistrict.id, idx);
          }, 0);
        } else {
          const newPos = e.target.getLatLng();
          const { x, y } = latLngToPercent(newPos);
          setTimeout(() => {
            updateDistrictPolygonVertex(currentDistrict.id, idx, x, y);
          }, 0);
        }
      });

      handleMarker.addTo(handlesLayer);
    });
  }, [isEditMode, selectedCityId, districtsList, mapInstance]);

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

  // 5.5 HIỂN THỊ CĂN CỨ NGHĨA QUÂN & CỨ ĐIỂM QUÂN MINH (GÁN CỨNG 1:1 VÀO KHỐI Ô LƯỚI)
  useEffect(() => {
    if (!mapInstance) return;
    const layer = nodesLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    cities.forEach(city => {
      const troops = city.troops;
      const isLamSonBase = city.faction === 'lam_son' && (city.hasBase || city.id === 'lam_son');
      const isCity = city.type === 'city';

      // Quy tắc gán cứng kích thước ô lưới:
      // Doanh trại: 3x3 (<300), 4x4 (300-1000), 5x5 (1000-10000), 6x6 (>10000)
      // Thành trì: 4x4 (<1000), 5x5 (1000-10000), 6x6 (10000-50000), 7x7 (>50000)
      const gridSize = isCity ? getCityGridSize(troops) : getCampGridSize(troops);
      const bounds = getEntityCellBounds(city.x, city.y, gridSize, city.startCol, city.startRow);

      // Bounding box chuẩn xác khớp từng ô lưới (Leaflet CRS.Simple: y tăng từ trên xuống, lat âm)
      const sw = percentToLatLng(bounds.minX, bounds.maxY);
      const ne = percentToLatLng(bounds.maxX, bounds.minY);
      const imgBounds = L.latLngBounds(sw, ne);

      const iconUrl = isCity || troops >= 8000 ? '/icons/structure_city.png' : '/icons/structure_camp.png';

      // 1. DÙNG L.imageOverlay ĐỂ ICON TỰ ĐỘNG PHÓNG TO / THU NHỎ CHUẨN XÁC THEO Ô LƯỚI
      const overlay = L.imageOverlay(iconUrl, imgBounds, {
        interactive: true,
        pane: 'structuresPane',
        className: `city-grid-overlay cursor-pointer select-none transition-all ${
          isLamSonBase ? 'filter drop-shadow-[0_0_8px_rgba(239,68,68,0.85)]' : 'filter drop-shadow-[0_0_8px_rgba(37,99,235,0.85)]'
        }`,
      });

      const matchedDistrict = findDistrictForCoord(bounds.centerX, bounds.centerY, districtsList);
      const districtName = matchedDistrict?.name || city.name;
      const hasTraining = !!(city.training && city.training.remainingDays > 0);

      overlay.bindTooltip(`
        <div class="px-2.5 py-1.5 rounded-lg bg-[#140e08]/98 border ${isLamSonBase ? 'border-red-500 text-amber-200' : 'border-blue-500 text-sky-200'} shadow-2xl font-serif text-xs whitespace-nowrap">
          <div class="font-bold text-sm ${isLamSonBase ? 'text-red-400' : 'text-sky-300'}">
            ${isLamSonBase ? '★ Đại Bản Doanh' : isCity ? '◆ Thành Trì' : '▲ Doanh Trại'} ${city.name} [${gridSize}x${gridSize} ô]
          </div>
          <div class="text-[10px] text-stone-300">Huyện ${districtName} • ${troops.toLocaleString()} quân</div>
          ${hasTraining ? `<div class="text-[10px] text-amber-300 font-bold mt-0.5">⚔️ Đang thao luyện ${city.training!.traineesCount} tráng phu (còn ${city.training!.remainingDays} ngày)</div>` : ''}
        </div>
      `, {
        direction: 'top',
        className: 'city-tooltip-container',
        sticky: true,
      });

      overlay.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (useUIStore.getState().placementMode || useUIStore.getState().baseRelocateMode) {
          handlePlacementAtRef.current(e.latlng);
          return;
        }
        selectBase(city.id);
      });

      overlay.addTo(layer);

      // 2. Huy hiệu quân số nhỏ gọn ở góc trên bên phải
      const badgeHtml = `
        <div class="pointer-events-none select-none -translate-x-1/2 -translate-y-1/2 flex items-center gap-1">
          <div class="px-1.5 py-0.2 rounded-full ${isLamSonBase ? 'bg-[#1c0f06] border-amber-400 text-amber-300' : 'bg-[#0a1128] border-sky-400 text-sky-200'} border text-[8px] font-mono font-bold shadow-md whitespace-nowrap">
            ${troops >= 1000 ? (troops/1000).toFixed(1) + 'k' : troops}
          </div>
        </div>
      `;

      const badgeMarker = L.marker(percentToLatLng(bounds.maxX, bounds.minY), {
        icon: L.divIcon({
          className: 'city-badge-marker',
          html: badgeHtml,
          iconSize: [20, 20],
          iconAnchor: [0, 0],
        }),
        pane: 'structuresPane',
        interactive: false,
      });

      badgeMarker.addTo(layer);
    });
  }, [mapInstance, cities, selectCity]);
  // 6. HIỂN THỊ CÁC CÔNG TRÌNH: RUỘNG (5x5, 6x6, 7x7) & LÒ RÈN (3x3) - GÁN CỨNG 1:1 VÀO Ô LƯỚI
  useEffect(() => {
    if (!mapInstance) return;
    const layer = structuresLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    structures.forEach(structure => {
      const isFarm = structure.type === 'farm';
      const isBuilding = structure.status === 'building';
      const order = structure.activeOrder;
      const gridSize = getStructureGridSize(structure);
      const bounds = getEntityCellBounds(structure.x, structure.y, gridSize, structure.startCol, structure.startRow);

      const sw = percentToLatLng(bounds.minX, bounds.maxY);
      const ne = percentToLatLng(bounds.maxX, bounds.minY);
      const imgBounds = L.latLngBounds(sw, ne);

      const iconUrl = isFarm ? '/icons/structure_farm.png' : '/icons/structure_forge.png';

      // 1. DÙNG L.imageOverlay ĐỂ ICON TỰ ĐỘNG PHÓNG TO / THU NHỎ CHUẨN XÁC THEO Ô LƯỚI
      const overlay = L.imageOverlay(iconUrl, imgBounds, {
        interactive: true,
        pane: 'structuresPane',
        className: `structure-grid-overlay cursor-pointer select-none transition-all ${
          isBuilding ? 'opacity-70 animate-pulse' : ''
        } ${order ? 'filter drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]' : 'filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]'}`,
      });

      overlay.bindTooltip(`
        <div class="px-2.5 py-1.5 rounded-lg bg-[#140e08]/98 border ${isFarm ? 'border-amber-500' : 'border-stone-500'} shadow-2xl font-serif text-xs text-stone-200 whitespace-nowrap">
          <div class="font-bold text-sm ${isFarm ? 'text-amber-300' : 'text-stone-200'}">
            ${structure.name} [${gridSize}x${gridSize} ô]
          </div>
          <div class="text-[11px] text-stone-300">
            ${isBuilding 
              ? `🚧 Đang thi công (còn ${structure.buildDaysRemaining} ngày)`
              : isFarm
              ? `🌾 ${structure.assignedWorkers}/${structure.maxWorkers} nông đinh • Vụ: ${structure.cropDays}/${structure.cropCycleDays} ngày`
              : order
              ? `🔥 Đang rèn ${order.quantity} ${order.name} (còn ${order.remainingDays} ngày)`
              : '⚒️ Sẵn sàng nhận lệnh đúc'
            }
          </div>
        </div>
      `, {
        direction: 'top',
        className: 'structure-tooltip-container',
        sticky: true,
      });

      overlay.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (useUIStore.getState().placementMode || useUIStore.getState().baseRelocateMode) {
          handlePlacementAtRef.current(e.latlng);
          return;
        }
        setSelectedStructureMenu(structure);
      });

      overlay.addTo(layer);
    });
  }, [mapInstance, structures]);
  // 7. CHẾ ĐỘ CHỌN VỊ TRÍ ĐẶT CÔNG TRÌNH & VÒNG BÁN KÍNH BẢO HỘ 14 DẶM
  useEffect(() => {
    if (!mapInstance) return;
    const map = mapInstance;
    const previewLayer = previewLayerRef.current;
    const controlLayer = controlRadiusLayerRef.current;
    if (!map || !previewLayer || !controlLayer) return;

    previewLayer.clearLayers();
    controlLayer.clearLayers();

    if (!placementMode && !baseRelocateMode) return;

    if (placementMode) {
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
    }

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      previewLayer.clearLayers();
      const { x, y } = latLngToPercent(e.latlng);
      const latestState = useGameStore.getState();

      if (baseRelocateMode) {
        const currentBase = latestState.cities.find(c => c.id === baseRelocateMode.baseId);
        const troops = currentBase ? currentBase.troops : 50;
        const gridSize = getCampGridSize(troops);

        const validation = validateBaseRelocate(
          baseRelocateMode.baseId,
          x,
          y,
          latestState.cities,
          latestState.structures
        );

        const isValid = validation.canBuild;
        const matchedDistrict = findDistrictForCoord(validation.snappedX, validation.snappedY, districtsList);

        const minX = validation.startCol * GRID_CELL_W_PCT;
        const maxX = (validation.endCol + 1) * GRID_CELL_W_PCT;
        const minY = validation.startRow * GRID_CELL_H_PCT;
        const maxY = (validation.endRow + 1) * GRID_CELL_H_PCT;

        const sw = percentToLatLng(minX, maxY);
        const ne = percentToLatLng(maxX, minY);
        const imgBounds = L.latLngBounds(sw, ne);

        // Khung viền hình chữ nhật bao chuẩn xác khối NxN ô
        const rect = L.rectangle(imgBounds, {
          color: isValid ? '#22c55e' : '#ef4444',
          weight: 2,
          fillColor: isValid ? '#22c55e' : '#ef4444',
          fillOpacity: 0.25,
          interactive: false,
          pane: 'structuresPane',
        });
        rect.addTo(previewLayer);

        // Icon doanh trại phủ chuẩn khối ô
        const previewOverlay = L.imageOverlay('/icons/structure_camp.png', imgBounds, {
          interactive: false,
          pane: 'structuresPane',
          className: 'pointer-events-none opacity-90',
        });
        previewOverlay.addTo(previewLayer);

        const tipMarker = L.marker(percentToLatLng((minX + maxX) / 2, (minY + maxY) / 2), {
          icon: L.divIcon({
            className: 'pointer-events-none',
            html: `
              <div class="pointer-events-none -translate-x-1/2 -translate-y-1/2 whitespace-nowrap mt-6">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-lg ${isValid ? 'bg-emerald-700' : 'bg-red-700'}">
                  ${isValid ? `✓ Doanh trại [${gridSize}x${gridSize} ô] - Huyện ${matchedDistrict?.name || '...'}` : `✗ ${validation.reason}`}
                </span>
              </div>
            `,
            iconSize: [1, 1],
          }),
          interactive: false,
        });
        tipMarker.addTo(previewLayer);
        return;
      }

      if (!placementMode) return;

      const gridSize = placementMode.gridSize || (placementMode.type === 'forge' ? 3 : (placementMode.farmTier === 50 ? 7 : placementMode.farmTier === 30 ? 6 : 5));
      const isRelocating = Boolean(placementMode.relocateStructureId);

      const validation = validateCellPlacement(
        x,
        y,
        placementMode.type,
        placementMode.cityId,
        latestState.cities,
        latestState.structures,
        placementMode.relocateStructureId,
        gridSize
      );

      const isValid = validation.canBuild;
      const previewIcon = placementMode.type === 'farm' ? '/icons/structure_farm.png' : '/icons/structure_forge.png';

      const minX = validation.startCol * GRID_CELL_W_PCT;
      const maxX = (validation.endCol + 1) * GRID_CELL_W_PCT;
      const minY = validation.startRow * GRID_CELL_H_PCT;
      const maxY = (validation.endRow + 1) * GRID_CELL_H_PCT;

      const sw = percentToLatLng(minX, maxY);
      const ne = percentToLatLng(maxX, minY);
      const imgBounds = L.latLngBounds(sw, ne);

      // Khung viền hình chữ nhật bao chuẩn xác khối NxN ô
      const rect = L.rectangle(imgBounds, {
        color: isValid ? '#22c55e' : '#ef4444',
        weight: 2,
        fillColor: isValid ? '#22c55e' : '#ef4444',
        fillOpacity: 0.25,
        interactive: false,
        pane: 'structuresPane',
      });
      rect.addTo(previewLayer);

      // Icon công trình phủ chuẩn khối ô
      const previewOverlay = L.imageOverlay(previewIcon, imgBounds, {
        interactive: false,
        pane: 'structuresPane',
        className: 'pointer-events-none opacity-90',
      });
      previewOverlay.addTo(previewLayer);

      const tipMarker = L.marker(percentToLatLng((minX + maxX) / 2, (minY + maxY) / 2), {
        icon: L.divIcon({
          className: 'pointer-events-none',
          html: `
            <div class="pointer-events-none -translate-x-1/2 -translate-y-1/2 whitespace-nowrap mt-6">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-lg ${isValid ? 'bg-emerald-700' : 'bg-red-700'}">
                ${isValid ? `✓ [${gridSize}x${gridSize} ô] ${isRelocating ? 'Di dời' : 'Cắm mốc'} tại Ô (${validation.startCol},${validation.startRow})` : `✗ ${validation.reason}`}
              </span>
            </div>
          `,
          iconSize: [1, 1],
        }),
        interactive: false,
      });
      tipMarker.addTo(previewLayer);
    };
    const handleClick = (e: L.LeafletMouseEvent) => {
      handlePlacementAtRef.current(e.latlng);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPlacementMode(null);
        setBaseRelocateMode(null);
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
  }, [mapInstance, placementMode, baseRelocateMode, districtsList, placeStructure, setPlacementMode, setBaseRelocateMode]);

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

      {/* THANH ĐIỀU KHIỂN DI DỜI CĂN CỨ */}
      {baseRelocateMode && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto flex items-center justify-between gap-4 px-6 py-3 rounded-2xl bg-[#1e130c]/98 border-2 border-amber-500 shadow-[0_10px_35px_rgba(0,0,0,0.85)] backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-200 max-w-2xl w-[95vw] md:w-auto">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-bounce shrink-0">
              🚚
            </span>
            <div>
              <div className="font-serif font-black text-amber-300 text-sm flex items-center gap-2">
                <span>
                  Đang Di Dời: Căn Cứ {cities.find(c => c.id === baseRelocateMode.baseId)?.name || ''}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-200 border border-amber-600/70 font-sans font-bold">
                  Đất bằng / Rừng già / Núi non
                </span>
              </div>
              <div className="text-[11px] text-stone-300 mt-0.5">
                👉 Nhấp chuột trái vào bất kỳ ô đất nào trên bản đồ để lập doanh trại mới. (Tránh sông sâu & vách đá).
              </div>
            </div>
          </div>

          <button
            onClick={() => setBaseRelocateMode(null)}
            className="shrink-0 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 hover:to-red-600 text-amber-100 font-bold text-xs shadow-lg border border-red-500 transition hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap flex items-center gap-1.5"
          >
            <span>✕</span>
            <span>HỦY BỎ (ESC)</span>
          </button>
        </div>
      )}

      {/* THANH ĐIỀU KHIỂN CHẾ ĐỘ XÂY DỰNG & DI DỜI (CONSTRUCTION BAR) */}
      {placementMode && (() => {
        const isRelocating = Boolean(placementMode.relocateStructureId);
        const relocatingStructure = isRelocating ? structures.find(s => s.id === placementMode.relocateStructureId) : null;
        const isFarm = placementMode.type === 'farm';

        return (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] w-[95vw] max-w-2xl bg-[#1e130c]/98 text-[#f5ebd7] px-4 py-3 rounded-2xl border-2 border-amber-500 shadow-[0_10px_35px_rgba(0,0,0,0.85)] backdrop-blur-md flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 pointer-events-auto">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 shrink-0 flex items-center justify-center">
                {isRelocating ? (
                  <span className="text-2xl animate-bounce">🚚</span>
                ) : (
                  <img
                    src={isFarm ? '/icons/structure_farm.png' : '/icons/structure_forge.png'}
                    alt="Công trình"
                    className="w-8 h-8 object-contain filter drop-shadow-md"
                  />
                )}
              </span>
              <div>
                <div className="font-serif font-black text-amber-300 text-sm flex items-center gap-2 flex-wrap">
                  <span>
                    {isRelocating 
                      ? `Đang Di Dời: ${relocatingStructure?.name || 'Công trình'}`
                      : `Chế Độ Xây Dựng: ${isFarm ? 'Ruộng Lúa Nước' : 'Lò Rèn Bí Mật (3x3)'}`
                    }
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-200 border border-amber-600/70 font-sans font-bold">
                    {isFarm ? 'Đất Đồng Bằng' : 'Tránh Sông & Vách đá'}
                  </span>

                  {/* Chọn 3 mốc quy mô Ruộng (5x5, 6x6, 7x7) */}
                  {isFarm && !isRelocating && (
                    <div className="flex items-center gap-1.5 ml-1">
                      {[
                        { size: 5, workers: 15, label: '5x5 (15 người)' },
                        { size: 6, workers: 30, label: '6x6 (30 người)' },
                        { size: 7, workers: 50, label: '7x7 (50 người)' },
                      ].map(tier => {
                        const isSelected = (placementMode.gridSize || 5) === tier.size;
                        return (
                          <button
                            key={tier.size}
                            type="button"
                            onClick={() => setPlacementMode({
                              ...placementMode,
                              gridSize: tier.size,
                              farmTier: tier.workers as any,
                            })}
                            className={`px-2 py-0.5 rounded text-[11px] font-serif font-bold transition cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500 text-stone-950 shadow ring-1 ring-amber-300'
                                : 'bg-[#2b170c] text-amber-300/80 hover:bg-[#3f2212] border border-amber-700/60'
                            }`}
                          >
                            {tier.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-stone-300 mt-0.5">
                  👉 Di chuyển chuột để xem khung ${placementMode.gridSize || (isFarm ? 5 : 3)}x${placementMode.gridSize || (isFarm ? 5 : 3)} ô (xanh = hợp lệ không trùng). Bấm chuột trái để cắm mốc xây.
                </div>
              </div>
            </div>

            <button
              onClick={() => setPlacementMode(null)}
              className="shrink-0 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 hover:to-red-600 text-amber-100 font-bold text-xs shadow-lg border border-red-500 transition hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            >
              <span>✕</span>
              <span>HỦY BỎ (ESC)</span>
            </button>
          </div>
        );
      })()}

      {/* POPOVER THAO TÁC CƠ QUAN / CÔNG TRÌNH (DI DỜI / PHÁ BỎ) */}
      {selectedStructureMenu && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm rounded-2xl bg-[#1e130c] border-2 border-amber-500/80 shadow-[0_15px_40px_rgba(0,0,0,0.85)] p-5 text-stone-200 font-sans space-y-4">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-amber-900/60 pb-3">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-amber-950/90 border border-amber-600 flex items-center justify-center p-1 shadow-md">
                  <img
                    src={selectedStructureMenu.type === 'farm' ? '/icons/structure_farm.png' : '/icons/structure_forge.png'}
                    alt="Công trình"
                    className="w-8 h-8 object-contain"
                  />
                </span>
                <div>
                  <h3 className="font-serif font-black text-amber-200 text-base leading-tight">
                    {selectedStructureMenu.name}
                  </h3>
                  <div className="text-[11px] text-stone-400 mt-0.5 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-black/40 text-amber-300 font-mono text-[10px]">
                      {selectedStructureMenu.type === 'farm' ? 'Ruộng Lúa Nước' : 'Lò Rèn Binh Khí'}
                    </span>
                    <span>•</span>
                    <span>Đất: <strong>{TERRAIN_DEFINITIONS[selectedStructureMenu.terrain]?.name || selectedStructureMenu.terrain}</strong></span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedStructureMenu(null)}
                className="w-7 h-7 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Thông tin trạng thái */}
            <div className="p-3 rounded-xl bg-black/40 border border-amber-950 text-xs space-y-1.5">
              <div className="flex justify-between text-stone-300">
                <span>Trạng thái:</span>
                <span className="font-bold text-amber-300">
                  {selectedStructureMenu.status === 'building'
                    ? `🚧 Đang thi công (còn ${selectedStructureMenu.buildDaysRemaining} ngày)`
                    : '🟢 Hoạt động bình thường'}
                </span>
              </div>
              {selectedStructureMenu.type === 'farm' && selectedStructureMenu.status === 'active' && (
                <div className="flex justify-between text-stone-300">
                  <span>Nông đinh canh tác:</span>
                  <span className="font-bold text-emerald-400">
                    {selectedStructureMenu.assignedWorkers}/{selectedStructureMenu.maxWorkers} người
                  </span>
                </div>
              )}
              {selectedStructureMenu.type === 'forge' && selectedStructureMenu.status === 'active' && (
                <div className="flex justify-between text-stone-300">
                  <span>Mẻ rèn:</span>
                  <span className="font-bold text-sky-400">
                    {selectedStructureMenu.activeOrder
                      ? `🔥 Đang đúc ${selectedStructureMenu.activeOrder.quantity} ${selectedStructureMenu.activeOrder.name}`
                      : 'Sẵn sàng nhận lệnh'}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-[11px] text-stone-400 pt-1 border-t border-stone-800/60 font-mono">
                <span>Tọa độ bản đồ:</span>
                <span>{selectedStructureMenu.x.toFixed(1)}%, {selectedStructureMenu.y.toFixed(1)}%</span>
              </div>
            </div>

            {/* Các nút hành động: Di dời & Phá bỏ */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  const s = selectedStructureMenu;
                  setSelectedStructureMenu(null);
                  setPlacementMode({
                    type: s.type,
                    cityId: s.cityId,
                    relocateStructureId: s.id,
                  });
                }}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-bold text-xs shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-98"
              >
                <span>🚚</span>
                <span>Di Dời Vị Trí</span>
              </button>

              <button
                onClick={() => {
                  const s = selectedStructureMenu;
                  if (confirm(`Bạn có chắc chắn muốn phá dỡ [${s.name}]? Bạn sẽ thu hồi 50% vàng phế liệu và giải phóng tráng phu về rảnh rỗi.`)) {
                    setSelectedStructureMenu(null);
                    const res = demolishStructure(s.id);
                    alert(res.message);
                  }
                }}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-800 to-red-900 hover:from-red-700 hover:to-red-800 text-red-100 font-bold text-xs shadow-lg transition border border-red-700/60 flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-98"
              >
                <span>💥</span>
                <span>Phá Bỏ (Hồi Vàng)</span>
              </button>
            </div>

            {/* Nút phụ: Mở Chiến thư căn cứ */}
            <button
              onClick={() => {
                selectCity(selectedStructureMenu.cityId);
                setSelectedStructureMenu(null);
              }}
              className="w-full py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 text-[11px] font-bold border border-stone-800 transition cursor-pointer"
            >
              🏛️ Mở Bảng Quản Lý Căn Cứ
            </button>
          </div>
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
