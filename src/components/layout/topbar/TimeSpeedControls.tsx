import React from 'react';
import { useUIStore } from '../../../store/uiStore';
import { useGameStore } from '../../../store/gameStore';
import { getCanhGioInfo } from '../../../utils/timelineUtils';

export const TimeSpeedControls: React.FC = React.memo(() => {
  const day = useGameStore(state => state.day);
  const month = useGameStore(state => state.month);
  const year = useGameStore(state => state.year);
  const canhHour = useGameStore(state => state.canhHour);
  const timeMode = useGameStore(state => state.timeMode);
  const isTimelineWheelOpen = useUIStore(state => state.isTimelineWheelOpen);
  const toggleTimelineWheel = useUIStore(state => state.toggleTimelineWheel);

  const currentCanh = getCanhGioInfo(canhHour);
  const isNight = timeMode === 'hour' && (canhHour >= 10 || canhHour <= 2);

  return (
    <div className="relative z-10 flex flex-col items-start justify-center shrink-0 pr-1">
      {/* KHỐI HIỂN THỊ NGÀY THÁNG & CANH GIỜ (NHẤP ĐỂ MỞ THƯỚC CUỘN BÁNH XE THỜI GIAN) */}
      <button 
        type="button"
        onClick={() => toggleTimelineWheel()}
        className={`relative z-10 flex items-center gap-1.5 py-0.5 px-1.5 rounded transition-all text-left cursor-pointer ${
          isTimelineWheelOpen 
            ? 'bg-black/30 ring-1 ring-amber-300/40' 
            : 'hover:bg-white/10 active:scale-98'
        }`}
        title="Nhấp để mở Thước Cuộn Bánh Xe Thời Gian (Tua chính xác từng ngày để thử nghiệm)"
      >
        <div 
          className="relative w-7 h-7 md:w-8 md:h-8 shrink-0 flex items-center justify-center"
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
            className={`w-full h-full object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] ${
              timeMode === 'pause'
                ? 'opacity-70 saturate-50 drop-shadow-[0_0_6px_rgba(56,189,248,0.7)]' 
                : timeMode === 'hour'
                ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-pulse'
                : 'drop-shadow-[0_0_4px_rgba(245,158,11,0.6)]'
            }`}
          />
        </div>

        {/* Chữ hiển thị ngày và Canh Giờ */}
        <div className="flex flex-col items-start leading-tight">
          <span className="font-serif font-black text-xs md:text-sm tracking-wide text-[#fef2d6] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] flex items-center whitespace-nowrap">
            <span className="inline-block">
              Ngày {day}/{month}/{year}
            </span>
            {timeMode === 'hour' && (
              <span className={`inline-block ml-1 text-[11px] md:text-xs font-extrabold ${isNight ? 'text-cyan-200' : 'text-amber-200'}`}>
                · {currentCanh.name} {isNight ? '🌙' : '☀️'}
              </span>
            )}
            {timeMode === 'pause' && (
              <span className="inline-block ml-1 text-[10px] md:text-[11px] font-bold px-1.5 py-0.2 rounded bg-sky-200/20 text-cyan-200 border border-sky-300/40">
                Tạm Ngưng
              </span>
            )}
          </span>

          {/* Dòng phụ: Mô tả nhịp thời gian hiện tại */}
          <span className="text-[10px] md:text-[10.5px] font-serif text-[#fef2d6]/75 drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)] tracking-tight">
            {timeMode === 'hour' 
              ? `${currentCanh.period} ${isNight ? '· Ban đêm hạ trại' : '· Đang hành quân'}`
              : timeMode === 'pause'
              ? 'Dòng thời gian tạm ngưng'
              : 'Chiến lược Lam Sơn (1 ngày / s)'
            }
          </span>
        </div>
      </button>
    </div>
  );
});

TimeSpeedControls.displayName = 'TimeSpeedControls';
