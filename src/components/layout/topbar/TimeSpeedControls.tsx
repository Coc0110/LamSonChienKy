import React from 'react';
import { useGameStore } from '../../../store/gameStore';
import { getCanhGioInfo } from '../../../utils/timelineUtils';

export const TimeSpeedControls: React.FC = React.memo(() => {
  const day = useGameStore(state => state.day);
  const month = useGameStore(state => state.month);
  const year = useGameStore(state => state.year);
  const canhHour = useGameStore(state => state.canhHour);
  const timeMode = useGameStore(state => state.timeMode);
  const togglePause = useGameStore(state => state.togglePause);

  const currentCanh = getCanhGioInfo(canhHour);
  const isNight = timeMode === 'hour' && (canhHour >= 10 || canhHour <= 2);

  return (
    // Chiều rộng cố định 245px để ngày tháng và Canh Giờ có đủ không gian, không bị chồng đè hay khuất
    <div className="relative z-10 w-[245px] shrink-0 flex items-center pr-1 select-none">
      <button 
        type="button"
        onClick={togglePause}
        className="relative z-10 flex items-center gap-2 py-0.5 px-0.5 rounded transition-transform text-left cursor-pointer hover:scale-[1.02] active:scale-98 w-full"
        title={
          timeMode === 'pause'
            ? "Dòng thời gian đang Tạm Ngưng · Nhấp vào để tiếp tục chạy"
            : "Nhấp vào ô thời gian để Tạm Ngưng"
        }
      >
        {/* Đồng hồ cát (2D phẳng lật 180 độ theo chu kỳ ngày, giữ trọn vẹn hình ảnh) */}
        <div className="relative w-6 h-6 md:w-7 md:h-7 shrink-0 flex items-center justify-center">
          <img
            src="/icons/hourglass.png"
            alt="Đồng hồ cát"
            style={{
              transform: `rotate(${((day % 2) * 180)}deg)`,
              transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            className={`w-full h-full object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] ${
              timeMode === 'pause'
                ? 'opacity-70 saturate-50 drop-shadow-[0_0_6px_rgba(56,189,248,0.7)]' 
                : timeMode === 'hour'
                ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-pulse'
                : 'drop-shadow-[0_0_4px_rgba(245,158,11,0.6)]'
            }`}
          />
        </div>

        {/* Khung chữ ngày tháng & Canh Giờ đặt cạnh nhau tự nhiên với gap-1.5, không chồng đè, không khuất */}
        <div className="w-[210px] shrink-0 font-serif font-black text-xs md:text-sm tracking-wide text-[#fef2d6] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
          <span>
            Ngày {day}/{month}/{year}
          </span>
          {timeMode === 'hour' && (
            <span className={`text-xs md:text-sm font-black ${isNight ? 'text-cyan-200' : 'text-amber-200'}`}>
              · {currentCanh.name} {isNight ? '🌙' : '☀️'}
            </span>
          )}
        </div>
      </button>
    </div>
  );
});

TimeSpeedControls.displayName = 'TimeSpeedControls';
