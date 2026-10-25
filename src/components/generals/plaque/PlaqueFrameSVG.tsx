import React from 'react';
import type { StarTier } from '../../../types';
import { PLAQUE_OUTER_PATH } from './plaqueConstants';

interface PlaqueFrameSVGProps {
  idSuffix: string;
  selected: boolean;
  starTier?: StarTier;
}

export const PlaqueFrameSVG: React.FC<PlaqueFrameSVGProps> = ({
  idSuffix,
  selected,
  starTier = 'gold',
}) => {
  // Hiệu ứng phát sáng theo đúng bậc sao khi được chọn:
  // - Sao Bạc: sáng trắng bạc (White Glow)
  // - Sao Vàng: sáng vàng kim (Gold Glow)
  // - Sao Đỏ: sáng đỏ chu sa (Red Glow)
  const getSelectedShadow = () => {
    if (!selected) {
      return 'drop-shadow-[0_8px_14px_rgba(0,0,0,0.75)]';
    }
    switch (starTier) {
      case 'silver':
        return 'drop-shadow-[0_0_22px_rgba(240,248,255,0.98)] drop-shadow-[0_0_9px_rgba(255,255,255,1)]';
      case 'red':
        return 'drop-shadow-[0_0_25px_rgba(239,68,68,0.95)] drop-shadow-[0_0_9px_rgba(255,75,75,1)]';
      case 'gold':
      default:
        return 'drop-shadow-[0_0_22px_rgba(245,158,11,0.95)] drop-shadow-[0_0_9px_rgba(251,191,36,1)]';
    }
  };

  return (
    <svg
      viewBox="0 0 200 320"
      className={`absolute inset-0 w-full h-full pointer-events-none transition-all duration-300 ${getSelectedShadow()}`}
    >
      <defs>
        <linearGradient id={`plaqueSurface-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a67c52" />
          <stop offset="28%" stopColor="#b88e62" />
          <stop offset="58%" stopColor="#8c6239" />
          <stop offset="82%" stopColor="#734d29" />
          <stop offset="100%" stopColor="#54361a" />
        </linearGradient>

        {/* Viền kim loại đổi sang ánh sáng màu sao tương ứng khi được chọn */}
        <linearGradient id={`plaqueRim-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
          {selected && starTier === 'silver' ? (
            <>
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor="#cbd5e1" />
              <stop offset="70%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#f8fafc" />
            </>
          ) : selected && starTier === 'red' ? (
            <>
              <stop offset="0%" stopColor="#fecaca" />
              <stop offset="35%" stopColor="#ef4444" />
              <stop offset="70%" stopColor="#7f1d1d" />
              <stop offset="100%" stopColor="#dc2626" />
            </>
          ) : selected && starTier === 'gold' ? (
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
};
