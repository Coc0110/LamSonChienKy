import React from 'react';
import type { BattlefieldUnit } from '../../types/battlefield';

interface BattlefieldPieceProps {
  unit: BattlefieldUnit;
  cellSize: number;
  viewMode?: '2.5d' | '2d';
}

export const BattlefieldPiece: React.FC<BattlefieldPieceProps> = React.memo(({
  unit,
  cellSize,
  viewMode = '2.5d',
}) => {
  const isLamSon = unit.faction === 'lam_son';
  const soldiers = unit.soldiersCount;

  const isEliminated = unit.status === 'eliminated';
  const isFighting = unit.status === 'fighting';
  const hasDamage = unit.hp < unit.maxHp && !isEliminated;
  const hpRatio = Math.max(0, Math.min(1, unit.hp / unit.maxHp));

  // Phân tầng quân cờ theo thực lực binh số:
  const isTier100 = soldiers >= 80;
  const isTier10 = !isTier100 && soldiers >= 8;

  // Icon minh họa và Ký tự cổ phong theo binh chủng
  const unitMeta = unit.unitTypeId === 'general' ? { icon: '👑', code: '★', name: 'Tướng', crownColor: 'border-yellow-300 bg-yellow-950 text-yellow-200' } :
                   unit.unitTypeId === 'archer' ? { icon: '🏹', code: 'C', name: 'Cung', crownColor: 'border-amber-400 bg-amber-950 text-amber-200' } :
                   unit.unitTypeId === 'spearman' ? { icon: '🔱', code: 'G', name: 'Giáo', crownColor: 'border-orange-400 bg-orange-950 text-orange-200' } :
                   unit.unitTypeId === 'cavalry' ? { icon: '🐎', code: 'K', name: 'Kỵ', crownColor: 'border-cyan-400 bg-cyan-950 text-cyan-200' } :
                   unit.unitTypeId === 'elephant' ? { icon: '🐘', code: 'T', name: 'Tượng', crownColor: 'border-stone-400 bg-stone-900 text-stone-200' } :
                   unit.unitTypeId === 'supply_cart' ? { icon: '🛒', code: 'L', name: 'Lương', crownColor: 'border-yellow-600 bg-amber-950 text-yellow-200' } :
                   { icon: '⚔️', code: 'Đ', name: 'Đao', crownColor: 'border-slate-300 bg-slate-900 text-slate-100' };

  // Chiều sâu hiển thị (Depth Sorting theo hàng Y):
  // Hàng phía dưới (gần người chơi hơn) có z-index cao hơn hàng phía trên
  const depthZIndex = unit.row * 2 + (isFighting ? 1 : 0) + (isTier100 ? 1 : 0);

  if (viewMode === '2.5d') {
    // 2.5D CÂN ĐỐI TỶ LỆ (Proportional 2.5D Token):
    // Đa ô: Voi/Xe lương (2x2), Kỵ binh (2x1) chiếm trọn diện tích sa bàn
    const spanCols = unit.spanCols || 1;
    const spanRows = unit.spanRows || 1;
    const baseW = spanCols > 1 ? spanCols * cellSize - 2 : (isTier100 ? 18 : isTier10 ? 15.5 : 13.5);
    const baseH = spanRows > 1 ? spanRows * cellSize + 6 : (isTier100 ? 23 : isTier10 ? 19.5 : 17);

    const tokenWidth = baseW;
    const tokenHeight = baseH;

    const anchorLeft = unit.col * cellSize + (spanCols * cellSize - tokenWidth) / 2;
    const anchorTop = unit.row * cellSize + spanRows * cellSize - tokenHeight;

    return (
      <div
        className="absolute pointer-events-none select-none"
        style={{
          left: `${anchorLeft}px`,
          top: `${anchorTop}px`,
          width: `${tokenWidth}px`,
          height: `${tokenHeight}px`,
          zIndex: depthZIndex,
          transition: 'left 0.28s cubic-bezier(0.2, 0.8, 0.4, 1), top 0.28s cubic-bezier(0.2, 0.8, 0.4, 1), transform 0.2s ease-out, opacity 0.45s ease-out',
          willChange: 'left, top, transform',
          transformOrigin: 'bottom center',
          transform: isEliminated 
            ? 'rotateX(0deg) translateY(4px) scale(0.6) opacity(0)'
            : 'rotateX(-32deg) translateY(-1px)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Bóng đổ chân đế trên mặt sa bàn */}
        <div 
          className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3.5 h-1 bg-black/40 rounded-full blur-[0.4px] pointer-events-none" 
          style={{ transform: 'rotateX(32deg)' }}
        />

        {/* THÂN THẺ QUÂN ĐỨNG THẲNG */}
        <div
          className={`relative w-full h-full flex flex-col items-center justify-between rounded-t-sm rounded-b-[1.5px] border shadow-[0_2.5px_5px_rgba(0,0,0,0.55)] ${
            isFighting ? 'animate-pulse ring-1.5 ring-red-400' : ''
          } ${
            isEliminated
              ? 'bg-stone-900 border-red-950 text-red-600'
              : isLamSon
              ? isTier100
                ? 'bg-gradient-to-b from-emerald-600 via-emerald-800 to-emerald-950 border-amber-300 text-amber-100 ring-1 ring-yellow-400'
                : isTier10
                ? 'bg-gradient-to-b from-emerald-700 to-emerald-900 border-amber-400 text-amber-100'
                : 'bg-gradient-to-b from-emerald-800 to-emerald-950 border-emerald-400 text-emerald-100'
              : isTier100
                ? 'bg-gradient-to-b from-red-600 via-red-800 to-red-950 border-amber-300 text-amber-100 ring-1 ring-yellow-400'
                : isTier10
                ? 'bg-gradient-to-b from-red-700 to-red-900 border-red-400 text-amber-100'
                : 'bg-gradient-to-b from-red-800 to-red-950 border-red-500 text-red-100'
          }`}
        >
          {/* Huy hiệu Cấp độ Thập Đội / Bách Doanh */}
          {isTier100 && (
            <span className="absolute -top-1.5 -right-1 px-0.5 py-0 text-[5.5px] font-black rounded bg-yellow-400 text-stone-950 leading-none shadow border border-yellow-700 z-30">
              ¹⁰⁰
            </span>
          )}
          {isTier10 && (
            <span className="absolute -top-1.5 -right-1 px-0.5 py-0 text-[5px] font-black rounded-full bg-amber-400 text-stone-950 leading-none shadow border border-amber-600 z-30">
              ¹⁰
            </span>
          )}

          {/* Biểu tượng Giao Tranh Đột Kích */}
          {isFighting && !isEliminated && (
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[8px] animate-bounce pointer-events-none select-none z-30 drop-shadow">
              ⚔️
            </span>
          )}

          {/* ĐỈNH THẺ (TOP CROWN): ICON BINH CHỦNG NẰM TRÊN CÙNG - KHÔNG BAO GIỜ BỊ CHE KHUẤT */}
          <div className="w-full flex items-center justify-center pt-0.5 leading-none">
            <span className={tokenHeight >= 22 ? 'text-[10px]' : tokenHeight >= 19 ? 'text-[9px]' : 'text-[8px]'}>
              {isEliminated ? '†' : unitMeta.icon}
            </span>
          </div>

          {/* CHÂN THẺ: KÝ TỰ VIẾT TẮT CỔ PHONG */}
          <span className="text-[6.5px] font-black leading-none pb-0.5 text-amber-200">
            {isEliminated ? '' : unitMeta.code}
          </span>

          {/* Thanh Vi Huyết Lực dưới chân thẻ */}
          {hasDamage && (
            <div className="w-[85%] h-[1.5px] bg-black/80 rounded-full overflow-hidden border border-black/60 pointer-events-none mb-0.5">
              <div 
                className={`h-full transition-all duration-200 ${
                  hpRatio > 0.5 ? 'bg-emerald-400' : hpRatio > 0.2 ? 'bg-amber-400' : 'bg-red-500'
                }`}
                style={{ width: `${Math.round(hpRatio * 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Chế độ 2D Phẳng truyền thống
  const spanCols = unit.spanCols || 1;
  const spanRows = unit.spanRows || 1;
  const isMulti = spanCols > 1 || spanRows > 1;

  const pieceW = isMulti ? spanCols * cellSize - 2 : (isTier100 ? 17 : isTier10 ? 14.5 : 10.5);
  const pieceH = isMulti ? spanRows * cellSize - 2 : (isTier100 ? 17 : isTier10 ? 14.5 : 10.5);
  const offsetW = (spanCols * cellSize - pieceW) / 2;
  const offsetH = (spanRows * cellSize - pieceH) / 2;

  const left = unit.col * cellSize + offsetW;
  const top = unit.row * cellSize + offsetH;

  return (
    <div
      className={`absolute flex items-center justify-center font-serif font-black select-none pointer-events-none ${
        isEliminated
          ? 'opacity-0 scale-50 -rotate-45 z-10 transition-all duration-700 ease-out'
          : isFighting
          ? 'scale-105 z-28 ring-2 ring-red-500 shadow-[0_0_8px_rgba(239,68,68,0.85)]'
          : isMulti
          ? 'rounded-[4px] z-26 shadow-[0_3px_6px_rgba(0,0,0,0.85)] ring-2 ring-amber-400 border border-amber-600'
          : isTier100
          ? 'rounded-[3px] z-25 shadow-[0_3px_6px_rgba(0,0,0,0.85)] ring-2 ring-amber-300 border border-yellow-600'
          : isTier10
          ? 'rounded-full z-22 shadow-[0_2.5px_4.5px_rgba(0,0,0,0.7)] ring-1.5 ring-amber-400 border border-amber-700'
          : 'rounded-full z-20 shadow-[0_1.5px_3px_rgba(0,0,0,0.55)] border border-black/25'
      } ${
        isEliminated
          ? 'bg-red-950 text-red-500'
          : isLamSon
          ? isTier100
            ? 'bg-gradient-to-b from-emerald-600 to-emerald-950 text-amber-200'
            : isTier10
            ? 'bg-gradient-to-b from-emerald-600 to-emerald-900 text-amber-100'
            : 'bg-[#15803d] text-amber-100 ring-1 ring-emerald-400/50'
          : isTier100
            ? 'bg-gradient-to-b from-red-600 to-red-950 text-amber-200'
            : isTier10
            ? 'bg-gradient-to-b from-red-600 to-red-900 text-amber-100'
            : 'bg-[#8c2d19] text-amber-100 ring-1 ring-red-400/50'
      }`}
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${pieceW}px`,
        height: `${pieceH}px`,
        fontSize: isMulti ? '11px' : isTier100 ? '10px' : isTier10 ? '9px' : '7.5px',
        zIndex: depthZIndex,
        transition: 'left 0.28s cubic-bezier(0.2, 0.8, 0.4, 1), top 0.28s cubic-bezier(0.2, 0.8, 0.4, 1), transform 0.2s ease-out, opacity 0.45s ease-out',
        willChange: 'left, top, transform',
      }}
    >
      <span>{isEliminated ? '†' : unitMeta.code}</span>

      {isFighting && !isEliminated && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] animate-bounce pointer-events-none select-none z-30 drop-shadow">
          ⚔️
        </span>
      )}

      {hasDamage && (
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-[12px] h-[2px] bg-black/80 rounded-full overflow-hidden border border-black/60 pointer-events-none z-25">
          <div 
            className={`h-full transition-all duration-200 ${
              hpRatio > 0.5 ? 'bg-emerald-400' : hpRatio > 0.2 ? 'bg-amber-400' : 'bg-red-500'
            }`}
            style={{ width: `${Math.round(hpRatio * 100)}%` }}
          />
        </div>
      )}

      {isTier10 && !isEliminated && (
        <span className="absolute -top-1 -right-1 px-[2px] py-0 text-[6px] font-black rounded-full bg-amber-400 text-stone-950 leading-none shadow-xs border border-amber-600">
          ¹⁰
        </span>
      )}

      {isTier100 && !isEliminated && (
        <span className="absolute -top-1.5 -right-1.5 px-[2px] py-0 text-[6.5px] font-black rounded bg-yellow-400 text-stone-950 leading-none shadow-xs border border-yellow-700">
          ¹⁰⁰
        </span>
      )}
    </div>
  );
});

BattlefieldPiece.displayName = 'BattlefieldPiece';
