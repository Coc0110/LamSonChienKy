import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useUIStore } from '../../store/uiStore';
import {
  GRID_CELL_SIZE,
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

  const showGrid = useUIStore(state => state.showGrid);
  const showTerrainOverlay = useUIStore(state => state.showTerrainOverlay);
  const terrainEditMode = useUIStore(state => state.terrainEditMode);
  const brushTerrain = useUIStore(state => state.brushTerrain);
  const brushSize = useUIStore(state => state.brushSize);
  const placementMode = useUIStore(state => state.placementMode);
  const hoveredCell = useUIStore(state => state.hoveredCell);
  const setHoveredCell = useUIStore(state => state.setHoveredCell);

  const isMouseDownRef = useRef(false);

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
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';

    gridPane.appendChild(canvas);
    canvasRef.current = canvas;

    const resizeCanvas = () => {
      if (!canvas || !map) return;
      const size = map.getSize();
      canvas.width = size.x;
      canvas.height = size.y;
    };

    resizeCanvas();

    return () => {
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      canvasRef.current = null;
    };
  }, [map]);

  // 2. Hàm vẽ Canvas Lưới và Địa Hình
  const drawGrid = () => {
    const canvas = canvasRef.current;
    if (!canvas || !map || !(map as any)._loaded) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width === 0 || canvas.height === 0) {
      const size = map.getSize();
      if (!size.x || !size.y) return;
      canvas.width = size.x;
      canvas.height = size.y;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Nếu không bật cả Lưới lẫn Lớp Địa Hình và không trong chế độ Đặt / Sơn thì không cần vẽ nền
    if (!showGrid && !showTerrainOverlay && !terrainEditMode && !placementMode) {
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

    const startCol = Math.max(0, Math.floor(minX / GRID_CELL_SIZE));
    const endCol = Math.min(GRID_COLS - 1, Math.ceil(maxX / GRID_CELL_SIZE));
    const startRow = Math.max(0, Math.floor(minY / GRID_CELL_SIZE));
    const endRow = Math.min(GRID_ROWS - 1, Math.ceil(maxY / GRID_CELL_SIZE));

    const zoom = map.getZoom();

    // 1. Tô màu địa hình từng ô nếu bật showTerrainOverlay hoặc terrainEditMode
    if (showTerrainOverlay || terrainEditMode) {
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const terrain = getGridTerrain(c, r);
          const { minX: cMinX, maxX: cMaxX, minY: cMinY, maxY: cMaxY } = cellToCoord(c, r);

          const pTopLeft = map.latLngToContainerPoint(percentToLatLng(cMinX, cMinY));
          const pBottomRight = map.latLngToContainerPoint(percentToLatLng(cMaxX, cMaxY));

          const width = pBottomRight.x - pTopLeft.x;
          const height = pBottomRight.y - pTopLeft.y;

          ctx.fillStyle = TERRAIN_FILL_COLORS[terrain];
          ctx.fillRect(pTopLeft.x, pTopLeft.y, width, height);
        }
      }
    }

    // 2. Vẽ các đường kẻ lưới ô vuông nếu bật showGrid hoặc đang chỉnh sửa / đặt công trình
    if (showGrid || terrainEditMode || placementMode) {
      ctx.lineWidth = 1;

      // Nét lưới nhẹ
      ctx.strokeStyle = zoom >= 2.5 ? 'rgba(168, 124, 79, 0.35)' : 'rgba(168, 124, 79, 0.18)';

      for (let r = startRow; r <= endRow + 1; r++) {
        const yPct = r * GRID_CELL_SIZE;
        const p1 = map.latLngToContainerPoint(percentToLatLng(startCol * GRID_CELL_SIZE, yPct));
        const p2 = map.latLngToContainerPoint(percentToLatLng((endCol + 1) * GRID_CELL_SIZE, yPct));

        // Nhấn đậm nhẹ mỗi 5 ô (2.5%)
        const isMajor = r % 5 === 0;
        if (isMajor) {
          ctx.strokeStyle = 'rgba(168, 124, 79, 0.45)';
          ctx.lineWidth = 1.2;
        } else {
          ctx.strokeStyle = zoom >= 2.5 ? 'rgba(168, 124, 79, 0.28)' : 'rgba(168, 124, 79, 0.14)';
          ctx.lineWidth = 0.8;
        }

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      for (let c = startCol; c <= endCol + 1; c++) {
        const xPct = c * GRID_CELL_SIZE;
        const p1 = map.latLngToContainerPoint(percentToLatLng(xPct, startRow * GRID_CELL_SIZE));
        const p2 = map.latLngToContainerPoint(percentToLatLng(xPct, (endRow + 1) * GRID_CELL_SIZE));

        const isMajor = c % 5 === 0;
        if (isMajor) {
          ctx.strokeStyle = 'rgba(168, 124, 79, 0.45)';
          ctx.lineWidth = 1.2;
        } else {
          ctx.strokeStyle = zoom >= 2.5 ? 'rgba(168, 124, 79, 0.28)' : 'rgba(168, 124, 79, 0.14)';
          ctx.lineWidth = 0.8;
        }

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    // 3. Highlight ô đang rê chuột (Hover) hoặc vùng cọ vẽ (Brush)
    if (hoveredCell) {
      if (terrainEditMode) {
        // Vẽ viền phạm vi cọ vẽ (1x1, 3x3, 5x5)
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
      } else if (!placementMode) {
        // Chỉ highlight viền ô đơn lẻ khi rê chuột xem
        const { minX: hMinX, maxX: hMaxX, minY: hMinY, maxY: hMaxY } = cellToCoord(hoveredCell.col, hoveredCell.row);
        const pTL = map.latLngToContainerPoint(percentToLatLng(hMinX, hMinY));
        const pBR = map.latLngToContainerPoint(percentToLatLng(hMaxX, hMaxY));

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.strokeRect(pTL.x, pTL.y, pBR.x - pTL.x, pBR.y - pTL.y);
      }
    }
  };

  // 3. Lắng nghe sự kiện di chuyển và zoom của bản đồ để vẽ lại
  useEffect(() => {
    if (!map) return;

    const handleUpdate = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const size = map.getSize();
        if (canvas.width !== size.x || canvas.height !== size.y) {
          canvas.width = size.x;
          canvas.height = size.y;
        }
      }
      drawGrid();
    };

    map.on('move', handleUpdate);
    map.on('zoom', handleUpdate);
    map.on('resize', handleUpdate);

    handleUpdate();

    return () => {
      map.off('move', handleUpdate);
      map.off('zoom', handleUpdate);
      map.off('resize', handleUpdate);
    };
  }, [map, showGrid, showTerrainOverlay, terrainEditMode, brushTerrain, brushSize, placementMode, hoveredCell]);

  // 4. Lắng nghe rê chuột trên bản đồ để cập nhật hoveredCell và Sơn địa hình
  useEffect(() => {
    if (!map) return;

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      const { x, y } = latLngToPercent(e.latlng);
      const cell = coordToCell(x, y);

      setHoveredCell({ col: cell.col, row: cell.row });

      // Nếu đang trong chế độ Sơn Địa Hình và giữ chuột trái -> Sơn liên tục
      if (terrainEditMode && isMouseDownRef.current) {
        paintTerrainBrush(cell.col, cell.row, brushTerrain, brushSize);
        drawGrid();
      }
    };

    const handleMouseDown = (e: L.LeafletMouseEvent) => {
      if (e.originalEvent.button !== 0) return; // Chỉ nhận chuột trái
      isMouseDownRef.current = true;

      if (terrainEditMode) {
        const { x, y } = latLngToPercent(e.latlng);
        const cell = coordToCell(x, y);
        paintTerrainBrush(cell.col, cell.row, brushTerrain, brushSize);
        drawGrid();
      }
    };

    const handleMouseUp = () => {
      isMouseDownRef.current = false;
    };

    const handleMouseLeave = () => {
      isMouseDownRef.current = false;
      setHoveredCell(null);
    };

    map.on('mousemove', handleMouseMove);
    map.on('mousedown', handleMouseDown);
    map.on('mouseup', handleMouseUp);
    map.on('mouseout', handleMouseLeave);

    return () => {
      map.off('mousemove', handleMouseMove);
      map.off('mousedown', handleMouseDown);
      map.off('mouseup', handleMouseUp);
      map.off('mouseout', handleMouseLeave);
    };
  }, [map, terrainEditMode, brushTerrain, brushSize, setHoveredCell]);

  return null;
};
