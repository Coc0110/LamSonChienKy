import React, { useMemo } from 'react';
import { RotateCw } from 'lucide-react';
import type { General } from '../../../types';
import { PlaqueFrameSVG } from './PlaqueFrameSVG';
import { CarvedPlaqueStar } from './CarvedPlaqueStar';
import { PlaqueHangerRing } from './PlaqueHangerRing';
import {
  INNER_BORDER_CLIP_STYLE,
  EngravedTextStyle,
  CarvedBronzeGrooveTextStyle,
  GENERAL_PORTRAIT_CONFIG,
  GENERAL_NAME_CONFIG,
} from './plaqueConstants';
import { calculateGeneralRating } from '../../../utils/generalRating';

interface BronzePlaqueFrontProps {
  general: General;
  selected: boolean;
  flipped: boolean;
  size: 'sm' | 'md' | 'lg';
  bodyHeight: string;
}

export const BronzePlaqueFront: React.FC<BronzePlaqueFrontProps> = ({
  general,
  selected,
  flipped,
  size,
  bodyHeight,
}) => {
  const isLeLaiCard = general.id === 'le_lai';
  const isLeLoiCard = general.id === 'le_loi';
  const isModernBronzeCard = !!general.portraitUrl;
  const hanziChars = general.hanzi.split('');

  // Tự động liên kết chỉ số (trung bình & cao nhất) với số sao và bậc sao theo quy tắc mới
  const rating = useMemo(() => calculateGeneralRating(general.stats), [general.stats]);
  const activeTier = rating.tier;
  const layeredStars = rating.layeredStars;
  const starSize = size === 'sm' ? 11 : size === 'lg' ? 15 : 13;

  return (
    <div
      className="w-full flex flex-col items-center"
      style={{
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: 'translateZ(3.5px)',
      }}
    >
      {/* 1. Khoen móc treo */}
      <PlaqueHangerRing generalId={general.id} size={size} />

      {/* 2. Thân thẻ bài mặt trước */}
      <div className={`relative w-full ${bodyHeight} flex flex-col items-center justify-between`}>
        <PlaqueFrameSVG idSuffix={`front-${general.id}`} selected={selected} starTier={activeTier} />

        {isModernBronzeCard ? (
          <div className="relative z-10 w-full h-full pointer-events-none">
            {/* Hàng 5 Sao Đè Sao (Layered Stars) */}
            <div
              className="absolute top-[15.5%] inset-x-0 z-20 flex items-center justify-center gap-1"
              title={`${rating.stars} Sao (Bậc ${activeTier === 'red' ? 'Đỏ' : activeTier === 'gold' ? 'Vàng' : 'Bạc'} - AVG ${rating.avg})`}
            >
              {layeredStars.map((starType, idx) => (
                <CarvedPlaqueStar
                  key={idx}
                  size={starSize}
                  tier={starType}
                />
              ))}
            </div>

            {/* Chân dung tướng cắt theo viền trong */}
            <div
              className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
              style={INNER_BORDER_CLIP_STYLE}
            >
              {isLeLaiCard ? (
                <div
                  className="absolute inset-x-0 top-[20.5%] bottom-[11.9%] flex items-end justify-center"
                  style={{
                    transform: `translate(${GENERAL_PORTRAIT_CONFIG[general.id]?.x || '0px'}, ${GENERAL_PORTRAIT_CONFIG[general.id]?.y || '0px'}) scale(${GENERAL_PORTRAIT_CONFIG[general.id]?.scale ?? 1})`,
                    transformOrigin: 'bottom center',
                  }}
                >
                  <img
                    src={general.portraitUrl}
                    alt={general.name}
                    draggable={false}
                    className="w-full h-full object-contain object-bottom select-none px-1"
                    style={{
                      filter:
                        'drop-shadow(0 1px 0 rgba(245, 208, 155, 0.48)) drop-shadow(0 -1px 1px rgba(20, 9, 2, 0.85))',
                    }}
                  />
                </div>
              ) : (
                <img
                  src={general.portraitUrl}
                  alt={general.name}
                  draggable={false}
                  className="w-full h-full object-contain pt-12 pb-3 px-1 select-none"
                  style={{
                    transform: `translate(${GENERAL_PORTRAIT_CONFIG[general.id]?.x || '0px'}, ${GENERAL_PORTRAIT_CONFIG[general.id]?.y || '0px'}) scale(${GENERAL_PORTRAIT_CONFIG[general.id]?.scale ?? (isLeLoiCard ? 0.98 : 1)})`,
                    transformOrigin: 'center center',
                    filter:
                      'drop-shadow(0 1px 0 rgba(245, 208, 155, 0.48)) drop-shadow(0 -1px 1px rgba(20, 9, 2, 0.85))',
                  }}
                />
              )}
            </div>

            {/* Tên khắc chìm */}
            <div
              className="absolute z-20 flex flex-col items-center justify-center leading-none select-none"
              style={{
                ...CarvedBronzeGrooveTextStyle,
                top: GENERAL_NAME_CONFIG[general.id]?.top,
                bottom: GENERAL_NAME_CONFIG[general.id]?.bottom ?? (GENERAL_NAME_CONFIG[general.id]?.top ? undefined : '16%'),
                left: GENERAL_NAME_CONFIG[general.id]?.left,
                right: GENERAL_NAME_CONFIG[general.id]?.right ?? (GENERAL_NAME_CONFIG[general.id]?.left ? undefined : '14%'),
                transform: `translate(${GENERAL_NAME_CONFIG[general.id]?.x || '0px'}, ${GENERAL_NAME_CONFIG[general.id]?.y || '0px'})`,
              }}
            >
              {general.name.toUpperCase().split(' ').map((word, wIdx) => (
                <span
                  key={wIdx}
                  className="font-serif font-black uppercase tracking-[0.14em] mt-0.5 first:mt-0"
                  style={{
                    fontSize: isLeLaiCard || isLeLoiCard
                      ? (size === 'sm' ? '12px' : size === 'lg' ? '18px' : '15px')
                      : (size === 'sm' ? '11px' : size === 'lg' ? '16px' : '13px'),
                  }}
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        ) : (
          /* Mẫu thẻ chữ Hán dọc */
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-between pt-10 pb-8 px-5 text-center">
            <div
              className="w-full font-serif font-black tracking-[0.12em] uppercase leading-tight text-[#ebd0a7] shrink-0"
              style={{
                ...EngravedTextStyle,
                fontSize: size === 'sm' ? '8.5px' : size === 'lg' ? '12px' : '10px',
              }}
            >
              {general.title}
            </div>

            <div className="my-auto flex flex-col items-center justify-center gap-0.5 py-1">
              {hanziChars.map((char, idx) => (
                <span
                  key={idx}
                  className="font-serif font-bold leading-none text-[#d9b584] select-none"
                  style={{
                    fontSize:
                      size === 'sm'
                        ? hanziChars.length > 2
                          ? '22px'
                          : '28px'
                        : size === 'lg'
                        ? hanziChars.length > 2
                          ? '36px'
                          : '46px'
                        : hanziChars.length > 2
                        ? '26px'
                        : '34px',
                    textShadow:
                      '0 1px 0 rgba(255,238,205,0.55), 0 -1px 2px rgba(20,10,2,0.95), 2px 3px 5px rgba(0,0,0,0.8)',
                  }}
                >
                  {char}
                </span>
              ))}
            </div>

            <div className="w-full flex flex-col items-center border-t border-[#4a3016]/85 pt-1.5 shrink-0">
              <div
                className="font-serif font-black tracking-wider text-[#f5dec0] uppercase leading-tight"
                style={{
                  ...EngravedTextStyle,
                  fontSize: size === 'sm' ? '11px' : size === 'lg' ? '15px' : '13px',
                }}
              >
                {general.name}
              </div>

              {/* Dãy sao đè sao cho thẻ chữ Hán */}
              <div
                className="flex items-center justify-center gap-1 mt-1"
                title={`${rating.stars} Sao (Bậc ${activeTier === 'red' ? 'Đỏ' : activeTier === 'gold' ? 'Vàng' : 'Bạc'})`}
              >
                {layeredStars.map((starType, idx) => (
                  <CarvedPlaqueStar
                    key={idx}
                    size={starSize}
                    tier={starType}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Nhãn gợi ý lật thẻ */}
        {selected && !flipped && size !== 'sm' && (
          <div className="absolute -bottom-3 z-30 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#241407]/95 border border-[#e3b574] text-[#fce3b8] text-[9.5px] font-serif font-bold shadow-md pointer-events-none whitespace-nowrap">
            <RotateCw size={10} />
            <span>Nhấp lần nữa để lật</span>
          </div>
        )}
      </div>
    </div>
  );
};
