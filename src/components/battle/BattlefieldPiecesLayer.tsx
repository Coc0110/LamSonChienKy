import React from 'react';
import type { BattlefieldUnit } from '../../types/battlefield';
import { BattlefieldPiece } from './BattlefieldPiece';

interface BattlefieldPiecesLayerProps {
  units: BattlefieldUnit[];
  cellSize: number;
  currentTurn?: number;
  viewMode?: '2.5d' | '2d';
}

export const BattlefieldPiecesLayer: React.FC<BattlefieldPiecesLayerProps> = React.memo(({
  units,
  cellSize,
  currentTurn,
  viewMode = '2.5d',
}) => {
  // Lọc các đơn vị còn sống HOẶC vừa mới bị tiêu diệt trong lượt hiện tại để hiển thị hiệu ứng tử trận
  const visibleUnits = units.filter(
    u => u.status !== 'eliminated' || (u.eliminatedAtTurn && currentTurn !== undefined && u.eliminatedAtTurn === currentTurn)
  );

  return (
    <div 
      className="absolute inset-0 pointer-events-none z-20"
      style={{ transformStyle: 'preserve-3d' }}
    >
      {visibleUnits.map(unit => (
        <BattlefieldPiece
          key={unit.id}
          unit={unit}
          cellSize={cellSize}
          viewMode={viewMode}
        />
      ))}
    </div>
  );
});

BattlefieldPiecesLayer.displayName = 'BattlefieldPiecesLayer';
