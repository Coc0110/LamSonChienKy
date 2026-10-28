import React from 'react';
import { TERRAIN_DEFINITIONS } from '../../../data/terrainData';
import { getGridTerrain, cellToCoord } from '../../../data/terrainGrid';
import type { TerrainType } from '../../../types/terrain';

const TERRAIN_ICONS: Record<TerrainType, string> = {
  plains: '🌾',
  forest: '🌲',
  mountain: '⛰️',
  cliff: '🧗',
  swamp: '💧',
  water: '🌊',
};

interface TerrainInspectHUDProps {
  showGrid: boolean;
  hoveredCell: { col: number; row: number } | null;
  placementMode: any;
  isEditMode: boolean;
}

export const TerrainInspectHUD: React.FC<TerrainInspectHUDProps> = React.memo(({
  showGrid,
  hoveredCell,
  placementMode,
  isEditMode,
}) => {
  if (!showGrid || !hoveredCell || placementMode || isEditMode) {
    return null;
  }

  const terrainType = getGridTerrain(hoveredCell.col, hoveredCell.row);
  const terrain = TERRAIN_DEFINITIONS[terrainType];
  const { centerX, centerY } = cellToCoord(hoveredCell.col, hoveredCell.row);

  const speedText = terrainType === 'water' ? 'Không thể qua (sông nước)'
    : terrainType === 'cliff' ? 'Vách đá (-80% tốc độ)'
    : terrainType === 'swamp' ? 'Đầm lầy (-65% tốc độ)'
    : terrainType === 'mountain' ? 'Núi cao (-55% tốc độ)'
    : terrainType === 'forest' ? 'Rừng già (-30% tốc độ)'
    : 'Đồng bằng (100% tốc độ)';

  const tacticalText = terrainType === 'forest' ? '🌲 Phục kích & ẩn nấp: +40%'
    : terrainType === 'mountain' ? '⛰️ Phòng thủ & chốt chặn: +50%'
    : terrainType === 'swamp' ? '💧 Bẫy sa lầy kỵ binh: +35%'
    : terrainType === 'cliff' ? '🧗 Hẻm núi hiểm trở'
    : terrainType === 'plains' ? '🌾 Đất màu mỡ mở đồn điền'
    : '🌊 Dòng nước sông Mã tự nhiên';

  return (
    <div className="absolute bottom-6 left-6 z-30 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="px-3 py-2 rounded-lg bg-[#14120e]/95 border border-[#8a724d]/60 shadow-[0_8px_20px_rgba(0,0,0,0.8)] backdrop-blur-sm text-stone-200 font-sans text-xs min-w-[240px]">
        <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-[#524430]/60">
          <span className="font-serif font-bold text-[#f7e6c4] flex items-center gap-1.5">
            <span className="text-base">{TERRAIN_ICONS[terrainType]}</span>
            {terrain.name}
          </span>
          <span className="font-mono text-[10px] text-amber-300/80 bg-black/40 px-1.5 py-0.5 rounded">
            Ô [{hoveredCell.col}, {hoveredCell.row}] • {centerX.toFixed(1)}%, {centerY.toFixed(1)}%
          </span>
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex items-center justify-between text-stone-300">
            <span className="text-stone-400">Hành quân:</span>
            <span className="font-medium text-amber-200">{speedText}</span>
          </div>
          <div className="text-[11px] text-emerald-400/90 font-medium">
            {tacticalText}
          </div>
          <div className="pt-1 flex gap-2 text-[10px] text-stone-400 border-t border-stone-800/60">
            <span>Ruộng: {terrainType === 'plains' ? '🟢 Khả dụng' : '🔴 Cấm'}</span>
            <span>Lò rèn: {terrainType !== 'water' && terrainType !== 'cliff' ? '🟢 Khả dụng' : '🔴 Cấm'}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

TerrainInspectHUD.displayName = 'TerrainInspectHUD';
