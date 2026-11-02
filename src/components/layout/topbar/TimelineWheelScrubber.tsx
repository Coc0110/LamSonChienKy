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
  const [containerWidth, setContainerWidth] = useState<number>(560);

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
    // - Gần tâm (< 25px): hệ số = 1 (tinh chỉnh tỉ mỉ từng ngày)
    // - Càng kéo chuột ra xa: gia tốc tăng dần theo khoảng cách
    const normalizedDist = Math.max(0, distFromCenter - 25);
    const speedMultiplier = 1 + Math.pow(normalizedDist / 32, 1.6);

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
    const speedMultiplier = Math.max(1, Math.round(1 + Math.pow(distFromCenter / 45, 1.4)));
    
    const deltaDays = (e.deltaY > 0 ? 1 : -1) * speedMultiplier;
    const nextDay = Math.max(0, Math.min(MAX_DAY_INDEX, Math.round(effectiveDayIndex) + deltaDays));
    const targetDate = dayIndexToDate(nextDay);
    setTimeDate(targetDate.day, targetDate.month, targetDate.year);
  };

  // Vạch chia ngày hiển thị trong khung nhìn (Virtual ticks)
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
    <div className="fixed top-[72px] md:top-[78px] left-1/2 -translate-x-1/2 z-40 select-none pointer-events-auto filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] animate-fade-in">
      {/* KHUNG THƯỚC NHỎ GỌN (~NỬA MÀN HÌNH) */}
      <div 
        ref={containerRef}
        className="relative w-[92vw] max-w-[540px] md:max-w-[580px] bg-[#fbf6ea] border-2 border-[#8c2d19] rounded-lg overflow-hidden shadow-2xl"
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, #fefcf6 0%, #f5e9d3 100%)',
        }}
      >
        {/* Nền giấy cổ */}
        <img
          src="/parchment_torn_horizontal.png"
          alt="Parchment Border"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none opacity-20 mix-blend-multiply"
        />

        {/* 1. PHÍA TRÊN: CHỈ HIỂN THỊ DUY NHẤT NGÀY THÁNG NĂM (VD: 14/2/1420) + NÚT ĐÓNG */}
        <div className="relative z-20 px-3 pt-2 pb-1 flex items-center justify-between border-b border-[#8c6b44]/20 font-serif">
          <div className="w-5" /> {/* Spacer cân xứng */}
          
          {/* CHỮ SỐ NGÀY THÁNG ĐẬM RÕ */}
          <span className="text-base md:text-lg font-black tracking-widest text-[#701a14] drop-shadow-xs">
            {day}/{month}/{year}
          </span>

          <button
            onClick={() => setTimelineWheelOpen(false)}
            className="p-1 rounded hover:bg-black/10 active:scale-90 text-[#701a14] transition-all cursor-pointer"
            title="Đóng thanh thời gian"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. BĂNG CUỘN BÁNH XE THỜI GIAN NHÌN TỪ TRÊN XUỐNG */}
        <div 
          className="relative w-full h-[52px] cursor-grab active:cursor-grabbing overflow-hidden"
          onMouseDown={handleMouseDown}
          onWheel={handleWheel}
        >
          {/* Đổ bóng 3D mờ dần ở 2 mép tạo cảm giác vành bánh xe cong nhìn từ trên xuống */}
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-stone-900/40 via-stone-800/10 to-transparent pointer-events-none z-10" />
          <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-stone-900/40 via-stone-800/10 to-transparent pointer-events-none z-10" />

          {/* Đường ray thời gian ngang */}
          <div className="absolute top-[26px] left-0 right-0 h-0.5 bg-[#8c6b44]/30" />

          {/* CÁC VẠCH NGÀY THÁNG (TICKS) */}
          <div className="absolute inset-0 pointer-events-none">
            {ticks.map((t) => {
              if (t.x < -60 || t.x > containerWidth + 60) return null;

              return (
                <div 
                  key={t.dayIndex}
                  className="absolute top-0 bottom-0 flex flex-col items-center"
                  style={{ left: `${t.x}px`, transform: 'translateX(-50%)' }}
                >
                  {/* Nhãn tháng / năm ở đầu tháng */}
                  {t.isFirstDay && (
                    <span className="absolute top-0.5 text-[9px] font-black text-[#701a14] whitespace-nowrap bg-[#faeed8] px-1 rounded shadow-xs border border-[#8c6b44]/40">
                      {t.month}/{t.year}
                    </span>
                  )}

                  {/* Vạch đo ngày */}
                  <div
                    className={`w-px ${
                      t.isFirstDay
                        ? 'h-5 top-[18px] bg-[#701a14] w-[1.5px]'
                        : t.isFullMoon
                        ? 'h-3.5 top-[21px] bg-[#8c6b44] w-[1px]'
                        : 'h-2 top-[24px] bg-[#b39775]/60'
                    }`}
                  />

                  {/* Số ngày */}
                  {(t.isFirstDay || t.isFullMoon || t.day % 5 === 0) && (
                    <span 
                      className={`absolute top-[34px] text-[8px] font-mono leading-none ${
                        t.isFirstDay ? 'font-bold text-[#701a14]' : 'text-stone-600'
                      }`}
                    >
                      {t.day}
                    </span>
                  )}

                  {/* Dấu son đỏ mốc lịch sử */}
                  {t.milestone && (
                    <div 
                      className="absolute top-[10px] w-2 h-2 rounded-full shadow-xs animate-ping"
                      style={{ backgroundColor: t.milestone.color }}
                      title={`${t.milestone.title}: Ngày ${t.milestone.day}/${t.milestone.month}/${t.milestone.year}`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* 3. DUY NHẤT 1 MŨI TÊN HƯỚNG LÊN TRÊN Ở CHÍNH GIỮA */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center">
            {/* Vạch kim mảnh đỏ xuyên tâm chỉ ngày */}
            <div className="w-[1.5px] h-7 bg-red-600 shadow-[0_0_6px_rgba(239,68,68,0.9)]" />
            
            {/* Mũi tên đỏ duy nhất trỏ lên trên */}
            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-red-600 filter drop-shadow-[0_-2px_4px_rgba(220,38,38,0.8)]" />
          </div>

        </div>
      </div>
    </div>
  );
};
