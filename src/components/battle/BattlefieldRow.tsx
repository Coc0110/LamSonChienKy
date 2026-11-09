import React from 'react';
import type { BattlefieldTile, BattlefieldUnit } from '../../types/battlefield';

interface BattlefieldRowProps {
  rowIndex: number;
  tiles: BattlefieldTile[];
  rowUnits: BattlefieldUnit[];
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
  rowUnits,
  cellSize,
}) => {
  // Tạo map nhanh các unit tại hàng này theo col
  const unitByCol = new Map<number, BattlefieldUnit>();
  rowUnits.forEach(u => {
    if (u.status !== 'eliminated') {
      unitByCol.set(u.col, u);
    }
  });

  return (
    <div 
      className="flex flex-row pointer-events-none select-none"
      style={{ height: `${cellSize}px` }}
    >
      {tiles.map((tile) => {
        const unit = unitByCol.get(tile.col);
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

            {/* Hiển thị quân cờ nếu có */}
            {unit && (
              <div
                className={`w-[85%] h-[85%] rounded-[2px] flex items-center justify-center font-serif font-black text-[9px] shadow-sm select-none pointer-events-none z-20 ${
                  unit.faction === 'lam_son'
                    ? 'bg-[#15803d] text-amber-100 ring-1 ring-emerald-300'
                    : 'bg-[#8c2d19] text-amber-100 ring-1 ring-red-400'
                }`}
              >
                {unit.unitTypeId === 'general' ? '★' :
                 unit.unitTypeId === 'archer' ? 'C' :
                 unit.unitTypeId === 'spearman' ? 'G' :
                 unit.unitTypeId === 'cavalry' ? 'K' :
                 unit.unitTypeId === 'supply_cart' ? 'L' : 'Đ'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

BattlefieldRow.displayName = 'BattlefieldRow';
