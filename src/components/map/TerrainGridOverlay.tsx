import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { useUIStore } from '../../store/uiStore';
import {
  GRID_CELL_W_PCT,
  GRID_CELL_H_PCT,
  GRID_COLS,
  GRID_ROWS,
  getGridTerrain,
  coordToCell,
  cellToCoord,
  paintTerrainBrush,
} from '../../data/terrainGrid';
import { percentToLatLng, latLngToPercent } from '../../utils/mapGeo';
import type { TerrainType } from '../../types/terrain';

interface TerrainGridOverlayProps {
  map: L.Map | null;
}

const TERRAIN_FILL_COLORS: Record<TerrainType, string> = {
  plains: 'rgba(234, 179, 8, 0.22)',    // Vàng đồng bằng
  forest: 'rgba(34, 197, 94, 0.28)',    // Xanh rừng già
  mountain: 'rgba(249, 115, 22, 0.28)',  // Cam núi cao
  cliff: 'rgba(239, 68, 68, 0.35)',     // Đỏ vách đá hiểm
  swamp: 'rgba(6, 182, 212, 0.25)',     // Xanh ngọc đầm lầy
  water: 'rgba(59, 130, 246, 0.32)',    // Xanh dương sông Mã
};

export const TerrainGridOverlay: React.FC<TerrainGridOverlayProps> = ({ map }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isEditMode = useUIStore(state => state.isEditMode);
  const showGrid = useUIStore(state => state.showGrid);
  const showTerrainOverlay = useUIStore(state => state.showTerrainOverlay);
  const terrainEditMode = useUIStore(state => state.terrainEditMode);
  const brushTerrain = useUIStore(state => state.brushTerrain);
  const brushSize = useUIStore(state => state.brushSize);
  const placementMode = useUIStore(state => state.placementMode);
  const baseRelocateMode = useUIStore(state => state.baseRelocateMode);
  const hoveredCell = useUIStore(state => state.hoveredCell);
  const setHoveredCell = useUIStore(state => state.setHoveredCell);

  const isMouseDownRef = useRef(false);

  // Đồng bộ kích thước và vị trí của canvas trong Leaflet Pane để khớp 1:1 với màn hình
  const syncCanvasSizeAndPos = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !map || !(map as any)._loaded) return;
    const size = map.getSize();
    if (!size.x || !size.y) return;
    if (canvas.width !== size.x || canvas.height !== size.y) {
      canvas.width = size.x;
      canvas.height = size.y;
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;
    }
    const topLeft = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(canvas, topLeft);
  }, [map]);

  // 1. Tạo Canvas và đăng ký với Leaflet Pane
  useEffect(() => {
    if (!map) return;

    // Tạo pane riêng với zIndex 420 (trên ảnh sa bàn 25, dưới ranh giới huyện 450)
    let gridPane = map.getPane('terrainGridPane');
    if (!gridPane) {
      gridPane = map.createPane('terrainGridPane');
      gridPane.style.zIndex = '420';
      gridPane.style.pointerEvents = 'none';
    }

    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.pointerEvents = 'none';

    gridPane.appendChild(canvas);
    canvasRef.current = canvas;

    syncCanvasSizeAndPos();

    return () => {
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      canvasRef.current = null;
    };
  }, [map, syncCanvasSizeAndPos]);

  // 2. Hàm vẽ Canvas Lưới và Địa Hình
  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !map || !(map as any)._loaded) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    syncCanvasSizeAndPos();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const shouldDrawGrid = showGrid || isEditMode || terrainEditMode || Boolean(placementMode);

    // Nếu không bật cả Lưới lẫn Lớp Địa Hình và không trong chế độ Đặt / Sửa Map thì không cần vẽ nền
    if (!shouldDrawGrid && !showTerrainOverlay) {
      return;
    }

    let bounds: L.LatLngBounds;
    try {
      bounds = map.getBounds();
    } catch {
      return;
    }
    const northEast = latLngToPercent(bounds.getNorthEast());
    const southWest = latLngToPercent(bounds.getSouthWest());

    const minX = Math.min(northEast.x, southWest.x);
    const maxX = Math.max(northEast.x, southWest.x);
    const minY = Math.min(northEast.y, southWest.y);
    const maxY = Math.max(northEast.y, southWest.y);

    const startCol = Math.max(0, Math.floor(minX / GRID_CELL_W_PCT) - 1);
    const endCol = Math.min(GRID_COLS - 1, Math.ceil(maxX / GRID_CELL_W_PCT) + 1);
    const startRow = Math.max(0, Math.floor(minY / GRID_CELL_H_PCT) - 1);
    const endRow = Math.min(GRID_ROWS - 1, Math.ceil(maxY / GRID_CELL_H_PCT) + 1);

    const zoom = map.getZoom();

    // 1. Tô màu địa hình từng ô nếu bật showTerrainOverlay, terrainEditMode hoặc khi đang xây dựng (placementMode)
    const isShowingTerrainColors = showTerrainOverlay || terrainEditMode || Boolean(placementMode) || Boolean(baseRelocateMode);
    if (isShowingTerrainColors) {
      // Khi zoom xa (< 1.8) và không ở chế độ sơn/đặt công trình, tô màu gộp 4 ô (~1km) hoặc 2 ô để tối ưu mượt mà 60fps
      const isPreciseMode = terrainEditMode || Boolean(placementMode) || Boolean(baseRelocateMode);
      const fillStep = (zoom < 1.8 && !isPreciseMode) ? 4 : (zoom < 2.2 && !isPreciseMode) ? 2 : 1;

      for (let r = startRow; r <= endRow; r += fillStep) {
        for (let c = startCol; c <= endCol; c += fillStep) {
          const terrain = getGridTerrain(c, r);
          const { minX: cMinX, minY: cMinY } = cellToCoord(c, r);
          const { maxX: cMaxX, maxY: cMaxY } = cellToCoord(
            Math.min(GRID_COLS - 1, c + fillStep - 1),
            Math.min(GRID_ROWS - 1, r + fillStep - 1)
          );

          const pTopLeft = map.latLngToContainerPoint(percentToLatLng(cMinX, cMinY));
          const pBottomRight = map.latLngToContainerPoint(percentToLatLng(cMaxX, cMaxY));

          const width = pBottomRight.x - pTopLeft.x;
          const height = pBottomRight.y - pTopLeft.y;

          ctx.fillStyle = TERRAIN_FILL_COLORS[terrain];
          ctx.fillRect(pTopLeft.x, pTopLeft.y, width, height);
        }
      }
    }

    // 2. Vẽ các đường kẻ lưới ô vuông (Square Grid Lines)
    if (shouldDrawGrid) {
      // Khi ở chế độ đặt công trình hoặc sửa map, luôn vẽ lưới chi tiết
      const isPreciseMode = terrainEditMode || Boolean(placementMode) || isEditMode;
      const step = (zoom < 1.8 && !isPreciseMode) ? 4 : 1;
      const actualStartRow = Math.floor(startRow / step) * step;
      const actualStartCol = Math.floor(startCol / step) * step;

      // Đường kẻ ngang (Horizontal lines)
      for (let r = actualStartRow; r <= endRow + 1; r += step) {
        const yPct = r * GRID_CELL_H_PCT;
        const p1 = map.latLngToContainerPoint(percentToLatLng(Math.max(0, startCol * GRID_CELL_W_PCT), yPct));
        const p2 = map.latLngToContainerPoint(percentToLatLng(Math.min(100, (endCol + 1) * GRID_CELL_W_PCT), yPct));

        const isMajor5km = r % 20 === 0; // Mốc lớn mỗi 5km (20 ô x 250m)
        const isMajor1km = r % 4 === 0;  // Mốc vừa mỗi 1km (4 ô x 250m)

        if (isMajor5km) {
          ctx.strokeStyle = terrainEditMode ? 'rgba(217, 119, 6, 0.90)' : 'rgba(180, 100, 30, 0.75)';
          ctx.lineWidth = 1.4;
        } else if (isMajor1km) {
          ctx.strokeStyle = terrainEditMode ? 'rgba(217, 119, 6, 0.65)' : 'rgba(170, 115, 60, 0.50)';
          ctx.lineWidth = 1.0;
        } else {
          ctx.strokeStyle = terrainEditMode
            ? 'rgba(217, 119, 6, 0.35)'
            : (zoom >= 3.0 ? 'rgba(160, 110, 60, 0.35)' : 'rgba(160, 110, 60, 0.20)');
          ctx.lineWidth = 0.7;
        }

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      // Đường kẻ dọc (Vertical lines)
      for (let c = actualStartCol; c <= endCol + 1; c += step) {
        const xPct = c * GRID_CELL_W_PCT;
        const p1 = map.latLngToContainerPoint(percentToLatLng(xPct, Math.max(0, startRow * GRID_CELL_H_PCT)));
        const p2 = map.latLngToContainerPoint(percentToLatLng(xPct, Math.min(100, (endRow + 1) * GRID_CELL_H_PCT)));

        const isMajor5km = c % 20 === 0; // Mốc lớn mỗi 5km
        const isMajor1km = c % 4 === 0;  // Mốc vừa mỗi 1km

        if (isMajor5km) {
          ctx.strokeStyle = terrainEditMode ? 'rgba(217, 119, 6, 0.90)' : 'rgba(180, 100, 30, 0.75)';
          ctx.lineWidth = 1.4;
        } else if (isMajor1km) {
          ctx.strokeStyle = terrainEditMode ? 'rgba(217, 119, 6, 0.65)' : 'rgba(170, 115, 60, 0.50)';
          ctx.lineWidth = 1.0;
        } else {
          ctx.strokeStyle = terrainEditMode
            ? 'rgba(217, 119, 6, 0.35)'
            : (zoom >= 3.0 ? 'rgba(160, 110, 60, 0.35)' : 'rgba(160, 110, 60, 0.20)');
          ctx.lineWidth = 0.7;
        }

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    // 3. Highlight ô đang rê chuột (Hover) hoặc vùng cọ vẽ (Brush)
    if (hoveredCell && (shouldDrawGrid || showTerrainOverlay)) {
      if (terrainEditMode) {
        // Vẽ viền phạm vi cọ vẽ (1x1, 3x3, 5x5, 9x9)
        const half = Math.floor(brushSize / 2);
        const bStartCol = Math.max(0, hoveredCell.col - half);
        const bEndCol = Math.min(GRID_COLS - 1, hoveredCell.col + half);
        const bStartRow = Math.max(0, hoveredCell.row - half);
        const bEndRow = Math.min(GRID_ROWS - 1, hoveredCell.row + half);

        const { minX: bMinX, minY: bMinY } = cellToCoord(bStartCol, bStartRow);
        const { maxX: bMaxX, maxY: bMaxY } = cellToCoord(bEndCol, bEndRow);

        const pTL = map.latLngToContainerPoint(percentToLatLng(bMinX, bMinY));
        const pBR = map.latLngToContainerPoint(percentToLatLng(bMaxX, bMaxY));

        ctx.fillStyle = TERRAIN_FILL_COLORS[brushTerrain];
        ctx.fillRect(pTL.x, pTL.y, pBR.x - pTL.x, pBR.y - pTL.y);

        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(pTL.x, pTL.y, pBR.x - pTL.x, pBR.y - pTL.y);
      } else if (placementMode) {
        // Vẽ viền phạm vi công trình NxN ô
        const size = placementMode.gridSize || (placementMode.type === 'forge' ? 3 : (placementMode.farmTier === 50 ? 7 : placementMode.farmTier === 35 ? 6 : 5));
        const half = Math.floor(size / 2);
        const bStartCol = Math.max(0, Math.min(GRID_COLS - size, hoveredCell.col - half));
        const bEndCol = bStartCol + size - 1;
        const bStartRow = Math.max(0, Math.min(GRID_ROWS - size, hoveredCell.row - half));
        const bEndRow = bStartRow + size - 1;

        const { minX: bMinX, minY: bMinY } = cellToCoord(bStartCol, bStartRow);
        const { maxX: bMaxX, maxY: bMaxY } = cellToCoord(bEndCol, bEndRow);

        const pTL = map.latLngToContainerPoint(percentToLatLng(bMinX, bMinY));
        const pBR = map.latLngToContainerPoint(percentToLatLng(bMaxX, bMaxY));

        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(pTL.x, pTL.y, pBR.x - pTL.x, pBR.y - pTL.y);
      } else if (baseRelocateMode) {
        // Vẽ viền phạm vi căn cứ 3x3..6x6 ô
        const size = 3;
        const half = Math.floor(size / 2);
        const bStartCol = Math.max(0, Math.min(GRID_COLS - size, hoveredCell.col - half));
        const bEndCol = bStartCol + size - 1;
        const bStartRow = Math.max(0, Math.min(GRID_ROWS - size, hoveredCell.row - half));
        const bEndRow = bStartRow + size - 1;

        const { minX: bMinX, minY: bMinY } = cellToCoord(bStartCol, bStartRow);
        const { maxX: bMaxX, maxY: bMaxY } = cellToCoord(bEndCol, bEndRow);

        const pTL = map.latLngToContainerPoint(percentToLatLng(bMinX, bMinY));
        const pBR = map.latLngToContainerPoint(percentToLatLng(bMaxX, bMaxY));

        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(pTL.x, pTL.y, pBR.x - pTL.x, pBR.y - pTL.y);
      } else if (isEditMode) {
        // Chỉ highlight viền ô đơn lẻ khi đang ở chế độ chỉnh sửa địa hình / sửa map
        const { minX: hMinX, maxX: hMaxX, minY: hMinY, maxY: hMaxY } = cellToCoord(hoveredCell.col, hoveredCell.row);
        const pTL = map.latLngToContainerPoint(percentToLatLng(hMinX, hMinY));
        const pBR = map.latLngToContainerPoint(percentToLatLng(hMaxX, hMaxY));

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.strokeRect(pTL.x, pTL.y, pBR.x - pTL.x, pBR.y - pTL.y);
      }
    }
  }, [
    map,
    syncCanvasSizeAndPos,
    isEditMode,
    showGrid,
    showTerrainOverlay,
    terrainEditMode,
    brushTerrain,
    brushSize,
    placementMode,
    baseRelocateMode,
    hoveredCell,
  ]);

  const drawGridRef = useRef<() => void>(drawGrid);
  useEffect(() => {
    drawGridRef.current = drawGrid;
  }, [drawGrid]);

  // 3. Lắng nghe sự kiện di chuyển và zoom của bản đồ để vẽ lại (dùng requestAnimationFrame chống giật lag)
  useEffect(() => {
    if (!map) return;

    let rafId: number | null = null;
    const handleUpdate = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        drawGridRef.current();
      });
    };

    map.on('move', handleUpdate);
    map.on('zoom', handleUpdate);
    map.on('resize', handleUpdate);
    map.on('viewreset', handleUpdate);

    handleUpdate();

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      map.off('move', handleUpdate);
      map.off('zoom', handleUpdate);
      map.off('resize', handleUpdate);
      map.off('viewreset', handleUpdate);
    };
  }, [map]);

  // Cập nhật khi các state UI liên quan thay đổi
  useEffect(() => {
    drawGrid();
  }, [drawGrid]);

  // 4. Lắng nghe rê chuột trên bản đồ để cập nhật hoveredCell và Sơn địa hình
  useEffect(() => {
    if (!map) return;

    if (!terrainEditMode) {
      isMouseDownRef.current = false;
    }

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      const isGridActive = showGrid || isEditMode || terrainEditMode || Boolean(placementMode) || showTerrainOverlay;
      if (!isGridActive) {
        if (useUIStore.getState().hoveredCell) setHoveredCell(null);
        return;
      }

      const { x, y } = latLngToPercent(e.latlng);
      const cell = coordToCell(x, y);

      setHoveredCell({ col: cell.col, row: cell.row });

      // Nếu đang trong chế độ Sơn Địa Hình và giữ chuột trái -> Sơn liên tục
      if (terrainEditMode && isMouseDownRef.current) {
        paintTerrainBrush(cell.col, cell.row, brushTerrain, brushSize);
        drawGridRef.current();
      }
    };

    const handleMouseDown = (e: L.LeafletMouseEvent) => {
      if (e.originalEvent.button !== 0) return; // Chỉ nhận chuột trái
      isMouseDownRef.current = true;

      if (terrainEditMode) {
        const { x, y } = latLngToPercent(e.latlng);
        const cell = coordToCell(x, y);
        paintTerrainBrush(cell.col, cell.row, brushTerrain, brushSize);
        drawGridRef.current();
      }
    };

    const handleMouseUp = () => {
      isMouseDownRef.current = false;
    };

    const handleMouseLeave = () => {
      isMouseDownRef.current = false;
      setHoveredCell(null);
    };

    const handleGlobalMouseUp = () => {
      isMouseDownRef.current = false;
    };

    map.on('mousemove', handleMouseMove);
    map.on('mousedown', handleMouseDown);
    map.on('mouseup', handleMouseUp);
    map.on('mouseout', handleMouseLeave);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      map.off('mousemove', handleMouseMove);
      map.off('mousedown', handleMouseDown);
      map.off('mouseup', handleMouseUp);
      map.off('mouseout', handleMouseLeave);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [
    map,
    showGrid,
    isEditMode,
    showTerrainOverlay,
    placementMode,
    terrainEditMode,
    brushTerrain,
    brushSize,
    setHoveredCell,
  ]);

  return null;
};
