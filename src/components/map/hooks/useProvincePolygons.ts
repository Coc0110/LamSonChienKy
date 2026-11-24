import { useEffect, useCallback } from 'react';
import L from 'leaflet';
import { PROVINCE_REGIONS, type ProvinceRegion } from '../../../data/provinceRegions';
import { percentToLatLng, latLngToPercent } from '../../../utils/mapGeo';
import { notify } from '../../../store/dialogStore';

export const PROVINCE_STORAGE_KEY = 'lam_son_province_regions_custom_v1';
const SHARED_REL_TOL = 0.005;

interface BordersBounds {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

interface UseProvincePolygonsProps {
  mapInstance: L.Map | null;
  provinceList: ProvinceRegion[];
  setProvinceList: React.Dispatch<React.SetStateAction<ProvinceRegion[]>>;
  bordersBounds: BordersBounds;
  isZoomedOutOverview: boolean;
  isEditingProvinces: boolean;
  selectedProvinceId: string | null;
  setSelectedProvinceId: React.Dispatch<React.SetStateAction<string | null>>;
  hoveredProvinceId: string | null;
  setHoveredProvinceId: React.Dispatch<React.SetStateAction<string | null>>;
  provincePolygonsLayerRef: React.MutableRefObject<L.LayerGroup | null>;
  provincePolygonsMapRef: React.MutableRefObject<Map<string, L.Polygon>>;
  provinceLabelsLayerRef: React.MutableRefObject<L.LayerGroup | null>;
  provinceHandlesLayerRef: React.MutableRefObject<L.LayerGroup | null>;
}

export const useProvincePolygons = ({
  mapInstance,
  provinceList,
  setProvinceList,
  bordersBounds,
  isZoomedOutOverview,
  isEditingProvinces,
  selectedProvinceId,
  setSelectedProvinceId,
  hoveredProvinceId,
  setHoveredProvinceId,
  provincePolygonsLayerRef,
  provincePolygonsMapRef,
  provinceLabelsLayerRef,
  provinceHandlesLayerRef,
}: UseProvincePolygonsProps) => {
  const relToLatLng = useCallback((rx: number, ry: number) => {
    const w = bordersBounds.xMax - bordersBounds.xMin;
    const h = bordersBounds.yMax - bordersBounds.yMin;
    return percentToLatLng(bordersBounds.xMin + rx * w, bordersBounds.yMin + ry * h);
  }, [bordersBounds]);

  const latLngToRel = useCallback((latlng: L.LatLng): [number, number] => {
    const { x, y } = latLngToPercent(latlng);
    const w = bordersBounds.xMax - bordersBounds.xMin || 1;
    const h = bordersBounds.yMax - bordersBounds.yMin || 1;
    return [
      Math.round(((x - bordersBounds.xMin) / w) * 10000) / 10000,
      Math.round(((y - bordersBounds.yMin) / h) * 10000) / 10000,
    ];
  }, [bordersBounds]);

  const updateProvinceVertex = useCallback((
    provinceId: string,
    vertexIndex: number,
    newRx: number,
    newRy: number,
    sharedTargets: { provinceId: string; vertexIndex: number }[] = []
  ) => {
    setProvinceList(prev => {
      const sharedMap = new Map<string, number[]>();
      for (const s of sharedTargets) {
        const list = sharedMap.get(s.provinceId) || [];
        list.push(s.vertexIndex);
        sharedMap.set(s.provinceId, list);
      }

      const next = prev.map(p => {
        if (p.id === provinceId) {
          const newPoly = [...p.polygon];
          newPoly[vertexIndex] = [newRx, newRy];
          return { ...p, polygon: newPoly };
        }
        const matched = sharedMap.get(p.id);
        if (matched && matched.length > 0) {
          const newPoly = [...p.polygon];
          for (const idx of matched) {
            if (idx >= 0 && idx < newPoly.length) newPoly[idx] = [newRx, newRy];
          }
          return { ...p, polygon: newPoly };
        }
        return p;
      });
      try {
        localStorage.setItem(PROVINCE_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [setProvinceList]);

  const insertProvinceVertex = useCallback((provinceId: string, clickRx: number, clickRy: number) => {
    setProvinceList(prev => {
      const src = prev.find(p => p.id === provinceId);
      if (!src || src.polygon.length < 3) return prev;
      const poly = src.polygon;
      let bestSeg = 0;
      let minDist = Infinity;
      let bestPt: [number, number] = [clickRx, clickRy];

      for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        const abX = b[0] - a[0];
        const abY = b[1] - a[1];
        const lenSq = abX * abX + abY * abY;
        let t = lenSq === 0 ? 0 : ((clickRx - a[0]) * abX + (clickRy - a[1]) * abY) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const px = a[0] + t * abX;
        const py = a[1] + t * abY;
        const dist = Math.hypot(clickRx - px, clickRy - py);
        if (dist < minDist) {
          minDist = dist;
          bestSeg = i;
          bestPt = [Math.round(px * 10000) / 10000, Math.round(py * 10000) / 10000];
        }
      }

      const segA = poly[bestSeg];
      const segB = poly[(bestSeg + 1) % poly.length];
      const near = (p1: [number, number], p2: [number, number]) =>
        Math.hypot(p1[0] - p2[0], p1[1] - p2[1]) <= SHARED_REL_TOL;

      const next = prev.map(p => {
        if (p.id === provinceId) {
          const newPoly = [...p.polygon];
          newPoly.splice(bestSeg + 1, 0, bestPt);
          return { ...p, polygon: newPoly };
        }
        const op = p.polygon;
        for (let j = 0; j < op.length; j++) {
          const p1 = op[j];
          const p2 = op[(j + 1) % op.length];
          if ((near(p1, segA) && near(p2, segB)) || (near(p1, segB) && near(p2, segA))) {
            const newPoly = [...op];
            newPoly.splice(j + 1, 0, bestPt);
            return { ...p, polygon: newPoly };
          }
        }
        return p;
      });
      try {
        localStorage.setItem(PROVINCE_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [setProvinceList]);

  const deleteProvinceVertex = useCallback((provinceId: string, vertexIndex: number) => {
    setProvinceList(prev => {
      const src = prev.find(p => p.id === provinceId);
      if (!src) return prev;
      if (src.polygon.length <= 3) {
        notify.warning('Không thể gộp: Đa giác tỉnh cần tối thiểu 3 đỉnh!');
        return prev;
      }
      const removedPt = src.polygon[vertexIndex];
      const next = prev.map(p => {
        if (p.id === provinceId) {
          const newPoly = [...p.polygon];
          newPoly.splice(vertexIndex, 1);
          return { ...p, polygon: newPoly };
        }
        if (removedPt && p.polygon.length > 3) {
          const mIdx = p.polygon.findIndex(v => Math.hypot(v[0] - removedPt[0], v[1] - removedPt[1]) <= SHARED_REL_TOL);
          if (mIdx !== -1) {
            const newPoly = [...p.polygon];
            newPoly.splice(mIdx, 1);
            return { ...p, polygon: newPoly };
          }
        }
        return p;
      });
      try {
        localStorage.setItem(PROVINCE_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [setProvinceList]);

  // 1. Render các polygon tỉnh khi zoom out hoặc đang ở chế độ Nắn Ranh Giới Tỉnh
  useEffect(() => {
    const polyLayer = provincePolygonsLayerRef.current;
    if (!polyLayer) return;
    polyLayer.clearLayers();
    provincePolygonsMapRef.current.clear();

    if (!isZoomedOutOverview && !isEditingProvinces) return;

    provinceList.forEach(region => {
      const latlngs = region.polygon.map(([rx, ry]) => relToLatLng(rx, ry));
      const poly = L.polygon(latlngs, {
        fill: true,
        fillColor: '#ffffff',
        fillOpacity: 0.0001,
        color: isEditingProvinces ? '#6b4c35' : '#c2410c',
        weight: isEditingProvinces ? 1.2 : 0,
        opacity: isEditingProvinces ? 0.75 : 0,
        pane: 'districtsPane',
        interactive: true,
      });

      poly.on('mouseover', () => {
        setHoveredProvinceId(region.id);
      });
      poly.on('mouseout', () => {
        setHoveredProvinceId(prev => (prev === region.id ? null : prev));
      });
      poly.on('click', (e) => {
        if (!isEditingProvinces) return;
        L.DomEvent.stopPropagation(e);
        setSelectedProvinceId(region.id);
      });

      poly.addTo(polyLayer);
      provincePolygonsMapRef.current.set(region.id, poly);
    });
  }, [
    isZoomedOutOverview,
    isEditingProvinces,
    provinceList,
    relToLatLng,
    provincePolygonsLayerRef,
    provincePolygonsMapRef,
    setHoveredProvinceId,
    setSelectedProvinceId,
  ]);

  // 2. Highlight chỉ đường ranh giới + hiện tên tỉnh khi hover / chọn
  useEffect(() => {
    const showOverlay = isZoomedOutOverview || isEditingProvinces;
    provincePolygonsMapRef.current.forEach((poly, pid) => {
      const region = provinceList.find(r => r.id === pid);
      const isSelected = isEditingProvinces && selectedProvinceId === pid;
      const isHovered = showOverlay && hoveredProvinceId === pid;

      if (isSelected) {
        poly.setStyle({
          color: '#991b1b',
          weight: 2.8,
          opacity: 1.0,
          fillOpacity: 0.0001,
        });
      } else if (isHovered) {
        poly.setStyle({
          color: region?.isMain ? '#d97706' : '#c2410c',
          weight: 2.2,
          opacity: 1.0,
          fillOpacity: 0.0001,
        });
      } else if (isEditingProvinces) {
        poly.setStyle({
          color: '#6b4c35',
          weight: 1.2,
          opacity: 0.75,
          fillOpacity: 0.0001,
        });
      } else {
        poly.setStyle({
          weight: 0,
          opacity: 0,
          fillOpacity: 0.0001,
        });
      }
    });

    const layer = provinceLabelsLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    const activeId = (isEditingProvinces && selectedProvinceId) || (showOverlay && hoveredProvinceId) || null;
    if (!activeId) return;
    const region = provinceList.find(r => r.id === activeId);
    if (!region) return;

    const pos = relToLatLng(region.relX, region.relY);
    const textColor = region.isMain ? 'text-amber-300' : 'text-[#f5ebd7]';
    const fontSize = region.isMain ? '22px' : '18px';
    const glow = region.isMain ? 'rgba(245, 158, 11, 0.7)' : 'rgba(0, 0, 0, 0.9)';

    const html = `
      <div class="pointer-events-none select-none whitespace-nowrap font-serif font-black tracking-[0.18em] ${textColor} animate-in fade-in zoom-in-95 duration-150"
           style="font-size: ${fontSize}; transform: translate(-50%, -50%); text-align: center; text-shadow: -1.5px -1.5px 0 #180e06, 1.5px -1.5px 0 #180e06, -1.5px 1.5px 0 #180e06, 1.5px 1.5px 0 #180e06, 0 2px 10px rgba(0,0,0,0.95), 0 0 14px ${glow};">
        ${region.name}
      </div>
    `;

    L.marker(pos, {
      icon: L.divIcon({
        className: 'province-region-label',
        html,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      }),
      interactive: false,
      pane: 'districtLabelsPane',
    }).addTo(layer);
  }, [
    isZoomedOutOverview,
    isEditingProvinces,
    selectedProvinceId,
    hoveredProvinceId,
    provinceList,
    relToLatLng,
    provincePolygonsMapRef,
    provinceLabelsLayerRef,
  ]);

  // 3. Tay nắm kéo đỉnh & thêm/gộp đỉnh khi đang Nắn Ranh Giới Tỉnh
  useEffect(() => {
    const handlesLayer = provinceHandlesLayerRef.current;
    if (!handlesLayer) return;
    handlesLayer.clearLayers();

    if (!isEditingProvinces || !selectedProvinceId || !mapInstance) return;
    const current = provinceList.find(p => p.id === selectedProvinceId);
    if (!current) return;

    const closedLatLngs = [
      ...current.polygon.map(([rx, ry]) => relToLatLng(rx, ry)),
      relToLatLng(current.polygon[0][0], current.polygon[0][1]),
    ];

    const visualLine = L.polyline(closedLatLngs, {
      color: '#f59e0b',
      weight: 3.5,
      opacity: 0.95,
      dashArray: '6, 6',
      pane: 'districtsPane',
      interactive: false,
    }).addTo(handlesLayer);

    const hitLine = L.polyline(closedLatLngs, {
      color: '#ffffff',
      weight: 22,
      opacity: 0.0001,
      pane: 'districtsPane',
      interactive: true,
    }).addTo(handlesLayer);

    hitLine.bindTooltip('✦ Nhấp chuột trái để thêm đỉnh mới cho ranh giới tỉnh', {
      sticky: true,
      direction: 'top',
    });

    hitLine.on('click', (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);
      const [rx, ry] = latLngToRel(e.latlng);
      insertProvinceVertex(current.id, rx, ry);
    });

    const defaultIcon = L.divIcon({
      className: 'district-vertex-handle-marker',
      html: '<div style="width: 14px; height: 14px; background: #fbbf24; border: 2.5px solid #991b1b; border-radius: 50%; box-shadow: 0 0 6px rgba(0,0,0,0.9); cursor: crosshair; touch-action: none;"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    current.polygon.forEach((pt, idx) => {
      const marker = L.marker(relToLatLng(pt[0], pt[1]), {
        icon: defaultIcon,
        draggable: true,
      });

      let snapTargetIdx: number | null = null;
      let snapAdjPt: [number, number] | null = null;
      const sharedNeighbors: { provinceId: string; vertexIndex: number }[] = [];
      for (const other of provinceList) {
        if (other.id === current.id) continue;
        other.polygon.forEach((v, j) => {
          if (Math.hypot(v[0] - pt[0], v[1] - pt[1]) <= SHARED_REL_TOL) {
            sharedNeighbors.push({ provinceId: other.id, vertexIndex: j });
          }
        });
      }

      marker.on('drag', (e) => {
        let newPos = e.target.getLatLng();
        snapTargetIdx = null;
        snapAdjPt = null;
        const pCurr = mapInstance.latLngToContainerPoint(newPos);

        for (let j = 0; j < current.polygon.length; j++) {
          if (j === idx) continue;
          const pOther = mapInstance.latLngToContainerPoint(relToLatLng(current.polygon[j][0], current.polygon[j][1]));
          if (Math.hypot(pCurr.x - pOther.x, pCurr.y - pOther.y) <= 16) {
            snapTargetIdx = j;
            break;
          }
        }

        if (snapTargetIdx === null && sharedNeighbors.length === 0) {
          let bestDist = 10;
          for (const other of provinceList) {
            if (other.id === current.id) continue;
            for (const v of other.polygon) {
              const pAdj = mapInstance.latLngToContainerPoint(relToLatLng(v[0], v[1]));
              const d = Math.hypot(pCurr.x - pAdj.x, pCurr.y - pAdj.y);
              if (d <= bestDist) {
                bestDist = d;
                snapAdjPt = v;
              }
            }
          }
          if (snapAdjPt) {
            newPos = relToLatLng(snapAdjPt[0], snapAdjPt[1]);
            e.target.setLatLng(newPos);
          }
        }

        const poly = provincePolygonsMapRef.current.get(current.id);
        if (poly) {
          const latlngs = poly.getLatLngs()[0] as L.LatLng[];
          if (latlngs && latlngs[idx]) {
            latlngs[idx] = newPos;
            poly.setLatLngs([latlngs]);
          }
        }

        const lineLatLngs = visualLine.getLatLngs() as L.LatLng[];
        if (lineLatLngs && lineLatLngs[idx]) {
          lineLatLngs[idx] = newPos;
          if (idx === 0) lineLatLngs[lineLatLngs.length - 1] = newPos;
          visualLine.setLatLngs(lineLatLngs);
        }

        for (const sn of sharedNeighbors) {
          const adjPoly = provincePolygonsMapRef.current.get(sn.provinceId);
          if (adjPoly) {
            const adjLatLngs = adjPoly.getLatLngs()[0] as L.LatLng[];
            if (adjLatLngs && adjLatLngs[sn.vertexIndex]) {
              adjLatLngs[sn.vertexIndex] = newPos;
              adjPoly.setLatLngs([adjLatLngs]);
            }
          }
        }
      });

      marker.on('dragend', (e) => {
        if (snapTargetIdx !== null && current.polygon.length > 3) {
          setTimeout(() => deleteProvinceVertex(current.id, idx), 0);
        } else if (snapAdjPt) {
          const [rx, ry] = snapAdjPt;
          setTimeout(() => updateProvinceVertex(current.id, idx, rx, ry, sharedNeighbors), 0);
        } else {
          const [rx, ry] = latLngToRel(e.target.getLatLng());
          setTimeout(() => updateProvinceVertex(current.id, idx, rx, ry, sharedNeighbors), 0);
        }
      });

      marker.addTo(handlesLayer);
    });
  }, [
    isEditingProvinces,
    selectedProvinceId,
    provinceList,
    mapInstance,
    relToLatLng,
    latLngToRel,
    provinceHandlesLayerRef,
    provincePolygonsMapRef,
    insertProvinceVertex,
    deleteProvinceVertex,
    updateProvinceVertex,
  ]);

  const resetSingleProvince = (provinceId: string) => {
    const def = PROVINCE_REGIONS.find(p => p.id === provinceId);
    if (!def) return;
    setProvinceList(prev => {
      const next = prev.map(p => (p.id === provinceId ? { ...def, polygon: def.polygon.map(pt => [...pt] as [number, number]) } : p));
      try {
        localStorage.setItem(PROVINCE_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return { resetSingleProvince };
};
