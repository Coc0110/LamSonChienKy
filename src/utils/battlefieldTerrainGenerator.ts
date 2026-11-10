import type { TerrainType } from '../types/terrain';
import type { 
  BattlefieldGrid, 
  BattlefieldScaleLevel, 
  BattlefieldTile 
} from '../types/battlefield';
import { getGridTerrain, GRID_COLS, GRID_ROWS } from '../data/terrainGrid';

export const BATTLEFIELD_COLS = 96;
export const BATTLEFIELD_ROWS = 32;

export const ZONE_LAM_SON_MAX_COL = 31;
export const ZONE_NEUTRAL_MAX_COL = 63;

export function determineScaleFromTroops(lamSonTroops: number, mingTroops: number): BattlefieldScaleLevel {
  const maxTroops = Math.max(lamSonTroops, mingTroops);
  if (maxTroops > 25000) return '100x';
  if (maxTroops > 3000) return '10x';
  return '1x';
}

interface ScaleConfig {
  sampleCols: number;
  sampleRows: number;
  subCols: number;
  subRows: number;
}

const SCALE_CONFIGS: Record<BattlefieldScaleLevel, ScaleConfig> = {
  '1x': { sampleCols: 12, sampleRows: 4, subCols: 8, subRows: 8 },
  '10x': { sampleCols: 24, sampleRows: 8, subCols: 4, subRows: 4 },
  '100x': { sampleCols: 48, sampleRows: 16, subCols: 2, subRows: 2 },
};

export function generateBattlefieldTerrain(
  centerCol: number,
  centerRow: number,
  scale: BattlefieldScaleLevel
): BattlefieldGrid {
  const cfg = SCALE_CONFIGS[scale];
  
  // Tính toán cửa sổ mẫu trên bản đồ thế giới (kẹp an toàn trong phạm vi bản đồ)
  const halfSampleCols = Math.floor(cfg.sampleCols / 2);
  const halfSampleRows = Math.floor(cfg.sampleRows / 2);
  
  const startCol = Math.max(0, Math.min(GRID_COLS - cfg.sampleCols, centerCol - halfSampleCols));
  const startRow = Math.max(0, Math.min(GRID_ROWS - cfg.sampleRows, centerRow - halfSampleRows));

  // Khởi tạo ma trận 32 hàng x 96 cột
  const tiles: BattlefieldTile[][] = [];

  for (let r = 0; r < BATTLEFIELD_ROWS; r++) {
    const rowTiles: BattlefieldTile[] = [];
    const mapR = startRow + Math.min(cfg.sampleRows - 1, Math.floor(r / cfg.subRows));
    
    for (let c = 0; c < BATTLEFIELD_COLS; c++) {
      const mapC = startCol + Math.min(cfg.sampleCols - 1, Math.floor(c / cfg.subCols));
            
      const rawTerrain: TerrainType = getGridTerrain(mapC, mapR);

      // Phân vùng chiến trường
      let zone: BattlefieldTile['zone'] = 'neutral';
      if (c <= ZONE_LAM_SON_MAX_COL) zone = 'lam_son';
      else if (c > ZONE_NEUTRAL_MAX_COL) zone = 'ming';

      // Tính toán thuộc tính chi tiết theo địa hình và hẻm núi (chokepoints)
      let isPassable = true;
      let speedCost = 1.0;
      let defenseBonus = 0.0;
      let elevation = 0;
      let coverType: BattlefieldTile['coverType'] = 'none';

      switch (rawTerrain) {
        case 'mountain':
        case 'cliff': {
          elevation = 1;
          defenseBonus = 0.35;
          speedCost = 1.8;
          // Chỉ chặn mép ngoài cùng trên/dưới để tạo lòng thung lũng, bên trong mở đường cho quân đi
          if (r <= 2 || r >= 29) {
            isPassable = false;
          } else if (c >= 45 && c <= 55 && (r % 5 === 0)) {
            // Vài tảng đá hiểm trở tạo khe hẹp thắt cổ chai
            isPassable = false;
          }
          break;
        }

        case 'swamp': {
          speedCost = 2.4; // Làm chậm kỵ binh & bộ binh nặng
          defenseBonus = -0.15; // Khó phòng thủ trong bùn lầy
          coverType = 'light';
          break;
        }

        case 'forest': {
          speedCost = 1.4;
          defenseBonus = 0.25; // Che chắn cung nỏ
          coverType = 'dense'; // Phục kích ẩn thân
          break;
        }

        case 'water': {
          // Nước: Tạo nhiều ghềnh nước nông, cầu cạn hoặc bến lội để hai bên qua lại giao chiến
          // Các hàng chẵn hoặc vùng bến lội (r % 3 !== 0) cho phép lội nước với tốc độ chậm
          if (r % 3 !== 0 || (c >= 40 && c <= 55)) {
            isPassable = true;
            speedCost = 2.2;
          } else {
            // Vùng nước sâu chặn đường
            isPassable = false;
          }
          break;
        }

        case 'plains':
        default: {
          speedCost = 1.0;
          defenseBonus = 0.0;
          break;
        }
      }

      // Đảm bảo doanh trại 2 bên (c < 32 và c > 63) luôn thông thoáng tuyệt đối
      if ((c <= 31 || c >= 64) && !isPassable) {
        if (r > 2 && r < 29) {
          isPassable = true;
        }
      }

      rowTiles.push({
        col: c,
        row: r,
        terrain: rawTerrain,
        isPassable,
        speedCost,
        defenseBonus,
        elevation,
        coverType,
        zone,
      });
    }
    tiles.push(rowTiles);
  }

  return {
    cols: BATTLEFIELD_COLS,
    rows: BATTLEFIELD_ROWS,
    tiles,
    scale,
    centerMapCol: centerCol,
    centerMapRow: centerRow,
    sampleWindow: {
      startCol,
      startRow,
      sampleCols: cfg.sampleCols,
      sampleRows: cfg.sampleRows,
    },
  };
}
