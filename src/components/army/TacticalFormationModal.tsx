import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  X, Plus, Trash2, ShieldAlert,
  Swords, Dumbbell, ChevronRight, Eraser, Info, Users
} from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import type { TacticalUnitType, TacticalPlacedUnit } from '../../types/armyFormation';
import { TACTICAL_UNIT_CONFIGS } from '../../types/armyFormation';
import { FORMATION_ROWS, FORMATION_COLS } from '../../store/slices/armySlice';
import { calculateTrainingDays } from '../../store/slices/militarySlice';
import { notify } from '../../store/dialogStore';
import { TacticalGeneralPlaque } from './TacticalGeneralPlaque';
import type { Resources } from '../../types';

export type TacticalZoomLevel = 100 | 256 | 1024 | '1024_x10';

// Tra cứu vũ khí / phương tiện tồn kho thực tế của từng binh chủng
const getUnitResourceInfo = (type: TacticalUnitType, res: Resources) => {
  switch (type) {
    case 'swordsman':
      return { icon: '⚔️', count: Math.floor(res.swords), label: 'Đao kiếm tồn kho' };
    case 'archer':
      return { icon: '🏹', count: Math.floor(res.bows), label: 'Lượng cung nỏ tồn kho' };
    case 'spearman':
      return { icon: '🗡️', count: Math.floor(res.spears), label: 'Trường giáo tồn kho' };
    case 'scout':
    case 'cavalry':
      return { icon: '🐎', count: Math.floor(res.horses), label: 'Chiến mã trong trại' };
    case 'elephant':
      return { icon: '🐘', count: Math.floor(res.elephants), label: 'Voi chiến thuần dưỡng' };
    case 'supply_cart':
      return { icon: '🌾', count: Math.floor(res.food), label: 'Lương thảo tích trữ' };
    default:
      return { icon: '⚔️', count: Math.floor(res.weapons), label: 'Quân khí tồn kho' };
  }
};

// ==========================================
// 1. TACTICAL GRID CELL (Memoized for 120+ FPS, Zero Filter Repaints)
// ==========================================
interface TacticalGridCellProps {
  r: number;
  c: number;
  cell: TacticalPlacedUnit | null;
  cellSizePx: number;
  zoomLevel: TacticalZoomLevel;
  generalPortraitUrl?: string;
}

const TacticalGridCell = React.memo<TacticalGridCellProps>(({
  r,
  c: _c,
  cell,
  cellSizePx,
  zoomLevel,
  generalPortraitUrl,
}) => {
  const cfg = cell ? TACTICAL_UNIT_CONFIGS[cell.type] : null;

  // 4 Mức Zoom theo yêu cầu: 100, 256, 1024, 1024_x10
  const isHighZoom = zoomLevel === 100;
  const isFrontSector = r < 8;
  const isRearSector = r >= 24;

  const iconSize = Math.max(9, Math.round(cellSizePx * (zoomLevel === 100 ? 0.75 : zoomLevel === 256 ? 0.72 : 0.68)));

  return (
    <div
      style={{ 
        width: `${cellSizePx}px`, 
        height: `${cellSizePx}px`,
        userSelect: 'none'
      }}
      className={`relative rounded-[2px] flex flex-col items-center justify-center select-none transition-none pointer-events-none ${
        cell
          ? `${cfg?.bgTint} border ${cfg?.borderColor} z-10`
          : isFrontSector
            ? 'bg-[#faebd7]/80 border border-dashed border-[#b91c1c]/35'
            : isRearSector
              ? 'bg-[#faebd7]/80 border border-dashed border-[#ca8a04]/35'
              : 'bg-[#faebd7]/60 border border-dashed border-[#8c6b44]/35'
      }`}
    >
      {cell && (
        <>
          {/* HIỂN THỊ ICON TẠI TẤT CẢ CÁC MỨC ZOOM (KHÔNG DÙNG DROP-SHADOW ĐỂ ĐẠT 120+ FPS) */}
          {cell.isRoot && (
            <img
              src={cell.type === 'general' ? generalPortraitUrl : cfg?.icon}
              alt={cell.name}
              draggable={false}
              style={{
                width: `${iconSize}px`,
                height: `${iconSize}px`,
              }}
              className="object-contain pointer-events-none select-none"
            />
          )}

          {/* HUY HIỆU ×10 Ở CHẾ ĐỘ VẠN QUÂN */}
          {cell.isRoot && cell.multiplier && cell.multiplier > 1 && (
            <span className="absolute bottom-0 right-0 px-0.5 rounded bg-amber-500 text-black text-[6.5px] font-black leading-none pointer-events-none shadow-xs border border-amber-700">
              ×{cell.multiplier}
            </span>
          )}

          {/* MỨC 100 Ô: HIỂN THỊ TÊN BINH CHỦNG */}
          {isHighZoom && cell.isRoot && (
            <span className="text-[7.5px] font-serif font-black text-[#261304] truncate max-w-full leading-none mt-0.5 select-none pointer-events-none">
              {cell.name.split(' ')[0]}
            </span>
          )}
        </>
      )}
    </div>
  );
}, (prev, next) => {
  return (
    prev.r === next.r &&
    prev.c === next.c &&
    prev.cell?.id === next.cell?.id &&
    prev.cell?.parentUnitId === next.cell?.parentUnitId &&
    prev.cell?.multiplier === next.cell?.multiplier &&
    prev.cellSizePx === next.cellSizePx &&
    prev.zoomLevel === next.zoomLevel &&
    prev.generalPortraitUrl === next.generalPortraitUrl
  );
});

TacticalGridCell.displayName = 'TacticalGridCell';

// ==========================================
// 1.4. TỪNG HÀNG SA BÀN ĐƯỢC MEMO HÓA (CHỈ RE-RENDER HÀNG CÓ THAY ĐỔI QUÂN SỐ)
// ==========================================
interface TacticalGridRowProps {
  r: number;
  rowArr: (TacticalPlacedUnit | null)[];
  cellSizePx: number;
  zoomLevel: TacticalZoomLevel;
  generalsPortraitMap: Record<string, string>;
}

const TacticalGridRow = React.memo<TacticalGridRowProps>(({
  r,
  rowArr,
  cellSizePx,
  zoomLevel,
  generalsPortraitMap,
}) => {
  return (
    <>
      {rowArr.map((cell, cIdx) => (
        <TacticalGridCell
          key={`cell_${r}_${cIdx}`}
          r={r}
          c={cIdx}
          cell={cell}
          cellSizePx={cellSizePx}
          zoomLevel={zoomLevel}
          generalPortraitUrl={cell?.type === 'general' ? generalsPortraitMap[cell.generalId || ''] : undefined}
        />
      ))}
    </>
  );
}, (prev, next) => {
  return (
    prev.r === next.r &&
    prev.rowArr === next.rowArr &&
    prev.cellSizePx === next.cellSizePx &&
    prev.zoomLevel === next.zoomLevel &&
    prev.generalsPortraitMap === next.generalsPortraitMap
  );
});

TacticalGridRow.displayName = 'TacticalGridRow';

// ==========================================
// 1.5. MA TRẬN 1024 Ô TÁCH BIỆT (KHÔNG RE-RENDER KHI RÊ CHUỘT, BỎ QUA 31 HÀNG KHÔNG ĐỔI KHI ĐẶT/HỦY)
// ==========================================
interface TacticalGridBoardProps {
  grid: (TacticalPlacedUnit | null)[][];
  cellSizePx: number;
  zoomLevel: TacticalZoomLevel;
  generalsPortraitMap: Record<string, string>;
}

const TacticalGridBoard = React.memo<TacticalGridBoardProps>(({
  grid,
  cellSizePx,
  zoomLevel,
  generalsPortraitMap,
}) => {
  return (
    <>
      {grid.map((rowArr, rIdx) => (
        <TacticalGridRow
          key={`row_${rIdx}`}
          r={rIdx}
          rowArr={rowArr}
          cellSizePx={cellSizePx}
          zoomLevel={zoomLevel}
          generalsPortraitMap={generalsPortraitMap}
        />
      ))}
    </>
  );
});

TacticalGridBoard.displayName = 'TacticalGridBoard';

// ==========================================
// 2. MODAL CHÍNH: SA BÀN BỐ TRẬN
// ==========================================
export const TacticalFormationModal: React.FC = React.memo(() => {
  const activeModal = useUIStore(state => state.activeModal);
  const setActiveModal = useUIStore(state => state.setActiveModal);
  const setMarchDrawMode = useUIStore(state => state.setMarchDrawMode);
  const selectedCityId = useUIStore(state => state.selectedCityId) || 'lam_son';

  const cities = useGameStore(state => state.cities);
  const generals = useGameStore(state => state.generals);
  const resources = useGameStore(state => state.resources);
  const formations = useGameStore(state => state.formations);
  const activeFormationId = useGameStore(state => state.activeFormationId);
  const setActiveFormationId = useGameStore(state => state.setActiveFormationId);
  const createFormation = useGameStore(state => state.createFormation);
  const deleteFormation = useGameStore(state => state.deleteFormation);
  const updateFormationName = useGameStore(state => state.updateFormationName);
  const placeUnitOnGrid = useGameStore(state => state.placeUnitOnGrid);
  const removeUnitFromGrid = useGameStore(state => state.removeUnitFromGrid);
  const assignGeneralToFormation = useGameStore(state => state.assignGeneralToFormation);
  const removeGeneralFromFormation = useGameStore(state => state.removeGeneralFromFormation);
  const startTraining = useGameStore(state => state.startTraining);
  const cancelTraining = useGameStore(state => state.cancelTraining);

  // 4 Mức Zoom cố định: 100 ô (cận cảnh), 256 ô, 1024 ô (toàn cảnh), 1024_x10 (vạn quân)
  const [zoomLevel, setZoomLevel] = useState<TacticalZoomLevel>(1024);

  // Loại quân đang chọn trên khay ('eraser' là công cụ tẩy)
  const [selectedToolUnit, setSelectedToolUnit] = useState<TacticalUnitType | 'eraser'>('swordsman');
  const [selectedGeneralToPlace, setSelectedGeneralToPlace] = useState<string | null>(null);

  // Vị trí chuột đang hover trên lưới (để preview footprint)
  const [hoveredCell, setHoveredCell] = useState<{ r: number; c: number } | null>(null);

  // Trạng thái giữ chuột để KÉO ĐẶT NHIỀU hoặc KÉO HỦY NHIỀU (Drag-to-place & Drag-to-remove)
  const isLeftMouseDownRef = useRef<boolean>(false);
  const isRightMouseDownRef = useRef<boolean>(false);
  const lastInteractedCellRef = useRef<string>('');

  // Đổi tên đạo quân
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  // Tab chuyển đổi bên phải: 'bench' (khay đặt quân) hoặc 'training' (thao luyện quân đinh)
  const [rightTab, setRightTab] = useState<'bench' | 'training'>('bench');

  // Form Thao Luyện nhanh
  const [trainingTrainees, setTrainingTrainees] = useState<number>(10);
  const [trainingGeneralId, setTrainingGeneralId] = useState<string>('le_loi');

  const currentCity = useMemo(() => {
    return cities.find(c => c.id === selectedCityId) || cities[0];
  }, [cities, selectedCityId]);

  const cityFormations = useMemo(() => {
    return formations.filter(f => f.cityId === currentCity.id);
  }, [formations, currentCity.id]);

  const activeFormation = useMemo(() => {
    return formations.find(f => f.id === activeFormationId) || cityFormations[0] || null;
  }, [formations, activeFormationId, cityFormations]);

  // Bảng tra cứu chân dung tướng (tính toán 1 lần thay vì 1024 lần trong vòng lặp)
  const generalsPortraitMap = useMemo(() => {
    const map: Record<string, string> = {};
    generals.forEach(g => {
      map[g.id] = g.portraitUrl || '/icons/general_token.png';
    });
    return map;
  }, [generals]);

  // Vùng footprint preview đơn lẻ (Floating Ghost Box) - Tính toán 1 lần duy nhất, không đụng tới 1024 ô lưới
  const hoveredFootprint = useMemo(() => {
    if (!hoveredCell || !selectedToolUnit || !activeFormation) {
      return null;
    }

    // Chế độ Tẩy Quân: hiển thị khung 1 ô viền đỏ/cam
    if (selectedToolUnit === 'eraser') {
      const targetCell = activeFormation.grid[hoveredCell.r]?.[hoveredCell.c] || null;
      return {
        r: hoveredCell.r,
        c: hoveredCell.c,
        spanRows: 1,
        spanCols: 1,
        isValid: true,
        isEraser: true,
        hasTarget: !!targetCell,
      };
    }

    const toolCfg = TACTICAL_UNIT_CONFIGS[selectedToolUnit];
    if (!toolCfg) return null;

    const sR = toolCfg.spanRows;
    const sC = toolCfg.spanCols;
    const fits = hoveredCell.r + sR <= FORMATION_ROWS && hoveredCell.c + sC <= FORMATION_COLS;
    let overlaps = false;
    if (fits) {
      for (let ro = 0; ro < sR; ro++) {
        for (let co = 0; co < sC; co++) {
          if (activeFormation.grid[hoveredCell.r + ro]?.[hoveredCell.c + co] !== null) {
            overlaps = true;
            break;
          }
        }
        if (overlaps) break;
      }
    }

    return {
      r: hoveredCell.r,
      c: hoveredCell.c,
      spanRows: sR,
      spanCols: sC,
      isValid: fits && !overlaps,
      isEraser: false,
      hasTarget: false,
    };
  }, [hoveredCell, selectedToolUnit, activeFormation]);

  // Thông tin ô đang trỏ chuột (Hiển thị thanh Inspector 0ms thay vì dùng title HTML lag)
  const hoveredCellInfo = useMemo(() => {
    if (!hoveredCell || !activeFormation) return null;
    const targetCell = activeFormation.grid[hoveredCell.r]?.[hoveredCell.c] || null;
    const cfg = targetCell ? TACTICAL_UNIT_CONFIGS[targetCell.type] : null;
    return {
      r: hoveredCell.r,
      c: hoveredCell.c,
      cell: targetCell,
      cfg,
    };
  }, [hoveredCell, activeFormation]);

  const availableGeneralsAtBase = useMemo(() => {
    return generals.filter(g => g.unlocked && (g.locationId === currentCity.id || !g.locationId));
  }, [generals, currentCity.id]);

  // Lắng nghe nhả chuột toàn cục để hủy trạng thái kéo rê
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isLeftMouseDownRef.current = false;
      isRightMouseDownRef.current = false;
      lastInteractedCellRef.current = '';
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('pointerup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('pointerup', handleGlobalMouseUp);
    };
  }, []);

  // Kiểm tra ban chỉ huy: đếm số quân từng loại và so khớp năng lực tướng
  const leadershipAudit = useMemo(() => {
    if (!activeFormation) {
      return { 
        typeCounts: {}, 
        assignedGens: [], 
        missingTypes: [], 
        generalCapacities: [], 
        isReady: false 
      };
    }

    const typeCounts: Record<string, number> = {};
    const seenParents = new Set<string>();

    const grid = activeFormation.grid;
    for (let r = 0; r < FORMATION_ROWS; r++) {
      const rowArr = grid[r];
      for (let c = 0; c < FORMATION_COLS; c++) {
        const u = rowArr[c];
        if (u && !seenParents.has(u.parentUnitId)) {
          seenParents.add(u.parentUnitId);
          if (u.type !== 'general') {
            typeCounts[u.type] = (typeCounts[u.type] || 0) + (u.multiplier || 1);
          }
        }
      }
    }

    const assignedGens = generals.filter(g => activeFormation.assignedGeneralIds.includes(g.id));

    const missingTypes: { type: TacticalUnitType; count: number; reqTroop: string }[] = [];
    const generalCapacities = assignedGens.map(g => {
      const maxCap = Math.max(8, Math.round(g.stats.command / 5));
      return {
        general: g,
        maxCapacity: maxCap,
        specialties: g.troops || [],
      };
    });

    Object.entries(typeCounts).forEach(([uType, count]) => {
      const cfg = TACTICAL_UNIT_CONFIGS[uType as TacticalUnitType];
      if (cfg && cfg.requiredGeneralTroopType) {
        const hasCoveringGen = assignedGens.some(g => (g.troops || []).includes(cfg.requiredGeneralTroopType!));
        if (!hasCoveringGen) {
          missingTypes.push({
            type: uType as TacticalUnitType,
            count,
            reqTroop: cfg.requiredGeneralTroopType,
          });
        }
      }
    });

    const isReady = missingTypes.length === 0 && (activeFormation.totalTroops > 0 || activeFormation.assignedGeneralIds.length > 0);

    return {
      typeCounts,
      assignedGens,
      missingTypes,
      generalCapacities,
      isReady,
    };
  }, [activeFormation, generals]);

  // Đo kích thước khung sa bàn để tính toán kích thước ô phủ trọn 100% khung hình
  const boardViewportRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({ width: 560, height: 560 });

  useEffect(() => {
    if (!boardViewportRef.current) return;
    const updateSize = () => {
      if (boardViewportRef.current) {
        const { clientWidth, clientHeight } = boardViewportRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          setViewportSize({ width: clientWidth, height: clientHeight });
        }
      }
    };
    updateSize();
    const observer = new ResizeObserver(() => updateSize());
    observer.observe(boardViewportRef.current);
    return () => observer.disconnect();
  }, []);

  // Tính kích thước ô thực tế theo 4 mức zoom chuẩn: 100 ô, 256 ô, 1024 ô, 1024 (x10 Vạn Quân)
  const cellSizePx = useMemo(() => {
    const padding = 16;
    const minDim = Math.max(300, Math.min(viewportSize.width, viewportSize.height) - padding);
    switch (zoomLevel) {
      case 100:
        return Math.max(32, Math.floor((minDim - 9 * 2) / 10));
      case 256:
        return Math.max(22, Math.floor((minDim - 15 * 2) / 16));
      case 1024:
      case '1024_x10':
      default:
        return Math.max(14, Math.floor((minDim - 31 * 1) / 32));
    }
  }, [viewportSize, zoomLevel]);

  const cellGap = (zoomLevel === 1024 || zoomLevel === '1024_x10') ? 1 : 2;
  const gridPx = cellSizePx * FORMATION_COLS + (FORMATION_COLS - 1) * cellGap;

  // Lấy tọa độ ô mà vị tướng đang trấn giữ (nếu đã đặt trên sa bàn)
  const getGeneralCoordinate = useCallback((genId: string) => {
    if (!activeFormation) return null;
    for (let r = 0; r < FORMATION_ROWS; r++) {
      for (let c = 0; c < FORMATION_COLS; c++) {
        const cell = activeFormation.grid[r]?.[c];
        if (cell && cell.type === 'general' && cell.generalId === genId) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }, [activeFormation]);

  // Kéo thả thẻ lệnh bài vị tướng vào ô sa bàn
  const handleDropGeneral = useCallback((genId: string, r: number, c: number) => {
    if (!activeFormation) return;

    const cell = activeFormation.grid[r]?.[c];
    if (cell) {
      notify.error(`Ô Hàng ${r + 1}, Cột ${c + 1} đã có ${cell.name}! Vui lòng thả vào ô trống.`);
      return;
    }

    const gen = generals.find(g => g.id === genId);
    if (!gen) return;

    // Nếu tướng đã trấn thủ ở ô khác, dời vị trí
    const oldCoord = getGeneralCoordinate(genId);
    if (oldCoord) {
      removeUnitFromGrid(activeFormation.id, oldCoord.row, oldCoord.col);
    }

    // Gán tướng vào đạo quân nếu chưa gán
    if (!activeFormation.assignedGeneralIds.includes(genId)) {
      assignGeneralToFormation(activeFormation.id, genId);
    }

    // Đặt tướng vào ô (r, c)
    placeUnitOnGrid(activeFormation.id, r, c, 'general', genId);
  }, [activeFormation, generals, getGeneralCoordinate, removeUnitFromGrid, assignGeneralToFormation, placeUnitOnGrid]);

  // Hàm thực hiện đặt quân tại (r, c) (Đọc store trực tiếp, khử triệt để stale closure và re-binding)
  const executePlaceAt = useCallback((r: number, c: number) => {
    const key = `place_${r}_${c}`;
    if (lastInteractedCellRef.current === key) return;
    lastInteractedCellRef.current = key;

    const state = useGameStore.getState();
    const currentActive = state.formations.find(f => f.id === state.activeFormationId);
    if (!currentActive) return;

    // Nếu ô đã có quân -> bỏ qua khi kéo chuột
    const existing = currentActive.grid[r][c];
    if (existing) return;

    if (selectedToolUnit === 'eraser') {
      return;
    }

    // Ở chế độ '1024_x10' (Vạn Quân), mỗi ô đặt xuống là 10 binh chủng (trừ Tướng)
    const multiplier = zoomLevel === '1024_x10' ? 10 : 1;

    if (selectedToolUnit === 'general') {
      if (selectedGeneralToPlace) {
        placeUnitOnGrid(currentActive.id, r, c, 'general', selectedGeneralToPlace, 1);
      }
    } else if (selectedToolUnit) {
      placeUnitOnGrid(currentActive.id, r, c, selectedToolUnit, undefined, multiplier);
    }
  }, [selectedToolUnit, selectedGeneralToPlace, placeUnitOnGrid, zoomLevel]);

  // Hàm thực hiện hủy/gỡ quân tại (r, c) (Đọc store trực tiếp, khử triệt để stale closure và re-binding)
  const executeRemoveAt = useCallback((r: number, c: number) => {
    const state = useGameStore.getState();
    const currentActive = state.formations.find(f => f.id === state.activeFormationId);
    if (!currentActive) return;

    const cell = currentActive.grid[r][c];
    if (!cell) return;
    const key = `del_${cell.parentUnitId}`;
    if (lastInteractedCellRef.current === key) return;
    lastInteractedCellRef.current = key;

    removeUnitFromGrid(currentActive.id, r, c);
  }, [removeUnitFromGrid]);

  // Hàm tính tọa độ ô (r, c) từ vị trí con trỏ trên khung lưới (O(1) Math, 0ms Delay)
  const getGridCoordinateFromPointer = useCallback((e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement> | React.DragEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const step = cellSizePx + cellGap;
    const c = Math.floor(x / step);
    const r = Math.floor(y / step);
    if (r >= 0 && r < FORMATION_ROWS && c >= 0 && c < FORMATION_COLS) {
      return { r, c };
    }
    return null;
  }, [cellSizePx, cellGap]);

  // Nhấn chuột trên lưới (Đồng bộ cả click đơn và kéo rải quân)
  const handleGridPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.button !== 2) return;
    e.preventDefault();
    if (!activeFormation) return;

    const coord = getGridCoordinateFromPointer(e);
    if (!coord) return;
    const { r, c } = coord;

    if (e.button === 0) {
      isLeftMouseDownRef.current = true;
      if (selectedToolUnit === 'eraser') {
        executeRemoveAt(r, c);
      } else {
        executePlaceAt(r, c);
      }
    } else if (e.button === 2) {
      isRightMouseDownRef.current = true;
      executeRemoveAt(r, c);
    }
  }, [activeFormation, getGridCoordinateFromPointer, selectedToolUnit, executePlaceAt, executeRemoveAt]);

  // Di chuyển con trỏ trên lưới (Hover preview + Kéo đặt nhiều / Kéo xóa nhiều đạt 120+ FPS)
  const handleGridPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const coord = getGridCoordinateFromPointer(e);
    if (!coord) return;
    const { r, c } = coord;

    setHoveredCell(prev => (prev && prev.r === r && prev.c === c ? prev : { r, c }));

    if (isLeftMouseDownRef.current) {
      if (selectedToolUnit === 'eraser') {
        executeRemoveAt(r, c);
      } else {
        executePlaceAt(r, c);
      }
    } else if (isRightMouseDownRef.current) {
      executeRemoveAt(r, c);
    }
  }, [getGridCoordinateFromPointer, selectedToolUnit, executePlaceAt, executeRemoveAt]);

  // Kéo Lệnh Bài Tướng lướt qua lưới
  const handleGridDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const coord = getGridCoordinateFromPointer(e);
    if (coord) {
      setHoveredCell(prev => (prev && prev.r === coord.r && prev.c === coord.c ? prev : coord));
    }
  }, [getGridCoordinateFromPointer]);

  // Thả Lệnh Bài Tướng vào ô
  const handleGridDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const coord = getGridCoordinateFromPointer(e);
    if (!coord) return;
    const genId = e.dataTransfer.getData('generalId') || e.dataTransfer.getData('text/plain');
    if (genId) {
      handleDropGeneral(genId, coord.r, coord.c);
    }
  }, [getGridCoordinateFromPointer, handleDropGeneral]);

  const handleStartRename = () => {
    if (!activeFormation) return;
    setEditedName(activeFormation.name);
    setIsEditingName(true);
  };

  const handleSaveRename = () => {
    if (!activeFormation || !editedName.trim()) return;
    updateFormationName(activeFormation.id, editedName.trim());
    setIsEditingName(false);
  };

  // Xử lý bắt đầu Thao Luyện nhanh ngay trong modal (đồng bộ công thức với TrainingSlider)
  const handleStartQuickTraining = () => {
    if (!currentCity.population) return;
    const idleCount = currentCity.population.idleLaborers;
    if (idleCount <= 0) {
      notify.error(`Căn cứ ${currentCity.name} không còn tráng phu nhàn rỗi để thao luyện!`);
      return;
    }

    const trainees = Math.min(idleCount, Math.max(1, trainingTrainees));
    if (resources.weapons < trainees) {
      notify.error(`Vũ khí trong kho không đủ để cấp cho ${trainees} người luyện võ!`);
      return;
    }

    const coach = generals.find(g => g.id === trainingGeneralId) || generals[0];
    const days = calculateTrainingDays(coach);

    startTraining(currentCity.id, trainingGeneralId, trainees, 0, days);
    notify.success(`Đã cử ${coach.name} huấn luyện ${trainees} nghĩa binh tại ${currentCity.name} trong ${days} ngày!`);
  };

  if (activeModal !== 'army') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-xs select-none">
      
      {/* KHUNG MODAL CỐ ĐỊNH HOÀN TOÀN */}
      <div 
        className="relative w-full max-w-6xl h-[88vh] max-h-[850px] bg-[#fbf6ea] border-2 border-[#5c3417] rounded-lg shadow-2xl flex flex-col overflow-hidden text-[#261304]"
        onContextMenu={(e) => e.preventDefault()}
      >
        
        {/* NỀN GIẤY DA CỔ */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20 bg-cover bg-center"
          style={{ backgroundImage: `url('/parchment_clean.png')` }}
        />

        {/* HEADER CỐ ĐỊNH: BỐ TRẬN & THANH ZOOM */}
        <div className="relative z-10 flex items-center justify-between px-4 py-2.5 bg-[#42220f] text-[#fef3c7] border-b-2 border-[#734f2d] shadow-md shrink-0">
          <div className="flex items-center gap-2">
            <img src="/icons/flag.png" alt="Quân" className="w-5 h-5 object-contain" />
            <h2 className="font-serif font-black text-sm md:text-base tracking-wider text-[#faecd5]">
              SA BÀN BỐ TRẬN — QUÂN THỨ LAM SƠN ({currentCity.name})
            </h2>
          </div>

          {/* 4 MỨC ZOOM CỐ ĐỊNH: 100 Ô, 256 Ô, 1024 Ô, 1024 (×10 VẠN QUÂN) */}
          <div className="flex items-center gap-1 bg-black/50 p-1 rounded-md border border-amber-900/60 text-xs font-mono">
            <span className="text-[#e2c7a0] font-serif text-[11px] px-1 font-bold">Mức Ô:</span>
            {([100, 256, 1024, '1024_x10'] as const).map(lvl => (
              <button
                key={lvl}
                onClick={() => setZoomLevel(lvl)}
                className={`px-2.5 py-0.5 rounded text-[11px] font-serif font-bold transition cursor-pointer ${
                  zoomLevel === lvl
                    ? lvl === '1024_x10'
                      ? 'bg-amber-600 text-black font-black shadow'
                      : 'bg-[#8c2d19] text-white shadow'
                    : 'text-[#e2c7a0]/80 hover:text-white hover:bg-black/30'
                }`}
                title={
                  lvl === 100 ? '100 ô: Cận cảnh chiến trận (10x10 ô)' :
                  lvl === 256 ? '256 ô: Trung cảnh sa bàn (16x16 ô)' :
                  lvl === 1024 ? '1024 ô: Toàn cảnh sa bàn (32x32 ô, hiển thị icon, 1 binh/ô)' :
                  '1024 (×10): Chế độ Vạn Quân (32x32 ô, mỗi ô đặt 10 binh)'
                }
              >
                {lvl === '1024_x10' ? '1024 (×10)' : `${lvl} Ô`}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 text-[#d4af82] hover:text-[#fff] hover:bg-[#5c3417] rounded transition cursor-pointer"
            title="Đóng Sa Bàn"
          >
            <X size={20} />
          </button>
        </div>

        {/* THÂN CHÍNH CỐ ĐỊNH: 3 CỘT */}
        <div className="relative z-10 flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[#734f2d]/30 min-h-0">

          {/* CỘT 1: DANH SÁCH ĐẠO QUÂN CHỜ TẠI CĂN CỨ (CỐ ĐỊNH 224px) */}
          <div className="w-full md:w-56 p-2.5 flex flex-col bg-[#dec79e]/60 overflow-y-auto no-scrollbar shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="font-serif font-bold text-xs text-[#3a2010] uppercase tracking-wider">
                Đạo Quân Chờ ({cityFormations.length})
              </span>
              <button
                onClick={() => createFormation(currentCity.id)}
                className="px-2 py-0.5 text-xs font-serif font-bold bg-[#8c2d19] hover:bg-[#6e1e0d] text-[#fff] rounded flex items-center gap-1 shadow cursor-pointer transition active:scale-95"
                title="Lập thêm 1 đạo quân mới ở trạng thái chờ"
              >
                <Plus size={12} /> Lập Đội
              </button>
            </div>

            <div className="space-y-1.5 flex-1">
              {cityFormations.map(form => {
                const isSelected = form.id === activeFormation?.id;
                return (
                  <div
                    key={form.id}
                    onClick={() => setActiveFormationId(form.id)}
                    className={`p-2 rounded border transition cursor-pointer relative ${
                      isSelected 
                        ? 'bg-[#351e0f] text-[#fef3c7] border-[#92400e] shadow-md' 
                        : 'bg-[#f4ebd9]/85 text-[#29160a] border-[#8c6b44]/40 hover:bg-[#fff9ed]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif font-bold text-xs truncate max-w-[130px]">
                        {form.name}
                      </h4>
                      <span className="text-[9px] font-mono opacity-70">
                        {isSelected ? 'Đang Xếp' : 'Chờ Lệnh'}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap gap-x-2 text-[10px] opacity-80 font-mono">
                      <span>Binh: {form.totalTroops}</span>
                      <span>Khí: {form.totalWeapons}</span>
                      <span>Mã: {form.totalHorses}</span>
                      <span>Voi: {form.totalElephants}</span>
                      <span>Lương: {form.totalFoodCarried}</span>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between gap-1 pt-1 border-t border-[#8c6b44]/25">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (form.totalTroops <= 0) {
                            notify.warning('Hãy đặt ít nhất 1 đơn vị lính vào đạo quân trước khi vẽ lộ trình hành quân!');
                            return;
                          }
                          setMarchDrawMode({ formationId: form.id });
                        }}
                        className="px-2 py-0.5 rounded bg-[#8c2d19] hover:bg-[#a6361f] text-white text-[10px] font-serif font-bold shadow cursor-pointer transition"
                        title="Ra bản đồ tự vẽ đường hành quân theo ô lưới"
                      >
                        ✍️ Vẽ Lộ Trình
                      </button>

                      {cityFormations.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFormation(form.id);
                          }}
                          className="text-red-500/70 hover:text-red-700 p-0.5 cursor-pointer"
                          title="Giải tán đạo quân này"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* MẸO THAO TÁC CHUỘT: KÉO ĐẶT VÀ KÉO HỦY */}
            <div className="mt-2 p-2 rounded bg-[#ebd5b3]/70 border border-[#8c6b44]/30 text-[10px] font-serif space-y-1 text-[#4a2e16]">
              <div className="font-bold flex items-center gap-1 text-[#8c2d19]">
                <Info size={12} /> Mẹo Thao Tác Chuột:
              </div>
              <p>&bull; <b>Kéo chuột trái:</b> Đặt một lúc cả hàng/vệt quân nhanh chóng.</p>
              <p>&bull; <b>Kéo chuột phải:</b> Quét hủy hàng loạt quân khỏi ô.</p>
              <p>&bull; <b>Lăn chuột (Wheel):</b> Thu phóng cỡ ô mượt mà.</p>
            </div>

            {/* BẢNG MÀU KHI ZOOM XA */}
            <div className="mt-2 pt-2 border-t border-[#734f2d]/30 text-[10px] font-serif space-y-1">
              <span className="font-bold text-[#3a2010] block">Màu sắc binh chủng (LOD):</span>
              <div className="grid grid-cols-2 gap-1 text-[9px]">
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-600"></span> Đao Khiên</div>
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-600"></span> Cung Thủ</div>
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-600"></span> Giáo Binh</div>
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-600"></span> Thám Mã</div>
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-violet-600"></span> Kỵ (2 ô)</div>
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-600"></span> Xe Lương (4 ô)</div>
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-900"></span> Voi (6 ô)</div>
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-400"></span> Vị Tướng</div>
              </div>
            </div>
          </div>

          {/* CỘT 2: KHUNG CHỨA LƯỚI MA TRẬN 32X32 CỐ ĐỊNH */}
          <div 
            className="flex-1 p-2 md:p-3 flex flex-col items-center justify-between overflow-hidden bg-[#f6efe0]/80 relative min-w-0"
            onContextMenu={(e) => e.preventDefault()}
            onWheel={(e) => {
              e.preventDefault();
              const levels: TacticalZoomLevel[] = [100, 256, 1024, '1024_x10'];
              const curIdx = levels.indexOf(zoomLevel);
              if (e.deltaY < 0 && curIdx > 0) {
                setZoomLevel(levels[curIdx - 1]);
              } else if (e.deltaY > 0 && curIdx < levels.length - 1) {
                setZoomLevel(levels[curIdx + 1]);
              }
            }}
          >
            {activeFormation ? (
              <div className="w-full h-full flex flex-col items-center justify-between min-h-0">
                
                {/* THANH TIÊU ĐỀ ĐẠO QUÂN */}
                <div className="w-full flex items-center justify-between mb-1 px-3 shrink-0">
                  <div className="flex items-center gap-2">
                    {isEditingName ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="px-2 py-0.5 text-xs font-serif font-bold border border-[#8c2d19] rounded bg-[#fff8eb]"
                          autoFocus
                        />
                        <button onClick={handleSaveRename} className="px-2 py-0.5 bg-[#8c2d19] text-white text-xs rounded">
                          Lưu
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-serif font-black text-sm md:text-base text-[#261304]">
                          {activeFormation.name}
                        </h3>
                        <button onClick={handleStartRename} className="text-[10px] text-[#8c2d19] hover:underline cursor-pointer">
                          (Đổi tên)
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-xs font-serif text-[#4a2e16] flex flex-wrap items-center gap-2.5">
                    <span>
                      Quy mô: <b>{activeFormation.totalTroops}</b> quân &bull; 
                      Lương: <b>{activeFormation.totalFoodCarried}</b>
                    </span>
                    <span>
                      Chủ Soái: <b className="text-[#8c2d19]">
                        {generals.find(g => g.id === activeFormation.commanderGeneralId)?.name || 'Chưa định'}
                      </b>
                    </span>
                    <button
                      onClick={() => {
                        if (activeFormation.totalTroops <= 0) {
                          notify.warning('Hãy đặt ít nhất 1 đơn vị lính vào đạo quân trước khi vẽ lộ trình hành quân!');
                          return;
                        }
                        setMarchDrawMode({ formationId: activeFormation.id });
                      }}
                      className="px-2.5 py-1 rounded bg-gradient-to-r from-[#8c2d19] to-[#b45309] hover:from-[#a6361f] hover:to-[#d97706] text-white text-[11px] font-bold shadow cursor-pointer transition"
                      title="Đóng sa bàn và tự vẽ đường hành quân theo ô lưới trên bản đồ"
                    >
                      ✍️ Vẽ Lộ Trình Hành Quân
                    </button>
                    <button
                      onClick={() => {
                        if (activeFormation.totalTroops <= 0) {
                          notify.warning('Hãy đặt ít nhất 1 đơn vị lính vào đạo quân trước khi vẽ lộ trình!');
                          return;
                        }
                        setMarchDrawMode({ formationId: activeFormation.id, isDualRoute: true });
                      }}
                      className="px-2.5 py-1 rounded bg-purple-900 hover:bg-purple-800 text-purple-100 text-[11px] font-bold shadow cursor-pointer transition"
                      title="Vẽ lộ trình 2 chặng: Tiến lên khiêu khích địch rồi vờ thua rút lui về ổ phục kích"
                    >
                      🏳️ Trá Bại Dụ Địch
                    </button>
                  </div>
                </div>

                {/* HƯỚNG MŨI TÊN TIẾN QUÂN */}
                <div className="w-full max-w-2xl flex items-center justify-center gap-2 py-0.5 mb-1 bg-[#8c2d19]/10 rounded border border-[#8c2d19]/25 text-[#8c2d19] text-[11px] font-serif font-bold uppercase tracking-wider shrink-0 select-none">
                  <span>▲ HƯỚNG TIẾN QUÂN / TIỀN TUYẾN ▲</span>
                </div>

                {/* VÙNG CUỘN CHỨA TẤM LƯỚI MA TRẬN 32X32 */}
                <div 
                  ref={boardViewportRef}
                  className="relative flex-1 min-h-0 w-full flex items-center justify-center bg-[#ebd4b0] p-1.5 rounded-lg border-2 border-[#543319] shadow-inner overflow-auto no-scrollbar select-none"
                  onMouseLeave={() => setHoveredCell(null)}
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                >
                  <div 
                    className="relative grid transition-none select-none m-auto cursor-pointer"
                    style={{ 
                      gridTemplateColumns: `repeat(${FORMATION_COLS}, ${cellSizePx}px)`,
                      gridTemplateRows: `repeat(${FORMATION_ROWS}, ${cellSizePx}px)`,
                      gap: `${cellGap}px`,
                      width: `${gridPx}px`,
                      height: `${gridPx}px`,
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                    onPointerDown={handleGridPointerDown}
                    onPointerMove={handleGridPointerMove}
                    onDragOver={handleGridDragOver}
                    onDrop={handleGridDrop}
                  >
                    {/* BẢNG MA TRẬN 1024 Ô CỐ ĐỊNH (TỰ ĐỘNG MEMO, 0MS DELAY KHI RÊ CHUỘT) */}
                    <TacticalGridBoard
                      grid={activeFormation.grid}
                      cellSizePx={cellSizePx}
                      zoomLevel={zoomLevel}
                      generalsPortraitMap={generalsPortraitMap}
                    />

                    {/* VÙNG HOVER HIỂN THỊ Ô XANH / ĐỎ / TẨY CỰC MƯỢT (0MS DELAY, KHÔNG DÙNG BOX-SHADOW BLUR) */}
                    {hoveredFootprint && (
                      <div
                        className={`absolute pointer-events-none rounded-[2px] transition-none z-30 ${
                          hoveredFootprint.isEraser
                            ? hoveredFootprint.hasTarget
                              ? 'bg-red-500/40 border-2 border-red-500 ring-1 ring-red-400'
                              : 'bg-amber-400/25 border-2 border-dashed border-amber-600'
                            : hoveredFootprint.isValid
                              ? 'bg-emerald-400/45 border-2 border-emerald-500 ring-1 ring-emerald-300'
                              : 'bg-red-500/45 border-2 border-red-500 ring-1 ring-red-400'
                        }`}
                        style={{
                          left: `${hoveredFootprint.c * (cellSizePx + cellGap)}px`,
                          top: `${hoveredFootprint.r * (cellSizePx + cellGap)}px`,
                          width: `${hoveredFootprint.spanCols * cellSizePx + (hoveredFootprint.spanCols - 1) * cellGap}px`,
                          height: `${hoveredFootprint.spanRows * cellSizePx + (hoveredFootprint.spanRows - 1) * cellGap}px`,
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* THANH TRẠNG THÁI SOI Ô (INSPECTOR BAR 0MS DELAY) */}
                <div className="w-full max-w-2xl flex items-center justify-between text-[11px] font-serif px-2.5 py-1 mt-1 bg-[#42220f]/10 border border-[#734f2d]/30 rounded text-[#351e0f] shrink-0 select-none">
                  {hoveredCellInfo ? (
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono font-bold text-[#8c2d19] bg-[#faebd7] px-1.5 py-0.2 rounded border border-[#8c2d19]/30">
                        Hàng {hoveredCellInfo.r + 1}, Cột {hoveredCellInfo.c + 1}
                      </span>
                      {hoveredCellInfo.cell ? (
                        <span className="font-bold">
                          {hoveredCellInfo.cell.name} ({hoveredCellInfo.cfg?.name}{hoveredCellInfo.cell.multiplier && hoveredCellInfo.cell.multiplier > 1 ? ` ×${hoveredCellInfo.cell.multiplier}` : ''})
                          <span className="text-[#8c2d19] font-normal ml-2">• [Chuột phải]: Hủy quân</span>
                        </span>
                      ) : (
                        <span className="text-[#543319]">
                          Ô trống • <span className="text-emerald-800 font-bold">[Chuột trái]: Đặt {selectedToolUnit === 'eraser' ? 'Tẩy' : TACTICAL_UNIT_CONFIGS[selectedToolUnit]?.name}</span> • Kéo thẻ tướng vào đây
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-[#734f2d] italic">
                      Di chuột lên ô sa bàn để ngắm vị trí • Giữ chuột trái kéo để rải quân • Chuột phải kéo để hủy
                    </div>
                  )}
                  <span className="text-[10px] text-[#734f2d] shrink-0 ml-2">
                    {zoomLevel === '1024_x10' ? 'Chế độ Vạn Quân (×10)' : `${zoomLevel} Ô`}
                  </span>
                </div>

                {/* PHÂN VÙNG 32 HÀNG CHIẾN TUYẾN */}
                <div className="w-full max-w-2xl flex items-center justify-between text-[11px] font-serif text-[#543319] mt-1 px-2 shrink-0 select-none">
                  <span>🚩 <b>Hàng 1-8:</b> Tiên Phong</span>
                  <span>⚔️ <b>Hàng 9-16:</b> Tiền Quân</span>
                  <span>⭐ <b>Hàng 17-24:</b> Trung Quân & Bản Doanh</span>
                  <span>🌾 <b>Hàng 25-32:</b> Hậu Cần & Xe Lương</span>
                </div>

              </div>
            ) : (
              <div className="text-center py-20 text-[#8c6b44]">
                Vui lòng chọn hoặc tạo mới một đạo quân.
              </div>
            )}
          </div>

          {/* CỘT 3: KHAY QUÂN BINH & BẢNG THAO LUYỆN (CỐ ĐỊNH 320px) */}
          <div className="w-full md:w-80 p-3 flex flex-col bg-[#dec79e]/60 overflow-y-auto no-scrollbar shrink-0">
            
            {/* THANH CHUYỂN TAB: KHAY BỐ TRẬN VS THAO LUYỆN */}
            <div className="flex border-b border-[#734f2d]/40 mb-3 pb-1 shrink-0">
              <button
                onClick={() => setRightTab('bench')}
                className={`flex-1 py-1 text-xs font-serif font-bold rounded-t flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  rightTab === 'bench' 
                    ? 'bg-[#351e0f] text-[#fef3c7] shadow' 
                    : 'text-[#4a2e16] hover:bg-[#eedbc0]'
                }`}
              >
                <Swords size={13} /> Khay Bố Trận
              </button>
              <button
                onClick={() => setRightTab('training')}
                className={`flex-1 py-1 text-xs font-serif font-bold rounded-t flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  rightTab === 'training' 
                    ? 'bg-[#351e0f] text-[#fef3c7] shadow' 
                    : 'text-[#4a2e16] hover:bg-[#eedbc0]'
                }`}
              >
                <Dumbbell size={13} /> Thao Luyện
                {currentCity.training && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                )}
              </button>
            </div>

            {rightTab === 'bench' ? (
              /* TAB 1: KHAY QUÂN BINH & LỆNH BÀI DANH TƯỚNG */
              <div className="flex-1 flex flex-col min-h-0">
                <div className="mb-2 shrink-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="font-serif font-bold text-xs text-[#3a2010] uppercase tracking-wider">
                      Chọn Binh Chủng ({currentCity.population?.combatTroops || 0} nghĩa binh dự bị)
                    </h4>
                    <button
                      onClick={() => {
                        setSelectedToolUnit('eraser');
                        setSelectedGeneralToPlace(null);
                      }}
                      className={`text-[10px] font-serif px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition ${
                        selectedToolUnit === 'eraser'
                          ? 'bg-red-700 text-white font-bold shadow'
                          : 'bg-red-100/90 text-red-800 hover:bg-red-200 border border-red-300'
                      }`}
                      title="Chế độ tẩy: Nhấp hoặc kéo chuột trái để gỡ quân (Chuột phải cũng gỡ)"
                    >
                      <Eraser size={11} /> Tẩy Quân
                    </button>
                  </div>

                  {/* THÔNG BÁO CHẾ ĐỘ VẠN QUÂN */}
                  {zoomLevel === '1024_x10' && (
                    <div className="mb-2 px-2 py-1 rounded bg-amber-500/20 border border-amber-600/60 text-[#78350f] text-[10.5px] font-serif font-black flex items-center justify-between shadow-xs">
                      <span className="flex items-center gap-1">🚩 CHẾ ĐỘ VẠN QUÂN: 1 Ô = 10 BINH</span>
                      <span className="bg-amber-600 text-black px-1.5 py-0.2 rounded text-[9px] font-black">×10</span>
                    </div>
                  )}

                  {/* DANH SÁCH BINH CHỦNG */}
                  <div className="space-y-1">
                    {(Object.keys(TACTICAL_UNIT_CONFIGS) as TacticalUnitType[]).map(uType => {
                      if (uType === 'general') return null;
                      const cfg = TACTICAL_UNIT_CONFIGS[uType];
                      const isSelected = selectedToolUnit === uType;
                      const resInfo = getUnitResourceInfo(uType, resources);

                      return (
                        <button
                          key={uType}
                          onClick={() => {
                            setSelectedToolUnit(uType);
                            setSelectedGeneralToPlace(null);
                          }}
                          className={`w-full px-2 py-1.5 rounded border text-left flex items-center justify-between transition cursor-pointer ${
                            isSelected 
                              ? 'bg-[#351e0f] text-[#fef3c7] border-[#b45309] shadow-md scale-101' 
                              : 'bg-[#f4ebd9]/85 text-[#29160a] border-[#8c6b44]/40 hover:bg-[#fff9ed]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span 
                              className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/40" 
                              style={{ backgroundColor: cfg.colorHex }}
                            ></span>
                            <img src={cfg.icon} alt={cfg.name} className="w-5 h-5 object-contain shrink-0" />
                            <span className="font-serif font-bold text-xs whitespace-nowrap">
                              {cfg.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 font-mono shrink-0 ml-1">
                            <span 
                              className="flex items-center gap-1 text-[11px] font-bold text-amber-950 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-300/60" 
                              title={`Số lượng ${cfg.name} trong đạo quân`}
                            >
                              <Users size={12} className="text-amber-800" />
                              {(leadershipAudit.typeCounts[uType] || 0).toLocaleString()}
                            </span>
                            <span 
                              className="flex items-center gap-1 text-[11px] font-bold text-[#8c2d19] bg-red-100/90 px-1.5 py-0.5 rounded border border-red-300/60" 
                              title={resInfo.label}
                            >
                              <span className="text-xs select-none">{resInfo.icon}</span>
                              {resInfo.count.toLocaleString()}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. LỆNH BÀI DANH TƯỚNG */}
                <div className="flex-1 flex flex-col border-t border-[#734f2d]/30 pt-2 min-h-0">
                  <div className="flex items-center justify-between mb-1 shrink-0">
                    <div>
                      <h4 className="font-serif font-bold text-xs text-[#3a2010] uppercase tracking-wider">
                        Lệnh Bài Danh Tướng
                      </h4>
                      <p className="text-[9px] font-serif text-[#78350f]/80">
                        Nhấp lật xem icon sở trường • Kéo ra Sa Bàn
                      </p>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-[#78350f] bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-300/50">
                      {availableGeneralsAtBase.length} Tướng
                    </span>
                  </div>

                  {/* CẢNH BÁO THIẾU TƯỚNG SỞ TRƯỜNG */}
                  {leadershipAudit.missingTypes.length > 0 && (
                    <div className="mb-2 p-1.5 rounded bg-amber-950/90 border border-amber-500/80 text-amber-200 text-xs font-serif space-y-0.5 shadow shrink-0">
                      <div className="flex items-center gap-1.5 font-bold text-amber-300 text-[11px]">
                        <ShieldAlert size={13} /> Thiếu Tướng Sở Trường:
                      </div>
                      {leadershipAudit.missingTypes.map((m, idx) => (
                        <p key={idx} className="text-[9.5px] leading-tight text-amber-200/90">
                          &bull; Có <b>{m.count} {TACTICAL_UNIT_CONFIGS[m.type].name}</b> nhưng thiếu tướng am hiểu <b>{m.reqTroop}</b>!
                        </p>
                      ))}
                    </div>
                  )}

                  {/* LƯỚI THẺ BÀI DANH TƯỚNG KÍCH THƯỚC NHỎ NHƯ CĂN CỨ (5 CỘT) */}
                  <div className="flex-1 overflow-y-auto no-scrollbar min-h-0 p-1">
                    <div className="grid grid-cols-5 gap-1.5 justify-items-center">
                      {availableGeneralsAtBase.map(gen => {
                        const isAssigned = activeFormation?.assignedGeneralIds.includes(gen.id) || false;
                        const coord = getGeneralCoordinate(gen.id);

                        return (
                          <TacticalGeneralPlaque
                            key={gen.id}
                            general={gen}
                            isAssigned={isAssigned}
                            gridCoordinate={coord}
                            onRecall={() => {
                              if (coord) {
                                executeRemoveAt(coord.row, coord.col);
                              }
                              if (isAssigned) {
                                removeGeneralFromFormation(activeFormation!.id, gen.id);
                              }
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* TAB 2: CƠ CHẾ THAO LUYỆN TRỰC TIẾP TRONG SA BÀN */
              <div className="flex-1 flex flex-col space-y-3 font-serif">
                <div className="p-2.5 rounded bg-[#f4ebd9]/90 border border-[#8c6b44]/40 text-xs text-[#261304] space-y-2">
                  <h4 className="font-bold text-[#8c2d19] flex items-center gap-1.5 uppercase text-xs">
                    <Dumbbell size={14} /> Thao Luyện Trực Tiếp Tại {currentCity.name}
                  </h4>
                  
                  {currentCity.training ? (
                    <div className="p-2 rounded bg-amber-100 border border-amber-400 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#78350f]">Đang thao luyện:</span>
                        <span className="font-mono text-amber-900 font-bold">
                          Còn {currentCity.training.remainingDays}/{currentCity.training.totalDays} ngày
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-stone-300 overflow-hidden">
                        <div 
                          className="h-full bg-emerald-600 transition-all duration-300"
                          style={{
                            width: `${Math.round(((currentCity.training.totalDays - currentCity.training.remainingDays) / currentCity.training.totalDays) * 100)}%`
                          }}
                        ></div>
                      </div>
                      <div className="text-[11px] text-[#543319] flex items-center justify-between">
                        <span>Số lượng: <b>{currentCity.training.traineesCount} tráng phu</b></span>
                        <button
                          onClick={() => cancelTraining(currentCity.id)}
                          className="text-red-700 hover:underline cursor-pointer text-[10px]"
                        >
                          Hủy đợt luyện
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] text-[#543319]">
                        Huấn luyện tráng phu nhàn rỗi thành nghĩa binh tinh nhuệ để sẵn sàng đưa vào sa bàn bố trận.
                      </p>

                      <div>
                        <label className="block text-[11px] font-bold mb-1">
                          Vị Tướng Phụ Trách Thao Luyện:
                        </label>
                        <select
                          value={trainingGeneralId}
                          onChange={(e) => setTrainingGeneralId(e.target.value)}
                          className="w-full p-1.5 text-xs font-bold border border-[#8c6b44] rounded bg-[#fff8eb]"
                        >
                          {availableGeneralsAtBase.map(g => (
                            <option key={g.id} value={g.id}>
                              {g.name} (Thống: {g.stats.command}, Võ: {g.stats.martial})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                          <span>Số Lượng Tráng Phu Luyện Võ:</span>
                          <span className="font-mono text-[#8c2d19]">{trainingTrainees} người</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max={Math.max(1, currentCity.population?.idleLaborers || 10)}
                          value={trainingTrainees}
                          onChange={(e) => setTrainingTrainees(Number(e.target.value))}
                          className="w-full accent-[#8c2d19] cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] text-[#78350f]">
                          <span>1 người</span>
                          <span>Tối đa: {currentCity.population?.idleLaborers || 0} tráng phu</span>
                        </div>
                      </div>

                      <button
                        onClick={handleStartQuickTraining}
                        disabled={!currentCity.population || currentCity.population.idleLaborers <= 0}
                        className="w-full py-2 bg-[#8c2d19] hover:bg-[#6e1e0d] text-white text-xs font-bold rounded shadow cursor-pointer transition disabled:bg-stone-400 disabled:cursor-not-allowed"
                      >
                        Bắt Đầu Thao Luyện ({trainingTrainees} Quân)
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-2.5 rounded bg-[#ebd5b3]/70 border border-[#8c6b44]/30 text-[11px] text-[#543319] space-y-1">
                  <div className="font-bold flex items-center gap-1 text-[#3a2010]">
                    <ChevronRight size={13} /> Quy tắc quân bị Lam Sơn:
                  </div>
                  <p>&bull; Mỗi tráng phu thao luyện cần 1 vũ khí từ lò rèn đúc.</p>
                  <p>&bull; Tướng có chỉ số Thống Lĩnh và Võ Nghệ càng cao thì thời gian thao luyện càng rút ngắn.</p>
                  <p>&bull; Sau khi luyện xong, nghĩa binh sẽ lập tức có mặt ở kho để nhặt-đặt vào sa bàn đại quân!</p>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
});

TacticalFormationModal.displayName = 'TacticalFormationModal';
