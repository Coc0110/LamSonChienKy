import { useEffect } from 'react';
import L from 'leaflet';
import type { MarchCalculationResult } from '../../../types/terrain';
import { percentToLatLng } from '../../../utils/mapGeo';

interface UseTacticalMarchLayerProps {
  marchLayerRef: React.MutableRefObject<L.LayerGroup | null>;
  activeMarchRoute: MarchCalculationResult | null;
}

export const useTacticalMarchLayer = ({
  marchLayerRef,
  activeMarchRoute,
}: UseTacticalMarchLayerProps) => {
  useEffect(() => {
    const layer = marchLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!activeMarchRoute || !activeMarchRoute.pathPoints || activeMarchRoute.pathPoints.length < 2) {
      return;
    }

    const latlngs = activeMarchRoute.pathPoints.map(pt => percentToLatLng(pt[0], pt[1]));
    const polyline = L.polyline(latlngs, {
      color: '#ef4444',
      weight: 4,
      dashArray: '8, 8',
      className: 'marching-route-line',
    });
    polyline.addTo(layer);
  }, [activeMarchRoute, marchLayerRef]);
};
