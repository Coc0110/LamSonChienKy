import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import {
  Compass,
  Flag,
  GitBranch,
  Merge,
  RotateCcw,
  Send,
  Swords,
  Trash2,
  X,
  AlertTriangle,
  LayoutGrid,
  Square,
  CheckCircle2,
  Edit3,
} from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { useUIStore } from '../../../store/uiStore';
import { latLngToPercent, percentToLatLng } from '../../../utils/mapGeo';
import { coordToCell, cellToCoord } from '../../../data/terrainGrid';
import { TERRAIN_DEFINITIONS } from '../../../data/terrainData';
import {
  getFormationMapPos,
  createMarchPathCell,
  appendCellsToMarchPath,
  analyzeMarchRoute,
  MARCH_ENDPOINT_ACTIONS,
  STATUS_LABELS,
} from '../../../utils/marchPathUtils';
import type { MarchPathCell, MarchEndpointAction } from '../../../types/armyFormation';
import type { TerrainType } from '../../../types/terrain';
import { notify } from '../../../store/dialogStore';

interface MarchRouteDrawerOverlayProps {
  map: L.Map | null;
}

const CELL_DRAW_COLORS: Record<TerrainType, string> = {
  plains: '#eab308',
  forest: '#22c55e',
  mountain: '#f97316',
  cliff: '#ef4444',
  swamp: '#06b6d4',
  water: '#3b82f6',
};

export const MarchRouteDrawerOverlay: React.FC<MarchRouteDrawerOverlayProps> = ({ map }) => {
  const formations = useGameStore(state => state.formations);
  const cities = useGameStore(state => state.cities);
  const startGridMarch = useGameStore(state => state.startGridMarch);
  const updateMarchEndpointAction = useGameStore(state => state.updateMarchEndpointAction);
  const stopFormationMarch = useGameStore(state => state.stopFormationMarch);
  const splitFormationDetachment = useGameStore(state => state.splitFormationDetachment);
  const mergeFormationIntoParent = useGameStore(state => state.mergeFormationIntoParent);
  const setActiveFormationId = useGameStore(state => state.setActiveFormationId);

  const marchDrawMode = useUIStore(state => state.marchDrawMode);
  const setMarchDrawMode = useUIStore(state => state.setMarchDrawMode);
  const selectedMapFormationId = useUIStore(state => state.selectedMapFormationId);
  const setSelectedMapFormationId = useUIStore(state => state.setSelectedMapFormationId);
  const setActiveModal = useUIStore(state => state.setActiveModal);

  const activeFormation = useMemo(() => {
    const targetId = marchDrawMode?.formationId || selectedMapFormationId;
    if (!targetId) return null;
    return formations.find(f => f.id === targetId) || null;
  }, [formations, marchDrawMode, selectedMapFormationId]);

  const [drawnCells, setDrawnCells] = useState<MarchPathCell[]>([]);
  const [drawnRetreatCells, setDrawnRetreatCells] = useState<MarchPathCell[]>([]);
  const [drawingPhase, setDrawingPhase] = useState<'main' | 'retreat'>('main');
  // Trạng thái đã dừng vẽ (do click đúp chuột trái hoặc bấm nút Dừng Vẽ) -> Mở bảng chọn thao tác chiến thuật
  const [isRouteFinalized, setIsRouteFinalized] = useState<boolean>(false);
  const [selectedEndpointAction, setSelectedEndpointAction] = useState<MarchEndpointAction>('camp');
  const [cliffWarningCell, setCliffWarningCell] = useState<{ col: number; row: number } | null>(null);

  const drawLayerRef = useRef<L.LayerGroup | null>(null);
  const isDraggingPathRef = useRef(false);

  // Refs phục vụ phát hiện Click 2 lần chuột trái (Double Click) và Click chuột phải hoàn tác (Undo)
  const drawnCellsRef = useRef<MarchPathCell[]>([]);
  const drawnRetreatCellsRef = useRef<MarchPathCell[]>([]);
  const drawingPhaseRef = useRef<'main' | 'retreat'>('main');
  const mainUndoStackRef = useRef<number[]>([]);
  const retreatUndoStackRef = useRef<number[]>([]);
  const lastLeftClickRef = useRef<{ time: number; col: number; row: number }>({
    time: 0,
    col: -1,
    row: -1,
  });
  const rightMouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    drawnCellsRef.current = drawnCells;
  }, [drawnCells]);

  useEffect(() => {
    drawnRetreatCellsRef.current = drawnRetreatCells;
  }, [drawnRetreatCells]);

  useEffect(() => {
    drawingPhaseRef.current = drawingPhase;
  }, [drawingPhase]);

  // Khởi tạo layer vẽ đường tạm thời trên bản đồ
  useEffect(() => {
    if (!map) return;
    const lg = L.layerGroup().addTo(map);
    drawLayerRef.current = lg;
    return () => {
      lg.remove();
      drawLayerRef.current = null;
    };
  }, [map]);

  // Tắt doubleClickZoom của Leaflet khi đang trong chế độ vẽ đường để Click 2 lần chuột trái dùng làm lệnh Dừng Vẽ
  useEffect(() => {
    if (!map) return;
    if (marchDrawMode && !isRouteFinalized) {
      map.doubleClickZoom.disable();
    } else {
      map.doubleClickZoom.enable();
    }
    return () => {
      map.doubleClickZoom.enable();
    };
  }, [map, marchDrawMode, isRouteFinalized]);

  // Khởi tạo ô xuất phát khi bắt đầu chế độ vẽ lộ trình (marchDrawMode)
  useEffect(() => {
    if (!marchDrawMode || !activeFormation) {
      setDrawnCells([]);
      setDrawnRetreatCells([]);
      setDrawingPhase('main');
      setIsRouteFinalized(false);
      setCliffWarningCell(null);
      mainUndoStackRef.current = [];
      retreatUndoStackRef.current = [];
      return;
    }

    const startPos = getFormationMapPos(activeFormation, cities);
    const initialCell = createMarchPathCell(
      startPos.col,
      startPos.row,
      activeFormation,
      0,
      Boolean(marchDrawMode.isEmergencyRetreat)
    );
    initialCell.moveCostDays = 0;
    initialCell.cumulativeDays = 0;
    initialCell.foodCost = 0;

    setDrawnCells([initialCell]);
    setDrawnRetreatCells([]);
    setDrawingPhase('main');
    setIsRouteFinalized(false);
    setCliffWarningCell(null);
    mainUndoStackRef.current = [1];
    retreatUndoStackRef.current = [];
    lastLeftClickRef.current = { time: 0, col: -1, row: -1 };

    if (marchDrawMode.isDualRoute) {
      setSelectedEndpointAction('feigned_retreat');
    } else {
      setSelectedEndpointAction('camp');
    }
  }, [marchDrawMode, activeFormation?.id]);

  // Hàm dừng việc vẽ đường hành quân -> Kích hoạt sự kiện chọn thao tác chiến thuật điểm cuối!
  const handleStopDrawingAndOpenTacticalMenu = useCallback(() => {
    if (drawnCellsRef.current.length < 2) {
      notify.warning('Hãy kéo chuột trái hoặc click chọn ít nhất 1 ô đích trên bản đồ trước khi dừng vẽ!');
      return;
    }
    isDraggingPathRef.current = false;
    setIsRouteFinalized(true);
  }, []);

  // Hàm hoàn tác (Undo) khi người chơi click chuột phải hoặc bấm nút Lùi Đoạn
  const handleUndoStep = useCallback(() => {
    if (drawingPhaseRef.current === 'retreat' && drawnRetreatCellsRef.current.length > 1) {
      setDrawnRetreatCells(prev => {
        if (prev.length <= 1) return prev;
        const stack = retreatUndoStackRef.current;
        while (stack.length > 0 && stack[stack.length - 1] >= prev.length) {
          stack.pop();
        }
        const targetLen = stack.length > 0 ? stack.pop()! : Math.max(1, prev.length - 5);
        return prev.slice(0, Math.max(1, targetLen));
      });
      setCliffWarningCell(null);
      return;
    }

    if (drawnCellsRef.current.length > 1) {
      setDrawnCells(prev => {
        if (prev.length <= 1) return prev;
        const stack = mainUndoStackRef.current;
        while (stack.length > 0 && stack[stack.length - 1] >= prev.length) {
          stack.pop();
        }
        const targetLen = stack.length > 0 ? stack.pop()! : Math.max(1, prev.length - 5);
        return prev.slice(0, Math.max(1, targetLen));
      });
      setCliffWarningCell(null);
    }
  }, []);

  // Chuyển sang vẽ Chặng 2 (Đường vờ thua rút lui) cho kế sách Trá Bại Dụ Địch
  const handleStartRetreatDrawingPhase = useCallback(() => {
    if (!activeFormation || drawnCellsRef.current.length < 2) {
      notify.warning('Hãy vẽ Chặng 1 (Đường tiến công khiêu khích địch) ít nhất 2 ô trước!');
      return;
    }
    const provokeEnd = drawnCellsRef.current[drawnCellsRef.current.length - 1];
    if (drawnRetreatCellsRef.current.length === 0) {
      const startRetreatCell = createMarchPathCell(provokeEnd.col, provokeEnd.row, activeFormation, 0, true);
      startRetreatCell.moveCostDays = 0;
      startRetreatCell.cumulativeDays = 0;
      startRetreatCell.foodCost = 0;
      setDrawnRetreatCells([startRetreatCell]);
      retreatUndoStackRef.current = [1];
    }
    setDrawingPhase('retreat');
    setSelectedEndpointAction('feigned_retreat');
    setIsRouteFinalized(false);
    notify.info('🏳️ Đang vẽ Chặng 2 (Đường vờ thua rút lui): Click đúp chuột trái khi vẽ xong để dừng vẽ!');
  }, [activeFormation]);

  // Lắng nghe sự kiện trên bản đồ:
  // - Giữ chuột trái kéo hoặc click 1 lần chuột trái: Vẽ đường qua các ô lưới
  // - Click 2 lần chuột trái (Double-click hoặc click lần 2 vào ô cuối hiện tại): Dừng vẽ & Mở bảng chọn thao tác chiến thuật!
  // - Click chuột phải (không kéo map): Hoàn tác (Undo) bước vẽ vừa rồi!
  useEffect(() => {
    if (!map || !marchDrawMode || !activeFormation || isRouteFinalized) return;

    const appendAtLatLng = (latlng: L.LatLng, isInitialDown = false) => {
      const { x, y } = latLngToPercent(latlng);
      const cell = coordToCell(x, y);

      if (drawingPhaseRef.current === 'retreat') {
        const curList = drawnRetreatCellsRef.current;
        if (isInitialDown && curList.length > 0) {
          const last = curList[curList.length - 1];
          // Nếu đã có >= 2 ô và người chơi click lần 2 vào đúng ô cuối cùng -> Dừng vẽ luôn!
          if (curList.length >= 2 && last.col === cell.col && last.row === cell.row) {
            isDraggingPathRef.current = false;
            setIsRouteFinalized(true);
            return;
          }
          retreatUndoStackRef.current.push(curList.length);
        }

        setDrawnRetreatCells(prev => {
          const res = appendCellsToMarchPath(prev, cell.col, cell.row, activeFormation, true);
          if (res.blockedByCliff && res.cliffCell) {
            setCliffWarningCell(res.cliffCell);
          } else {
            setCliffWarningCell(null);
          }
          return res.cells;
        });
      } else {
        const curList = drawnCellsRef.current;
        if (isInitialDown && curList.length > 0) {
          const last = curList[curList.length - 1];
          // Nếu đã có >= 2 ô và người chơi click lần 2 vào đúng ô cuối cùng -> Dừng vẽ luôn!
          if (curList.length >= 2 && last.col === cell.col && last.row === cell.row) {
            isDraggingPathRef.current = false;
            setIsRouteFinalized(true);
            return;
          }
          mainUndoStackRef.current.push(curList.length);
        }

        setDrawnCells(prev => {
          const res = appendCellsToMarchPath(
            prev,
            cell.col,
            cell.row,
            activeFormation,
            Boolean(marchDrawMode.isEmergencyRetreat)
          );
          if (res.blockedByCliff && res.cliffCell) {
            setCliffWarningCell(res.cliffCell);
          } else {
            setCliffWarningCell(null);
          }
          return res.cells;
        });
      }
    };

    const handleMouseDown = (e: L.LeafletMouseEvent) => {
      const btn = e.originalEvent.button;

      // Chuột phải (button === 2): Ghi nhận vị trí để nếu là click chuột phải (không kéo map) thì Hoàn Tác (Undo)
      if (btn === 2) {
        rightMouseDownPosRef.current = {
          x: e.originalEvent.clientX,
          y: e.originalEvent.clientY,
        };
        return;
      }

      if (btn !== 0) return; // Chỉ xử lý chuột trái cho việc vẽ

      const { x, y } = latLngToPercent(e.latlng);
      const cell = coordToCell(x, y);
      const now = Date.now();
      const prevClick = lastLeftClickRef.current;

      // Kiểm tra Click 2 lần chuột trái liên tiếp (Double-click trong 420ms)
      if (now - prevClick.time <= 420 && Math.abs(cell.col - prevClick.col) <= 2 && Math.abs(cell.row - prevClick.row) <= 2) {
        isDraggingPathRef.current = false;
        if (drawnCellsRef.current.length >= 2) {
          setIsRouteFinalized(true);
        }
        lastLeftClickRef.current = { time: 0, col: -1, row: -1 };
        return;
      }

      lastLeftClickRef.current = { time: now, col: cell.col, row: cell.row };
      isDraggingPathRef.current = true;
      appendAtLatLng(e.latlng, true);
    };

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      if (!isDraggingPathRef.current) return;
      appendAtLatLng(e.latlng, false);
    };

    const handleMouseUp = (e: L.LeafletMouseEvent) => {
      if (e.originalEvent.button === 2 && rightMouseDownPosRef.current) {
        const dx = Math.abs(e.originalEvent.clientX - rightMouseDownPosRef.current.x);
        const dy = Math.abs(e.originalEvent.clientY - rightMouseDownPosRef.current.y);
        rightMouseDownPosRef.current = null;
        // Nếu người chơi click chuột phải tại chỗ (di chuyển chuột < 6px) -> Hoàn tác (Undo)!
        if (dx <= 6 && dy <= 6) {
          handleUndoStep();
        }
        return;
      }
      isDraggingPathRef.current = false;
    };

    const handleDblClick = (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);
      isDraggingPathRef.current = false;
      if (drawnCellsRef.current.length >= 2) {
        setIsRouteFinalized(true);
      }
    };

    const handleGlobalMouseUp = () => {
      isDraggingPathRef.current = false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleStopDrawingAndOpenTacticalMenu();
      } else if (e.key === 'Escape') {
        setMarchDrawMode(null);
      }
    };

    map.on('mousedown', handleMouseDown);
    map.on('mousemove', handleMouseMove);
    map.on('mouseup', handleMouseUp);
    map.on('dblclick', handleDblClick);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      isDraggingPathRef.current = false;
      map.off('mousedown', handleMouseDown);
      map.off('mousemove', handleMouseMove);
      map.off('mouseup', handleMouseUp);
      map.off('dblclick', handleDblClick);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    map,
    marchDrawMode,
    activeFormation,
    isRouteFinalized,
    handleStopDrawingAndOpenTacticalMenu,
    handleUndoStep,
    setMarchDrawMode,
  ]);

  // Vẽ trực quan các ô lưới của lộ trình đang phác thảo lên bản đồ
  useEffect(() => {
    const layer = drawLayerRef.current;
    if (!layer || !map) return;
    layer.clearLayers();

    if (!marchDrawMode || drawnCells.length === 0) return;

    // 1. Vẽ từng ô lưới của Chặng 1
    drawnCells.forEach((c, idx) => {
      const { minX, minY, maxX, maxY } = cellToCoord(c.col, c.row);
      const bounds = L.latLngBounds(percentToLatLng(minX, maxY), percentToLatLng(maxX, minY));
      const color = marchDrawMode.isEmergencyRetreat
        ? '#c084fc'
        : CELL_DRAW_COLORS[c.terrain] || '#eab308';

      L.rectangle(bounds, {
        color: idx === drawnCells.length - 1 ? '#ffffff' : color,
        weight: idx === drawnCells.length - 1 ? 2.5 : 1.2,
        fillColor: color,
        fillOpacity: idx === 0 ? 0.55 : idx === drawnCells.length - 1 ? 0.7 : 0.4,
        interactive: false,
      }).addTo(layer);

      if (c.terrain === 'water') {
        const raftIcon = L.divIcon({
          className: 'draw-water-raft',
          html: `<div style="font-size:11px;filter:drop-shadow(0 1px 2px #000);">🛶</div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        L.marker(percentToLatLng(c.x, c.y), { icon: raftIcon, interactive: false }).addTo(layer);
      }
    });

    if (drawnCells.length >= 2) {
      const latlngs = drawnCells.map(c => percentToLatLng(c.x, c.y));
      L.polyline(latlngs, {
        color: marchDrawMode.isEmergencyRetreat ? '#c084fc' : '#fef08a',
        weight: 3.5,
        dashArray: '7, 5',
        interactive: false,
      }).addTo(layer);
    }

    // 2. Vẽ từng ô lưới của Chặng 2 (Nhánh Trá Bại Rút Lui Dụ Địch nếu có)
    if (drawnRetreatCells.length > 0) {
      drawnRetreatCells.forEach((c, idx) => {
        const { minX, minY, maxX, maxY } = cellToCoord(c.col, c.row);
        const bounds = L.latLngBounds(percentToLatLng(minX, maxY), percentToLatLng(maxX, minY));
        L.rectangle(bounds, {
          color: idx === drawnRetreatCells.length - 1 ? '#fff' : '#c084fc',
          weight: idx === drawnRetreatCells.length - 1 ? 2.5 : 1.2,
          fillColor: '#a855f7',
          fillOpacity: idx === drawnRetreatCells.length - 1 ? 0.7 : 0.38,
          interactive: false,
        }).addTo(layer);
      });

      if (drawnRetreatCells.length >= 2) {
        const rLatLngs = drawnRetreatCells.map(c => percentToLatLng(c.x, c.y));
        L.polyline(rLatLngs, {
          color: '#e879f9',
          weight: 3.5,
          dashArray: '5, 6',
          interactive: false,
        }).addTo(layer);
      }
    }

    // 3. Nếu vừa quẹt trúng ô Vách đá (cliff), vẽ ô cảnh báo màu đỏ
    if (cliffWarningCell) {
      const { minX, minY, maxX, maxY } = cellToCoord(cliffWarningCell.col, cliffWarningCell.row);
      const bounds = L.latLngBounds(percentToLatLng(minX, maxY), percentToLatLng(maxX, minY));
      L.rectangle(bounds, {
        color: '#ef4444',
        weight: 3,
        fillColor: '#dc2626',
        fillOpacity: 0.7,
        interactive: false,
      }).addTo(layer);
    }

    // 4. Nhãn hướng dẫn ngay tại đầu mút (điểm cuối) của đường vẽ
    const finalCell =
      drawnRetreatCells.length > 1
        ? drawnRetreatCells[drawnRetreatCells.length - 1]
        : drawnCells[drawnCells.length - 1];

    if (finalCell && drawnCells.length >= 2) {
      const actMeta = MARCH_ENDPOINT_ACTIONS[selectedEndpointAction] || MARCH_ENDPOINT_ACTIONS.camp;
      const tipIcon = L.divIcon({
        className: 'drawn-endpoint-flag',
        html: isRouteFinalized
          ? `
            <div style="
              transform: translate(-50%, -120%);
              white-space: nowrap;
              padding: 4px 10px;
              border-radius: 8px;
              background: rgba(20, 12, 6, 0.96);
              border: 2px solid ${actMeta.color};
              color: #fef3c7;
              font-family: serif;
              font-size: 11.5px;
              font-weight: 800;
              box-shadow: 0 4px 14px rgba(0,0,0,0.85);
              display: inline-flex;
              align-items: center;
              gap: 6px;
              pointer-events: none;
            ">
              <span>${actMeta.icon}</span>
              <span>Điểm Cuối: ${actMeta.shortLabel} (${finalCell.col}, ${finalCell.row})</span>
            </div>
          `
          : `
            <div style="
              transform: translate(-50%, -125%);
              white-space: nowrap;
              padding: 4px 10px;
              border-radius: 8px;
              background: rgba(20, 83, 45, 0.95);
              border: 1.5px solid #86efac;
              color: #ffffff;
              font-family: serif;
              font-size: 11px;
              font-weight: 800;
              box-shadow: 0 4px 12px rgba(0,0,0,0.85);
              display: inline-flex;
              align-items: center;
              gap: 5px;
              pointer-events: none;
            ">
              <span>🎯</span>
              <span>Ô (${finalCell.col}, ${finalCell.row}) • Click đúp chuột trái để Dừng Vẽ • Chuột phải: Hoàn tác</span>
            </div>
          `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      L.marker(percentToLatLng(finalCell.x, finalCell.y), {
        icon: tipIcon,
        interactive: false,
        zIndexOffset: 1600,
      }).addTo(layer);
    }
  }, [
    map,
    marchDrawMode,
    drawnCells,
    drawnRetreatCells,
    cliffWarningCell,
    selectedEndpointAction,
    isRouteFinalized,
  ]);

  // Phân tích thống kê lộ trình đang vẽ
  const routeAnalysis = useMemo(() => {
    if (!activeFormation || drawnCells.length < 2) return null;
    return analyzeMarchRoute(
      drawnCells,
      drawnRetreatCells.length > 1 ? drawnRetreatCells : undefined,
      cities,
      formations,
      activeFormation.id
    );
  }, [activeFormation, drawnCells, drawnRetreatCells, cities, formations]);

  if (!activeFormation) return null;

  const currentPos = getFormationMapPos(activeFormation, cities);
  const statusMeta = STATUS_LABELS[activeFormation.status] || STATUS_LABELS.idle;

  // Xử lý xác nhận phát lệnh hành quân
  const handleConfirmMarch = () => {
    if (drawnCells.length < 2) {
      notify.warning('Hãy kéo chuột hoặc click chọn trên bản đồ để vẽ đường hành quân ít nhất 2 ô lưới!');
      return;
    }

    if (selectedEndpointAction === 'feigned_retreat' && drawnRetreatCells.length < 2) {
      notify.warning('Với kế sách Trá Bại Dụ Địch, vui lòng bấm "Vẽ Tiếp Chặng 2: Đường Vờ Thua Rút Lui" để vẽ đường dẫn giặc vào ổ phục kích!');
      return;
    }

    const res = startGridMarch(
      activeFormation.id,
      drawnCells,
      selectedEndpointAction,
      drawnRetreatCells.length > 1 ? drawnRetreatCells : undefined,
      Boolean(marchDrawMode?.isEmergencyRetreat)
    );

    if (res.success) {
      notify.success(res.message);
      setMarchDrawMode(null);
    } else {
      notify.error(res.message);
    }
  };

  // Xử lý xóa vẽ lại từ đầu
  const handleResetDraw = () => {
    if (drawnCells.length > 0) {
      setDrawnCells([drawnCells[0]]);
    }
    setDrawnRetreatCells([]);
    setDrawingPhase('main');
    setIsRouteFinalized(false);
    setCliffWarningCell(null);
    mainUndoStackRef.current = [1];
    retreatUndoStackRef.current = [];
  };

  // ============================================================================
  // GIAO DIỆN 1: CHẾ ĐỘ VẼ ĐƯỜNG HÀNH QUÂN TRÊN LƯỚI (marchDrawMode)
  // ============================================================================
  if (marchDrawMode) {
    const endTerrainDef = routeAnalysis ? TERRAIN_DEFINITIONS[routeAnalysis.endTerrain] : null;
    const finalCell =
      drawnRetreatCells.length > 1
        ? drawnRetreatCells[drawnRetreatCells.length - 1]
        : drawnCells[drawnCells.length - 1];

    return (
      <>
        {/* THANH CÔNG CỤ VẼ ĐƯỜNG Ở PHÍA TRÊN BẢN ĐỒ */}
        <div
          className="fixed top-16 left-1/2 -translate-x-1/2 z-[1000] w-[95vw] max-w-3xl pointer-events-auto"
          onMouseDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
          onDoubleClick={e => e.stopPropagation()}
        >
          <div className="bg-[#1e120a]/95 border-2 border-amber-500/90 rounded-xl px-4 py-2.5 shadow-[0_12px_30px_rgba(0,0,0,0.85)] text-[#fef3c7] font-serif">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-amber-500 text-black font-black text-xs uppercase tracking-wider">
                  {isRouteFinalized
                    ? '✅ Đã Dừng Vẽ • Chọn Thao Tác Chiến Thuật'
                    : marchDrawMode.isEmergencyRetreat
                    ? '🏳️ Đang Vẽ Đường Trá Bại Rút Lui'
                    : drawingPhase === 'retreat'
                    ? '🏳️ Đang Vẽ Chặng 2: Đường Vờ Thua Rút Lui'
                    : '✍️ Đang Vẽ Đường Hành Quân'}
                </span>
                <span className="font-bold text-sm text-amber-200">
                  {activeFormation.name} ({activeFormation.totalTroops} binh)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {!isRouteFinalized ? (
                  <button
                    type="button"
                    onClick={handleStopDrawingAndOpenTacticalMenu}
                    disabled={drawnCells.length < 2}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 disabled:from-stone-700 disabled:to-stone-700 disabled:opacity-50 text-white font-black text-xs border-2 border-emerald-200 shadow-[0_0_15px_rgba(34,197,94,0.6)] flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                  >
                    <CheckCircle2 size={15} />
                    <span>🛑 Dừng Vẽ (Hoặc Click Đúp Chuột Trái)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsRouteFinalized(false)}
                    className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white font-bold text-xs border border-amber-300 flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Edit3 size={14} /> Tiếp Tục Vẽ Đường
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleUndoStep}
                  disabled={drawnCells.length <= 1 && drawnRetreatCells.length <= 1}
                  className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-amber-200 text-xs font-bold border border-amber-700/50 flex items-center gap-1 cursor-pointer transition"
                  title="Hoàn tác bước vẽ trước (Hoặc Click Chuột Phải)"
                >
                  <RotateCcw size={13} /> Hoàn Tác (Chuột Phải)
                </button>
                <button
                  type="button"
                  onClick={handleResetDraw}
                  disabled={drawnCells.length <= 1}
                  className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-red-300 text-xs font-bold border border-red-800/50 flex items-center gap-1 cursor-pointer transition"
                  title="Xóa toàn bộ đường vừa vẽ để vẽ lại"
                >
                  <Trash2 size={13} /> Vẽ Lại
                </button>
                <button
                  type="button"
                  onClick={() => setMarchDrawMode(null)}
                  className="p-1.5 rounded-lg bg-red-950/80 hover:bg-red-800 text-red-200 border border-red-700/60 cursor-pointer transition"
                  title="Thoát chế độ vẽ đường"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Thanh hướng dẫn thao tác chuột trực quan */}
            <div className="mt-1.5 text-xs text-amber-100/95 flex flex-wrap items-center justify-between gap-2 border-t border-amber-800/40 pt-1.5">
              <div className="flex flex-wrap items-center gap-3">
                <span>🖱️ <b>Chuột trái (Kéo / Click):</b> Vẽ đường</span>
                <span className="text-emerald-300 font-bold">🖱️×2 <b>Click đúp chuột trái:</b> Dừng vẽ & Chọn lệnh</span>
                <span className="text-amber-300 font-bold">🖱️Phải <b>Click chuột phải:</b> Hoàn tác</span>
              </div>

              {routeAnalysis && (
                <div className="flex flex-wrap items-center gap-2.5 font-mono text-[11px]">
                  <span className="text-amber-300 font-bold">
                    {routeAnalysis.totalCells} ô (~{routeAnalysis.totalDistanceKm} km)
                  </span>
                  <span className="text-emerald-300 font-bold">
                    {routeAnalysis.totalDays} ngày
                  </span>
                  <span className="text-yellow-300">
                    ~{routeAnalysis.totalFoodCost} lương
                  </span>
                </div>
              )}

              {cliffWarningCell && (
                <span className="px-2 py-0.5 rounded bg-red-900/90 border border-red-400 text-red-100 font-bold flex items-center gap-1 animate-pulse">
                  <AlertTriangle size={13} /> Vướng Vách Đá ({cliffWarningCell.col}, {cliffWarningCell.row})! Hãy vẽ vòng qua!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* SỰ KIỆN / MODAL CHỌN THAO TÁC CHIẾN THUẬT TẠI ĐIỂM CUỐI (Kích hoạt khi Click Đúp Chuột Trái hoặc bấm Dừng Vẽ) */}
        {isRouteFinalized && routeAnalysis && (
          <div
            className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4 pointer-events-auto"
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full max-w-2xl bg-[#23140b] border-2 border-amber-400 rounded-2xl p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] text-[#fef3c7] font-serif space-y-4 animate-in fade-in zoom-in-95 duration-150">
              {/* Tiêu đề sự kiện điểm cuối */}
              <div className="flex items-start justify-between border-b border-amber-700/60 pb-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                    <span>⚡ QUÂN LỆNH TÁC CHIẾN TẠI ĐIỂM CUỐI HÀNH QUÂN</span>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-white mt-0.5">
                    {activeFormation.name} → Điểm Đích Ô ({finalCell?.col}, {finalCell?.row})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRouteFinalized(false)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-xs font-bold border border-emerald-400/70 flex items-center gap-1 cursor-pointer shadow"
                >
                  <Edit3 size={13} /> Tiếp Tục Vẽ Đường
                </button>
              </div>

              {/* Thông số tổng kết quãng đường & địa hình điểm cuối */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-black/40 p-3 rounded-xl border border-amber-800/50 text-xs">
                <div>
                  <div className="text-stone-400 text-[11px]">Quãng đường lưới</div>
                  <div className="font-mono font-bold text-amber-300 text-sm">
                    {routeAnalysis.totalCells} ô (~{routeAnalysis.totalDistanceKm} km)
                  </div>
                </div>
                <div>
                  <div className="text-stone-400 text-[11px]">Thời gian di chuyển</div>
                  <div className="font-mono font-bold text-emerald-300 text-sm">
                    {routeAnalysis.totalDays} ngày
                  </div>
                </div>
                <div>
                  <div className="text-stone-400 text-[11px]">Lương thảo tiêu hao</div>
                  <div className="font-mono font-bold text-yellow-300 text-sm">
                    ~{routeAnalysis.totalFoodCost} thạch
                  </div>
                </div>
                <div>
                  <div className="text-stone-400 text-[11px]">Địa hình điểm cuối</div>
                  <div
                    className="font-bold text-sm truncate"
                    style={{ color: endTerrainDef?.color || '#fef3c7' }}
                  >
                    {endTerrainDef?.name || 'Đồng bằng'}
                  </div>
                </div>
              </div>

              {/* Gợi ý chiến thuật theo địa hình & tình hình địch-ta ở điểm cuối */}
              <div className="space-y-1.5 text-xs">
                {endTerrainDef && (
                  <div className="px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-700/50 text-amber-100">
                    🌲 <b>Đặc tính địa hình đích ({endTerrainDef.name}):</b> Phòng thủ <b>+{endTerrainDef.defenseBonus}%</b> • Tỷ lệ Mai Phục thành công: <b>{endTerrainDef.ambushSuccessRate}%</b>.
                  </div>
                )}
                {routeAnalysis.nearbyEnemyCity && (
                  <div className="px-3 py-1.5 rounded-lg bg-red-950/80 border border-red-500/70 text-red-100 font-bold">
                    🎯 Phát hiện đồn quân Minh sát điểm cuối: <span className="underline text-white">{routeAnalysis.nearbyEnemyCity.name}</span> ({routeAnalysis.nearbyEnemyCity.troops} binh) — Rất thích hợp để chọn <b>Tập Kích</b> hoặc <b>Trá Bại Dụ Địch</b>!
                  </div>
                )}
                {routeAnalysis.nearbyFriendlyAmbush && (
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/70 text-emerald-100 font-bold">
                    🔥 Điểm kết thúc nằm trong trận địa Mai Phục của <span className="underline text-white">{routeAnalysis.nearbyFriendlyAmbush.name}</span> ({routeAnalysis.nearbyFriendlyAmbush.totalTroops} binh) — Giặc đuổi theo tới đây sẽ lập tức sập bẫy!
                  </div>
                )}
              </div>

              {/* Danh sách Lựa chọn thao tác chiến thuật tại điểm cuối + Lựa chọn "Tiếp Tục Vẽ Đường" */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-300">
                  Hãy Chọn Thao Tác Chiến Thuật Khi Quân Tới Điểm Đích (Hoặc Chọn Tiếp Tục Vẽ):
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[270px] overflow-y-auto pr-1">
                  {/* Lựa chọn đặc biệt: TIẾP TỤC VẼ ĐƯỜNG (phòng trường hợp lỡ tay double-click sớm) */}
                  <button
                    type="button"
                    onClick={() => setIsRouteFinalized(false)}
                    className="p-2.5 rounded-xl border-2 border-dashed border-emerald-400/80 bg-emerald-950/50 hover:bg-emerald-900/70 text-left transition cursor-pointer flex items-start gap-2.5 shadow"
                  >
                    <span className="text-xl shrink-0 mt-0.5">✏️</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-emerald-200">Tiếp Tục Vẽ Đường</span>
                        <span className="text-[10px] font-mono text-emerald-300/80">續畫</span>
                      </div>
                      <p className="text-[11px] text-emerald-100/90 leading-snug mt-0.5">
                        Quay lại bản đồ để vẽ nối tiếp lộ trình từ ô ({finalCell?.col}, {finalCell?.row}) nếu bạn lỡ nhấp đúp chuột sớm.
                      </p>
                    </div>
                  </button>

                  {(Object.keys(MARCH_ENDPOINT_ACTIONS) as MarchEndpointAction[]).map(actKey => {
                    const act = MARCH_ENDPOINT_ACTIONS[actKey];
                    const isSelected = selectedEndpointAction === actKey;
                    return (
                      <button
                        type="button"
                        key={actKey}
                        onClick={() => setSelectedEndpointAction(actKey)}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-amber-600/25 border-2 border-amber-400 text-white shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                            : 'bg-stone-900/85 border-stone-700 text-stone-300 hover:bg-stone-800 hover:border-amber-700/70'
                        }`}
                      >
                        <span className="text-xl shrink-0 mt-0.5">{act.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-amber-100">{act.name}</span>
                            <span className="text-[10px] font-mono opacity-60">{act.nameHanzi}</span>
                          </div>
                          <p className="text-[11px] text-stone-300/90 leading-snug mt-0.5">
                            {act.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nếu chọn Trá Bại Dụ Địch mà chưa vẽ Chặng 2 (Đường vờ thua rút lui), hiện nút nhắc vẽ Chặng 2 */}
              {selectedEndpointAction === 'feigned_retreat' && (
                <div className="p-3 rounded-xl bg-purple-950/80 border border-purple-400/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="text-purple-100">
                    🏳️ <b>Kế sách Trá Bại Dụ Địch:</b>{' '}
                    {drawnRetreatCells.length > 1
                      ? `Đã vẽ xong Chặng 2 đường rút lui (${drawnRetreatCells.length - 1} ô)!`
                      : 'Cần vẽ thêm Chặng 2 (Đường vờ thua rút chạy về phía ổ Mai Phục).'}
                  </div>
                  <button
                    type="button"
                    onClick={handleStartRetreatDrawingPhase}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold border border-purple-200 shadow cursor-pointer transition"
                  >
                    {drawnRetreatCells.length > 1
                      ? '✍️ Vẽ Lại Đường Rút Lui (Chặng 2)'
                      : '✍️ Vẽ Tiếp Đường Vờ Thua Rút Lui (Chặng 2)'}
                  </button>
                </div>
              )}

              {/* Footer xác nhận xuất quân */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-amber-800/50">
                <button
                  type="button"
                  onClick={() => setIsRouteFinalized(false)}
                  className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs border border-stone-600 cursor-pointer transition"
                >
                  ✏️ Tiếp Tục Vẽ Đường
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMarch}
                  className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#991b1b] to-[#d97706] hover:from-[#b91c1c] hover:to-[#f59e0b] text-white font-black text-xs uppercase tracking-wider shadow-xl border border-amber-300 flex items-center gap-2 cursor-pointer transition active:scale-95"
                >
                  <Send size={15} />
                  <span>
                    Xác Nhận Xuất Quân ({MARCH_ENDPOINT_ACTIONS[selectedEndpointAction].shortLabel})
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ============================================================================
  // GIAO DIỆN 2: BẢNG ĐIỀU KHIỂN NHANH ĐẠO QUÂN KHI CLICK VÀO QUÂN KỲ TRÊN MAP
  // ============================================================================
  if (selectedMapFormationId && activeFormation) {
    return (
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-[95vw] max-w-2xl pointer-events-auto"
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-[#23140b]/95 border-2 border-[#b45309] rounded-xl p-3 shadow-[0_14px_35px_rgba(0,0,0,0.88)] text-[#fef3c7] font-serif space-y-2.5">
          {/* Header thông tin đạo quân */}
          <div className="flex items-center justify-between border-b border-amber-800/50 pb-2">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{statusMeta.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm md:text-base text-amber-100">
                    {activeFormation.name}
                  </h3>
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold border"
                    style={{
                      borderColor: statusMeta.color,
                      color: statusMeta.color,
                      backgroundColor: 'rgba(0,0,0,0.45)',
                    }}
                  >
                    {statusMeta.label}
                  </span>
                </div>
                <div className="text-[11px] text-amber-300/80 font-mono">
                  Quân số: <b>{activeFormation.totalTroops}</b> binh • Khí giới: <b>{activeFormation.totalWeapons}</b> • Lương mang theo: <b>{activeFormation.totalFoodCarried}</b> • Ô lưới: ({currentPos.col}, {currentPos.row})
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setActiveFormationId(activeFormation.id);
                  setActiveModal('army');
                }}
                className="px-2.5 py-1 rounded bg-amber-900/70 hover:bg-amber-800 text-amber-100 text-xs font-bold border border-amber-600/60 flex items-center gap-1 cursor-pointer transition"
                title="Mở Sa Bàn Đội Hình 32x32 của đạo quân này"
              >
                <LayoutGrid size={13} /> Sa Bàn 32×32
              </button>
              <button
                type="button"
                onClick={() => setSelectedMapFormationId(null)}
                className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
                title="Đóng bảng lệnh"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Hàng nút Hành Quân & Tách Đội / Trá Bại */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMarchDrawMode({ formationId: activeFormation.id })}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#8c2d19] to-[#b45309] hover:from-[#a6361f] hover:to-[#d97706] text-white font-bold text-xs border border-amber-400/80 shadow flex items-center gap-1.5 cursor-pointer transition"
            >
              <Compass size={14} /> Vẽ Đường Hành Quân
            </button>

            <button
              type="button"
              onClick={() => setMarchDrawMode({ formationId: activeFormation.id, isDualRoute: true })}
              className="px-3 py-1.5 rounded-lg bg-purple-900/90 hover:bg-purple-800 text-purple-100 font-bold text-xs border border-purple-400/70 shadow flex items-center gap-1.5 cursor-pointer transition"
              title="Vẽ lộ trình 2 chặng: Tiến lên khiêu khích địch rồi vờ thua rút lui dẫn giặc vào ổ phục kích"
            >
              <Flag size={13} /> Lộ Trình Kép: Trá Bại Dụ Địch
            </button>

            {activeFormation.status === 'engaging' && (
              <button
                type="button"
                onClick={() => setMarchDrawMode({ formationId: activeFormation.id, isEmergencyRetreat: true })}
                className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white font-bold text-xs border border-yellow-300 shadow animate-pulse flex items-center gap-1.5 cursor-pointer transition"
                title="Đang đánh nhau vờ thua bỏ chạy, vẽ đường rút lui kéo quân Minh đuổi theo vào ổ phục kích!"
              >
                <Swords size={13} /> Đang Đánh Vờ Thua Rút Lui!
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                const res = splitFormationDetachment(activeFormation.id, 0.3);
                if (res.success && res.newFormationId) {
                  notify.success(res.message);
                  setSelectedMapFormationId(res.newFormationId);
                } else {
                  notify.warning(res.message);
                }
              }}
              className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-200 font-bold text-xs border border-amber-700/60 flex items-center gap-1.5 cursor-pointer transition"
              title="Tách một đội nhỏ (~30% binh lực nhẹ) để đi dụ địch, trinh sát hoặc đánh bọc sườn"
            >
              <GitBranch size={13} /> Tách Đội Nhỏ
            </button>

            {formations.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  const res = mergeFormationIntoParent(activeFormation.id);
                  if (res.success) {
                    notify.success(res.message);
                    setSelectedMapFormationId(null);
                  } else {
                    notify.warning(res.message);
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-emerald-200 font-bold text-xs border border-emerald-700/60 flex items-center gap-1.5 cursor-pointer transition"
                title="Nhập đội quân này vào đại quân đồng minh đứng gần (bán kính 8 ô)"
              >
                <Merge size={13} /> Hội Quân
              </button>
            )}

            {(activeFormation.status === 'marching' || activeFormation.status === 'retreating') && (
              <button
                type="button"
                onClick={() => {
                  const res = stopFormationMarch(activeFormation.id);
                  if (res.success) notify.info(res.message);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-red-950 hover:bg-red-900 text-red-200 font-bold text-xs border border-red-600/60 flex items-center gap-1 cursor-pointer transition"
              >
                <Square size={12} /> Dừng Ngay Tại Ô Này
              </button>
            )}
          </div>

          {/* Hàng đổi nhanh Trạng Thái / Lệnh Chiến Thuật tại chỗ hoặc tại điểm đích */}
          <div className="pt-1.5 border-t border-amber-800/40">
            <span className="text-[11px] text-amber-300/90 font-bold block mb-1">
              {activeFormation.status === 'marching'
                ? '🔄 Đổi Lệnh Chiến Thuật Tại Điểm Đích Đang Tới:'
                : '⚡ Đổi Trạng Thái Chiến Thuật Ngay Tại Vị Trí Hiện Tại:'}
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {(['camp', 'ambush', 'raid', 'scout', 'forage', 'decoy'] as MarchEndpointAction[]).map(actKey => {
                const act = MARCH_ENDPOINT_ACTIONS[actKey];
                const isCurrent =
                  activeFormation.marchOrder?.endpointAction === actKey ||
                  (activeFormation.status === 'stationed' && actKey === 'camp') ||
                  (activeFormation.status === 'ambushing' && actKey === 'ambush') ||
                  (activeFormation.status === 'engaging' && actKey === 'raid') ||
                  (activeFormation.status === 'scouting' && actKey === 'scout') ||
                  (activeFormation.status === 'foraging' && actKey === 'forage') ||
                  (activeFormation.status === 'decoying' && actKey === 'decoy');

                return (
                  <button
                    type="button"
                    key={actKey}
                    onClick={() => {
                      const res = updateMarchEndpointAction(activeFormation.id, actKey);
                      if (res.success) notify.success(res.message);
                      else notify.warning(res.message);
                    }}
                    className={`px-2 py-1 rounded border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                      isCurrent
                        ? 'bg-amber-600/35 border-amber-400 text-white shadow'
                        : 'bg-stone-900/80 border-stone-700 text-stone-300 hover:bg-stone-800'
                    }`}
                    title={act.description}
                  >
                    <span>{act.icon}</span>
                    <span>{act.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
