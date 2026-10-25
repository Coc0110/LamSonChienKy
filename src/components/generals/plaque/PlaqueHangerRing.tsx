import React from 'react';

interface PlaqueHangerRingProps {
  generalId: string;
  size: 'sm' | 'md' | 'lg';
  isBack?: boolean;
}

export const PlaqueHangerRing: React.FC<PlaqueHangerRingProps> = ({ generalId, size, isBack = false }) => {
  const width = size === 'lg' ? 52 : 42;
  const height = size === 'lg' ? 36 : 30;
  const gradId = isBack ? `ringBack-${generalId}` : `ringFront-${generalId}`;

  return (
    <div className="relative z-20 flex flex-col items-center -mb-2.5 pointer-events-none">
      <svg
        width={width}
        height={height}
        viewBox="0 0 60 44"
        fill="none"
        className={`drop-shadow-[0_3px_4px_rgba(0,0,0,0.75)] ${
          !isBack ? 'transition-transform duration-300 group-hover:rotate-3' : ''
        }`}
      >
        <ellipse
          cx={isBack ? 27 : 33}
          cy="15"
          rx="15"
          ry="11"
          transform={isBack ? 'rotate(18 27 15)' : 'rotate(-18 33 15)'}
          stroke={`url(#${gradId})`}
          strokeWidth="3.5"
          fill="none"
        />
        <path
          d={
            isBack
              ? 'M36 22 C38 28, 34 35, 30 37 C26 35, 24 28, 27 23'
              : 'M24 22 C22 28, 26 35, 30 37 C34 35, 36 28, 33 23'
          }
          stroke={`url(#${gradId})`}
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
            id={gradId}
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
  );
};
