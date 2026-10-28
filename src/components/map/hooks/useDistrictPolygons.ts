import { useEffect, useCallback } from 'react';
import L from 'leaflet';
import type { CityNode } from '../../../types';
import type { DistrictInfo, ParchmentMode } from '../../../types/map';
import { percentToLatLng, latLngToPercent } from '../../../utils/mapGeo';
import districtData from '../../../data/districtPolygons.json';
import { useUIStore } from '../../../store/uiStore';
import { notify } from '../../../store/dialogStore';

export const DISTRICT_STORAGE_KEY = 'lam_son_district_polygons_custom_v1';

interface UseDistrictPolygonsProps {
  mapInstance: L.Map | null;
  districtsList: DistrictInfo[];
  setDistrictsList: React.Dispatch<React.SetStateAction<DistrictInfo[]>>;
  showDistricts: boolean;
  parchmentMode: ParchmentMode;
  hoveredDistrictId: string | null;
  setHoveredDistrictId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedCityId: string | null;
  cities: CityNode[];
  isEditMode: boolean;
  selectDistrict: (districtId: string) => void;
  polygonsMapRef: React.MutableRefObject<Map<string, L.Polygon>>;
  labelsLayerRef: React.MutableRefObject<L.LayerGroup | null>;
  vertexHandlesLayerRef: React.MutableRefObject<L.LayerGroup | null>;
  handlePlacementAtRef: React.MutableRefObject<(latlng: L.LatLng) => void>;
}

export const useDistrictPolygons = ({
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
}: UseDistrictPolygonsProps) => {

  // Cập nhật tọa độ polygon cho huyện
  const updateDistrictPolygonVertex = useCallback((districtId: string, vertexIndex: number, newX: number, newY: number) => {
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
  }, [setDistrictsList]);

  // Thêm đỉnh mới khi nhấp chuột lên đoạn đường viền ranh giới (bẻ gãy đường kẻ)
  const insertDistrictPolygonVertex = useCallback((districtId: string, clickX: number, clickY: number) => {
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
  }, [setDistrictsList]);

  // Xóa / Gộp đỉnh khi kéo chồng 2 nút lên nhau
  const deleteDistrictPolygonVertex = useCallback((districtId: string, vertexIndex: number) => {
    setDistrictsList(prev => {
      const next = prev.map(d => {
        if (d.id !== districtId) return d;
        if (d.polygon.length <= 4) {
          notify.warning('Không thể gộp: Đa giác cần có tối thiểu 3 đỉnh!');
          return d;
        }

        const newPoly = [...d.polygon];
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
  }, [setDistrictsList]);

  // 1. Vẽ các Polygon ranh giới huyện
  useEffect(() => {
    if (!mapInstance) return;
    const map = mapInstance;

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
  }, [mapInstance, districtsList, selectDistrict, polygonsMapRef, setHoveredDistrictId, handlePlacementAtRef]);

  // 2. Cập nhật Style highlight trực tiếp (0ms latency, không redraw)
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
  }, [selectedCityId, hoveredDistrictId, showDistricts, parchmentMode, polygonsMapRef]);

  // 3. Chế độ chỉnh sửa ranh giới bằng tay (Edit Mode)
  useEffect(() => {
    const handlesLayer = vertexHandlesLayerRef.current;
    if (!handlesLayer) return;

    handlesLayer.clearLayers();

    if (!isEditMode || !selectedCityId) return;

    const currentDistrict = districtsList.find(d => d.id === selectedCityId);
    if (!currentDistrict) return;

    const boundaryLatLngs = currentDistrict.polygon.map(pt => percentToLatLng(pt[0], pt[1]));

    // Đường viền nét đứt vàng nổi bật
    const visualLine = L.polyline(boundaryLatLngs, {
      color: '#f59e0b',
      weight: 3.5,
      opacity: 0.95,
      dashArray: '6, 6',
      pane: 'districtsPane',
      interactive: false,
    });
    visualLine.addTo(handlesLayer);

    // Vùng bấm vô hình (hit-box dày 22px) để thêm đỉnh mới
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

    // Các nút đỉnh (vertex handle markers) & Hỗ trợ kéo chồng lên nhau để Gộp/Xóa
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
  }, [
    isEditMode,
    selectedCityId,
    districtsList,
    mapInstance,
    polygonsMapRef,
    vertexHandlesLayerRef,
    insertDistrictPolygonVertex,
    deleteDistrictPolygonVertex,
    updateDistrictPolygonVertex,
  ]);

  // 4. Hiển thị chữ thẻ bài nổi khi rê chuột hoặc chọn huyện
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
  }, [mapInstance, showDistricts, parchmentMode, selectedCityId, hoveredDistrictId, cities, districtsList, labelsLayerRef]);

  // Helper reset single district
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

  const importDistrictsList = (importedData: DistrictInfo[]) => {
    setDistrictsList(importedData);
    try {
      localStorage.setItem(DISTRICT_STORAGE_KEY, JSON.stringify(importedData));
    } catch {
      // ignore
    }
  };

  return {
    resetSingleDistrict,
    importDistrictsList,
  };
};
