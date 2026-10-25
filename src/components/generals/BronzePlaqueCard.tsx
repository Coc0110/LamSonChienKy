import React, { useMemo } from 'react';
import type { CityNode, General } from '../../types';
import { BronzePlaqueFront } from './plaque/BronzePlaqueFront';
import { BronzePlaqueBack } from './plaque/BronzePlaqueBack';
import { BronzePlaque3DThickness } from './plaque/BronzePlaque3DThickness';
import { calculateGeneralRating } from '../../utils/generalRating';

export interface BronzePlaqueCardProps {
  general: General;
  selected?: boolean;
  flipped?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  cities?: CityNode[];
  onAssignCity?: (cityId: string) => void;
}

export const BronzePlaqueCard: React.FC<BronzePlaqueCardProps> = ({
  general,
  selected = false,
  flipped = false,
  onClick,
  size = 'md',
}) => {
  // Tự động phân bậc và sao dựa trên chỉ số tướng theo quy tắc mới:
  // - >= 1 sao đỏ => Viền Đỏ
  // - 0 đỏ và AVG >= 80 => Viền Vàng
  // - Còn lại => Viền Trắng
  const rating = useMemo(() => calculateGeneralRating(general.stats), [general.stats]);
  const activeTier = rating.tier;

  // Giữ đúng tỷ lệ chuẩn của thẻ (không bị biến dạng khi chọn hoặc lật)
  const cardWidth = size === 'sm' ? 'w-32' : size === 'lg' ? 'w-52' : 'w-44';
  const bodyHeight = size === 'sm' ? 'h-52' : size === 'lg' ? 'h-84' : 'h-70';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      style={{ perspective: '1200px' }}
      className={`group relative flex flex-col items-center select-none transition-transform duration-300 cursor-pointer ${cardWidth} ${
        selected ? 'scale-105 z-20' : 'hover:-translate-y-1.5 z-10'
      }`}
      title={
        selected && !flipped
          ? `Nhấp thêm lần nữa để lật mặt sau thẻ ${general.name}`
          : `${general.name} (${general.title} - ${rating.stars}* ${activeTier === 'red' ? 'Đỏ' : activeTier === 'gold' ? 'Vàng' : 'Bạc'})`
      }
    >
      {/* Wrapper xoay 3D 180 độ khi lật thẻ */}
      <div
        className="relative w-full flex flex-col items-center"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: 'transform 0.72s cubic-bezier(0.35, 0, 0.25, 1)',
        }}
      >
        {/* Lõi độ dày 3D vật lý của thẻ đồng */}
        <BronzePlaque3DThickness size={size} bodyHeight={bodyHeight} />

        {/* Mặt trước */}
        <BronzePlaqueFront
          general={general}
          selected={selected}
          flipped={flipped}
          size={size}
          bodyHeight={bodyHeight}
        />

        {/* Mặt sau */}
        <BronzePlaqueBack
          general={general}
          selected={selected}
          size={size}
          bodyHeight={bodyHeight}
        />
      </div>

      {/* Đổ bóng 3D mặt sàn khi lật thẻ, phản chiếu ánh sáng theo bậc sao khi chọn */}
      <div
        className="w-3/4 h-2.5 mt-1 rounded-[100%] blur-[5px] pointer-events-none transition-all duration-700 ease-out"
        style={{
          transform: flipped ? 'scaleX(0.88) scaleY(1.15)' : 'scaleX(1) scaleY(1)',
          background: selected
            ? activeTier === 'red'
              ? 'radial-gradient(ellipse at center, rgba(239,68,68,0.7) 0%, rgba(0,0,0,0.8) 70%)'
              : activeTier === 'silver'
              ? 'radial-gradient(ellipse at center, rgba(240,248,255,0.7) 0%, rgba(0,0,0,0.8) 70%)'
              : 'radial-gradient(ellipse at center, rgba(245,158,11,0.7) 0%, rgba(0,0,0,0.8) 70%)'
            : 'rgba(0, 0, 0, 0.6)',
          opacity: selected ? 0.85 : 0.5,
        }}
      />
    </div>
  );
};
