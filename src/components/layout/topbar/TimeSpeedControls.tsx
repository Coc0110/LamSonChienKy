import React from 'react';
import { useUIStore } from '../../../store/uiStore';
import { useGameStore } from '../../../store/gameStore';
import { getCanhGioInfo } from '../../../utils/timelineUtils';

// Tốc độ thời gian chuẩn
const SPEED_OPTIONS = [0, 1, 2, 5, 10] as const;

export const TimeSpeedControls: React.FC = React.memo(() => {
  const day = useGameStore(state => state.day);
  const month = useGameStore(state => state.month);
  const year = useGameStore(state => state.year);
  const canhHour = useGameStore(state => state.canhHour);
  const isWarMode = useGameStore(state => state.isWarMode);
  const isPaused = useGameStore(state => state.isPaused);
  const gameSpeed = useGameStore(state => state.gameSpeed);
  const isTimelineWheelOpen = useUIStore(state => state.isTimelineWheelOpen);
  const toggleTimelineWheel = useUIStore(state => state.toggleTimelineWheel);
  const setSpeed = useGameStore(state => state.setSpeed);

  const currentCanh = getCanhGioInfo(canhHour);
  const isNight = isWarMode && (canhHour >= 10 || canhHour <= 2);

  return (
    <div className="relative z-10 flex flex-col items-start justify-center shrink-0 pr-1 -mt-0.5">
      {/* DÒNG TRÊN: NGÀY / THÁNG / NĂM + CANH GIỜ (LOẠI BỎ GIẢI THÍCH NGHỈ ĐÊM) */}
      <button 
        onClick={() => toggleTimelineWheel()}
        className={`relative z-10 flex items-center gap-1.5 py-0 px-1 rounded transition-all text-left cursor-pointer ${
          isTimelineWheelOpen 
            ? 'bg-amber-800/20 ring-1 ring-[#8c2d19]/40' 
            : isWarMode 
            ? 'hover:bg-white/10' 
            : 'hover:bg-black/[0.04]'
        }`}
        title={
          isWarMode 
            ? `Chế độ Chiến Sự: ${currentCanh.name} (${currentCanh.period}) ${isNight ? '· Ban đêm hạ trại nghỉ ngơi' : '· Đang hành quân'}` 
            : "Bấm để mở Thanh Cuộn Bánh Xe Thời Gian (Kéo tua chính xác từng ngày)"
        }
      >
        <div 
          className="relative w-6 h-6 md:w-7 md:h-7 shrink-0 flex items-center justify-center"
          style={{ perspective: '400px' }}
        >
          <img
            src="/icons/hourglass.png"
            alt="Đồng hồ cát"
            style={{
              transform: `rotateX(${(day * 12 + canhHour) * 30}deg)`,
              transformOrigin: '50% 50%',
              transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              transformStyle: 'preserve-3d'
            }}
            className={`w-full h-full object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] ${
              isPaused 
                ? 'opacity-60 saturate-50' 
                : isWarMode
                ? 'drop-shadow-[0_0_6px_rgba(239,68,68,0.9)] animate-pulse'
                : gameSpeed >= 10
                ? 'drop-shadow-[0_0_4px_rgba(220,38,38,0.7)]'
                : ''
            }`}
          />
        </div>

        {/* Chữ hiển thị ngày và Canh Giờ (Cố định chiều rộng khung để không bị co dãn khi đổi Canh Giờ) */}
        <span 
          className={`font-serif font-black text-xs md:text-sm tracking-wide leading-none transition-colors flex items-center whitespace-nowrap ${
            isWarMode 
              ? 'text-[#fef2d6] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] min-w-[195px] md:min-w-[210px]' 
              : 'text-[#261304] min-w-[125px] md:min-w-[135px]'
          }`}
        >
          <span className="inline-block min-w-[115px] md:min-w-[125px]">
            Ngày {day}/{month}/{year}
          </span>
          {isWarMode && (
            <span className={`inline-block w-[68px] md:w-[74px] text-left ml-1 text-[11px] md:text-xs font-extrabold ${isNight ? 'text-cyan-200' : 'text-amber-200'}`}>
              · {currentCanh.name}
            </span>
          )}
        </span>
      </button>

      {/* DÒNG DƯỚI: CÁC NÚT TỐC ĐỘ 0X, 1X, 2X, 5X, 10X */}
      <div className="relative z-10 flex items-center gap-1 mt-0.5 pl-0.5">
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
              title={
                speed === 0 
                  ? "Tạm dừng (0x)" 
                  : isWarMode 
                  ? `Tốc độ ${speed}x trong Thời Chiến (${speed} canh giờ / giây)` 
                  : `Tốc độ ${speed}x (${speed} ngày / giây)`
              }
            >
              {isActive && (
                <img
                  src={speed === 0 ? "/ink_stroke_red.png" : "/ink_stroke_1.png"}
                  alt="Vết mực"
                  className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                />
              )}
              
              <span 
                className={`relative z-10 font-serif font-black text-[10px] md:text-[11px] tracking-tight leading-none ${
                  isActive 
                    ? 'text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]' 
                    : isWarMode
                    ? 'text-[#fef2d6]/80 hover:text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]'
                    : 'text-[#3d240f]/75 hover:text-[#261304]'
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
