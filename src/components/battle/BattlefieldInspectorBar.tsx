import React from 'react';
import type { BattlefieldTile, BattlefieldUnit } from '../../types/battlefield';

interface BattlefieldInspectorBarProps {
  hoveredTile: BattlefieldTile | null;
  hoveredUnit: BattlefieldUnit | null;
}

export const BattlefieldInspectorBar: React.FC<BattlefieldInspectorBarProps> = ({
  hoveredTile,
  hoveredUnit,
}) => {
  if (!hoveredTile) {
    return (
      <div className="h-10 px-4 flex items-center justify-between text-xs font-serif text-[#704d2e] bg-[#fbf6ea] border-t border-[#8c6b44]/30 select-none">
        <span>Rê chuột lên chiến trường 96×32 để do thám địa hình và quân cờ đối phương.</span>
        <span className="text-[11px] text-[#8c6b44]">Phân khu: Cánh Tả (Lam Sơn) | Trung Lộ (Hiểm Địa) | Cánh Hữu (Quân Minh)</span>
      </div>
    );
  }

  const terrainName = 
    hoveredTile.terrain === 'mountain' || hoveredTile.terrain === 'cliff' ? 'Núi Đá / Vách Dốc' :
    hoveredTile.terrain === 'swamp' ? 'Đầm Lầy / Sình Nước' :
    hoveredTile.terrain === 'forest' ? 'Rừng Rậm / Bụi Cây' :
    hoveredTile.terrain === 'water' ? 'Thủy Vực / Nước Sâu' : 'Đồng Bằng / Đất Cứng';

  const zoneText = 
    hoveredTile.zone === 'lam_son' ? 'Căn Cứ Lam Sơn' :
    hoveredTile.zone === 'ming' ? 'Doanh Trại Quân Minh' : 'Chiến Trường Giằng Co';

  return (
    <div className="h-11 px-4 flex items-center justify-between text-xs font-serif text-[#261304] bg-[#fbf6ea] border-t border-[#8c6b44]/30 select-none">
      <div className="flex items-center gap-3">
        <span className="font-bold text-[#8c2d19]">
          Ô ({hoveredTile.col}, {hoveredTile.row}) • {zoneText}
        </span>
        <span className="text-stone-600">
          Địa hình: <strong className="text-[#261304]">{terrainName}</strong>
        </span>
        {hoveredTile.defenseBonus !== 0 && (
          <span className={hoveredTile.defenseBonus > 0 ? 'text-[#15803d]' : 'text-[#8c2d19]'}>
            Thủ: {hoveredTile.defenseBonus > 0 ? `+${Math.round(hoveredTile.defenseBonus * 100)}%` : `${Math.round(hoveredTile.defenseBonus * 100)}%`}
          </span>
        )}
        {hoveredTile.speedCost > 1.0 && (
          <span className="text-[#b45309]">
            Tốc độ: -{Math.round((1 - 1 / hoveredTile.speedCost) * 100)}%
          </span>
        )}
        {hoveredTile.elevation > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-amber-200/60 text-[#78350f] text-[10px] font-bold">
            Cao Điểm (+Tầm xa)
          </span>
        )}
        {!hoveredTile.isPassable && (
          <span className="px-1.5 py-0.5 rounded bg-red-200 text-red-800 text-[10px] font-bold">
            Bất Khả Vượt Qua
          </span>
        )}
      </div>

      {hoveredUnit ? (
        <div className="flex items-center gap-2.5">
          <span className="font-bold px-2 py-0.5 rounded text-[11px] uppercase tracking-wider text-white"
            style={{ backgroundColor: hoveredUnit.faction === 'lam_son' ? '#15803d' : '#8c2d19' }}>
            {hoveredUnit.faction === 'lam_son' ? 'Nghĩa Quân' : 'Quân Minh'}: {hoveredUnit.unitTypeId}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border border-[#8c6b44]/40 bg-[#f5ecda] text-[#704d2e]">
            {hoveredUnit.soldiersCount >= 80 ? 'Bách Doanh (×100)' : hoveredUnit.soldiersCount >= 8 ? 'Thập Đội (×10)' : 'Đơn Binh (×1)'}
          </span>
          <span className="text-xs">
            Binh lực: <strong className="text-[#8c2d19]">{hoveredUnit.soldiersCount}</strong>/{hoveredUnit.maxSoldiersCount} người
          </span>
          <span className="text-xs">
            Khí huyết: <strong className="text-[#15803d]">{hoveredUnit.hp}</strong>/{hoveredUnit.maxHp} HP
          </span>
          <span className="text-xs">
            Sĩ khí: <strong>{hoveredUnit.morale}%</strong>
          </span>
          {hoveredUnit.generalName && (
            <span className="text-[#b45309] font-bold text-xs">
              [{hoveredUnit.generalName}]
            </span>
          )}
        </div>
      ) : (
        <span className="text-stone-500 text-[11px] italic">Ô trống</span>
      )}
    </div>
  );
};
