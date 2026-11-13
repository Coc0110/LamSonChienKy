import React, { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { TimeSpeedControls } from './topbar/TimeSpeedControls';
import { TroopsDropdown } from './topbar/TroopsDropdown';
import { SuppliesDropdown } from './topbar/SuppliesDropdown';

export const TopBar: React.FC = React.memo(() => {
  const food = useGameStore(state => state.resources.food);
  const gold = useGameStore(state => state.resources.gold);
  const timeMode = useGameStore(state => state.timeMode);
  const setTimeMode = useGameStore(state => state.setTimeMode);
  const previousActiveTimeMode = useGameStore(state => state.previousActiveTimeMode);
  const togglePause = useGameStore(state => state.togglePause);
  
  const activeDropdown = useUIStore(state => state.activeDropdown);
  const setActiveDropdown = useUIStore(state => state.setActiveDropdown);
  const isMilitaryBookOpen = useUIStore(state => state.isMilitaryBookOpen);
  const toggleMilitaryBook = useUIStore(state => state.toggleMilitaryBook);
  const militaryNotices = useGameStore(state => state.militaryNotices || []);
  const unreadNoticesCount = militaryNotices.filter(n => !n.read).length;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.topbar-dropdown-container') && !target.closest('.topbar-paper-panel')) {
        setActiveDropdown(null);
      }
    };
    if (activeDropdown) {
      window.addEventListener('click', handleOutsideClick);
    }
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, [activeDropdown, setActiveDropdown]);

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-[2600] pointer-events-none filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.65)] drop-shadow-[0_2px_5px_rgba(0,0,0,0.4)]">
      {/* 1 TỜ GIẤY PHỦ KÍN 3 MẶT (TRÊN, TRÁI, PHẢI), SỨT MẺ DƯỚI */}
      <div className="relative w-full h-[72px] md:h-[78px] pointer-events-auto select-none flex items-center">
        {/* Nền giấy cổ sáng sạch, mép dưới rách sứt mẻ tự nhiên */}
        <img
          src="/parchment_header_full.png"
          alt="Giấy quân lương phủ mép trên"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
          draggable={false}
        />

        {/* Toàn bộ chữ và số nằm ở vùng giấy sáng sạch phía trên */}
        <div className="relative z-10 w-full px-3 md:px-5 flex items-center justify-between pb-2 md:pb-2.5 text-xs md:text-sm font-serif font-bold text-[#2a1708]">
          
          {/* CỤM THỜI GIAN & ĐỔI CHẾ ĐỘ: VỆT MỰC PHỦ LÊN TOÀN BỘ Ô NÀY (TỪ NÚT ĐỔI CHẾ ĐỘ ĐẾN HẾT Ô NGÀY THÁNG) */}
          <div className={`relative flex items-center shrink-0 ml-1 md:ml-3 ${
            (timeMode === 'hour' || (timeMode === 'pause' && previousActiveTimeMode === 'hour'))
              ? 'w-[405px] md:w-[420px]'
              : 'w-[295px] md:w-[305px]'
          } h-[44px] px-2 select-none transition-all duration-300`}>
            {/* VỆT MỰC BỀ DÀY LỚN GẤP ĐÔI, PHỦ KÉO DÀI SANG TRÁI HÀO PHÓNG */}
            <div className="absolute -left-14 -right-6 -inset-y-2 pointer-events-none z-0 overflow-hidden">
              <img
                src={
                  timeMode === 'pause'
                    ? "/ink_stroke_blue.png"
                    : timeMode === 'hour'
                    ? "/ink_stroke_red.png"
                    : "/ink_stroke_brown.png"
                }
                alt="Vệt mực thời gian"
                className="w-full h-full object-fill pointer-events-none"
              />
            </div>

            {/* CỤM NÚT ĐỔI CHẾ ĐỘ: NỀN VỆT MỰC ĐEN THỦY MẶC THAY CHO Ô NỀN MÀU */}
            <div className="relative z-10 w-[104px] shrink-0 flex items-center justify-start gap-1 p-0">
              {timeMode === 'pause' ? (
                <button
                  type="button"
                  onClick={() => togglePause()}
                  className="relative w-[100px] h-[28px] flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer text-center"
                  title="Dòng thời gian đang Tạm Ngưng · Nhấp để tiếp tục chạy"
                >
                  <img
                    src="/ink_stroke_1.png"
                    alt="Vết mực đen"
                    className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                  />
                  <span className="relative z-10 font-serif font-black text-xs md:text-sm text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                    Ngưng
                  </span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setTimeMode('day')}
                    className="relative w-[48px] h-[28px] flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer text-center"
                    title="Chế độ Ngày (1 ngày / giây)"
                  >
                    {timeMode === 'day' && (
                      <img
                        src="/ink_stroke_1.png"
                        alt="Vết mực đen"
                        className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                      />
                    )}
                    <span className={`relative z-10 font-serif font-black text-xs md:text-sm ${
                      timeMode === 'day'
                        ? 'text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]'
                        : 'text-[#fef2d6]/75 hover:text-white'
                    }`}>
                      Ngày
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeMode('hour')}
                    className="relative w-[48px] h-[28px] flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer text-center"
                    title="Chế độ Giờ (1 canh giờ / giây)"
                  >
                    {timeMode === 'hour' && (
                      <img
                        src="/ink_stroke_1.png"
                        alt="Vết mực đen"
                        className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                      />
                    )}
                    <span className={`relative z-10 font-serif font-black text-xs md:text-sm ${
                      timeMode === 'hour'
                        ? 'text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]'
                        : 'text-[#fef2d6]/75 hover:text-white'
                    }`}>
                      Giờ
                    </span>
                  </button>
                </>
              )}
            </div>

            {/* Phân cách mờ thanh mảnh cố định trên nền vệt mực */}
            <div className="w-px h-5 bg-white/25 shrink-0 self-center mx-1.5 z-10" />

            {/* KHỐI THỜI GIAN */}
            <TimeSpeedControls />
          </div>

          {/* DÃY CHỈ SỐ QUÂN LƯƠNG & TÀI NGUYÊN QUỐC GIA PHÍA BÊN PHẢI */}
          <div className="flex items-center gap-2 md:gap-3.5 mr-2 md:mr-4 overflow-x-auto no-scrollbar whitespace-nowrap py-0.5">
            {/* QUÂN LỰC DROPDOWN */}
            <TroopsDropdown />

            {/* Phân cách */}
            <div className="w-px h-6 bg-[#8c6b44]/40 shrink-0 self-center" />

            {/* QUÂN LƯƠNG */}
            <div className="flex items-center gap-1.5 shrink-0 self-center" title="Quân lương dự trữ">
              <img 
                src="/icons/food.png" 
                alt="Lương" 
                className="w-8 h-8 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
              />
              <span className={food <= 0 ? "text-[#8a180b] font-black" : ""}>
                Lương: {Math.floor(food).toLocaleString()}
              </span>
            </div>

            {/* Phân cách */}
            <div className="w-px h-6 bg-[#8c6b44]/40 shrink-0 self-center" />

            {/* KHÍ GIỚI DROPDOWN */}
            <SuppliesDropdown />

            {/* Phân cách */}
            <div className="w-px h-6 bg-[#8c6b44]/40 shrink-0 self-center" />

            {/* VÀNG (NGÂN KHỐ) */}
            <div className="flex items-center gap-1.5 shrink-0 self-center" title="Ngân quỹ vàng">
              <img 
                src="/icons/gold.png" 
                alt="Ngân khố" 
                className="w-7 h-7 object-contain translate-y-[3px] filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
              />
              <span className="leading-none">Ngân khố: {Math.floor(gold).toLocaleString()}</span>
            </div>

            {/* Phân cách */}
            <div className="w-px h-6 bg-[#8c6b44]/40 shrink-0 self-center" />

            {/* QUÂN THƯ (TOGGLE PANE Ở PHÍA TRÊN CÙNG BÊN PHẢI) */}
            <button
              type="button"
              onClick={() => toggleMilitaryBook()}
              className={`relative flex items-center gap-1.5 px-3 py-1 rounded transition-all cursor-pointer ${
                isMilitaryBookOpen ? 'scale-105' : 'hover:bg-black/[0.06] active:scale-95'
              }`}
              title="Quân Thư & Tin Báo Quân Cơ (Nhấp để bật/tắt)"
            >
              {isMilitaryBookOpen && (
                <img
                  src="/ink_stroke_red.png"
                  alt="Vết mực đỏ"
                  className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                />
              )}
              <div className="relative z-10 w-6 h-6 flex items-center justify-center">
                <img
                  src="/icons/scroll.png"
                  alt="Quân Thư"
                  className="w-full h-full object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
                />
                {unreadNoticesCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 bg-[#8c2d19] text-[#fff3db] border border-[#fef08a] rounded-full text-[9px] font-mono font-bold flex items-center justify-center shadow-md animate-pulse">
                    {unreadNoticesCount}
                  </span>
                )}
              </div>
              <span className={`relative z-10 font-serif font-black text-xs md:text-sm leading-none ${
                isMilitaryBookOpen
                  ? 'text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]'
                  : 'text-[#2a1708]'
              }`}>
                Quân Thư
              </span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
});

TopBar.displayName = 'TopBar';
