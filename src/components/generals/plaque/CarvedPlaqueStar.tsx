import React from 'react';
import type { StarDisplayTier } from '../../../utils/generalRating';

interface CarvedPlaqueStarProps {
  size: number;
  tier: StarDisplayTier;
}

export const CarvedPlaqueStar: React.FC<CarvedPlaqueStarProps> = ({ size, tier }) => {
  if (tier === 'empty') {
    // Ngôi sao rỗng chìm vào phôi đồng (chưa mở khóa)
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className="overflow-visible select-none opacity-60"
        style={{
          filter: 'drop-shadow(0 -0.8px 1px rgba(0,0,0,0.9))',
        }}
      >
        <polygon
          points="12 1.4 15.3 8.1 22.6 9.2 17.3 14.3 18.6 21.6 12 18.1 5.4 21.6 6.7 14.3 1.4 9.2 8.7 8.1"
          fill="#140802"
          stroke="#2d1508"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="1.5" fill="#0d0401" />
      </svg>
    );
  }

  const facetLight =
    tier === 'red'
      ? '#ef4444'
      : tier === 'gold'
      ? '#f59e0b'
      : '#f1f5f9';

  const facetDark =
    tier === 'red'
      ? '#7f1d1d'
      : tier === 'gold'
      ? '#78350f'
      : '#475569';

  const filterStyle =
    tier === 'red'
      ? 'drop-shadow(0 1.2px 0 rgba(254, 202, 202, 0.6)) drop-shadow(0 0 3px rgba(239, 68, 68, 0.75)) drop-shadow(0 -1px 1px rgba(15, 6, 0, 0.95))'
      : tier === 'gold'
      ? 'drop-shadow(0 1.2px 0 rgba(254, 240, 138, 0.7)) drop-shadow(0 0 3px rgba(245, 158, 11, 0.75)) drop-shadow(0 -1px 1px rgba(15, 6, 0, 0.95))'
      : 'drop-shadow(0 1.2px 0 rgba(255, 255, 255, 0.8)) drop-shadow(0 0 3px rgba(226, 232, 240, 0.7)) drop-shadow(0 -1px 1px rgba(15, 6, 0, 0.95))';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="overflow-visible select-none"
      style={{
        filter: filterStyle,
      }}
    >
      {/* Hõm sao khắc chìm sâu vào phôi thẻ đồng */}
      <polygon
        points="12 1.4 15.3 8.1 22.6 9.2 17.3 14.3 18.6 21.6 12 18.1 5.4 21.6 6.7 14.3 1.4 9.2 8.7 8.1"
        fill="#1b0b03"
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
