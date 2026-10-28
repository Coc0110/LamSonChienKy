import { useEffect } from 'react';
import L from 'leaflet';
import type { CityNode } from '../../../types';
import type { DistrictInfo } from '../../../types/map';
import { percentToLatLng, findDistrictForCoord } from '../../../utils/mapGeo';
import { getCityGridSize, getCampGridSize, getEntityCellBounds } from '../../../data/terrainGrid';
import { useUIStore } from '../../../store/uiStore';

interface UseCityMarkersProps {
  mapInstance: L.Map | null;
  nodesLayerRef: React.MutableRefObject<L.LayerGroup | null>;
  cities: CityNode[];
  districtsList: DistrictInfo[];
  selectBase: (cityId: string) => void;
  handlePlacementAtRef: React.MutableRefObject<(latlng: L.LatLng) => void>;
}

export const useCityMarkers = ({
  mapInstance,
  nodesLayerRef,
  cities,
  districtsList,
  selectBase,
  handlePlacementAtRef,
}: UseCityMarkersProps) => {
  useEffect(() => {
    if (!mapInstance) return;
    const layer = nodesLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    cities.forEach(city => {
      const troops = city.troops;
      const isLamSonBase = city.faction === 'lam_son' && (city.hasBase || city.id === 'lam_son');
      const isCity = city.type === 'city';

      // Quy tắc gán cứng kích thước ô lưới
      const gridSize = isCity ? getCityGridSize(troops) : getCampGridSize(troops);
      const bounds = getEntityCellBounds(city.x, city.y, gridSize, city.startCol, city.startRow);

      const sw = percentToLatLng(bounds.minX, bounds.maxY);
      const ne = percentToLatLng(bounds.maxX, bounds.minY);
      const imgBounds = L.latLngBounds(sw, ne);

      const iconUrl = isCity || troops >= 8000 ? '/icons/structure_city.png' : '/icons/structure_camp.png';

      // Dùng L.imageOverlay để icon tự động phóng to / thu nhỏ theo ô lưới
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
        <div class="px-3 py-2 rounded shadow-xl font-serif text-xs whitespace-nowrap relative border border-[#8c6b44]/40 bg-[#fbf5e8] text-[#261304] drop-shadow-md">
          <div class="font-bold text-sm ${isLamSonBase ? 'text-[#8c2d19]' : 'text-[#1d4ed8]'} pb-0.5 border-b border-[#8c6b44]/25">
            ${isLamSonBase ? '★ Đại Bản Doanh' : isCity ? '◆ Thành Trì' : '▲ Doanh Trại'} ${city.name}
          </div>
          <div class="text-[11px] text-[#5c3e23] pt-1">Huyện ${districtName} • ${troops.toLocaleString()} quân</div>
          ${hasTraining ? `<div class="text-[10px] text-[#8c2d19] font-bold mt-0.5">⚔️ Đang thao luyện ${city.training!.traineesCount} tráng phu (còn ${city.training!.remainingDays} ngày)</div>` : ''}
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

      // Huy hiệu quân số nhỏ gọn ở góc trên bên phải
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
  }, [mapInstance, cities, selectBase, districtsList, nodesLayerRef, handlePlacementAtRef]);
};
