import React, { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { TimeSpeedControls } from './topbar/TimeSpeedControls';
import { TroopsDropdown } from './topbar/TroopsDropdown';
import { SuppliesDropdown } from './topbar/SuppliesDropdown';
// import { GameSaveMenu } from './topbar/GameSaveMenu'; // Tạm thời ẩn theo yêu cầu

export const TopBar: React.FC = React.memo(() => {
  const food = useGameStore(state => state.resources.food);
  const gold = useGameStore(state => state.resources.gold);
  // const morale = useGameStore(state => state.resources.morale);
  const militaryNotices = useGameStore(state => state.militaryNotices);
  const isMilitaryBookOpen = useUIStore(state => state.isMilitaryBookOpen);
  const toggleMilitaryBook = useUIStore(state => state.toggleMilitaryBook);
  const isBuildPaperOpen = useUIStore(state => state.isBuildPaperOpen);
  const toggleBuildPaper = useUIStore(state => state.toggleBuildPaper);
  const activeModal = useUIStore(state => state.activeModal);
  const setActiveModal = useUIStore(state => state.setActiveModal);
  const timeMode = useGameStore(state => state.timeMode);
  const setTimeMode = useGameStore(state => state.setTimeMode);
  const togglePause = useGameStore(state => state.togglePause);
  
  const activeDropdown = useUIStore(state => state.activeDropdown);
  const setActiveDropdown = useUIStore(state => state.setActiveDropdown);

  const unreadNoticesCount = (militaryNotices || []).filter(n => !n.read).length;

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
          
          {/* DÃY CHỈ SỐ QUÂN LƯƠNG & CỤM THỜI GIAN */}
          <div className="flex items-center gap-1.5 md:gap-2.5 overflow-x-auto no-scrollbar whitespace-nowrap py-0.5">
            
            {/* 0. NÚT QUÂN THƯ */}
            <button
              onClick={toggleMilitaryBook}
              className={`relative px-1.5 py-0.5 rounded flex items-center gap-1.5 transition-all cursor-pointer ${
                isMilitaryBookOpen ? 'scale-105' : 'hover:bg-black/[0.04] active:scale-95'
              }`}
              title="Mở Quân Thư (Xem thư từ quân sự & lịch sử thu hoạch/rèn khí giới)"
            >
              {!isMilitaryBookOpen && (
                <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                  <img 
                    src="/icons/scroll.png" 
                    alt="Quân Thư" 
                    className="w-full h-full object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
                  />
                  {unreadNoticesCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#8c2d19] text-[#fff3db] border border-[#fef08a] rounded-full text-[9px] font-mono font-bold flex items-center justify-center shadow-md animate-pulse">
                      {unreadNoticesCount}
                    </span>
                  )}
                </div>
              )}
              {isMilitaryBookOpen ? (
                <div className="relative px-3.5 py-1 flex items-center justify-center">
                  <img
                    src="/ink_stroke_1.png"
                    alt="Vết mực"
                    className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                  />
                  <span className="relative z-10 font-serif font-bold text-xs md:text-sm text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                    Quân Thư
                  </span>
                </div>
              ) : (
                <span className="relative z-10 font-serif font-bold text-[#2a1708]">
                  Quân Thư
                </span>
              )}
            </button>

            {/* Phân cách */}
            <div className="w-px h-6 bg-[#8c6b44]/40 shrink-0 self-center" />

            {/* 0.5. NÚT XÂY DỰNG CÔNG TRÌNH */}
            <button
              onClick={toggleBuildPaper}
              className={`relative px-1.5 py-0.5 rounded flex items-center gap-1.5 transition-all cursor-pointer ${
                isBuildPaperOpen ? 'scale-105' : 'hover:bg-black/[0.04] active:scale-95'
              }`}
              title="Mở bảng xây dựng công trình (Căn cứ, Ruộng, Lò rèn)"
            >
              {!isBuildPaperOpen && (
                <img 
                  src="/icons/structure_camp.png" 
                  alt="Xây Dựng" 
                  className="w-8 h-8 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
                />
              )}
              {isBuildPaperOpen ? (
                <div className="relative px-3.5 py-1 flex items-center justify-center">
                  <img
                    src="/ink_stroke_1.png"
                    alt="Vết mực"
                    className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                  />
                  <span className="relative z-10 font-serif font-bold text-xs md:text-sm text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                    Xây Dựng
                  </span>
                </div>
              ) : (
                <span className="relative z-10 font-serif font-bold text-[#2a1708]">
                  Xây Dựng
                </span>
              )}
            </button>

            {/* Phân cách */}
            <div className="w-px h-6 bg-[#8c6b44]/40 shrink-0 self-center" />

            {/* 0.6. NÚT THẺ TƯỚNG */}
            <button
              onClick={() => setActiveModal(activeModal === 'generals' ? null : 'generals')}
              className={`relative px-1.5 py-0.5 rounded flex items-center gap-1.5 transition-all cursor-pointer ${
                activeModal === 'generals' ? 'scale-105' : 'hover:bg-black/[0.04] active:scale-95'
              }`}
              title="Mở Thẻ Tướng (Bảng Lệnh Bài Danh Tướng Lam Sơn)"
            >
              {activeModal !== 'generals' && (
                <img 
                  src="/icons/general_token.png" 
                  alt="Thẻ Tướng" 
                  className="w-8 h-8 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
                />
              )}
              {activeModal === 'generals' ? (
                <div className="relative px-3.5 py-1 flex items-center justify-center">
                  <img
                    src="/ink_stroke_1.png"
                    alt="Vết mực"
                    className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                  />
                  <span className="relative z-10 font-serif font-bold text-xs md:text-sm text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                    Thẻ Tướng
                  </span>
                </div>
              ) : (
                <span className="relative z-10 font-serif font-bold text-[#2a1708]">
                  Thẻ Tướng
                </span>
              )}
            </button>

            {/* Phân cách */}
            <div className="w-px h-6 bg-[#8c6b44]/40 shrink-0 self-center" />

            {/* 0.7. NÚT BỐ TRẬN SA BÀN */}
            <button
              onClick={() => setActiveModal(activeModal === 'army' ? null : 'army')}
              className={`relative px-1.5 py-0.5 rounded flex items-center gap-1.5 transition-all cursor-pointer ${
                activeModal === 'army' ? 'scale-105' : 'hover:bg-black/[0.04] active:scale-95'
              }`}
              title="Mở Sa Bàn Bố Trận (Sắp xếp từng người lính và quản lý các đạo quân chờ)"
            >
              {activeModal !== 'army' && (
                <img 
                  src="/icons/flag.png" 
                  alt="Bố Trận" 
                  className="w-8 h-8 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
                />
              )}
              {activeModal === 'army' ? (
                <div className="relative px-3.5 py-1 flex items-center justify-center">
                  <img
                    src="/ink_stroke_1.png"
                    alt="Vết mực"
                    className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                  />
                  <span className="relative z-10 font-serif font-bold text-xs md:text-sm text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                    Bố Trận
                  </span>
                </div>
              ) : (
                <span className="relative z-10 font-serif font-bold text-[#2a1708]">
                  Bố Trận
                </span>
              )}
            </button>



            {/* Phân cách */}
            <div className="w-px h-6 bg-[#8c6b44]/40 shrink-0 self-center" />

            {/* CỤM THỜI GIAN & ĐỔI CHẾ ĐỘ: VỆT MỰC PHỦ LÊN TOÀN BỘ Ô NÀY (TỪ NÚT ĐỔI CHẾ ĐỘ ĐẾN HẾT Ô NGÀY THÁNG) */}
            <div className="relative flex items-center shrink-0 gap-2 pl-2 pr-3 py-0.5 min-w-[340px] md:min-w-[370px]">
              {/* VỆT MỰC PHỦ TOÀN BỘ CỤM NÀY THEO MÀU CỦA CHẾ ĐỘ */}
              <div className="absolute -left-10 -right-6 -inset-y-1.5 pointer-events-none z-0 overflow-hidden animate-fade-in">
                <img
                  src={
                    timeMode === 'pause'
                      ? "/ink_stroke_blue.png"
                      : timeMode === 'hour'
                      ? "/ink_stroke_red.png"
                      : "/ink_stroke_brown.png"
                  }
                  alt="Vệt mực thời gian"
                  className="w-full h-full object-fill opacity-95 filter drop-shadow-[0_0_12px_rgba(0,0,0,0.5)] transition-all duration-300"
                />
              </div>

              {/* 0.8. NÚT ĐỔI CHẾ ĐỘ THỜI GIAN: BÌNH THƯỜNG 2 NÚT [NGÀY][GIỜ], KHI NGƯNG THAY THẾ BẰNG 1 NÚT [NGƯNG] */}
              <div className="relative z-10 flex items-center gap-1.5 shrink-0 p-0.5">
                {timeMode === 'pause' ? (
                  <button
                    type="button"
                    onClick={() => togglePause()}
                    className="px-3.5 py-0.5 rounded font-serif font-black text-xs md:text-sm bg-sky-400 text-sky-950 shadow-md ring-1 ring-sky-200 transition-all cursor-pointer hover:scale-105 active:scale-95 whitespace-nowrap animate-in fade-in duration-150"
                    title="Dòng thời gian đang Tạm Ngưng · Nhấp để tiếp tục chạy"
                  >
                    Ngưng
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setTimeMode('day')}
                      className={`px-2.5 py-0.5 rounded font-serif font-black text-xs md:text-sm transition-all cursor-pointer whitespace-nowrap ${
                        timeMode === 'day'
                          ? 'bg-amber-300 text-stone-950 shadow-md ring-1 ring-amber-100 scale-105'
                          : 'text-[#fef2d6]/75 hover:text-white hover:bg-white/10'
                      }`}
                      title="Chế độ Ngày (1 ngày / giây)"
                    >
                      Ngày
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeMode('hour')}
                      className={`px-2.5 py-0.5 rounded font-serif font-black text-xs md:text-sm transition-all cursor-pointer whitespace-nowrap ${
                        timeMode === 'hour'
                          ? 'bg-red-400 text-stone-950 shadow-md ring-1 ring-red-200 scale-105'
                          : 'text-[#fef2d6]/75 hover:text-white hover:bg-white/10'
                      }`}
                      title="Chế độ Giờ (1 canh giờ / giây)"
                    >
                      Giờ
                    </button>
                  </>
                )}
              </div>

              {/* Phân cách mờ trên nền vệt mực */}
              <div className="w-px h-6 bg-white/20 shrink-0 self-center mx-0.5 z-10" />

              {/* 1. KHỐI THỜI GIAN */}
              <TimeSpeedControls />
            </div>

            {/* Phân cách */}
            <div className="w-px h-8 bg-[#8c6b44]/40 shrink-0 self-center" />

            {/* 2. QUÂN LỰC DROPDOWN */}
            <TroopsDropdown />

            {/* Phân cách */}
            <div className="w-px h-6 bg-[#8c6b44]/40 shrink-0 self-center" />

            {/* 3. QUÂN LƯƠNG */}
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

            {/* 4. KHÍ GIỚI DROPDOWN */}
            <SuppliesDropdown />

            {/* Phân cách */}
            <div className="w-px h-6 bg-[#8c6b44]/40 shrink-0 self-center" />

            {/* 5. VÀNG (NGÂN KHỐ) */}
            <div className="flex items-center gap-1.5 shrink-0 self-center" title="Ngân quỹ vàng">
              <img 
                src="/icons/gold.png" 
                alt="Ngân khố" 
                className="w-7 h-7 object-contain translate-y-[3px] filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
              />
              <span className="leading-none">Ngân khố: {Math.floor(gold).toLocaleString()}</span>
            </div>

{/* Tạm thời ẩn mục Sĩ Khí theo yêu cầu người dùng */}
          </div>

          {/* Tạm thời ẩn chế độ lưu trữ và chuyển nút Sửa Map xuống thanh dưới */}

        </div>
      </div>
    </header>
  );
});

TopBar.displayName = 'TopBar';
