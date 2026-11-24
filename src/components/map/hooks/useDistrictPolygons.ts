import { useEffect, useCallback } from 'react';
import L from 'leaflet';
import type { CityNode } from '../../../types';
import type { DistrictInfo, ParchmentMode } from '../../../types/map';
import { percentToLatLng, latLngToPercent } from '../../../utils/mapGeo';
import districtData from '../../../data/districtPolygons.json';
import { useUIStore } from '../../../store/uiStore';
import { notify } from '../../../store/dialogStore';

export const DISTRICT_STORAGE_KEY = 'lam_son_district_polygons_custom_v6';

const SHARED_VERTEX_TOL = 0.25;

const computePolygonCentroid = (pts: [number, number][]): [number, number] => {
  const p = pts.length > 3 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]
    ? pts.slice(0, -1)
    : pts;
  const n = p.length;
  if (n === 0) return [50, 50];
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = p[i];
    const [x1, y1] = p[(i + 1) % n];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  area *= 0.5;
  if (Math.abs(area) < 1e-6) {
    return [
      Math.round((p.reduce((s, pt) => s + pt[0], 0) / n) * 1000) / 1000,
      Math.round((p.reduce((s, pt) => s + pt[1], 0) / n) * 1000) / 1000,
    ];
  }
  return [
    Math.round((cx / (6 * area)) * 1000) / 1000,
    Math.round((cy / (6 * area)) * 1000) / 1000,
  ];
};

interface SharedVertexRef {
  districtId: string;
  vertexIndex: number;
}

const findSharedVertices = (
  districts: DistrictInfo[],
  sourceDistrictId: string,
  pt: [number, number]
): SharedVertexRef[] => {
  const matches: SharedVertexRef[] = [];
  for (const d of districts) {
    if (d.id === sourceDistrictId) continue;
    const len = d.polygon.length;
    for (let j = 0; j < len - 1; j++) {
      const v = d.polygon[j];
      if (Math.hypot(v[0] - pt[0], v[1] - pt[1]) <= SHARED_VERTEX_TOL) {
        matches.push({ districtId: d.id, vertexIndex: j });
      }
    }
  }
  return matches;
};

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
  const marchDrawMode = useUIStore(state => state.marchDrawMode);

  // Cập nhật tọa độ polygon cho huyện (đồng bộ luôn các đỉnh chung của huyện lân cận)
  const updateDistrictPolygonVertex = useCallback((
    districtId: string,
    vertexIndex: number,
    newX: number,
    newY: number,
    sharedTargets: SharedVertexRef[] = []
  ) => {
    setDistrictsList(prev => {
      const sharedMap = new Map<string, number[]>();
      for (const s of sharedTargets) {
        const list = sharedMap.get(s.districtId) || [];
        list.push(s.vertexIndex);
        sharedMap.set(s.districtId, list);
      }

      const next = prev.map(d => {
        if (d.id === districtId) {
          const newPoly = [...d.polygon];
          newPoly[vertexIndex] = [newX, newY];
          if (vertexIndex === 0) newPoly[newPoly.length - 1] = [newX, newY];
          if (vertexIndex === newPoly.length - 1) newPoly[0] = [newX, newY];
          return { ...d, polygon: newPoly, center: computePolygonCentroid(newPoly) };
        }

        const matchedIndices = sharedMap.get(d.id);
        if (matchedIndices && matchedIndices.length > 0) {
          const newPoly = [...d.polygon];
          for (const sIdx of matchedIndices) {
            if (sIdx >= 0 && sIdx < newPoly.length) {
              newPoly[sIdx] = [newX, newY];
              if (sIdx === 0) newPoly[newPoly.length - 1] = [newX, newY];
              if (sIdx === newPoly.length - 1) newPoly[0] = [newX, newY];
            }
          }
          return { ...d, polygon: newPoly, center: computePolygonCentroid(newPoly) };
        }

        return d;
      });
      try {
        localStorage.setItem(DISTRICT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [setDistrictsList]);

  // Thêm đỉnh mới khi nhấp chuột lên đoạn đường viền ranh giới (bẻ gãy đường kẻ cả 2 huyện giáp ranh)
  const insertDistrictPolygonVertex = useCallback((districtId: string, clickX: number, clickY: number) => {
    setDistrictsList(prev => {
      const source = prev.find(d => d.id === districtId);
      if (!source || source.polygon.length < 2) return prev;

      const poly = source.polygon;
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

      const segA = poly[bestSegIdx];
      const segB = poly[bestSegIdx + 1];
      const near = (p1: [number, number], p2: [number, number]) =>
        Math.hypot(p1[0] - p2[0], p1[1] - p2[1]) <= SHARED_VERTEX_TOL;

      const next = prev.map(d => {
        if (d.id === districtId) {
          const newPoly = [...d.polygon];
          newPoly.splice(bestSegIdx + 1, 0, bestProjectedPt);
          return { ...d, polygon: newPoly };
        }

        const op = d.polygon;
        for (let j = 0; j < op.length - 1; j++) {
          const p1 = op[j];
          const p2 = op[j + 1];
          if ((near(p1, segA) && near(p2, segB)) || (near(p1, segB) && near(p2, segA))) {
            const newPoly = [...op];
            newPoly.splice(j + 1, 0, bestProjectedPt);
            return { ...d, polygon: newPoly };
          }
        }
        return d;
      });

      try {
        localStorage.setItem(DISTRICT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [setDistrictsList]);

  // Xóa / Gộp đỉnh khi kéo chồng 2 nút lên nhau (gộp luôn đỉnh trùng ở huyện lân cận)
  const deleteDistrictPolygonVertex = useCallback((districtId: string, vertexIndex: number) => {
    setDistrictsList(prev => {
      const source = prev.find(d => d.id === districtId);
      if (!source) return prev;
      if (source.polygon.length <= 4) {
        notify.warning('Không thể gộp: Đa giác cần có tối thiểu 3 đỉnh!');
        return prev;
      }
      const targetPt = source.polygon[vertexIndex];

      const next = prev.map(d => {
        if (d.id === districtId) {
          const newPoly = [...d.polygon];
          const lastIdx = newPoly.length - 1;
          if (vertexIndex === 0 || vertexIndex === lastIdx) {
            newPoly.splice(0, 1);
            newPoly[newPoly.length - 1] = [...newPoly[0]];
          } else {
            newPoly.splice(vertexIndex, 1);
          }
          return { ...d, polygon: newPoly };
        }

        if (targetPt && d.polygon.length > 4) {
          const matchIdx = d.polygon.findIndex(
            (v, idx) => idx < d.polygon.length - 1 && Math.hypot(v[0] - targetPt[0], v[1] - targetPt[1]) <= SHARED_VERTEX_TOL
          );
          if (matchIdx !== -1) {
            const newPoly = [...d.polygon];
            const lastIdx = newPoly.length - 1;
            if (matchIdx === 0 || matchIdx === lastIdx) {
              newPoly.splice(0, 1);
              newPoly[newPoly.length - 1] = [...newPoly[0]];
            } else {
              newPoly.splice(matchIdx, 1);
            }
            return { ...d, polygon: newPoly };
          }
        }
        return d;
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
        if (useUIStore.getState().marchDrawMode) return;
        setHoveredDistrictId(district.id);
      });

      poly.on('mouseout', () => {
        setHoveredDistrictId(prev => (prev === district.id ? null : prev));
      });

      poly.on('click', (e) => {
        if (useUIStore.getState().marchDrawMode) {
          return;
        }
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
      const isSelected = !marchDrawMode && selectedCityId === did;
      const isHovered = !marchDrawMode && hoveredDistrictId === did;

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
  }, [selectedCityId, hoveredDistrictId, showDistricts, parchmentMode, polygonsMapRef, marchDrawMode]);

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
      let snapAdjacentPt: [number, number] | null = null;
      const sharedNeighbors = findSharedVertices(districtsList, currentDistrict.id, pt);

      handleMarker.on('drag', (e) => {
        let newPos = e.target.getLatLng();
        snapTargetIdx = null;
        snapAdjacentPt = null;

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

          // Nếu đỉnh chưa dính với huyện lân cận nào, tự hút dính vào đỉnh của huyện lân cận trong 10px
          if (snapTargetIdx === null && sharedNeighbors.length === 0) {
            let bestAdjDist = 10;
            for (const otherDist of districtsList) {
              if (otherDist.id === currentDistrict.id) continue;
              for (let k = 0; k < otherDist.polygon.length - 1; k++) {
                const adjPt = otherDist.polygon[k];
                const pAdj = mapInstance.latLngToContainerPoint(percentToLatLng(adjPt[0], adjPt[1]));
                const dPx = Math.hypot(pCurrent.x - pAdj.x, pCurrent.y - pAdj.y);
                if (dPx <= bestAdjDist) {
                  bestAdjDist = dPx;
                  snapAdjacentPt = adjPt;
                }
              }
            }
            if (snapAdjacentPt) {
              newPos = percentToLatLng(snapAdjacentPt[0], snapAdjacentPt[1]);
              e.target.setLatLng(newPos);
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

        // Cập nhật trực tiếp các polygon huyện lân cận có đỉnh chung
        for (const sn of sharedNeighbors) {
          const adjPoly = polygonsMapRef.current.get(sn.districtId);
          if (adjPoly) {
            const adjLatLngs = adjPoly.getLatLngs()[0] as L.LatLng[];
            if (adjLatLngs && adjLatLngs[sn.vertexIndex]) {
              adjLatLngs[sn.vertexIndex] = newPos;
              if (sn.vertexIndex === 0) adjLatLngs[adjLatLngs.length - 1] = newPos;
              adjPoly.setLatLngs([adjLatLngs]);
            }
          }
        }
      });

      handleMarker.on('dragend', (e) => {
        if (snapTargetIdx !== null && currentDistrict.polygon.length > 4) {
          setTimeout(() => {
            deleteDistrictPolygonVertex(currentDistrict.id, idx);
          }, 0);
        } else if (snapAdjacentPt) {
          const [sx, sy] = snapAdjacentPt;
          setTimeout(() => {
            updateDistrictPolygonVertex(currentDistrict.id, idx, sx, sy, sharedNeighbors);
          }, 0);
        } else {
          const newPos = e.target.getLatLng();
          const { x, y } = latLngToPercent(newPos);
          setTimeout(() => {
            updateDistrictPolygonVertex(currentDistrict.id, idx, x, y, sharedNeighbors);
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

  // 4. Hiển thị chữ thẻ bài nổi khi rê chuột hoặc chọn huyện (Ẩn hoàn toàn khi đang vẽ đường hành quân)
  useEffect(() => {
    if (!mapInstance) return;
    const labelsLayer = labelsLayerRef.current;
    if (!labelsLayer) return;

    labelsLayer.clearLayers();

    if (!showDistricts || parchmentMode === 'off' || marchDrawMode) return;

    districtsList.forEach(district => {
      const isSelected = selectedCityId === district.id;
      const isHovered = hoveredDistrictId === district.id;

      if (isSelected || isHovered) {
        const centerLatLng = percentToLatLng(district.center[0], district.center[1]);

        const cityNode = cities.find(c => c.id === district.id);
        const faction = cityNode ? cityNode.faction : district.faction;

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

        const labelHtml = `
          <div class="pointer-events-none select-none flex items-center justify-center whitespace-nowrap font-serif font-black tracking-widest ${isSelected ? 'scale-115' : ''} transition-transform duration-150 animate-in fade-in zoom-in-95"
               style="font-size: 19px; transform: translate(-50%, calc(-70% - 14px)); text-align: center; text-shadow: -1.5px -1.5px 0 #180e06, 1.5px -1.5px 0 #180e06, -1.5px 1.5px 0 #180e06, 1.5px 1.5px 0 #180e06, 0 2px 8px rgba(0,0,0,0.95), 0 0 14px ${glowColor};">
            <span class="${factionColor}">${district.name}</span>
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
  }, [mapInstance, showDistricts, parchmentMode, selectedCityId, hoveredDistrictId, cities, districtsList, labelsLayerRef, marchDrawMode]);

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
