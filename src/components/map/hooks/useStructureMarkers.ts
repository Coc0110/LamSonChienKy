import { useEffect } from 'react';
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

      // Dùng L.imageOverlay để icon tự động phóng to / thu nhỏ theo ô lưới
      const overlay = L.imageOverlay(iconUrl, imgBounds, {
        interactive: true,
        pane: 'structuresPane',
        className: `structure-grid-overlay cursor-pointer select-none transition-all ${
          isBuilding ? 'opacity-70 animate-pulse' : ''
        } ${order ? 'filter drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]' : 'filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]'}`,
      });

      const cleanName = cleanStructureName(structure.name);
      const isMing = cities.find(c => c.id === structure.cityId)?.faction === 'ming';
      const taxRate = isMing ? 50 : 10;
      const efficiency = structure.gridSize === 7 ? 0.26 : structure.gridSize === 6 ? 0.24 : 0.22;
      const weatherMult = structure.seasonCondition === 'bountiful' ? 1.25 : structure.seasonCondition === 'poor' ? 0.70 : 1.0;
      const expectedYield = Math.max(0, Math.round((structure.assignedWorkers || 0) * 90 * efficiency * weatherMult * (1 - taxRate / 100)));
      const weatherText = structure.seasonCondition === 'bountiful' ? 'Được mùa +25%' : structure.seasonCondition === 'poor' ? 'Mất mùa -30%' : 'Bình thường';

      overlay.bindTooltip(`
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
        onSelectStructureMenu(structure);
      });

      overlay.addTo(layer);
    });
  }, [mapInstance, structures, cities, structuresLayerRef, onSelectStructureMenu, handlePlacementAtRef]);
};
