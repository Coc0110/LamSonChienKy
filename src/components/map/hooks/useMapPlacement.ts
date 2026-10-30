import { useEffect } from 'react';
import L from 'leaflet';
import type { DistrictInfo } from '../../../types/map';
import { percentToLatLng, latLngToPercent, findDistrictForCoord, MAP_COORD_W } from '../../../utils/mapGeo';
import {
  GRID_CELL_W_PCT,
  GRID_CELL_H_PCT,
  validateCellPlacement,
  validateBaseRelocate,
  getCampGridSize,
  FARM_BASE_RADIUS_PCT,
} from '../../../data/terrainGrid';
import { useGameStore } from '../../../store/gameStore';
import type { PlacementMode, BaseRelocateMode } from '../../../store/uiStore';

interface UseMapPlacementProps {
  mapInstance: L.Map | null;
  previewLayerRef: React.MutableRefObject<L.LayerGroup | null>;
  controlRadiusLayerRef: React.MutableRefObject<L.LayerGroup | null>;
  placementMode: PlacementMode | null;
  baseRelocateMode: BaseRelocateMode | null;
  districtsList: DistrictInfo[];
  setPlacementMode: (mode: PlacementMode | null) => void;
  setBaseRelocateMode: (mode: BaseRelocateMode | null) => void;
  handlePlacementAtRef: React.MutableRefObject<(latlng: L.LatLng) => void>;
}

export const useMapPlacement = ({
  mapInstance,
  previewLayerRef,
  controlRadiusLayerRef,
  placementMode,
  baseRelocateMode,
  districtsList,
  setPlacementMode,
  setBaseRelocateMode,
  handlePlacementAtRef,
}: UseMapPlacementProps) => {
  useEffect(() => {
    if (!mapInstance) return;
    const map = mapInstance;
    const previewLayer = previewLayerRef.current;
    const controlLayer = controlRadiusLayerRef.current;
    if (!map || !previewLayer || !controlLayer) return;

    previewLayer.clearLayers();
    controlLayer.clearLayers();

    if (!placementMode && !baseRelocateMode) return;

    if (placementMode && placementMode.type === 'farm') {
      const currentCities = useGameStore.getState().cities;
      const targetCity = currentCities.find(c => c.id === placementMode.cityId);
      const basesToDraw = targetCity ? [targetCity] : currentCities.filter(c => c.faction === 'lam_son' && (c.hasBase || c.type === 'camp' || c.id === 'lam_son'));

      // Vẽ vòng tròn giới hạn bán kính bảo hộ quanh căn cứ khi xây ruộng nương
      basesToDraw.forEach(base => {
        const baseLatLng = percentToLatLng(base.x, base.y);
        const radiusCRS = (FARM_BASE_RADIUS_PCT / 100) * MAP_COORD_W;

        const controlCircle = L.circle(baseLatLng, {
          radius: radiusCRS,
          color: '#10b981',
          weight: 2,
          dashArray: '6, 6',
          fillColor: '#10b981',
          fillOpacity: 0.12,
          pane: 'structuresPane',
          interactive: false,
        });

        controlCircle.addTo(controlLayer);
      });
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

      const gridSize = placementMode.gridSize || (placementMode.type === 'forge' ? 3 : (placementMode.farmTier === 50 ? 7 : placementMode.farmTier === 35 ? 6 : 5));
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
  }, [
    mapInstance,
    placementMode,
    baseRelocateMode,
    districtsList,
    setPlacementMode,
    setBaseRelocateMode,
    previewLayerRef,
    controlRadiusLayerRef,
    handlePlacementAtRef,
  ]);
};
