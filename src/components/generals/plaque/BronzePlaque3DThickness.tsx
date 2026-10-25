import React from 'react';
import { PLAQUE_OUTER_PATH } from './plaqueConstants';

interface BronzePlaque3DThicknessProps {
  size: 'sm' | 'md' | 'lg';
  bodyHeight: string;
}

export const BronzePlaque3DThickness: React.FC<BronzePlaque3DThicknessProps> = ({
  size,
  bodyHeight,
}) => {
  return (
    <div
      className="absolute inset-0 w-full flex flex-col items-center pointer-events-none select-none"
      style={{ transformStyle: 'preserve-3d' }}
      aria-hidden="true"
    >
      {/* Khoảng bù cho khoen móc */}
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
        {/* Các lát đồng silhouette đa tầng lấp đầy thể tích */}
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

        {/* Cạnh viền đồng bên TRÁI */}
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

        {/* Cạnh viền đồng bên PHẢI */}
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
  );
};
