import React, { useState, useMemo } from 'react';
import type { General } from '../../types';
import { 
  PLAQUE_OUTER_PATH, 
  CarvedBronzeGrooveTextStyle, 
  TROOP_SPECS 
} from '../generals/plaque/plaqueConstants';
import { calculateGeneralRating } from '../../utils/generalRating';

interface TacticalGeneralPlaqueProps {
  general: General;
  isAssigned: boolean;
  gridCoordinate?: { row: number; col: number } | null;
  onRecall?: () => void;
}

export const TacticalGeneralPlaque: React.FC<TacticalGeneralPlaqueProps> = React.memo(({
  general,
  isAssigned,
  gridCoordinate,
  onRecall,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const rating = useMemo(() => calculateGeneralRating(general.stats), [general.stats]);
  const activeTier = rating.tier;

  // Xếp tên danh tướng theo chiều dọc (mỗi từ một hàng)
  const words = useMemo(() => general.name.toUpperCase().split(' '), [general.name]);

  const getWordStyle = (word: string) => {
    const len = word.length;
    if (len <= 3) return { fontSize: '9px', letterSpacing: '0.04em' };
    if (len === 4) return { fontSize: '8px', letterSpacing: '0.02em' };
    if (len === 5) return { fontSize: '7px', letterSpacing: '0.01em' };
    return { fontSize: '6.2px', letterSpacing: '0em' };
  };

  // Tra cứu danh sách icon binh chủng mà tướng thông thạo
  const generalTroopSpecs = useMemo(() => {
    const troops = general.troops || [];
    return troops.map(tId => {
      const found = TROOP_SPECS.find(s => s.id === tId);
      return found || {
        id: tId,
        label: tId,
        iconUrl: '/troops/infantry.png',
      };
    });
  }, [general.troops]);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', general.id);
    e.dataTransfer.setData('generalId', general.id);
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  return (
    <div className="flex flex-col items-center select-none w-full group">
      
      {/* THẺ BÀI DANH TƯỚNG KÍCH CỠ NHỎ NHƯ CĂN CỨ (ASPECT 200/320) & CÓ THỂ LẬT 3D */}
      <div 
        className="relative w-full aspect-[200/320] cursor-grab active:cursor-grabbing transition-transform duration-150 hover:scale-105"
        style={{ perspective: '800px' }}
        draggable={true}
        onDragStart={handleDragStart}
        onClick={() => setIsFlipped(prev => !prev)}
        title={`${general.name} (${general.title})\n• Kéo thả vào ô trên Sa Bàn\n• Nhấp chuột để lật mặt xem icon Binh Chủng`}
      >
        <div 
          className="relative w-full h-full transition-transform duration-500 rounded-xs"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* ============================================================ */}
          {/* MẶT TRƯỚC: THẺ BÀI CHỈ TÊN ĐÚNG CHUẨN THÔNG TIN CĂN CỨ */}
          {/* ============================================================ */}
          <div 
            className="absolute inset-0 w-full h-full flex flex-col items-center justify-center"
            style={{ 
              backfaceVisibility: 'hidden', 
              WebkitBackfaceVisibility: 'hidden' 
            }}
          >
            <svg
              viewBox="0 0 200 320"
              className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.55)]"
            >
              <defs>
                <linearGradient id={`tacSurface-${general.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a67c52" />
                  <stop offset="28%" stopColor="#b88e62" />
                  <stop offset="58%" stopColor="#8c6239" />
                  <stop offset="82%" stopColor="#734d29" />
                  <stop offset="100%" stopColor="#54361a" />
                </linearGradient>

                <linearGradient id={`tacRim-${general.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  {activeTier === 'red' ? (
                    <>
                      <stop offset="0%" stopColor="#fecaca" />
                      <stop offset="35%" stopColor="#ef4444" />
                      <stop offset="70%" stopColor="#7f1d1d" />
                      <stop offset="100%" stopColor="#dc2626" />
                    </>
                  ) : activeTier === 'gold' ? (
                    <>
                      <stop offset="0%" stopColor="#fef08a" />
                      <stop offset="35%" stopColor="#f59e0b" />
                      <stop offset="70%" stopColor="#92400e" />
                      <stop offset="100%" stopColor="#fbbf24" />
                    </>
                  ) : (
                    <>
                      <stop offset="0%" stopColor="#deb887" />
                      <stop offset="35%" stopColor="#9c7246" />
                      <stop offset="70%" stopColor="#593b1d" />
                      <stop offset="100%" stopColor="#b88e5d" />
                    </>
                  )}
                </linearGradient>

                <radialGradient id={`tacPatina-${general.id}`} cx="20%" cy="30%" r="45%">
                  <stop offset="0%" stopColor="rgba(68, 115, 92, 0.22)" />
                  <stop offset="100%" stopColor="rgba(68, 115, 92, 0)" />
                </radialGradient>
              </defs>

              <path
                d={PLAQUE_OUTER_PATH}
                fill={`url(#tacSurface-${general.id})`}
                stroke={`url(#tacRim-${general.id})`}
                strokeWidth="3.6"
              />
              <path d={PLAQUE_OUTER_PATH} fill={`url(#tacPatina-${general.id})`} />
            </svg>

            {/* Tên danh tướng khắc chìm chính giữa thẻ */}
            <div className="relative z-10 flex flex-col items-center justify-center px-0.5 py-1 text-center w-full overflow-hidden">
              {words.map((word, wIdx) => {
                const { fontSize, letterSpacing } = getWordStyle(word);
                return (
                  <span
                    key={wIdx}
                    className="font-serif font-black uppercase leading-tight whitespace-nowrap"
                    style={{
                      ...CarvedBronzeGrooveTextStyle,
                      fontSize,
                      letterSpacing,
                      marginTop: wIdx > 0 ? (words.length >= 3 ? '1.5px' : '2px') : '0px',
                    }}
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          </div>

          {/* ============================================================ */}
          {/* MẶT SAU: CHỈ HIỂN THỊ CÁC ICON BINH CHỦNG, KHÔNG THÊM GÌ KHÁC */}
          {/* ============================================================ */}
          <div 
            className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-1"
            style={{ 
              backfaceVisibility: 'hidden', 
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)' 
            }}
          >
            <svg
              viewBox="0 0 200 320"
              className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.55)]"
            >
              <path
                d={PLAQUE_OUTER_PATH}
                fill={`url(#tacSurface-${general.id})`}
                stroke={`url(#tacRim-${general.id})`}
                strokeWidth="3.6"
              />
              <path d={PLAQUE_OUTER_PATH} fill={`url(#tacPatina-${general.id})`} />
            </svg>

            {/* CHỈ HIỂN THỊ CÁC ICON BINH CHỦNG THÔNG THẠO */}
            <div className="relative z-10 w-full h-full flex items-center justify-center p-1">
              <div className="flex flex-col items-center justify-center gap-1.5 max-w-[80%]">
                {generalTroopSpecs.map((spec, sIdx) => (
                  <img 
                    key={sIdx}
                    src={spec.iconUrl} 
                    alt={spec.label} 
                    title={spec.label}
                    className="w-4 h-4 object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]" 
                  />
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* DƯỚI THẺ: VỊ TRÍ NẾU ĐÃ BỐ TRÍ HOẶC NÚT RÚT */}
      {gridCoordinate ? (
        <div className="mt-0.5 flex items-center justify-between w-full px-0.5">
          <span className="text-[7.5px] font-mono font-bold text-amber-950 bg-amber-200/90 px-1 py-0.2 rounded truncate">
            {gridCoordinate.row + 1}-{gridCoordinate.col + 1}
          </span>
          {onRecall && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRecall();
              }}
              className="text-[7.5px] font-serif text-red-700 hover:text-red-900 cursor-pointer ml-1"
              title="Gỡ tướng khỏi ô"
            >
              ✕
            </button>
          )}
        </div>
      ) : isAssigned ? (
        <div className="mt-0.5 flex items-center justify-between w-full px-0.5">
          <span className="text-[7px] font-serif text-emerald-800 bg-emerald-100 px-1 rounded">
            Đã Cử
          </span>
          {onRecall && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRecall();
              }}
              className="text-[7.5px] font-serif text-red-700 hover:text-red-900 cursor-pointer ml-1"
              title="Rút tướng về căn cứ"
            >
              ✕
            </button>
          )}
        </div>
      ) : null}

    </div>
  );
});

TacticalGeneralPlaque.displayName = 'TacticalGeneralPlaque';
