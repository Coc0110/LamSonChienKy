import { useEffect } from 'react';
import L from 'leaflet';
import { useGameStore } from '../../../store/gameStore';
import { useUIStore } from '../../../store/uiStore';
import { percentToLatLng } from '../../../utils/mapGeo';
import { cellToCoord, GRID_CELL_W_PCT, GRID_CELL_H_PCT } from '../../../data/terrainGrid';
import {
  getFormationMapPos,
  MARCH_ENDPOINT_ACTIONS,
  STATUS_LABELS,
} from '../../../utils/marchPathUtils';
import type { TerrainType } from '../../../types/terrain';

interface UseArmyMarchLayerProps {
  mapInstance: L.Map | null;
  armyLayerRef: React.MutableRefObject<L.LayerGroup | null>;
}

const TERRAIN_PATH_COLORS: Record<TerrainType, string> = {
  plains: '#facc15',
  forest: '#4ade80',
  mountain: '#fb923c',
  cliff: '#ef4444',
  swamp: '#22d3ee',
  water: '#60a5fa',
};

export function useArmyMarchLayer({ mapInstance, armyLayerRef }: UseArmyMarchLayerProps) {
  const formations = useGameStore(state => state.formations);
  const cities = useGameStore(state => state.cities);
  const generals = useGameStore(state => state.generals);
  const selectedMapFormationId = useUIStore(state => state.selectedMapFormationId);
  const marchDrawMode = useUIStore(state => state.marchDrawMode);

  useEffect(() => {
    const map = mapInstance;
    const layer = armyLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    // Đếm số đạo quân đứng trùng 1 ô để tách góc hiển thị không đè lên nhau
    const cellCountMap = new Map<string, number>();
    const cellIndexMap = new Map<string, number>();

    const validFormations = formations.filter(f => f.totalTroops > 0);
    validFormations.forEach(f => {
      const pos = getFormationMapPos(f, cities);
      const key = `${pos.col}_${pos.row}`;
      cellCountMap.set(key, (cellCountMap.get(key) || 0) + 1);
    });

    validFormations.forEach(form => {
      const pos = getFormationMapPos(form, cities);
      const key = `${pos.col}_${pos.row}`;
      const totalAtCell = cellCountMap.get(key) || 1;
      const idxAtCell = cellIndexMap.get(key) || 0;
      cellIndexMap.set(key, idxAtCell + 1);

      // Nếu đạo quân đang ở trùng vị trí căn cứ hoặc có nhiều đạo quân cùng 1 ô, dịch nhẹ tọa độ hiển thị cờ
      const isAtCity = cities.some(
        c => Math.abs(c.x - pos.x) < 0.35 && Math.abs(c.y - pos.y) < 0.35
      );
      let displayX = pos.x;
      let displayY = pos.y;

      if (isAtCity || totalAtCell > 1) {
        const angle = (-Math.PI / 4) + (idxAtCell * (Math.PI / 2.5));
        const radius = isAtCity ? 0.65 : 0.35;
        displayX = pos.x + Math.cos(angle) * radius;
        displayY = pos.y + Math.sin(angle) * radius;
      }

      const isSelected = selectedMapFormationId === form.id || marchDrawMode?.formationId === form.id;
      const statusMeta = STATUS_LABELS[form.status] || STATUS_LABELS.idle;
      const commander = generals.find(g => g.id === form.commanderGeneralId);

      // 1. Vẽ Vòng Tròn Phạm Vi Chiến Thuật (Mai phục 7 ô, Thám thính 12 ô, Nghi binh 6 ô)
      if (form.status === 'ambushing' || form.status === 'scouting' || form.status === 'decoying') {
        const radiusCells = form.status === 'scouting' ? 12 : form.status === 'ambushing' ? 7 : 6;
        const rx = radiusCells * GRID_CELL_W_PCT;
        const ry = radiusCells * GRID_CELL_H_PCT;
        const circlePts: L.LatLngExpression[] = [];
        for (let i = 0; i <= 36; i++) {
          const theta = (i / 36) * Math.PI * 2;
          circlePts.push(percentToLatLng(pos.x + Math.cos(theta) * rx, pos.y + Math.sin(theta) * ry));
        }

        const ringColor =
          form.status === 'ambushing'
            ? '#22c55e'
            : form.status === 'scouting'
            ? '#38bdf8'
            : '#f97316';

        L.polygon(circlePts, {
          color: ringColor,
          weight: 2,
          dashArray: '6, 6',
          fillColor: ringColor,
          fillOpacity: 0.14,
          interactive: false,
        }).addTo(layer);
      }

      // 2. Vẽ Lộ Trình Đang Hành Quân / Rút Lui (nếu có marchOrder)
      if (form.marchOrder) {
        const order = form.marchOrder;
        const activeCells =
          order.isInRetreatPhase && order.retreatCells && order.retreatCells.length > 1
            ? order.retreatCells
            : order.cells;

        const remainingCells = activeCells.slice(order.currentCellIndex);

        // Tô các ô lưới trên lộ trình còn lại
        remainingCells.forEach((c, idx) => {
          const { minX, minY, maxX, maxY } = cellToCoord(c.col, c.row);
          const bounds = L.latLngBounds(percentToLatLng(minX, maxY), percentToLatLng(maxX, minY));
          const cellColor = order.isInRetreatPhase
            ? '#c084fc'
            : TERRAIN_PATH_COLORS[c.terrain] || '#facc15';

          L.rectangle(bounds, {
            color: cellColor,
            weight: idx === remainingCells.length - 1 ? 2.5 : 1,
            fillColor: cellColor,
            fillOpacity: idx === remainingCells.length - 1 ? 0.45 : 0.25,
            interactive: false,
          }).addTo(layer);

          // Nếu đi qua ô Sông nước (water), hiện biểu tượng đóng bè vượt sông
          if (c.terrain === 'water' && idx % 2 === 0) {
            const raftIcon = L.divIcon({
              className: 'army-water-raft-icon',
              html: `<div style="font-size:11px;filter:drop-shadow(0 1px 2px #000);">🛶</div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            });
            L.marker(percentToLatLng(c.x, c.y), { icon: raftIcon, interactive: false }).addTo(layer);
          }
        });

        // Đường nối tâm các ô còn lại
        if (remainingCells.length >= 2) {
          const latlngs = [
            percentToLatLng(pos.x, pos.y),
            ...remainingCells.slice(1).map(c => percentToLatLng(c.x, c.y)),
          ];
          L.polyline(latlngs, {
            color: order.isInRetreatPhase ? '#c084fc' : '#f59e0b',
            weight: 3.5,
            dashArray: order.isInRetreatPhase ? '6, 6' : '8, 6',
            opacity: 0.95,
            interactive: false,
          }).addTo(layer);
        }

        // Nếu đang ở Chặng 1 của Lộ Trình Kép (Trá Bại) và có nhánh rút lui Chặng 2 -> Vẽ luôn nhánh rút lui dự kiến
        if (!order.isInRetreatPhase && order.retreatCells && order.retreatCells.length > 1) {
          const retreatLatLngs = order.retreatCells.map(c => percentToLatLng(c.x, c.y));
          L.polyline(retreatLatLngs, {
            color: '#c084fc',
            weight: 3,
            dashArray: '5, 7',
            opacity: 0.85,
            interactive: false,
          }).addTo(layer);
        }

        // Huy hiệu Lệnh Điểm Cuối ở ô cuối cùng
        const finalCell = remainingCells[remainingCells.length - 1];
        if (finalCell) {
          const actMeta = MARCH_ENDPOINT_ACTIONS[order.endpointAction] || MARCH_ENDPOINT_ACTIONS.camp;
          const endIcon = L.divIcon({
            className: 'army-endpoint-badge',
            html: `
              <div style="
                transform: translate(-50%, -115%);
                white-space: nowrap;
                padding: 2px 7px;
                border-radius: 6px;
                background: rgba(24, 15, 8, 0.92);
                border: 1.5px solid ${actMeta.color};
                color: #fef3c7;
                font-family: serif;
                font-size: 10.5px;
                font-weight: 700;
                box-shadow: 0 3px 10px rgba(0,0,0,0.65);
                display: inline-flex;
                align-items: center;
                gap: 4px;
                cursor: pointer;
              " title="Nhấp để đổi lệnh tại điểm cuối">
                <span>${actMeta.icon}</span>
                <span>Đích: ${actMeta.shortLabel}</span>
              </div>
            `,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          });

          const endMarker = L.marker(percentToLatLng(finalCell.x, finalCell.y), {
            icon: endIcon,
            zIndexOffset: 900,
          });
          endMarker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            useUIStore.getState().setSelectedMapFormationId(form.id);
          });
          endMarker.addTo(layer);
        }

        // Nếu có toán quân Minh đang đuổi theo sau lưng (pursuingEnemy) -> Vẽ marker Quân Minh Truy Kích!
        if (order.pursuingEnemy) {
          const pe = order.pursuingEnemy;
          const enemyIcon = L.divIcon({
            className: 'pursuing-ming-marker',
            html: `
              <div style="
                transform: translate(-50%, -50%);
                padding: 3px 7px;
                border-radius: 999px;
                background: linear-gradient(135deg, #7f1d1d, #dc2626);
                border: 2px solid #fca5a5;
                color: #fff;
                font-family: serif;
                font-size: 10px;
                font-weight: 800;
                white-space: nowrap;
                box-shadow: 0 0 12px rgba(239, 68, 68, 0.85);
                display: inline-flex;
                align-items: center;
                gap: 4px;
              ">
                <span>⚔️</span>
                <span>Giặc Truy Kích (${pe.troops})</span>
              </div>
            `,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          });
          L.marker(percentToLatLng(pe.x, pe.y), {
            icon: enemyIcon,
            interactive: false,
            zIndexOffset: 950,
          }).addTo(layer);
        }
      }

      // 3. Vẽ Quân Kỳ Đạo Quân (Army Banner Marker) tại vị trí hiện tại
      const bannerIcon = L.divIcon({
        className: 'lam-son-army-banner',
        html: `
          <div style="
            transform: translate(-50%, -88%);
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
            user-select: none;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.75));
          ">
            <div style="
              display: flex;
              align-items: center;
              gap: 5px;
              padding: 3px 8px;
              border-radius: 7px;
              background: ${isSelected ? 'linear-gradient(135deg, #7c2d12, #b45309)' : 'linear-gradient(135deg, #271509, #3f220f)'};
              border: ${isSelected ? '2px solid #fde047' : `1.5px solid ${statusMeta.color}`};
              color: #fef3c7;
              white-space: nowrap;
              font-family: serif;
              box-shadow: ${isSelected ? '0 0 14px rgba(250, 204, 21, 0.7)' : 'none'};
              transition: all 0.15s ease;
            ">
              <span style="font-size: 13px;">${statusMeta.icon}</span>
              <div style="display: flex; flex-direction: column; line-height: 1.15;">
                <span style="font-size: 11px; font-weight: 800; color: #fffbeb;">
                  ${form.name}
                </span>
                <span style="font-size: 9.5px; color: #fcd34d; font-family: monospace;">
                  ${form.totalTroops} binh • ${statusMeta.label}${commander ? ` • ${commander.name}` : ''}
                </span>
              </div>
            </div>
            <div style="
              width: 3px;
              height: 10px;
              background: ${isSelected ? '#fde047' : statusMeta.color};
            "></div>
            <div style="
              width: 8px;
              height: 8px;
              border-radius: 999px;
              background: ${isSelected ? '#fde047' : statusMeta.color};
              border: 1.5px solid #1c1917;
            "></div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const bannerMarker = L.marker(percentToLatLng(displayX, displayY), {
        icon: bannerIcon,
        zIndexOffset: isSelected ? 1200 : 1000,
      });

      bannerMarker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        const ui = useUIStore.getState();
        // Nếu đang ở chế độ vẽ của đạo quân khác thì chuyển sang chọn đạo quân này
        ui.setSelectedMapFormationId(form.id);
      });

      bannerMarker.addTo(layer);
    });
  }, [mapInstance, armyLayerRef, formations, cities, generals, selectedMapFormationId, marchDrawMode]);
}
