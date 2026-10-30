import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { PlacedStructure, CityNode } from '../../../types';
import { percentToLatLng } from '../../../utils/mapGeo';
import { getStructureGridSize, getEntityCellBounds } from '../../../data/terrainGrid';
import { cleanStructureName } from '../../../utils/formatters';
import { useUIStore } from '../../../store/uiStore';

interface UseStructureMarkersProps {
  mapInstance: L.Map | null;
  structuresLayerRef: React.MutableRefObject<L.LayerGroup | null>;
  structures: PlacedStructure[];
  cities: CityNode[];
  onSelectStructureMenu: (structure: PlacedStructure) => void;
  handlePlacementAtRef: React.MutableRefObject<(latlng: L.LatLng) => void>;
}

export const useStructureMarkers = ({
  mapInstance,
  structuresLayerRef,
  structures,
  cities,
  onSelectStructureMenu,
  handlePlacementAtRef,
}: UseStructureMarkersProps) => {
  // Lưu trữ instance overlay của từng công trình để tái sử dụng, tránh clearLayers() gây reload nhấp nháy hình ảnh
  const overlaysRef = useRef<Map<string, { overlay: L.ImageOverlay; visualKey: string }>>(new Map());

  // Giữ ref callback mới nhất để không tạo lại listener click không cần thiết
  const callbacksRef = useRef({ onSelectStructureMenu, handlePlacementAtRef });
  callbacksRef.current = { onSelectStructureMenu, handlePlacementAtRef };

  useEffect(() => {
    if (!mapInstance) return;
    const layer = structuresLayerRef.current;
    if (!layer) return;

    const currentOverlayMap = overlaysRef.current;
    const activeIds = new Set<string>();

    structures.forEach(structure => {
      activeIds.add(structure.id);
      const isFarm = structure.type === 'farm';
      const isBuilding = structure.status === 'building';
      const order = structure.activeOrder;
      const gridSize = getStructureGridSize(structure);
      const bounds = getEntityCellBounds(structure.x, structure.y, gridSize, structure.startCol, structure.startRow);

      const sw = percentToLatLng(bounds.minX, bounds.maxY);
      const ne = percentToLatLng(bounds.maxX, bounds.minY);
      const imgBounds = L.latLngBounds(sw, ne);

      const iconUrl = isFarm ? '/icons/structure_farm.png' : '/icons/structure_forge.png';

      // visualKey chỉ thay đổi khi vị trí, kích thước, tiến độ thi công hoặc có mẻ rèn thay đổi
      // KHÔNG phụ thuộc vào số lượng assignedWorkers khi kéo slider
      const visualKey = `${structure.id}_${structure.x}_${structure.y}_${gridSize}_${structure.type}_${structure.status}_${Boolean(order)}_${structure.startCol}_${structure.startRow}`;

      const cleanName = cleanStructureName(structure.name);
      const isMing = cities.find(c => c.id === structure.cityId)?.faction === 'ming';
      const taxRate = isMing ? 50 : 10;
      const efficiency = structure.gridSize === 7 ? 0.26 : structure.gridSize === 6 ? 0.24 : 0.22;
      const weatherMult = structure.seasonCondition === 'bountiful' ? 1.25 : structure.seasonCondition === 'poor' ? 0.70 : 1.0;
      const expectedYield = Math.max(0, Math.round((structure.assignedWorkers || 0) * 90 * efficiency * weatherMult * (1 - taxRate / 100)));
      const weatherText = structure.seasonCondition === 'bountiful' ? 'Được mùa +25%' : structure.seasonCondition === 'poor' ? 'Mất mùa -30%' : 'Bình thường';

      const tooltipHtml = `
        <div class="px-3 py-2 rounded shadow-xl font-serif text-xs whitespace-nowrap relative border border-[#8c6b44]/40 bg-[#fbf5e8] text-[#261304] drop-shadow-md">
          <div class="font-bold text-sm text-[#8c2d19] pb-0.5 border-b border-[#8c6b44]/25">
            ${cleanName}
          </div>
          <div class="text-[11px] text-[#5c3e23] pt-1 flex flex-col gap-0.5">
            ${isBuilding 
              ? `<span>🚧 Đang thi công (còn ${structure.buildDaysRemaining} ngày)</span>`
              : isFarm
              ? `<span>🌾 ${structure.assignedWorkers}/${structure.maxWorkers} nông đinh • Thuế: ${taxRate}%</span>
                 <span class="text-[#8c2d19] font-bold">Dự kiến thu: ~${expectedYield.toLocaleString()} thạch (${weatherText})</span>`
              : order
              ? `<span>🔥 Đang rèn ${order.quantity} ${order.name} (còn ${order.remainingDays} ngày)</span>`
              : '<span>⚒️ Sẵn sàng nhận lệnh đúc</span>'
            }
          </div>
        </div>
      `;

      const existing = currentOverlayMap.get(structure.id);

      if (existing && existing.visualKey === visualKey) {
        // Cập nhật tooltip mà KHÔNG reload lại ảnh overlay
        existing.overlay.setTooltipContent(tooltipHtml);
      } else {
        // Nếu đã có nhưng đổi vị trí/trạng thái thì gỡ bỏ cái cũ
        if (existing) {
          existing.overlay.remove();
        }

        const overlay = L.imageOverlay(iconUrl, imgBounds, {
          interactive: true,
          pane: 'structuresPane',
          className: `structure-grid-overlay cursor-pointer select-none transition-all ${
            isBuilding ? 'opacity-70 animate-pulse' : ''
          } ${order ? 'filter drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]' : 'filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]'}`,
        });

        overlay.bindTooltip(tooltipHtml, {
          direction: 'top',
          className: 'structure-tooltip-container',
          sticky: true,
        });

        overlay.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          if (useUIStore.getState().placementMode || useUIStore.getState().baseRelocateMode) {
            callbacksRef.current.handlePlacementAtRef.current(e.latlng);
            return;
          }
          callbacksRef.current.onSelectStructureMenu(structure);
        });

        overlay.addTo(layer);
        currentOverlayMap.set(structure.id, { overlay, visualKey });
      }
    });

    // Dọn dẹp các công trình đã bị phá dỡ
    for (const [id, item] of currentOverlayMap.entries()) {
      if (!activeIds.has(id)) {
        item.overlay.remove();
        currentOverlayMap.delete(id);
      }
    }
  }, [mapInstance, structures, cities, structuresLayerRef]);
};
