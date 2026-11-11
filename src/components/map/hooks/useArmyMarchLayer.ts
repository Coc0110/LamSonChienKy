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
import { ensureFormationRosterAndLayers } from '../../../utils/armyCompositionUtils';
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
  const canhHour = useGameStore(state => state.canhHour);
  const isWarMode = useGameStore(state => state.isWarMode);
  const timeMode = useGameStore(state => state.timeMode);
  const scoutMissions = useGameStore(state => state.scoutMissions || []);
  const selectedMapFormationId = useUIStore(state => state.selectedMapFormationId);

  const isNight = (isWarMode || timeMode === 'hour') && (canhHour >= 0 && canhHour <= 2);
  const marchDrawMode = useUIStore(state => state.marchDrawMode);

  useEffect(() => {
    const map = mapInstance;
    const layer = armyLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    // Đếm số đạo quân đứng trùng 1 ô để tách góc hiển thị không đè lên nhau
    const cellCountMap = new Map<string, number>();
    const cellIndexMap = new Map<string, number>();
    const attackedByCount = new Map<string, number>();
    const posById = new Map<string, { x: number; y: number; col: number; row: number }>();

    const validFormations = formations.filter(f => f.totalTroops > 0);
    validFormations.forEach(f => {
      const pos = getFormationMapPos(f, cities);
      posById.set(f.id, pos);
      const key = `${pos.col}_${pos.row}`;
      cellCountMap.set(key, (cellCountMap.get(key) || 0) + 1);
      if (f.combatState?.targetFormationId) {
        const tid = f.combatState.targetFormationId;
        attackedByCount.set(tid, (attackedByCount.get(tid) || 0) + 1);
      }
    });

    // Vẽ đường vector giao chiến trực tiếp giữa các đạo quân đang chạm trán
    const drawnClashPairs = new Set<string>();
    validFormations.forEach(form => {
      const targetId = form.combatState?.targetFormationId;
      if (!targetId) return;
      const pairKey = form.id < targetId ? `${form.id}__${targetId}` : `${targetId}__${form.id}`;
      if (drawnClashPairs.has(pairKey)) return;
      const p1 = posById.get(form.id);
      const p2 = posById.get(targetId);
      if (!p1 || !p2) return;
      drawnClashPairs.add(pairKey);

      const lineColor = form.faction === 'ming' ? '#ef4444' : '#f59e0b';
      L.polyline([percentToLatLng(p1.x, p1.y), percentToLatLng(p2.x, p2.y)], {
        color: lineColor,
        weight: 3,
        dashArray: '5, 4',
        opacity: 0.9,
        interactive: false,
      }).addTo(layer);

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const clashIcon = L.divIcon({
        className: 'world-combat-clash-badge',
        html: `<div style="transform:translate(-50%,-50%);width:22px;height:22px;border-radius:999px;background:#7f1d1d;border:1.5px solid #fde047;display:flex;align-items:center;justify-content:center;font-size:12px;">⚔️</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      L.marker(percentToLatLng(midX, midY), {
        icon: clashIcon,
        interactive: false,
        zIndexOffset: 1120,
      }).addTo(layer);
    });

    validFormations.forEach(rawForm => {
      const form = ensureFormationRosterAndLayers(rawForm);
      const isMing = form.faction === 'ming';
      const isConvoy = form.armyRole === 'ming_convoy';
      const pos = posById.get(form.id) || getFormationMapPos(form, cities);
      const key = `${pos.col}_${pos.row}`;
      const totalAtCell = cellCountMap.get(key) || 1;
      const idxAtCell = cellIndexMap.get(key) || 0;
      cellIndexMap.set(key, idxAtCell + 1);

      // Giữ tâm quân kỳ tại đúng ô/tọa độ thực; chỉ tách nhẹ khi có từ 2 đạo quân trở lên đứng trùng 1 ô
      let displayX = pos.x;
      let displayY = pos.y;

      if (totalAtCell > 1) {
        const angle = (idxAtCell / totalAtCell) * Math.PI * 2;
        const radius = 0.16;
        displayX = pos.x + Math.cos(angle) * radius;
        displayY = pos.y + Math.sin(angle) * radius;
      }

      const isSelected = selectedMapFormationId === form.id || marchDrawMode?.formationId === form.id;
      const statusMeta = STATUS_LABELS[form.status] || STATUS_LABELS.idle;
      const commander = generals.find(g => g.id === form.commanderGeneralId);

      // 1. Vẽ Vòng Tròn Phạm Vi Chiến Thuật (Mai phục 7 ô, Thám thính 12 ô, Nghi binh 6 ô)
      if (!isMing && (form.status === 'ambushing' || form.status === 'scouting' || form.status === 'decoying')) {
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

        // Tô các ô lưới trên lộ trình còn lại (chỉ vẽ ô chi tiết cho quân Lam Sơn)
        if (!isMing) {
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

            if (c.terrain === 'water' && idx % 2 === 0) {
              const raftIcon = L.divIcon({
                className: 'army-water-raft-icon',
                html: `<div style="font-size:11px;">🛶</div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8],
              });
              L.marker(percentToLatLng(c.x, c.y), { icon: raftIcon, interactive: false }).addTo(layer);
            }
          });
        }

        // Đường nối tâm các ô còn lại
        if (remainingCells.length >= 2) {
          const latlngs = [
            percentToLatLng(pos.x, pos.y),
            ...remainingCells.slice(1).map(c => percentToLatLng(c.x, c.y)),
          ];
          L.polyline(latlngs, {
            color: isMing ? '#dc2626' : order.isInRetreatPhase ? '#c084fc' : '#f59e0b',
            weight: isMing ? 2.5 : 3.5,
            dashArray: order.isInRetreatPhase ? '6, 6' : '8, 6',
            opacity: isMing ? 0.8 : 0.95,
            interactive: false,
          }).addTo(layer);
        }

        // Nhánh rút lui dự kiến của Lộ Trình Kép (Lam Sơn)
        if (!isMing && !order.isInRetreatPhase && order.retreatCells && order.retreatCells.length > 1) {
          const retreatLatLngs = order.retreatCells.map(c => percentToLatLng(c.x, c.y));
          L.polyline(retreatLatLngs, {
            color: '#c084fc',
            weight: 3,
            dashArray: '5, 7',
            opacity: 0.85,
            interactive: false,
          }).addTo(layer);
        }

        // Huy hiệu Lệnh Điểm Cuối ở ô cuối cùng (Lam Sơn)
        const finalCell = !isMing ? remainingCells[remainingCells.length - 1] : null;
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
                display: inline-flex;
                align-items: center;
                gap: 4px;
                cursor: pointer;
              ">
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
      }

      // 3. Tính toán Thanh Máu (HP / Quân số), Sĩ Khí (0..100) và Nhãn Trạng Thái Tác Chiến
      const layers = form.layers!;
      const totalHp = layers.frontlineHp + layers.backlineHp + layers.flankHp;
      const totalMaxHp = layers.frontlineMaxHp + layers.backlineMaxHp + layers.flankMaxHp;
      const hpPct = totalMaxHp > 0 ? Math.max(0, Math.min(100, Math.round((totalHp / totalMaxHp) * 100))) : 100;
      const moraleVal = Math.max(0, Math.min(100, Math.round(form.morale ?? 100)));
      const moraleColor = moraleVal < 20 ? '#ef4444' : moraleVal < 45 ? '#fb923c' : '#facc15';

      const pills: { text: string; bg: string; border: string; color: string }[] = [];
      if (form.isStealthed) {
        pills.push({ text: '🌲 Đang Ẩn Thân', bg: '#064e3b', border: '#34d399', color: '#ecfdf5' });
      }
      if (form.preparedTrap === 'fire') {
        pills.push({ text: '🔥 Bẫy Lửa Sẵn Sàng', bg: '#7c2d12', border: '#fb923c', color: '#ffedd5' });
      } else if (form.preparedTrap === 'rockfall') {
        pills.push({ text: '🪨 Bẫy Đá Sẵn Sàng', bg: '#44403c', border: '#a8a29e', color: '#f5f5f4' });
      }
      const isFlankedOrPincered =
        (attackedByCount.get(form.id) || 0) >= 2 ||
        form.combatState?.attackDirection === 'flank' ||
        form.combatState?.attackDirection === 'rear';
      if (isFlankedOrPincered) {
        pills.push({ text: '⚠️ Lưỡng Đầu Thụ Địch', bg: '#713f12', border: '#facc15', color: '#fef9c3' });
      }
      if (form.isSupplyCut) {
        pills.push({ text: '🌾 Tuyệt Lương', bg: '#7f1d1d', border: '#f87171', color: '#fee2e2' });
      }
      if (form.isRouting) {
        pills.push({ text: '🏳️ Vỡ Trận', bg: '#3f3f46', border: '#e4e4e7', color: '#fafafa' });
      }

      const pillsHtml =
        pills.length > 0
          ? `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:2px;margin-bottom:2px;max-width:210px;">
              ${pills
                .map(
                  p =>
                    `<span style="padding:1px 4px;border-radius:4px;font-size:8.5px;font-weight:700;white-space:nowrap;background:${p.bg};border:1px solid ${p.border};color:${p.color};">${p.text}</span>`
                )
                .join('')}
            </div>`
          : '';

      // 4. Vẽ Quân Kỳ Đạo Quân (Lam Sơn hoặc Quân Minh / Đoàn Vận Lương)
      const isNightResting = !isMing && isNight && (form.status === 'marching' || form.status === 'retreating');
      const displayStatusLabel = isConvoy
        ? 'Đoàn Vận Lương'
        : isNightResting
        ? 'Hạ trại nghỉ đêm'
        : statusMeta.label;
      const displayStatusIcon = isConvoy ? '🌾' : isNightResting ? '⛺' : statusMeta.icon;
      const displayBorderColor = isSelected
        ? '#fde047'
        : isMing
        ? '#fca5a5'
        : isNightResting
        ? '#60a5fa'
        : statusMeta.color;
      const displayBg = isMing
        ? isSelected
          ? 'linear-gradient(135deg, #991b1b, #b91c1c)'
          : 'linear-gradient(135deg, #7f1d1d, #991b1b)'
        : isSelected
        ? 'linear-gradient(135deg, #7c2d12, #b45309)'
        : isNightResting
        ? 'linear-gradient(135deg, #091326, #162544)'
        : 'linear-gradient(135deg, #271509, #3f220f)';

      const poleColor = isSelected ? '#fde047' : isMing ? '#991b1b' : statusMeta.color;
      const hpBarColor = isMing ? '#ef4444' : '#22c55e';

      const bannerIcon = L.divIcon({
        className: isMing ? 'ming-army-banner' : 'lam-son-army-banner',
        html: `
          <div style="
            transform: translate(-50%, -100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
            user-select: none;
          ">
            ${pillsHtml}
            <div style="
              width: 112px;
              margin-bottom: 2px;
              padding: 2px 3px;
              border-radius: 4px;
              background: rgba(15, 10, 6, 0.88);
              border: 1px solid ${isMing ? '#dc2626' : '#8c6b44'};
              display: flex;
              flex-direction: column;
              gap: 2px;
            ">
              <div style="height:3.5px;width:100%;background:rgba(255,255,255,0.14);border-radius:2px;overflow:hidden;">
                <div style="height:100%;width:${hpPct}%;background:${hpBarColor};"></div>
              </div>
              <div style="height:3px;width:100%;background:rgba(255,255,255,0.14);border-radius:2px;overflow:hidden;">
                <div style="height:100%;width:${moraleVal}%;background:${moraleColor};"></div>
              </div>
            </div>
            <div style="
              display: flex;
              align-items: center;
              gap: 5px;
              padding: 3px 8px;
              border-radius: 7px;
              background: ${displayBg};
              border: ${isSelected ? '2px solid #fde047' : `1.5px solid ${displayBorderColor}`};
              color: #fef3c7;
              white-space: nowrap;
              font-family: serif;
            ">
              <span style="font-size: 13px;">${displayStatusIcon}</span>
              <div style="display: flex; flex-direction: column; line-height: 1.15;">
                <span style="font-size: 11px; font-weight: 800; color: #fffbeb;">
                  ${isConvoy ? `🌾 ${form.name}` : form.name}
                </span>
                <span style="font-size: 9.5px; color: ${isMing ? '#fecaca' : isNightResting ? '#93c5fd' : '#fcd34d'}; font-family: monospace;">
                  ${form.totalTroops} binh • SK ${moraleVal}% • ${displayStatusLabel}${commander ? ` • ${commander.name}` : ''}
                </span>
              </div>
            </div>
            <div style="
              width: 3px;
              height: 9px;
              background: ${poleColor};
            "></div>
            <div style="
              width: 8px;
              height: 8px;
              border-radius: 999px;
              background: ${poleColor};
              border: 1.5px solid #1c1917;
            "></div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const bannerMarker = L.marker(percentToLatLng(displayX, displayY), {
        icon: bannerIcon,
        zIndexOffset: isSelected ? 1200 : isMing ? 1050 : 1000,
      });

      bannerMarker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        useUIStore.getState().setSelectedMapFormationId(form.id);
      });

      bannerMarker.addTo(layer);
    });

    // 5. Hiển thị các toán thám mã đang di chuyển trên bản đồ (Scout Missions)
    const activeScoutMissions = (scoutMissions || []).filter(m => m.status === 'traveling');
    activeScoutMissions.forEach(mission => {
      const remainingCells = mission.path.slice(mission.currentCellIndex);
      if (remainingCells.length >= 2) {
        const linePoints = [
          percentToLatLng(mission.currentPos.x, mission.currentPos.y),
          ...remainingCells.slice(1).map(c => percentToLatLng(c.x, c.y)),
        ];
        L.polyline(linePoints, {
          color: '#8c6b44',
          weight: 2,
          opacity: 0.75,
          dashArray: '4, 6',
          interactive: false,
        }).addTo(layer);
      }

      const scoutIconHtml = `
        <div style="
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(247, 238, 216, 0.95);
          border: 1.5px solid #8c6b44;
          border-radius: 9999px;
          padding: 2px 7px;
          white-space: nowrap;
          cursor: pointer;
        ">
          <img src="/troops/scout.png" alt="Thám mã" style="width: 16px; height: 16px; object-fit: contain;" />
          <span style="font-family: serif; font-weight: bold; font-size: 11px; color: #261304;">${mission.scoutCount} Thám mã</span>
        </div>
      `;

      const scoutMarker = L.marker(percentToLatLng(mission.currentPos.x, mission.currentPos.y), {
        icon: L.divIcon({
          className: 'scout-mission-marker',
          html: scoutIconHtml,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
        zIndexOffset: 1150,
      });

      scoutMarker.bindTooltip(
        `<b>Toán thám mã Lam Sơn (${mission.scoutCount} quân)</b><br/>Đang tới: ${mission.targetCityName}<br/>Còn ~${mission.daysRemaining.toFixed(1)} ngày đường (${Math.round(mission.daysRemaining * 12)} canh)`,
        { direction: 'top', offset: [0, -14] }
      );

      scoutMarker.addTo(layer);
    });
  }, [mapInstance, armyLayerRef, formations, cities, generals, selectedMapFormationId, marchDrawMode, canhHour, isWarMode, timeMode, isNight, scoutMissions]);
}
