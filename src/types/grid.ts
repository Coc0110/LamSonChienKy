import type { TerrainType } from './terrain';

export interface GridCell {
  col: number;
  row: number;
  x: number; // Tọa độ tâm ô (%)
  y: number; // Tọa độ tâm ô (%)
  terrain: TerrainType;
}

export interface TerrainBrushConfig {
  terrain: TerrainType;
  size: 1 | 3 | 5; // Kích thước cọ vẽ (1x1, 3x3, 5x5)
}

export interface GridPathResult {
  found: boolean;
  path: [number, number][]; // Tọa độ [x, y] phần trăm
  cellPath: { col: number; row: number }[];
  totalCost: number;
  totalDistanceKm: number;
  terrainBreakdown: Record<TerrainType, number>; // % mỗi loại địa hình đi qua
}

export interface CellBuildValidation {
  canBuild: boolean;
  reason: string;
  terrain: TerrainType;
  snappedX: number;
  snappedY: number;
  col: number;
  row: number;
}
