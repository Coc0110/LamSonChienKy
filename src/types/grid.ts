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

export interface CellBuildValidation {
  canBuild: boolean;
  reason: string;
  terrain: TerrainType;
  snappedX: number;
  snappedY: number;
  col: number;
  row: number;
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
  gridSize: number;
}
