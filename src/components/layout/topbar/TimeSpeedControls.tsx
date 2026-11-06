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
  const setTimeMode = useGameStore(state => state.setTimeMode);
  const isTimelineWheelOpen = useUIStore(state => state.isTimelineWheelOpen);
  const toggleTimelineWheel = useUIStore(state => state.toggleTimelineWheel);

  const currentCanh = getCanhGioInfo(canhHour);
  const isNight = timeMode === 'hour' && (canhHour >= 10 || canhHour <= 2);

  return (
    <div className="relative z-10 flex flex-col items-start justify-center shrink-0 pr-1 -mt-0.5">
      {/* DÒNG TRÊN: NGÀY THÁNG / CANH GIỜ + CHỈ BÁO TRẠNG THÁI (NHẤP MỞ THƯỚC CUỘN THỜI GIAN) */}
      <button 
        type="button"
        onClick={() => toggleTimelineWheel()}
        className={`relative z-10 flex items-center gap-1.5 py-0 px-1 rounded transition-all text-left cursor-pointer ${
          isTimelineWheelOpen 
            ? 'bg-amber-800/20 ring-1 ring-[#8c2d19]/40' 
            : 'hover:bg-black/[0.04]'
        }`}
        title="Nhấp để mở Thước Cuộn Bánh Xe Thời Gian (Tua chính xác từng ngày để thử nghiệm)"
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
              timeMode === 'pause'
                ? 'opacity-65 saturate-50 drop-shadow-[0_0_4px_rgba(2,132,199,0.5)]' 
                : timeMode === 'hour'
                ? 'drop-shadow-[0_0_6px_rgba(220,38,38,0.9)] animate-pulse'
                : 'drop-shadow-[0_0_3px_rgba(107,66,38,0.6)]'
            }`}
          />
        </div>

        {/* Chữ hiển thị ngày và Canh Giờ */}
        <span 
          className={`font-serif font-black text-xs md:text-sm tracking-wide leading-none transition-colors flex items-center whitespace-nowrap ${
            timeMode === 'pause'
              ? 'text-sky-900 min-w-[155px] md:min-w-[170px]'
              : timeMode === 'hour'
              ? 'text-[#8c2d19] drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)] min-w-[195px] md:min-w-[210px]' 
              : 'text-[#45260a] min-w-[125px] md:min-w-[135px]'
          }`}
        >
          <span className="inline-block min-w-[115px] md:min-w-[125px]">
            Ngày {day}/{month}/{year}
          </span>
          {timeMode === 'hour' && (
            <span className={`inline-block text-left ml-1 text-[11px] md:text-xs font-extrabold ${isNight ? 'text-indigo-800' : 'text-[#8c2d19]'}`}>
              · {currentCanh.name} {isNight ? '🌙' : '☀️'}
            </span>
          )}
          {timeMode === 'pause' && (
            <span className="inline-block ml-1 text-[10px] md:text-[11px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-[#0284c7] border border-sky-300">
              Ngưng
            </span>
          )}
        </span>
      </button>

      {/* DÒNG DƯỚI: 3 NÚT CHẾ ĐỘ THỜI GIAN THEO 3 MÀU MỰC */}
      <div className="relative z-10 flex items-center gap-1.5 mt-0.5 pl-0.5">
        {/* Nút 1: NGƯNG - Mực Xanh Da Trời */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setTimeMode('pause');
          }}
          className={`relative min-w-[48px] h-[19px] px-2 rounded flex items-center justify-center transition-all cursor-pointer font-serif font-black text-[10.5px] md:text-[11px] tracking-tight leading-none ${
            timeMode === 'pause'
              ? 'bg-[#0284c7] text-[#f0f9ff] border border-sky-400 ring-1 ring-sky-300/60 shadow-sm scale-105'
              : 'text-[#0369a1]/85 hover:text-[#0284c7] hover:bg-sky-100/60 border border-transparent hover:border-sky-300/40'
          }`}
          title="Tạm ngưng dòng thời gian (Màu mực Xanh Da Trời)"
        >
          Ngưng
        </button>

        {/* Nút 2: NGÀY - Mực Giấy Dó Đậm */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setTimeMode('day');
          }}
          className={`relative min-w-[48px] h-[19px] px-2 rounded flex items-center justify-center transition-all cursor-pointer font-serif font-black text-[10.5px] md:text-[11px] tracking-tight leading-none ${
            timeMode === 'day'
              ? 'bg-[#543315] text-[#fcf4e4] border border-[#784d26] ring-1 ring-[#a67c52]/60 shadow-sm scale-105'
              : 'text-[#543315]/85 hover:text-[#38200b] hover:bg-[#8c6b44]/20 border border-transparent hover:border-[#8c6b44]/40'
          }`}
          title="Chế độ Ngày: Thời gian trôi theo từng Ngày (Màu mực Giấy Dó Đậm)"
        >
          Ngày
        </button>

        {/* Nút 3: GIỜ - Mực Đỏ Son */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setTimeMode('hour');
          }}
          className={`relative min-w-[48px] h-[19px] px-2 rounded flex items-center justify-center transition-all cursor-pointer font-serif font-black text-[10.5px] md:text-[11px] tracking-tight leading-none ${
            timeMode === 'hour'
              ? 'bg-[#8c2d19] text-[#fff3db] border border-[#b91c1c] ring-1 ring-amber-300/40 shadow-sm scale-105'
              : 'text-[#8c2d19]/85 hover:text-[#691c0e] hover:bg-[#8c2d19]/15 border border-transparent hover:border-[#8c2d19]/40'
          }`}
          title="Chế độ Giờ: Thời gian trôi theo 12 Canh Giờ (Màu mực Đỏ Son)"
        >
          Giờ
        </button>
      </div>
    </div>
  );
});

TimeSpeedControls.displayName = 'TimeSpeedControls';
