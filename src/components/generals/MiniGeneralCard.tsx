import React, { useMemo } from 'react';
import type { General } from '../../types';
import { PLAQUE_OUTER_PATH, CarvedBronzeGrooveTextStyle } from './plaque/plaqueConstants';
import { calculateGeneralRating } from '../../utils/generalRating';

interface MiniGeneralCardProps {
  general: General;
  onClick?: () => void;
}

export const MiniGeneralCard: React.FC<MiniGeneralCardProps> = ({ general, onClick }) => {
  const rating = useMemo(() => calculateGeneralRating(general.stats), [general.stats]);
  const activeTier = rating.tier;

  // Xếp tên danh tướng theo chiều dọc (mỗi từ một hàng)
  const words = useMemo(() => general.name.toUpperCase().split(' '), [general.name]);

  // Tự động thu nhỏ font chữ cho các từ dài (ví dụ: TRỊNH, TRƯƠNG, NGUYỄN)
  const getWordStyle = (word: string) => {
    const len = word.length;
    if (len <= 3) {
      return { fontSize: '9.5px', letterSpacing: '0.04em' };
    }
    if (len === 4) {
      return { fontSize: '8.5px', letterSpacing: '0.02em' };
    }
    if (len === 5) {
      // Ví dụ: TRỊNH, TRIỆN, CHÍCH
      return { fontSize: '7.5px', letterSpacing: '0.01em' };
    }
    // Ví dụ: TRƯƠNG, NGUYỄN, NGUYÊN (>= 6 ký tự)
    return { fontSize: '6.6px', letterSpacing: '0em' };
  };

  return (
    <button
      onClick={onClick}
      type="button"
      className="group relative flex flex-col items-center justify-center w-full aspect-[200/320] transition-transform duration-200 cursor-pointer select-none hover:-translate-y-1 hover:scale-110 active:translate-y-0.5"
      title={`${general.name} • ${general.title}\nBấm để mở Lệnh Bài Danh Tướng`}
    >
      <svg
        viewBox="0 0 200 320"
        className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-[0_3px_6px_rgba(0,0,0,0.55)]"
      >
        <defs>
          {/* Nền mặt đồng cổ đúc chuẩn như thẻ lớn */}
          <linearGradient id={`miniSurface-${general.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a67c52" />
            <stop offset="28%" stopColor="#b88e62" />
            <stop offset="58%" stopColor="#8c6239" />
            <stop offset="82%" stopColor="#734d29" />
            <stop offset="100%" stopColor="#54361a" />
          </linearGradient>

          {/* Viền kim loại theo bậc sao tướng (chuẩn thẻ lớn) */}
          <linearGradient id={`miniRim-${general.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
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

          {/* Đốm rỉ đồng cổ */}
          <radialGradient id={`miniPatina-${general.id}`} cx="20%" cy="30%" r="45%">
            <stop offset="0%" stopColor="rgba(68, 115, 92, 0.22)" />
            <stop offset="100%" stopColor="rgba(68, 115, 92, 0)" />
          </radialGradient>
        </defs>

        {/* Thân thẻ đồng giữ chuẩn tỉ lệ 200:320 và đường biên khía góc của thẻ gốc, lược bỏ móc khóa và viền đen */}
        <path
          d={PLAQUE_OUTER_PATH}
          fill={`url(#miniSurface-${general.id})`}
          stroke={`url(#miniRim-${general.id})`}
          strokeWidth="3.6"
        />
        <path d={PLAQUE_OUTER_PATH} fill={`url(#miniPatina-${general.id})`} />
      </svg>

      {/* Tên danh tướng xếp theo chiều dọc khắc chìm chính giữa thẻ, tự co giãn khi chữ dài */}
      <div className="relative z-10 flex flex-col items-center justify-center px-0.5 py-2 select-none text-center w-full overflow-hidden">
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
                marginTop: wIdx > 0 ? (words.length >= 3 ? '1.5px' : '2.5px') : '0px',
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </button>
  );
};
