import React from 'react';
import { useUIStore } from '../../../store/uiStore';
import { useGameStore } from '../../../store/gameStore';
import { getCanhGioInfo } from '../../../utils/timelineUtils';

// Tạm bỏ 50x, thay thế bằng nút Chế độ Chiến Sự (Icon Kiếm Thương)
const SPEED_OPTIONS = [0, 1, 2, 5, 10] as const;

export const TimeSpeedControls: React.FC = React.memo(() => {
  const day = useGameStore(state => state.day);
  const month = useGameStore(state => state.month);
  const year = useGameStore(state => state.year);
  const canhHour = useGameStore(state => state.canhHour);
  const isWarMode = useGameStore(state => state.isWarMode);
  const toggleWarMode = useGameStore(state => state.toggleWarMode);
  const isPaused = useGameStore(state => state.isPaused);
  const gameSpeed = useGameStore(state => state.gameSpeed);
  const isTimelineWheelOpen = useUIStore(state => state.isTimelineWheelOpen);
  const toggleTimelineWheel = useUIStore(state => state.toggleTimelineWheel);
  const setSpeed = useGameStore(state => state.setSpeed);

  const currentCanh = getCanhGioInfo(canhHour);
  // Ban đêm (5 Canh: Tuất, Hợi, Tý, Sửu, Dần)
  const isNight = isWarMode && (canhHour >= 10 || canhHour <= 2);

  return (
    <div className="relative flex flex-col items-start justify-center shrink-0 pr-1 -mt-0.5">
      {/* VỆT MỰC ĐỎ CHE PHỦ TOÀN BỘ CHỮ VÀ NÚT KHI KÍCH HOẠT CHẾ ĐỘ CHIẾN SỰ */}
      {isWarMode && (
        <div className="absolute -inset-x-4 -inset-y-1.5 pointer-events-none z-0 overflow-hidden animate-fade-in">
          <img
            src="/ink_stroke_red.png"
            alt="Vệt mực đỏ thời chiến"
            className="w-full h-full object-fill opacity-95 filter drop-shadow-[0_0_12px_rgba(220,38,38,0.85)]"
          />
        </div>
      )}

      {/* Dòng trên: Ngày / Tháng / Năm + Canh Giờ + Icon Đồng Hồ Cát (Không có dòng giải thích thừa) */}
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

        {/* Chữ hiển thị ngày và Canh Giờ (gọn gàng duy nhất 1 dòng, không có dòng giải thích thừa) */}
        <span 
          className={`font-serif font-black text-xs md:text-sm tracking-wide leading-none transition-colors ${
            isWarMode 
              ? 'text-[#fef2d6] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]' 
              : 'text-[#261304]'
          }`}
        >
          Ngày {day}/{month}/{year}
          {isWarMode && (
            <span className={`ml-1 text-[11px] md:text-xs font-extrabold ${isNight ? 'text-cyan-200' : 'text-amber-200'}`}>
              · {currentCanh.name} {isNight && '(Nghỉ đêm)'}
            </span>
          )}
        </span>
      </button>

      {/* Dòng dưới: Các nút tốc độ 0x, 1x, 2x, 5x, 10x + Nút CHIẾN SỰ DUY NHẤT 1 ICON KIẾM THƯƠNG */}
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
              {/* Vết mực khi được chọn ("được tô mực") */}
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
                    ? 'text-amber-100 hover:text-white'
                    : 'text-[#6b4728] hover:text-[#8c2d19]'
                }`}
              >
                {speed}x
              </span>
            </button>
          );
        })}

        {/* NÚT CHIẾN SỰ: DUY NHẤT 1 ICON KIẾM THƯƠNG (KHÔNG CÓ CHỮ) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleWarMode();
          }}
          className={`relative min-w-[22px] w-[22px] h-[18px] flex items-center justify-center transition-all cursor-pointer rounded-xs ml-0.5 ${
            isWarMode 
              ? 'scale-110 drop-shadow-[0_0_6px_rgba(255,215,0,0.95)] animate-pulse' 
              : 'hover:scale-110 active:scale-95 opacity-75 hover:opacity-100'
          }`}
          title={
            isWarMode 
              ? "⚔️ Chế độ Chiến Sự ĐANG BẬT (Đếm Canh Giờ, ban đêm hạ trại nghỉ ngơi) - Bấm để tắt" 
              : "⚔️ Bật Chế độ Chiến Sự (Đếm từng Canh Giờ khi hành quân/tác chiến)"
          }
        >
          {/* Nền vệt mực đỏ nhỏ sau icon khi đang kích hoạt */}
          {isWarMode && (
            <img
              src="/ink_stroke_red.png"
              alt="Vệt mực"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_3px_rgba(185,28,28,0.95)]"
            />
          )}

          <img
            src={isWarMode ? "/icons/war_mode_sword_spear_gold.png" : "/icons/war_mode_sword_spear.png"}
            alt="Kiếm Thương Chiến Sự"
            className="relative z-10 w-4 h-4 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
          />
        </button>
      </div>
    </div>
  );
});

TimeSpeedControls.displayName = 'TimeSpeedControls';
