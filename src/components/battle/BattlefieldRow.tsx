import React from 'react';
import type { BattlefieldTile } from '../../types/battlefield';

interface BattlefieldRowProps {
  rowIndex: number;
  tiles: BattlefieldTile[];
  cellSize: number;
}

const TERRAIN_BG_MAP: Record<string, string> = {
  plains: 'bg-[#e5d6b7] border-[#d8c39d]',
  forest: 'bg-[#557538] border-[#425d2b]',
  mountain: 'bg-[#7a6550] border-[#614e3c]',
  cliff: 'bg-[#4a3a2d] border-[#382b20]',
  swamp: 'bg-[#706440] border-[#574c2e]',
  water: 'bg-[#407a9c] border-[#2e5e7a]',
};

export const BattlefieldRow: React.FC<BattlefieldRowProps> = React.memo(({
  rowIndex: _rowIndex,
  tiles,
  cellSize,
}) => {
  return (
    <div 
      className="flex flex-row pointer-events-none select-none"
      style={{ height: `${cellSize}px` }}
    >
      {tiles.map((tile) => {
        const bgClass = !tile.isPassable 
          ? 'bg-[#3b2d23] border-[#2b2018]' 
          : TERRAIN_BG_MAP[tile.terrain] || 'bg-[#e5d6b7] border-[#d8c39d]';

        return (
          <div
            key={tile.col}
            className={`relative border-[0.5px] shrink-0 pointer-events-none transition-none flex items-center justify-center ${bgClass}`}
            style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
          >
            {/* Phân định ranh giới 3 khu vực bằng đường vạch mờ */}
            {tile.col === 31 && (
              <div className="absolute right-0 top-0 bottom-0 w-[1.5px] bg-[#15803d]/60 z-10 pointer-events-none" />
            )}
            {tile.col === 63 && (
              <div className="absolute right-0 top-0 bottom-0 w-[1.5px] bg-[#8c2d19]/60 z-10 pointer-events-none" />
            )}
          </div>
        );
      })}
    </div>
  );
});

BattlefieldRow.displayName = 'BattlefieldRow';
