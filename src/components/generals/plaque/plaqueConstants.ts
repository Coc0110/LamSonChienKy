import type { CSSProperties } from 'react';
import type { StarTier, TroopType } from '../../../types';

export const STAR_TIER_STYLES: Record<
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

export const TROOP_SPECS: {
  id: TroopType;
  label: string;
  iconUrl: string;
}[] = [
  {
    id: 'infantry',
    label: 'Bộ Binh',
    iconUrl: '/troops/infantry.png?v=3',
  },
  {
    id: 'cavalry',
    label: 'Thiết Đột (Kỵ)',
    iconUrl: '/troops/cavalry.png',
  },
  {
    id: 'archer',
    label: 'Cung Nỏ',
    iconUrl: '/troops/archer.png',
  },
  {
    id: 'elephant',
    label: 'Tượng Binh',
    iconUrl: '/troops/elephant.png',
  },
  {
    id: 'navy',
    label: 'Thủy Quân',
    iconUrl: '/troops/navy.png',
  },
];

export const PLAQUE_OUTER_PATH = `
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

export const INNER_BORDER_CLIP_STYLE: CSSProperties = {
  clipPath:
    'polygon(19% 11.88%, 34% 11.88%, 50% 13.75%, 66% 11.88%, 81% 11.88%, 90% 17.5%, 90% 82.5%, 81% 88.13%, 19% 88.13%, 10% 82.5%, 10% 17.5%)',
};

export const EngravedTextStyle: CSSProperties = {
  textShadow:
    '0 1px 0 rgba(255,235,200,0.42), 0 -1px 1px rgba(20,10,0,0.92), 1px 2px 3px rgba(0,0,0,0.75)',
};

export const CarvedBronzeGrooveTextStyle: CSSProperties = {
  color: '#201004',
  textShadow:
    '0 1.2px 0 rgba(245, 208, 155, 0.7), 1px 1px 0 rgba(230, 188, 132, 0.5), 0 -1px 1px rgba(12, 4, 0, 0.9)',
};

export const getStatNumberStyle = (val: number, size: 'sm' | 'md' | 'lg' = 'md'): CSSProperties => {
  const baseNumStyle: CSSProperties = {
    fontFamily: "'HanZiVH', Georgia, 'Times New Roman', serif",
    fontWeight: 900,
    fontSize: size === 'sm' ? '11px' : size === 'lg' ? '14px' : '12.5px',
    lineHeight: 1,
    letterSpacing: '0.06em',
  };
  if (val > 90) {
    return {
      ...baseNumStyle,
      color: '#420808',
      textShadow:
        '0 1.2px 0 rgba(245, 208, 155, 0.65), 1px 1px 0 rgba(230, 188, 132, 0.35), 0 -1.2px 1.5px rgba(10, 2, 2, 0.98), 0 0.8px 1px rgba(220, 38, 38, 0.75)',
    };
  }
  if (val > 80) {
    return {
      ...baseNumStyle,
      color: '#310d38',
      textShadow:
        '0 1.2px 0 rgba(245, 208, 155, 0.65), 1px 1px 0 rgba(230, 188, 132, 0.35), 0 -1.2px 1.5px rgba(10, 2, 12, 0.98), 0 0.8px 1px rgba(168, 85, 247, 0.85)',
    };
  }
  return {
    ...baseNumStyle,
    color: '#1a0b03',
    textShadow:
      '0 1.2px 0 rgba(245, 208, 155, 0.65), 1px 1px 0 rgba(230, 188, 132, 0.35), 0 -1.2px 1.5px rgba(10, 3, 0, 0.95)',
  };
};

export const GENERAL_PORTRAIT_CONFIG: Record<string, { scale?: number; x?: string; y?: string }> = {
  le_loi: { scale: 0.98, x: '5px', y: '0px' },
  le_lai: { scale: 1.0, x: '0px', y: '0px' },
  le_sat: { scale: 1.0, x: '0px', y: '10px' },
  trinh_kha: { scale: 1.0, x: '0px', y: '10px' },
  le_than: { scale: 1.0, x: '0px', y: '5px' },
  dinh_le: { scale: 1.0, x: '0px', y: '10px' },
  luu_nhan_chu: { scale: 1.2, x: '15px', y: '15px' },
  le_van_an: { scale: 1.0, x: '-20px', y: '25px' },
};

export const GENERAL_NAME_CONFIG: Record<string, {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  x?: string;
  y?: string;
}> = {
  le_loi:       { left: '13%',  top: '30%',    x: '0px', y: '0px' },
  le_lai:       { right: '14%', bottom: '17%', x: '0px', y: '0px' },
  le_sat:       { left: '16%',  bottom: '23%', x: '0px', y: '0px' },
  trinh_kha:    { right: '14%', bottom: '13%', x: '0px', y: '0px' },
  le_than:      { right: '11%', top: '23%',    x: '0px', y: '0px' },
  dinh_le:      { left: '14%',  bottom: '67%', x: '0px', y: '0px' },
  luu_nhan_chu: { right: '58%', top: '24%',    x: '0px', y: '0px' },
  le_van_an:    { right: '64%', top: '25%',    x: '0px', y: '0px' },
};
