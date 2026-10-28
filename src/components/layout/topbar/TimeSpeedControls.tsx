import React, { useRef } from 'react';
import { useGameStore } from '../../../store/gameStore';

const SPEED_OPTIONS = [0, 1, 2, 5, 10, 50] as const;

export const TimeSpeedControls: React.FC = React.memo(() => {
  const day = useGameStore(state => state.day);
  const month = useGameStore(state => state.month);
  const year = useGameStore(state => state.year);
  const isPaused = useGameStore(state => state.isPaused);
  const gameSpeed = useGameStore(state => state.gameSpeed);
  const togglePause = useGameStore(state => state.togglePause);
  const setSpeed = useGameStore(state => state.setSpeed);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTimeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.detail === 1) {
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        togglePause();
      }, 280);
    } else if (e.detail >= 2) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (!isPaused && gameSpeed === 2) {
        setSpeed(1);
      } else {
        setSpeed(2);
      }
    }
  };

  return (
    <div className="flex flex-col items-start justify-center shrink-0 pr-1 -mt-0.5">
      {/* Dòng trên: Ngày / Tháng / Năm + Icon Đồng Hồ Cát lật theo trục ngang */}
      <button 
        onClick={handleTimeClick}
        className="flex items-center gap-1.5 py-0 px-1 rounded hover:bg-black/[0.04] transition-all text-left"
        title="Bấm để Tạm dừng / Tiếp tục"
      >
        <div 
          className="relative w-7 h-7 md:w-8 md:h-8 shrink-0 flex items-center justify-center"
          style={{ perspective: '400px' }}
        >
          <img
            src="/icons/hourglass.png"
            alt="Đồng hồ cát"
            style={{
              transform: `rotateX(${day * 180}deg)`,
              transformOrigin: '50% 50%',
              transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              transformStyle: 'preserve-3d'
            }}
            className={`w-full h-full object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] ${
              isPaused 
                ? 'opacity-60 saturate-50' 
                : gameSpeed >= 10
                ? 'drop-shadow-[0_0_4px_rgba(220,38,38,0.7)]'
                : ''
            }`}
          />
        </div>
        <span className="font-serif font-black text-xs md:text-sm tracking-wide text-[#261304] leading-none">
          Ngày {day}/{month}/{year}
        </span>
      </button>

      {/* Dòng dưới: Các nút tốc độ 0x, 1x, 2x, 5x, 10x, 50x dạng vết mực */}
      <div className="flex items-center gap-1 mt-0 pl-0.5">
        {SPEED_OPTIONS.map((speed) => {
          const isActive = speed === 0 ? isPaused : (!isPaused && gameSpeed === speed);
          
          return (
            <button
              key={speed}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSpeed(speed);
              }}
              className={`relative min-w-[21px] h-[18px] px-1.5 flex items-center justify-center transition-all cursor-pointer ${
                isActive 
                  ? 'scale-105' 
                  : 'hover:scale-105 active:scale-95'
              }`}
              title={speed === 0 ? "Tạm dừng (0x)" : `Tốc độ ${speed}x (1 ngày = ${Math.round(1000 / (speed || 1))}ms)`}
            >
              {/* Vết mực khi được chọn ("được tô mực") */}
              {isActive && (
                <img
                  src={speed === 0 ? "/ink_stroke_red.png" : "/ink_stroke_1.png"}
                  alt="Vết mực"
                  className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                />
              )}
              
              {/* Chữ đổi sang màu trắng khi được tô mực, chữ nâu đậm khi chưa chọn */}
              <span 
                className={`relative z-10 font-serif font-black text-[10px] md:text-[11px] tracking-tight leading-none ${
                  isActive 
                    ? 'text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]' 
                    : 'text-[#6b4728] hover:text-[#8c2d19]'
                }`}
              >
                {speed}x
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

TimeSpeedControls.displayName = 'TimeSpeedControls';
