import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { X } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { useUIStore } from '../../../store/uiStore';
import { 
  dateToDayIndex, 
  dayIndexToDate, 
} from '../../../utils/timelineUtils';
import { HISTORICAL_MILESTONES } from '../../../data/historicalMilestones';

const DAY_WIDTH_PX = 14; // Khoảng cách cơ bản giữa 2 ngày (pixel)
const MAX_DAY_INDEX = dateToDayIndex(31, 12, 1428); // Giới hạn cuối năm 1428

export const TimelineWheelScrubber: React.FC = () => {
  const day = useGameStore(state => state.day);
  const month = useGameStore(state => state.month);
  const year = useGameStore(state => state.year);
  const setTimeDate = useGameStore(state => state.setTimeDate);

  const isTimelineWheelOpen = useUIStore(state => state.isTimelineWheelOpen);
  const setTimelineWheelOpen = useUIStore(state => state.setTimelineWheelOpen);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(480);

  // Vị trí ngày hiện tại (dạng số thực khi đang kéo để mượt mà)
  const currentDayIndex = useMemo(() => dateToDayIndex(day, month, year), [day, month, year]);
  const [dragOffsetDay, setDragOffsetDay] = useState<number | null>(null);
  const effectiveDayIndex = dragOffsetDay !== null ? dragOffsetDay : currentDayIndex;

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Trạng thái kéo chuột
  const isDraggingRef = useRef(false);
  const lastXRef = useRef(0);
  const currentDayRef = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastXRef.current = e.clientX;
    currentDayRef.current = effectiveDayIndex;
    setDragOffsetDay(effectiveDayIndex);
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    const mouseX = e.clientX;
    const dx = mouseX - lastXRef.current;
    lastXRef.current = mouseX;

    // Tính khoảng cách từ con trỏ chuột tới mũi tên ở chính giữa
    const rect = containerRef.current?.getBoundingClientRect();
    const centerX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const distFromCenter = Math.abs(mouseX - centerX);

    // QUY TẮC: Càng xa mũi tên ở giữa, tốc độ kéo lướt thời gian càng lớn
    const normalizedDist = Math.max(0, distFromCenter - 20);
    const speedMultiplier = 1 + Math.pow(normalizedDist / 26, 1.7);

    const deltaDay = -(dx / DAY_WIDTH_PX) * speedMultiplier;
    currentDayRef.current = Math.max(0, Math.min(MAX_DAY_INDEX, currentDayRef.current + deltaDay));
    setDragOffsetDay(currentDayRef.current);

    const targetIntDay = Math.round(currentDayRef.current);
    const targetDate = dayIndexToDate(targetIntDay);
    if (targetDate.day !== day || targetDate.month !== month || targetDate.year !== year) {
      setTimeDate(targetDate.day, targetDate.month, targetDate.year);
    }
  }, [day, month, year, setTimeDate]);

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      document.body.style.userSelect = '';
      if (dragOffsetDay !== null) {
        const finalIntDay = Math.round(dragOffsetDay);
        const targetDate = dayIndexToDate(finalIntDay);
        setTimeDate(targetDate.day, targetDate.month, targetDate.year);
      }
      setDragOffsetDay(null);
    }
  }, [dragOffsetDay, setTimeDate]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Cuộn bánh xe chuột (Mouse wheel): ở gần tâm nhích 1 ngày, ở xa cuộn nhiều ngày
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    const centerX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const distFromCenter = Math.abs(e.clientX - centerX);
    const speedMultiplier = Math.max(1, Math.round(1 + Math.pow(distFromCenter / 38, 1.45)));
    
    const deltaDays = (e.deltaY > 0 ? 1 : -1) * speedMultiplier;
    const nextDay = Math.max(0, Math.min(MAX_DAY_INDEX, Math.round(effectiveDayIndex) + deltaDays));
    const targetDate = dayIndexToDate(nextDay);
    setTimeDate(targetDate.day, targetDate.month, targetDate.year);
  };

  // Vạch chia thước đo trong khung nhìn (Virtual ticks)
  const centerPos = containerWidth / 2;
  const visibleDaysRange = Math.ceil((containerWidth / 2) / DAY_WIDTH_PX) + 3;
  const minVisibleDay = Math.max(0, Math.floor(effectiveDayIndex - visibleDaysRange));
  const maxVisibleDay = Math.min(MAX_DAY_INDEX, Math.ceil(effectiveDayIndex + visibleDaysRange));

  const ticks = useMemo(() => {
    const items = [];
    for (let i = minVisibleDay; i <= maxVisibleDay; i++) {
      const dObj = dayIndexToDate(i);
      const x = centerPos + (i - effectiveDayIndex) * DAY_WIDTH_PX;
      const isFirstDay = dObj.day === 1;
      const isFullMoon = dObj.day === 15;
      const milestone = HISTORICAL_MILESTONES.find(m => m.dayIndex === i);

      items.push({
        dayIndex: i,
        x,
        day: dObj.day,
        month: dObj.month,
        year: dObj.year,
        isFirstDay,
        isFullMoon,
        milestone,
      });
    }
    return items;
  }, [minVisibleDay, maxVisibleDay, centerPos, effectiveDayIndex]);

  if (!isTimelineWheelOpen) return null;

  return (
    <div className="fixed top-[72px] md:top-[78px] left-1/2 -translate-x-1/2 z-40 select-none pointer-events-auto filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)] drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)] animate-fade-in">
      {/* KHUNG THƯỚC NHỎ GỌN, ĐỒNG BỘ MÀU GIẤY (~480px - 520px, CAO ~76px - 80px) */}
      <div 
        ref={containerRef}
        className="relative w-[92vw] max-w-[480px] md:max-w-[520px] h-[76px] md:h-[80px] px-7 pt-1.5 pb-2 flex flex-col justify-center items-center gap-0.5"
      >
        {/* NỀN GIẤY CỔ PHONG ĐỒNG MÀU, MÉP RÁCH TỰ NHIÊN */}
        <img
          src="/parchment_timeline_strip.png"
          alt="Giấy cổ phong"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
          draggable={false}
        />

        {/* 1. PHÍA TRÊN: CHỈ HIỂN THỊ DUY NHẤT NGÀY/THÁNG/NĂM (VD: 14/2/1420) + NÚT ĐÓNG */}
        <div className="relative z-10 w-full flex items-center justify-between font-serif px-2">
          <div className="w-5" /> {/* Cân xứng lề trái */}

          {/* DÒNG NGÀY THÁNG ĐẬM RÕ SÁT PHÍA TRÊN VẠCH THƯỚC */}
          <span className="font-serif font-black text-base md:text-lg tracking-widest text-[#2a1708] drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]">
            {day}/{month}/{year}
          </span>

          <button
            onClick={() => setTimelineWheelOpen(false)}
            className="p-0.5 rounded hover:bg-black/10 active:scale-90 text-[#701a14] transition-all cursor-pointer"
            title="Đóng thanh thời gian"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 2. THƯỚC ĐO CUỘN BÁNH XE THỜI GIAN NGAY SÁT BÊN DƯỚI */}
        <div 
          className="relative z-10 w-full h-[32px] cursor-grab active:cursor-grabbing overflow-hidden"
          onMouseDown={handleMouseDown}
          onWheel={handleWheel}
        >
          {/* Đổ bóng cong 3D mờ dần ở 2 mép tạo cảm giác bánh xe nhìn từ trên xuống */}
          <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-stone-900/30 via-stone-800/5 to-transparent pointer-events-none z-10" />
          <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-stone-900/30 via-stone-800/5 to-transparent pointer-events-none z-10" />

          {/* Đường gạch ngang ở đáy thước */}
          <div className="absolute bottom-[4px] left-0 right-0 h-px bg-[#8c6b44]/70" />

          {/* CÁC VẠCH THƯỚC DỰNG ĐỨNG TỪ GẠCH NGANG LÊN TRÊN */}
          <div className="absolute inset-0 pointer-events-none">
            {ticks.map((t) => {
              if (t.x < -30 || t.x > containerWidth + 30) return null;

              return (
                <div 
                  key={t.dayIndex}
                  className="absolute bottom-[4px] flex flex-col items-center"
                  style={{ left: `${t.x}px`, transform: 'translateX(-50%)' }}
                >
                  {/* Nhãn tháng/năm ở vạch đầu tháng */}
                  {t.isFirstDay && (
                    <span className="absolute bottom-[16px] text-[8px] font-bold text-[#701a14] whitespace-nowrap bg-[#faeed8] px-1 py-0.2 rounded shadow-2xs border border-[#8c6b44]/40 leading-none">
                      {t.month}/{t.year}
                    </span>
                  )}

                  {/* Vạch đo ngày dựng đứng từ đường gạch ngang lên */}
                  <div
                    className={`w-px ${
                      t.isFirstDay
                        ? 'h-3.5 bg-[#701a14] w-[1.5px]'
                        : t.isFullMoon
                        ? 'h-2 bg-[#8c6b44] w-[1px]'
                        : 'h-1.5 bg-[#b39775]/90'
                    }`}
                  />

                  {/* Chấm son đỏ mốc lịch sử */}
                  {t.milestone && (
                    <div 
                      className="absolute bottom-[10px] w-1.5 h-1.5 rounded-full shadow-xs animate-ping"
                      style={{ backgroundColor: t.milestone.color }}
                      title={`${t.milestone.title}: ${t.milestone.day}/${t.milestone.month}/${t.milestone.year}`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* 3. MŨI TÊN DUY NHẤT Ở ĐÁY CHÍNH GIỮA CHỈ THẲNG LÊN VẠCH THƯỚC */}
          <div className="absolute bottom-[1px] left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[7px] border-b-[#8c2d19] filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
          </div>

        </div>
      </div>
    </div>
  );
};
