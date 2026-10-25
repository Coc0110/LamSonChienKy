import React, { useMemo } from 'react';
import type { General } from '../../../types';
import { PlaqueFrameSVG } from './PlaqueFrameSVG';
import { PlaqueHangerRing } from './PlaqueHangerRing';
import {
  TROOP_SPECS,
  CarvedBronzeGrooveTextStyle,
  getStatNumberStyle,
} from './plaqueConstants';
import { calculateGeneralRating } from '../../../utils/generalRating';
import { useGameStore } from '../../../store/gameStore';

interface BronzePlaqueBackProps {
  general: General;
  selected: boolean;
  size: 'sm' | 'md' | 'lg';
  bodyHeight: string;
}

export const BronzePlaqueBack: React.FC<BronzePlaqueBackProps> = ({
  general,
  selected,
  size,
  bodyHeight,
}) => {
  const rating = useMemo(() => calculateGeneralRating(general.stats), [general.stats]);
  const horses = useGameStore(state => state.resources.horses);
  const elephants = useGameStore(state => state.resources.elephants);

  // Chỉ hiển thị binh chủng khi đã mở khóa trong game (chưa có ngựa/voi thì tạm ẩn trên thẻ)
  const availableTroops = useMemo(() => {
    return TROOP_SPECS.filter(troop => {
      if (!general.troops?.includes(troop.id)) return false;
      if (troop.id === 'cavalry' && horses <= 0) return false;
      if (troop.id === 'elephant' && elephants <= 0) return false;
      return true;
    });
  }, [general.troops, horses, elephants]);

  return (
    <div
      className="absolute inset-0 w-full flex flex-col items-center"
      style={{
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: 'rotateY(180deg) translateZ(3.5px)',
      }}
    >
      {/* 1. Khoen móc treo mặt sau */}
      <PlaqueHangerRing generalId={general.id} size={size} isBack />

      {/* 2. Thân thẻ bài mặt sau */}
      <div className={`relative w-full ${bodyHeight} flex flex-col items-center justify-between`}>
        <PlaqueFrameSVG idSuffix={`back-${general.id}`} selected={selected} starTier={rating.tier} />

        <div className="absolute top-[16%] bottom-[14%] inset-x-[11%] z-10 flex flex-col justify-around py-1 text-center pointer-events-none select-none">
          {/* 1. Ba dòng chỉ số */}
          <div className="w-full flex flex-col space-y-2 px-1">
            <div className="flex items-center justify-between">
              <span
                className="font-serif font-black uppercase tracking-[0.14em]"
                style={{
                  ...CarvedBronzeGrooveTextStyle,
                  fontSize: size === 'sm' ? '10px' : size === 'lg' ? '13px' : '11.5px',
                }}
              >
                THỐNG LĨNH
              </span>
              <span
                style={getStatNumberStyle(general.stats.command, size)}
                className="leading-none tracking-wider font-serif font-black"
              >
                {general.stats.command}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span
                className="font-serif font-black uppercase tracking-[0.14em]"
                style={{
                  ...CarvedBronzeGrooveTextStyle,
                  fontSize: size === 'sm' ? '10px' : size === 'lg' ? '13px' : '11.5px',
                }}
              >
                VÕ NGHỆ
              </span>
              <span
                style={getStatNumberStyle(general.stats.martial, size)}
                className="leading-none tracking-wider font-serif font-black"
              >
                {general.stats.martial}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span
                className="font-serif font-black uppercase tracking-[0.14em]"
                style={{
                  ...CarvedBronzeGrooveTextStyle,
                  fontSize: size === 'sm' ? '10px' : size === 'lg' ? '13px' : '11.5px',
                }}
              >
                MƯU LƯỢC
              </span>
              <span
                style={getStatNumberStyle(general.stats.intellect, size)}
                className="leading-none tracking-wider font-serif font-black"
              >
                {general.stats.intellect}
              </span>
            </div>
          </div>

          <div className="w-full h-[1.5px] bg-[#3a1d08] shadow-[0_1px_0_rgba(245,208,155,0.4)] my-1" />

          {/* 2. Binh chủng */}
          <div className="w-full flex items-center justify-center gap-4 py-1">
            {availableTroops.map(troop => (
              <div
                key={troop.id}
                title={`${troop.label} (Sở trường)`}
                className={`flex items-center justify-center ${
                  size === 'sm' ? 'w-5.5 h-5.5' : size === 'lg' ? 'w-9.5 h-9.5' : 'w-7.5 h-7.5'
                }`}
              >
                <img
                  src={troop.iconUrl}
                  alt={troop.label}
                  draggable={false}
                  className="w-full h-full object-contain select-none"
                  style={{
                    filter:
                      'drop-shadow(0 1.2px 0 rgba(245, 208, 155, 0.7)) drop-shadow(0 -1.2px 1.5px rgba(10, 3, 0, 0.95))',
                  }}
                />
              </div>
            ))}
          </div>

          <div className="w-full h-[1.5px] bg-[#3a1d08] shadow-[0_1px_0_rgba(245,208,155,0.4)] my-1" />

          {/* 3. Tên buff đặc kỹ */}
          <div className="w-full flex items-center justify-center py-2 px-1 overflow-hidden">
            <span
              className="font-serif font-black uppercase text-center whitespace-nowrap tracking-[0.14em]"
              style={{
                ...CarvedBronzeGrooveTextStyle,
                fontSize: size === 'sm' ? '9.5px' : size === 'lg' ? '13px' : '11.5px',
              }}
              title={general.buffName || 'CHIẾN CÔNG'}
            >
              {general.buffName || 'CHIẾN CÔNG'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
