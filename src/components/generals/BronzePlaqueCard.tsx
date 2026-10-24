import React from 'react';
import { RotateCw } from 'lucide-react';
import type { CityNode, General, StarTier } from '../../types';

interface BronzePlaqueCardProps {
  general: General;
  selected?: boolean;
  flipped?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  cities?: CityNode[];
  onAssignCity?: (cityId: string) => void;
}

const STAR_TIER_STYLES: Record<
  StarTier,
  {
    fill: string;
    stroke: string;
    glow: string;
    label: string;
  }
> = {
  silver: {
    fill: '#e2e8f0',
    stroke: '#475569',
    glow: 'drop-shadow(0 1px 1px rgba(0,0,0,0.9)) drop-shadow(0 0 3px rgba(226,232,240,0.4))',
    label: 'Bậc Bạc',
  },
  gold: {
    fill: '#fbbf24',
    stroke: '#78350f',
    glow: 'drop-shadow(0 1px 1px rgba(0,0,0,0.95)) drop-shadow(0 0 4px rgba(251,191,36,0.5))',
    label: 'Bậc Vàng',
  },
  red: {
    fill: '#dc2626',
    stroke: '#fbbf24',
    glow: 'drop-shadow(0 1px 2px rgba(0,0,0,0.95)) drop-shadow(0 0 5px rgba(220,38,38,0.75))',
    label: 'Bậc Đỏ',
  },
};

const PLAQUE_OUTER_PATH = `
  M 68 6
  L 132 6
  L 132 16
  L 152 16
  L 152 28
  L 168 28
  L 192 52
  L 192 268
  L 168 292
  L 152 292
  L 152 302
  L 132 302
  L 132 314
  L 68 314
  L 68 302
  L 48 302
  L 48 292
  L 32 292
  L 8 268
  L 8 52
  L 32 28
  L 48 28
  L 48 16
  L 68 16
  Z
`;

/* =========================================================================
   1. NGÔI SAO ĐÚC NỔI VÁT CẠNH 3D TRÊN MẶT ĐỒNG (Bronze Chiseled Star)
   ========================================================================= */
const CarvedPlaqueStar: React.FC<{ size: number; tier: StarTier }> = ({ size, tier }) => {
  const facetLight = tier === 'red' ? '#c45b3e' : tier === 'gold' ? '#d6a156' : '#c4ab89';
  const facetDark = tier === 'red' ? '#4a180b' : tier === 'gold' ? '#523110' : '#422c18';
  const socketFill = '#1b0b03';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="overflow-visible select-none"
      style={{
        filter:
          'drop-shadow(0 1.2px 0 rgba(245, 208, 155, 0.6)) drop-shadow(0 -1px 1px rgba(15, 6, 0, 0.95))',
      }}
    >
      {/* Hõm sao khắc chìm sâu vào phôi thẻ đồng */}
      <polygon
        points="12 1.4 15.3 8.1 22.6 9.2 17.3 14.3 18.6 21.6 12 18.1 5.4 21.6 6.7 14.3 1.4 9.2 8.7 8.1"
        fill={socketFill}
        stroke="#2b1306"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* 10 mặt vát 3D bên trong ngôi sao */}
      <polygon points="12,12 12,2.5 8.9,8.3" fill={facetDark} />
      <polygon points="12,12 15.1,8.3 12,2.5" fill={facetLight} />
      <polygon points="12,12 15.1,8.3 21.5,9.3" fill={facetDark} />
      <polygon points="12,12 21.5,9.3 16.8,14.0" fill={facetLight} />
      <polygon points="12,12 16.8,14.0 17.9,20.5" fill={facetLight} />
      <polygon points="12,12 17.9,20.5 12,17.4" fill={facetDark} />
      <polygon points="12,12 12,17.4 6.1,20.5" fill={facetLight} />
      <polygon points="12,12 6.1,20.5 7.2,14.0" fill={facetDark} />
      <polygon points="12,12 7.2,14.0 2.5,9.3" fill={facetDark} />
      <polygon points="12,12 2.5,9.3 8.9,8.3" fill={facetLight} />

      <path
        d="M12 2.5 L12 17.4 M2.5 9.3 L16.8 14.0 M21.5 9.3 L7.2 14.0 M6.1 20.5 L15.1 8.3 M17.9 20.5 L8.9 8.3"
        stroke="rgba(18, 7, 2, 0.65)"
        strokeWidth="0.6"
      />
    </svg>
  );
};

/* =========================================================================
   2. KHUNG THẺ ĐỒNG CỔ (Bronze Plaque)
   ========================================================================= */
const PlaqueFrameSVG: React.FC<{ idSuffix: string; selected: boolean }> = ({ idSuffix, selected }) => (
  <svg
    viewBox="0 0 200 320"
    className={`absolute inset-0 w-full h-full pointer-events-none transition-all duration-300 ${
      selected
        ? 'drop-shadow-[0_0_18px_rgba(245,158,11,0.8)]'
        : 'drop-shadow-[0_8px_14px_rgba(0,0,0,0.75)]'
    }`}
  >
    <defs>
      <linearGradient id={`plaqueSurface-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a67c52" />
        <stop offset="28%" stopColor="#b88e62" />
        <stop offset="58%" stopColor="#8c6239" />
        <stop offset="82%" stopColor="#734d29" />
        <stop offset="100%" stopColor="#54361a" />
      </linearGradient>

      <linearGradient id={`plaqueRim-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#deb887" />
        <stop offset="35%" stopColor="#9c7246" />
        <stop offset="70%" stopColor="#593b1d" />
        <stop offset="100%" stopColor="#b88e5d" />
      </linearGradient>

      <radialGradient id={`patinaSpot1-${idSuffix}`} cx="18%" cy="28%" r="45%">
        <stop offset="0%" stopColor="rgba(68, 115, 92, 0.24)" />
        <stop offset="100%" stopColor="rgba(68, 115, 92, 0)" />
      </radialGradient>
      <radialGradient id={`patinaSpot2-${idSuffix}`} cx="85%" cy="75%" r="40%">
        <stop offset="0%" stopColor="rgba(52, 95, 78, 0.22)" />
        <stop offset="100%" stopColor="rgba(52, 95, 78, 0)" />
      </radialGradient>
    </defs>

    <path
      d={PLAQUE_OUTER_PATH}
      fill={`url(#plaqueSurface-${idSuffix})`}
      stroke={`url(#plaqueRim-${idSuffix})`}
      strokeWidth={selected ? '5' : '3.5'}
    />
    <path d={PLAQUE_OUTER_PATH} fill={`url(#patinaSpot1-${idSuffix})`} />
    <path d={PLAQUE_OUTER_PATH} fill={`url(#patinaSpot2-${idSuffix})`} />

    <path
      d="M 38 38 L 68 38 L 100 44 L 132 38 L 162 38 L 180 56 L 180 264 L 162 282 L 38 282 L 20 264 L 20 56 Z"
      fill="none"
      stroke="#4a3016"
      strokeWidth="2.2"
    />
    <path
      d="M 39 39 L 68 39 L 100 45 L 132 39 L 161 39 L 179 57 L 179 263 L 161 281 L 39 281 L 21 263 L 21 57 Z"
      fill="none"
      stroke="#c79f6d"
      strokeWidth="1"
      strokeOpacity="0.65"
    />

    <path
      d="M 54 27 L 54 20 L 66 20 L 66 25 L 60 25 M 146 27 L 146 20 L 134 20 L 134 25 L 140 25"
      stroke="#d4ae7d"
      strokeWidth="2"
      fill="none"
      opacity="0.8"
    />
    <path
      d="M 100 10 C 109 10, 114 18, 114 25 C 114 32, 105 37, 100 41 C 95 37, 86 32, 86 25 C 86 18, 91 10, 100 10 Z"
      fill="#9e7447"
      stroke="#d6b07f"
      strokeWidth="1.5"
    />
    <path
      d="M 74 286 L 74 307 L 92 307 L 92 293 L 82 293 L 82 300 M 126 286 L 126 307 L 108 307 L 108 293 L 118 293 L 118 300"
      stroke="#d4ae7d"
      strokeWidth="2.2"
      fill="none"
      opacity="0.8"
    />
    <line x1="100" y1="283" x2="100" y2="311" stroke="#472d14" strokeWidth="2.5" />
  </svg>
);

const EngravedTextStyle: React.CSSProperties = {
  textShadow:
    '0 1px 0 rgba(255,235,200,0.42), 0 -1px 1px rgba(20,10,0,0.92), 1px 2px 3px rgba(0,0,0,0.75)',
};

const CarvedBronzeGrooveTextStyle: React.CSSProperties = {
  color: '#201004',
  textShadow:
    '0 1.2px 0 rgba(245, 208, 155, 0.7), 1px 1px 0 rgba(230, 188, 132, 0.5), 0 -1px 1px rgba(12, 4, 0, 0.9)',
};

// Ranh giới đường viền trong vát 4 góc để cắt bỏ phần hình ảnh tràn ra ngoài
const INNER_BORDER_CLIP_STYLE: React.CSSProperties = {
  clipPath:
    'polygon(19% 11.88%, 34% 11.88%, 50% 13.75%, 66% 11.88%, 81% 11.88%, 90% 17.5%, 90% 82.5%, 81% 88.13%, 19% 88.13%, 10% 82.5%, 10% 17.5%)',
};

export const BronzePlaqueCard: React.FC<BronzePlaqueCardProps> = ({
  general,
  selected = false,
  flipped = false,
  onClick,
  size = 'md',
}) => {
  const isLeLaiCard = general.id === 'le_lai';
  const isLeLoiCard = general.id === 'le_loi';
  const isModernBronzeCard = isLeLaiCard || isLeLoiCard;
  const hanziChars = general.hanzi.split('');
  const starTierStyle = STAR_TIER_STYLES[general.starTier || 'silver'];
  const starCount = general.stars || 5;

  // Giữ đúng tỷ lệ chuẩn của thẻ (không bị biến dạng khi chọn hoặc lật)
  const cardWidth = size === 'sm' ? 'w-32' : size === 'lg' ? 'w-52' : 'w-44';
  const bodyHeight = size === 'sm' ? 'h-52' : size === 'lg' ? 'h-84' : 'h-70';
  const starSize = size === 'sm' ? 11 : size === 'lg' ? 15 : 13;

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
          : `${general.name} (${general.title})`
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
        {/* ============================================================
            LÕI ĐỘ DÀY 3D VẬT LÝ CỦA THẺ ĐỒNG (3D Bronze Plaque Thickness Core)
            - Nằm giữa mặt trước (+3.5px) và mặt sau (-3.5px), tạo khối đồng đúc dày ~7px
            - Gồm các lát đồng nguyên khối xếp tầng & 2 cạnh bên vát ánh kim
           ============================================================ */}
        <div
          className="absolute inset-0 w-full flex flex-col items-center pointer-events-none select-none"
          style={{ transformStyle: 'preserve-3d' }}
          aria-hidden="true"
        >
          {/* Khoảng bù cho khoen móc phía trên */}
          <div className="relative z-20 flex flex-col items-center -mb-2.5 pointer-events-none opacity-0">
            <svg
              width={size === 'lg' ? 52 : 42}
              height={size === 'lg' ? 36 : 30}
              viewBox="0 0 60 44"
            />
          </div>

          {/* Thân phôi đồng dày 3D */}
          <div
            className={`relative w-full ${bodyHeight}`}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Các lát đồng silhouette đa tầng lấp đầy thể tích bên trong */}
            {[-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map(z => (
              <svg
                key={z}
                viewBox="0 0 200 320"
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{
                  transform: `translateZ(${z}px)`,
                }}
              >
                <path
                  d={PLAQUE_OUTER_PATH}
                  fill="#231206"
                  stroke="#573315"
                  strokeWidth="3.5"
                />
              </svg>
            ))}

            {/* Cạnh viền đồng bên TRÁI (Left 3D Extruded Flank) */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: '16.25%',
                height: '67.5%',
                left: 'calc(4% - 3.5px)',
                width: '7px',
                transform: 'rotateY(-90deg)',
                transformOrigin: 'center center',
                background:
                  'linear-gradient(to bottom, #4d2b10 0%, #7d5228 15%, #42240b 35%, #8f6539 50%, #42240b 70%, #7d5228 85%, #381d08 100%)',
                boxShadow:
                  'inset 0 0 1px rgba(255, 220, 160, 0.5), inset 0 0 3px rgba(0, 0, 0, 0.9)',
                borderTop: '1px solid #7d5228',
                borderBottom: '1px solid #381d08',
              }}
            />

            {/* Cạnh viền đồng bên PHẢI (Right 3D Extruded Flank) */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: '16.25%',
                height: '67.5%',
                left: 'calc(96% - 3.5px)',
                width: '7px',
                transform: 'rotateY(90deg)',
                transformOrigin: 'center center',
                background:
                  'linear-gradient(to bottom, #4d2b10 0%, #7d5228 15%, #42240b 35%, #8f6539 50%, #42240b 70%, #7d5228 85%, #381d08 100%)',
                boxShadow:
                  'inset 0 0 1px rgba(255, 220, 160, 0.5), inset 0 0 3px rgba(0, 0, 0, 0.9)',
                borderTop: '1px solid #7d5228',
                borderBottom: '1px solid #381d08',
              }}
            />
          </div>
        </div>

        {/* ============================================================
            MẶT TRƯỚC (FRONT FACE)
           ============================================================ */}
        <div
          className="w-full flex flex-col items-center"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'translateZ(3.5px)',
          }}
        >
          {/* 1. KHOEN MÓC TREO PHÍA TRÊN */}
          <div className="relative z-20 flex flex-col items-center -mb-2.5 pointer-events-none">
            <svg
              width={size === 'lg' ? 52 : 42}
              height={size === 'lg' ? 36 : 30}
              viewBox="0 0 60 44"
              fill="none"
              className="drop-shadow-[0_3px_4px_rgba(0,0,0,0.75)] transition-transform duration-300 group-hover:rotate-3"
            >
              <ellipse
                cx="33"
                cy="15"
                rx="15"
                ry="11"
                transform="rotate(-18 33 15)"
                stroke={`url(#ringFront-${general.id})`}
                strokeWidth="3.5"
                fill="none"
              />
              <path
                d="M24 22 C22 28, 26 35, 30 37 C34 35, 36 28, 33 23"
                stroke={`url(#ringFront-${general.id})`}
                strokeWidth="3.2"
                strokeLinecap="round"
                fill="none"
              />
              <circle
                cx="30"
                cy="38"
                r="5.5"
                fill="#6e4f32"
                stroke="#b58d5e"
                strokeWidth="2"
              />
              <circle cx="30" cy="38" r="2.2" fill="#170b04" />
              <defs>
                <linearGradient
                  id={`ringFront-${general.id}`}
                  x1="15"
                  y1="2"
                  x2="48"
                  y2="38"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#d4b483" />
                  <stop offset="45%" stopColor="#8a653e" />
                  <stop offset="85%" stopColor="#4a331d" />
                  <stop offset="100%" stopColor="#b08b5e" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* 2. THÂN THẺ BÀI MẶT TRƯỚC */}
          <div className={`relative w-full ${bodyHeight} flex flex-col items-center justify-between`}>
            <PlaqueFrameSVG idSuffix={`front-${general.id}`} selected={selected} />

            {isModernBronzeCard ? (
              /* ============================================================
                  MẪU THẺ ĐỒNG HIỆN ĐẠI (Áp dụng cho Lê Lai & Lê Lợi):
                  - Bỏ danh hiệu ở mặt trước
                  - 5 Sao đúc nổi/khắc chìm ở phía trên
                  - Hình ảnh nhân vật chiếm toàn bộ mặt thẻ trước, cắt theo viền trong
                  - Tên khắc chìm vào khoảng trống phù hợp
                 ============================================================ */
              <div className="relative z-10 w-full h-full pointer-events-none">
                {/* 1. Dãy 5 Sao khắc chìm ở phía trên (xích xuống vừa khéo không đè lên viền) */}
                <div
                  className="absolute top-[15.5%] inset-x-0 z-20 flex items-center justify-center gap-1"
                  title={`${starCount} Sao (${starTierStyle.label})`}
                >
                  {Array.from({ length: starCount }).map((_, idx) => (
                    <CarvedPlaqueStar
                      key={idx}
                      size={size === 'sm' ? 11 : size === 'lg' ? 15 : 13}
                      tier={general.starTier || 'red'}
                    />
                  ))}
                </div>

                {/* 2. Hình ảnh nhân vật cắt theo đường viền đen trong ranh giới thẻ */}
                <div
                  className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
                  style={INNER_BORDER_CLIP_STYLE}
                >
                  {isLeLaiCard ? (
                    /* Lê Lai: cố định chiều cao từ dưới hàng sao (top-[20.5%]) xuống đường viền dưới (bottom-[11.9%]), mũi thương cắm chuẩn tại viền đáy */
                    <div className="absolute inset-x-0 top-[20.5%] bottom-[11.9%] flex items-end justify-center">
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
                    /* Lê Lợi: cân đối trong lòng thẻ */
                    <img
                      src={general.portraitUrl}
                      alt={general.name}
                      draggable={false}
                      className="w-full h-full object-contain pt-12 pb-3 px-1 select-none scale-[0.98]"
                      style={{
                        filter:
                          'drop-shadow(0 1px 0 rgba(245, 208, 155, 0.48)) drop-shadow(0 -1px 1px rgba(20, 9, 2, 0.85))',
                      }}
                    />
                  )}
                </div>

                {/* 3. Tên vị tướng khắc chìm vào khoảng trống không bị hình lấn vào */}
                {isLeLaiCard ? (
                  /* Lê Lai: khoảng trống ở góc dưới-phải ngay cạnh chân ông */
                  <div
                    className="absolute right-[14%] bottom-[17%] z-20 flex flex-col items-center justify-center leading-none select-none"
                    style={CarvedBronzeGrooveTextStyle}
                  >
                    <span
                      className="font-serif font-black uppercase tracking-[0.14em]"
                      style={{
                        fontSize: size === 'sm' ? '12px' : size === 'lg' ? '18px' : '15px',
                      }}
                    >
                      LÊ
                    </span>
                    <span
                      className="font-serif font-black uppercase tracking-[0.14em] mt-0.5"
                      style={{
                        fontSize: size === 'sm' ? '12px' : size === 'lg' ? '18px' : '15px',
                      }}
                    >
                      LAI
                    </span>
                  </div>
                ) : (
                  /* Lê Lợi: đưa sang phía bên trái nằm ngay dưới thanh kiếm */
                  <div
                    className="absolute left-[13%] top-[30%] z-20 flex flex-col items-center justify-center leading-none select-none"
                    style={CarvedBronzeGrooveTextStyle}
                  >
                    <span
                      className="font-serif font-black uppercase tracking-[0.14em]"
                      style={{
                        fontSize: size === 'sm' ? '12px' : size === 'lg' ? '18px' : '15px',
                      }}
                    >
                      LÊ
                    </span>
                    <span
                      className="font-serif font-black uppercase tracking-[0.14em] mt-0.5"
                      style={{
                        fontSize: size === 'sm' ? '12px' : size === 'lg' ? '18px' : '15px',
                      }}
                    >
                      LỢI
                    </span>
                  </div>
                )}
              </div>
            ) : (
              /* ============================================================
                  CÁC THẺ CÒN LẠI (Chữ Hán dọc, giữ nguyên để tiết kiệm token)
                 ============================================================ */
              <div className="relative z-10 w-full h-full flex flex-col items-center justify-between pt-10 pb-8 px-5 text-center">
                {/* Tước hiệu phía trên */}
                <div
                  className="w-full font-serif font-black tracking-[0.12em] uppercase leading-tight text-[#ebd0a7] shrink-0"
                  style={{
                    ...EngravedTextStyle,
                    fontSize: size === 'sm' ? '8.5px' : size === 'lg' ? '12px' : '10px',
                  }}
                >
                  {general.title}
                </div>

                {/* Chữ Hán ở giữa */}
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

                {/* Tên vị tướng & Hàng 5 Sao */}
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

                  <div
                    className="flex items-center justify-center gap-0.5 mt-1"
                    title={`${starCount} Sao (${starTierStyle.label})`}
                  >
                    {Array.from({ length: starCount }).map((_, idx) => (
                      <svg
                        key={idx}
                        width={starSize}
                        height={starSize}
                        viewBox="0 0 24 24"
                        style={{ filter: starTierStyle.glow }}
                      >
                        <polygon
                          points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                          fill={starTierStyle.fill}
                          stroke={starTierStyle.stroke}
                          strokeWidth="1.6"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Nhãn gợi ý bấm lần nữa để lật thẻ khi đang được chọn */}
            {selected && !flipped && size !== 'sm' && (
              <div className="absolute -bottom-3 z-30 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#241407]/95 border border-[#e3b574] text-[#fce3b8] text-[9.5px] font-serif font-bold shadow-md pointer-events-none whitespace-nowrap">
                <RotateCw size={10} />
                <span>Nhấp lần nữa để lật</span>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================
            MẶT SAU (BACK FACE): Khắc chìm tinh gọn trực tiếp trên lưng thẻ
           ============================================================ */}
        <div
          className="absolute inset-0 w-full flex flex-col items-center"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg) translateZ(3.5px)',
          }}
        >
          {/* 1. KHOEN MÓC TREO PHÍA TRÊN (Mặt sau đối xứng) */}
          <div className="relative z-20 flex flex-col items-center -mb-2.5 pointer-events-none">
            <svg
              width={size === 'lg' ? 52 : 42}
              height={size === 'lg' ? 36 : 30}
              viewBox="0 0 60 44"
              fill="none"
              className="drop-shadow-[0_3px_4px_rgba(0,0,0,0.75)]"
            >
              <ellipse
                cx="27"
                cy="15"
                rx="15"
                ry="11"
                transform="rotate(18 27 15)"
                stroke={`url(#ringBack-${general.id})`}
                strokeWidth="3.5"
                fill="none"
              />
              <path
                d="M36 22 C38 28, 34 35, 30 37 C26 35, 24 28, 27 23"
                stroke={`url(#ringBack-${general.id})`}
                strokeWidth="3.2"
                strokeLinecap="round"
                fill="none"
              />
              <circle
                cx="30"
                cy="38"
                r="5.5"
                fill="#6e4f32"
                stroke="#b58d5e"
                strokeWidth="2"
              />
              <circle cx="30" cy="38" r="2.2" fill="#170b04" />
              <defs>
                <linearGradient
                  id={`ringBack-${general.id}`}
                  x1="15"
                  y1="2"
                  x2="48"
                  y2="38"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#d4b483" />
                  <stop offset="45%" stopColor="#8a653e" />
                  <stop offset="85%" stopColor="#4a331d" />
                  <stop offset="100%" stopColor="#b08b5e" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* 2. THÂN THẺ BÀI MẶT SAU */}
          <div className={`relative w-full ${bodyHeight} flex flex-col items-center justify-between`}>
            <PlaqueFrameSVG idSuffix={`back-${general.id}`} selected={selected} />

            {/* Nội dung khắc chìm trực tiếp trên lưng thẻ */}
            <div className="relative z-10 w-full h-full flex flex-col items-center justify-between pt-10 pb-8 px-6 text-center">
              {/* PHẦN TRÊN: Danh hiệu / Biệt hiệu */}
              <div
                className="w-full font-serif font-black tracking-[0.08em] uppercase leading-tight text-[#ebd0a7] shrink-0 line-clamp-1"
                style={{
                  ...EngravedTextStyle,
                  fontSize: size === 'sm' ? '8px' : size === 'lg' ? '11px' : '9.5px',
                }}
              >
                {general.epithet}
              </div>

              {/* PHẦN GIỮA: 3 Chỉ Số Tam Tài & Đặc Kỹ khắc trực tiếp */}
              <div className="my-auto w-full flex flex-col items-center justify-center gap-2 py-1">
                <div className="w-full space-y-1.5 border-y border-[#381c0a]/85 py-2">
                  <div className="flex items-center justify-between font-serif font-black text-[#f5dec0]" style={EngravedTextStyle}>
                    <span className="text-[10px] tracking-widest uppercase text-[#dfb885]">Thống Lĩnh</span>
                    <span className="text-sm text-[#fff0d4]">{general.stats.command}</span>
                  </div>
                  <div className="flex items-center justify-between font-serif font-black text-[#f5dec0]" style={EngravedTextStyle}>
                    <span className="text-[10px] tracking-widest uppercase text-[#dfb885]">Võ Nghệ</span>
                    <span className="text-sm text-[#fff0d4]">{general.stats.martial}</span>
                  </div>
                  <div className="flex items-center justify-between font-serif font-black text-[#f5dec0]" style={EngravedTextStyle}>
                    <span className="text-[10px] tracking-widest uppercase text-[#dfb885]">Mưu Lược</span>
                    <span className="text-sm text-[#fff0d4]">{general.stats.intellect}</span>
                  </div>
                </div>

                <div
                  className="font-serif font-bold text-[#edd0a4] leading-snug line-clamp-3 px-0.5"
                  style={{
                    ...EngravedTextStyle,
                    fontSize: size === 'sm' ? '8.5px' : size === 'lg' ? '11px' : '9.5px',
                  }}
                >
                  {general.specialty}
                </div>
              </div>

              {/* PHẦN DƯỚI: Tên tướng & Năm tụ nghĩa */}
              <div className="w-full flex flex-col items-center border-t border-[#381c0a]/85 pt-1.5 shrink-0">
                <div
                  className="font-serif font-black tracking-wider text-[#f5dec0] uppercase leading-tight"
                  style={{
                    ...EngravedTextStyle,
                    fontSize: size === 'sm' ? '11px' : size === 'lg' ? '15px' : '13px',
                  }}
                >
                  {general.name}
                </div>
                <div
                  className="font-serif font-bold tracking-widest uppercase text-[#d9b37c] mt-0.5"
                  style={{
                    ...EngravedTextStyle,
                    fontSize: size === 'sm' ? '8px' : '9.5px',
                  }}
                >
                  {general.title} • {general.joinYear}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Đổ bóng 3D mặt sàn khi lật thẻ, tạo cảm giác thẻ có trọng lượng vật lý */}
      <div
        className="w-3/4 h-2.5 mt-1 rounded-[100%] bg-black/60 blur-[5px] pointer-events-none transition-all duration-700 ease-out"
        style={{
          transform: flipped ? 'scaleX(0.88) scaleY(1.15)' : 'scaleX(1) scaleY(1)',
          opacity: selected ? 0.75 : 0.5,
        }}
      />
    </div>
  );
};
