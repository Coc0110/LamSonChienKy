import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import type { CityNode } from '../../../types';
import type { DistrictInfo } from '../../../types/map';
import { percentToLatLng } from '../../../utils/mapGeo';
import { getCampGridSize, getCityGridSize, getEntityCellBounds } from '../../../data/terrainGrid';
import { useUIStore } from '../../../store/uiStore';

interface UseCityMarkersProps {
  mapInstance: L.Map | null;
  nodesLayerRef: React.MutableRefObject<L.LayerGroup | null>;
  cities: CityNode[];
  districtsList: DistrictInfo[];
  selectBase: (id: string | null) => void;
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
  // Chỉ kích hoạt render lại các marker thành trì/căn cứ khi các thuộc tính hiển thị bản đồ thực sự thay đổi
  const cityMarkersSignature = useMemo(() => {
    return cities
      .map(c => `${c.id}_${c.x}_${c.y}_${c.troops}_${c.faction}_${c.type}_${c.hasBase}_${c.startCol}_${c.startRow}`)
      .join('|');
  }, [cities]);

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

      // Sử dụng L.imageOverlay để icon tự động phóng to / thu nhỏ đồng bộ tuyệt đối với ô lưới
      const overlay = L.imageOverlay(iconUrl, imgBounds, {
        interactive: true,
        pane: 'structuresPane',
        className: 'city-grid-overlay cursor-pointer select-none transition-all hover:brightness-125 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] hover:drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]',
      });

      overlay.bindTooltip(`
        <div class="px-2 py-1 rounded bg-[#1e130c]/95 border border-amber-600/70 text-amber-100 text-xs font-serif font-bold shadow-lg whitespace-nowrap">
          <div class="text-amber-300">${city.name}</div>
          <div class="text-[10px] text-stone-300 font-sans">Quân số: ${troops.toLocaleString()} • Quy mô: ${gridSize}x${gridSize} ô</div>
        </div>
      `, {
        direction: 'top',
        className: 'city-tooltip-container',
        sticky: true,
      });

      overlay.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        // Nếu đang ở chế độ xây dựng hoặc di dời thì click vào căn cứ vẫn ưu tiên đặt công trình
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
  }, [mapInstance, cityMarkersSignature, selectBase, districtsList, nodesLayerRef, handlePlacementAtRef]);
};
