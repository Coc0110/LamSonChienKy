import React, { useRef, useEffect } from 'react';
import { 
  Edit3, 
  Check,
} from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';

const SPEED_OPTIONS = [0, 1, 2, 5, 10, 50] as const;

export const TopBar: React.FC = () => {
  const { 
    day, 
    month, 
    year, 
    isPaused, 
    gameSpeed, 
    togglePause, 
    setSpeed, 
    resources,
    militaryNotices,
  } = useGameStore();

  const { 
    toggleEditMode, 
    isEditMode, 
    isMilitaryBookOpen, 
    toggleMilitaryBook,
    isBuildPaperOpen,
    toggleBuildPaper,
    activeModal,
    setActiveModal,
    activeDropdown,
    toggleDropdown,
    setActiveDropdown,
  } = useUIStore();

  const unreadNoticesCount = (militaryNotices || []).filter(n => !n.read).length;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.topbar-dropdown-container')) {
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
    <header className="fixed top-0 left-0 right-0 w-full z-40 pointer-events-none filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.65)] drop-shadow-[0_2px_5px_rgba(0,0,0,0.4)]">
      {/* 1 TỜ GIẤY PHỦ KÍN 3 MẶT (TRÊN, TRÁI, PHẢI), SỨT MẺ DƯỚI */}
      <div 
        className="relative w-full h-[72px] md:h-[78px] pointer-events-auto select-none flex items-start"
      >
        {/* Nền giấy cổ sáng sạch, mép dưới rách sứt mẻ tự nhiên */}
        <img
          src="/parchment_header_full.png"
          alt="Giấy quân lương phủ mép trên"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
          draggable={false}
        />

        {/* Toàn bộ chữ và số nằm ở vùng giấy sáng sạch phía trên */}
        <div className="relative z-10 w-full pt-1 px-4 md:px-7 flex items-center justify-between text-xs md:text-sm font-serif font-bold text-[#2a1708]">
          
          {/* DÃY CHỈ SỐ QUÂN LƯƠNG & CỤM THỜI GIAN */}
          <div className="flex items-center gap-2 md:gap-3.5 overflow-x-auto no-scrollbar whitespace-nowrap py-0.5">
            
            {/* 0. NÚT QUÂN THƯ (Icon cuộn giấy trúc x1.5, khi chọn chỉ tô đen phần chữ và ẩn icon) */}
            <button
              onClick={toggleMilitaryBook}
              type="button"
              className={`relative px-2 py-1 flex items-center justify-center gap-1.5 transition-all cursor-pointer rounded self-center ${
                isMilitaryBookOpen 
                  ? 'scale-105' 
                  : 'hover:scale-105 active:scale-95 hover:bg-black/[0.05]'
              }`}
              title="Mở Quân Thư & Danh Sách Cứ Điểm"
            >
              {!isMilitaryBookOpen && (
                <img 
                  src="/icons/scroll.png" 
                  alt="Quân Thư" 
                  className="w-6 h-6 object-contain relative z-10 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
                />
              )}
              {isMilitaryBookOpen ? (
                <div className="relative px-3.5 py-1 flex items-center justify-center">
                  <img
                    src="/ink_stroke_1.png"
                    alt="Vết mực"
                    className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                  />
                  <span className="relative z-10 font-serif font-black text-xs md:text-sm tracking-wide text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                    Quân Thư
                  </span>
                </div>
              ) : (
                <span className="relative z-10 font-serif font-black text-xs md:text-sm tracking-wide text-[#261304]">
                  Quân Thư
                </span>
              )}

              {/* Vết mực đỏ đề số lượng tin báo quân sự chưa đọc */}
              {unreadNoticesCount > 0 && (
                <div 
                  className="absolute -top-1.5 -right-2 z-20 min-w-[22px] h-[20px] px-1 flex items-center justify-center animate-pulse pointer-events-none select-none"
                  title={`${unreadNoticesCount} tin báo quân sự mới`}
                >
                  <img
                    src="/ink_stroke_red.png"
                    alt="Vết mực đỏ"
                    className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]"
                  />
                  <span className="relative z-10 text-[#fff5ea] text-[10px] font-serif font-black leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
                    {unreadNoticesCount > 99 ? '99+' : unreadNoticesCount}
                  </span>
                </div>
              )}
            </button>

            {/* 0.5. NÚT XÂY DỰNG (Icon Doanh trại / Căn cứ x1.5, khi chọn chỉ tô đen phần chữ và ẩn icon) */}
            <button
              onClick={toggleBuildPaper}
              type="button"
              className={`relative px-2 py-1 flex items-center justify-center gap-1.5 transition-all cursor-pointer rounded self-center ${
                isBuildPaperOpen 
                  ? 'scale-105' 
                  : 'hover:scale-105 active:scale-95 hover:bg-black/[0.05]'
              }`}
              title="Mở Bảng Công Trình Xây Dựng (Căn Cứ, Ruộng Nương, Lò Rèn)"
            >
              {!isBuildPaperOpen && (
                <img 
                  src="/icons/structure_camp.png" 
                  alt="Xây Dựng" 
                  className="w-6 h-6 object-contain relative z-10 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
                />
              )}
              {isBuildPaperOpen ? (
                <div className="relative px-3.5 py-1 flex items-center justify-center">
                  <img
                    src="/ink_stroke_1.png"
                    alt="Vết mực"
                    className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                  />
                  <span className="relative z-10 font-serif font-black text-xs md:text-sm tracking-wide text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                    Xây Dựng
                  </span>
                </div>
              ) : (
                <span className="relative z-10 font-serif font-black text-xs md:text-sm tracking-wide text-[#261304]">
                  Xây Dựng
                </span>
              )}
            </button>

            {/* 0.6. NÚT THẺ TƯỚNG (Icon lệnh bài tướng x1.5, cạnh Xây Dựng) */}
            <button
              onClick={() => setActiveModal(activeModal === 'generals' ? null : 'generals')}
              type="button"
              className={`relative px-2 py-1 flex items-center justify-center gap-1.5 transition-all cursor-pointer rounded self-center ${
                activeModal === 'generals' 
                  ? 'scale-105' 
                  : 'hover:scale-105 active:scale-95 hover:bg-black/[0.05]'
              }`}
              title="Mở Thẻ Tướng (Bảng Lệnh Bài Danh Tướng Lam Sơn)"
            >
              {activeModal !== 'generals' && (
                <img 
                  src="/icons/general_token.png" 
                  alt="Thẻ Tướng" 
                  className="w-6 h-6 object-contain relative z-10 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
                />
              )}
              {activeModal === 'generals' ? (
                <div className="relative px-3.5 py-1 flex items-center justify-center">
                  <img
                    src="/ink_stroke_1.png"
                    alt="Vết mực"
                    className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                  />
                  <span className="relative z-10 font-serif font-black text-xs md:text-sm tracking-wide text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                    Thẻ Tướng
                  </span>
                </div>
              ) : (
                <span className="relative z-10 font-serif font-black text-xs md:text-sm tracking-wide text-[#261304]">
                  Thẻ Tướng
                </span>
              )}
            </button>

            {/* Phân cách */}
            <div className="w-px h-8 bg-[#8c6b44]/40 shrink-0 self-center" />

            {/* 1. KHỐI THỜI GIAN VÀ CÁC NÚT TỐC ĐỘ DẠNG VẾT MỰC PHÍA DƯỚI */}
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
                      title={speed === 0 ? "Tạm dừng (0x)" : `Tốc độ ${speed}x (1 ngày = ${2 / (speed || 1)}s)`}
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

            {/* Phân cách */}
            <div className="w-px h-8 bg-[#8c6b44]/40 shrink-0 self-center" />

            {/* 2. QUÂN LỰC (Icon Binh Lính x2, khi chọn chỉ tô đen phần chữ và ẩn icon, nhấn để mở giấy chi tiết) */}
            <div className="relative topbar-dropdown-container shrink-0 self-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDropdown('troops');
                }}
                className={`relative px-1.5 py-0.5 rounded flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeDropdown === 'troops'
                    ? 'scale-105'
                    : 'hover:bg-black/[0.04] active:scale-95'
                }`}
                title="Bấm để xem danh sách chi tiết các binh chủng"
              >
                {activeDropdown !== 'troops' && (
                  <img 
                    src="/icons/soldier_bust.png" 
                    alt="Quân" 
                    className="w-8 h-8 object-contain relative z-10 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
                  />
                )}
                {activeDropdown === 'troops' ? (
                  <div className="relative px-3.5 py-1 flex items-center justify-center">
                    <img
                      src="/ink_stroke_1.png"
                      alt="Vết mực"
                      className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                    />
                    <span className="relative z-10 font-serif font-bold text-xs md:text-sm text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                      Quân: {Math.floor(resources.troops).toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <span className="relative z-10 font-serif font-bold text-[#2a1708]">
                    Quân: {Math.floor(resources.troops).toLocaleString()}
                  </span>
                )}
              </button>

              {/* Tờ giấy xổ xuống: Danh sách chi tiết binh chủng */}
              {activeDropdown === 'troops' && (
                <div 
                  className="absolute top-[42px] left-0 w-64 z-50 p-3 flex flex-col filter drop-shadow-[0_14px_28px_rgba(0,0,0,0.7)] drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)] animate-in fade-in slide-in-from-top-1 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src="/parchment_torn_panel.png"
                    alt="Giấy binh chủng"
                    className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
                  />
                  <div className="relative z-10 font-serif pt-1 px-1">
                    <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#8c6b44]/30">
                      <span className="font-bold text-xs uppercase tracking-wider text-[#8c2d19]">
                        Binh Chủng Nghĩa Binh
                      </span>
                      <span className="text-[11px] font-bold text-[#5c3e23]">
                        {Math.floor(resources.troops).toLocaleString()} đinh
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-[#2a1708]">
                      {/* 1. Quân binh (Kiếm) */}
                      <div className="flex items-center justify-between px-2 py-1 rounded hover:bg-black/[0.04] transition">
                        <div className="flex items-center gap-2">
                          <img src="/icons/unit_sword.png" alt="Kiếm binh" className="w-6 h-6 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
                          <span className="font-bold">Quân binh (Kiếm)</span>
                        </div>
                        <span className="font-mono font-bold text-[#8c2d19]">
                          {Math.floor(resources.troops * 0.45).toLocaleString()}
                        </span>
                      </div>

                      {/* 2. Cung thủ */}
                      <div className="flex items-center justify-between px-2 py-1 rounded hover:bg-black/[0.04] transition">
                        <div className="flex items-center gap-2">
                          <img src="/icons/unit_bow.png" alt="Cung thủ" className="w-6 h-6 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
                          <span className="font-bold">Cung thủ</span>
                        </div>
                        <span className="font-mono font-bold text-[#8c2d19]">
                          {Math.floor(resources.troops * 0.25).toLocaleString()}
                        </span>
                      </div>

                      {/* 3. Giáo binh */}
                      <div className="flex items-center justify-between px-2 py-1 rounded hover:bg-black/[0.04] transition">
                        <div className="flex items-center gap-2">
                          <img src="/icons/unit_spear.png" alt="Giáo binh" className="w-6 h-6 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
                          <span className="font-bold">Giáo binh</span>
                        </div>
                        <span className="font-mono font-bold text-[#8c2d19]">
                          {Math.max(0, Math.floor(resources.troops) - Math.floor(resources.troops * 0.45) - Math.floor(resources.troops * 0.25)).toLocaleString()}
                        </span>
                      </div>

                      {/* 4. Kỵ binh */}
                      <div className="flex items-center justify-between px-2 py-1 rounded hover:bg-black/[0.04] transition">
                        <div className="flex items-center gap-2">
                          <img src="/icons/unit_cavalry.png" alt="Kỵ binh" className="w-6 h-6 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
                          <span className="font-bold">Kỵ binh</span>
                        </div>
                        <span className="font-mono font-bold text-[#8c2d19]">
                          {Math.floor(resources.horses).toLocaleString()}
                        </span>
                      </div>

                      {/* 5. Tượng binh */}
                      <div className="flex items-center justify-between px-2 py-1 rounded hover:bg-black/[0.04] transition">
                        <div className="flex items-center gap-2">
                          <img src="/icons/unit_elephant.png" alt="Tượng binh" className="w-6 h-6 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
                          <span className="font-bold">Tượng binh</span>
                        </div>
                        <span className="font-mono font-bold text-[#8c2d19]">
                          {Math.floor(resources.elephants).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Phân cách */}
            <div className="w-px h-6 bg-[#8c6b44]/40 shrink-0 self-center" />

            {/* 3. QUÂN LƯƠNG (Icon Bao Lương Thảo x2: 32px) */}
            <div className="flex items-center gap-1.5 shrink-0 self-center" title="Quân lương dự trữ">
              <img 
                src="/icons/food.png" 
                alt="Lương" 
                className="w-8 h-8 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
              />
              <span className={resources.food <= 0 ? "text-[#8a180b] font-black" : ""}>
                Lương: {Math.floor(resources.food).toLocaleString()}
              </span>
            </div>

            {/* Phân cách */}
            <div className="w-px h-6 bg-[#8c6b44]/40 shrink-0 self-center" />

            {/* 4. KHÍ GIỚI (Cây thương chéo đè lên cây kiếm, khi chọn chỉ tô đen phần chữ và ẩn icon, nhấn để mở giấy chi tiết) */}
            <div className="relative topbar-dropdown-container shrink-0 self-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDropdown('weapons');
                }}
                className={`relative px-1.5 py-0.5 rounded flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeDropdown === 'weapons'
                    ? 'scale-105'
                    : 'hover:bg-black/[0.04] active:scale-95'
                }`}
                title="Bấm để xem danh sách chi tiết các loại khí giới"
              >
                {activeDropdown !== 'weapons' && (
                  <img 
                    src="/icons/weapon_crossed.png" 
                    alt="Khí giới" 
                    className="w-8 h-8 object-contain relative z-10 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
                  />
                )}
                {activeDropdown === 'weapons' ? (
                  <div className="relative px-3.5 py-1 flex items-center justify-center">
                    <img
                      src="/ink_stroke_1.png"
                      alt="Vết mực"
                      className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                    />
                    <span className="relative z-10 font-serif font-bold text-xs md:text-sm text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                      Khí giới: {Math.floor(resources.weapons).toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <span className="relative z-10 font-serif font-bold text-[#2a1708]">
                    Khí giới: {Math.floor(resources.weapons).toLocaleString()}
                  </span>
                )}
              </button>

              {/* Tờ giấy xổ xuống: Danh sách chi tiết khí giới */}
              {activeDropdown === 'weapons' && (
                <div 
                  className="absolute top-[42px] left-0 w-60 z-50 p-3 flex flex-col filter drop-shadow-[0_14px_28px_rgba(0,0,0,0.7)] drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)] animate-in fade-in slide-in-from-top-1 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src="/parchment_torn_panel.png"
                    alt="Giấy khí giới"
                    className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
                  />
                  <div className="relative z-10 font-serif pt-1 px-1">
                    <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#8c6b44]/30">
                      <span className="font-bold text-xs uppercase tracking-wider text-[#8c2d19]">
                        Kho Khí Giới
                      </span>
                      <span className="text-[11px] font-bold text-[#5c3e23]">
                        {Math.floor(resources.weapons).toLocaleString()} món
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-[#2a1708]">
                      {/* 1. Kiếm */}
                      <div className="flex items-center justify-between px-2 py-1 rounded hover:bg-black/[0.04] transition">
                        <div className="flex items-center gap-2">
                          <img src="/icons/weapon_sword.png" alt="Kiếm" className="w-6 h-6 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
                          <span className="font-bold">Kiếm</span>
                        </div>
                        <span className="font-mono font-bold text-[#8c2d19]">
                          {Math.floor(resources.weapons * 0.35).toLocaleString()}
                        </span>
                      </div>

                      {/* 2. Cung */}
                      <div className="flex items-center justify-between px-2 py-1 rounded hover:bg-black/[0.04] transition">
                        <div className="flex items-center gap-2">
                          <img src="/icons/weapon_bow.png" alt="Cung" className="w-6 h-6 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
                          <span className="font-bold">Cung</span>
                        </div>
                        <span className="font-mono font-bold text-[#8c2d19]">
                          {Math.floor(resources.weapons * 0.25).toLocaleString()}
                        </span>
                      </div>

                      {/* 3. Giáo */}
                      <div className="flex items-center justify-between px-2 py-1 rounded hover:bg-black/[0.04] transition">
                        <div className="flex items-center gap-2">
                          <img src="/icons/weapon_spear.png" alt="Giáo" className="w-6 h-6 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
                          <span className="font-bold">Giáo</span>
                        </div>
                        <span className="font-mono font-bold text-[#8c2d19]">
                          {Math.floor(resources.weapons * 0.30).toLocaleString()}
                        </span>
                      </div>

                      {/* 4. Giáp */}
                      <div className="flex items-center justify-between px-2 py-1 rounded hover:bg-black/[0.04] transition">
                        <div className="flex items-center gap-2">
                          <img src="/icons/weapon_armor.png" alt="Giáp" className="w-6 h-6 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
                          <span className="font-bold">Giáp</span>
                        </div>
                        <span className="font-mono font-bold text-[#8c2d19]">
                          {Math.max(0, Math.floor(resources.weapons) - Math.floor(resources.weapons * 0.35) - Math.floor(resources.weapons * 0.25) - Math.floor(resources.weapons * 0.30)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Phân cách */}
            <div className="w-px h-6 bg-[#8c6b44]/40 shrink-0 self-center" />

            {/* 5. VÀNG (NGÂN KHỐ - Icon Vàng x2: 32px) */}
            <div className="flex items-center gap-1.5 shrink-0 self-center" title="Ngân quỹ vàng">
              <img 
                src="/icons/gold.png" 
                alt="Ngân khố" 
                className="w-8 h-8 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
              />
              <span>Vàng: {Math.floor(resources.gold).toLocaleString()}</span>
            </div>

            {/* Phân cách */}
            <div className="w-px h-6 bg-[#8c6b44]/40 shrink-0 self-center" />

            {/* 6. SĨ KHÍ (Icon Cờ Khởi Nghĩa x2: 32px) */}
            <div className="flex items-center gap-1.5 shrink-0 self-center" title="Sĩ khí nghĩa quân">
              <img 
                src="/icons/flag.png" 
                alt="Sĩ khí" 
                className="w-8 h-8 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
              />
              <span className="text-[#1c4521]">Sĩ khí: {Math.floor(resources.morale)}</span>
            </div>
          </div>

          {/* 7. NÚT SỬA MAP (Ngay trên tờ giấy phía bên phải) */}
          <div className="shrink-0 pl-2 self-center">
            <button
              onClick={toggleEditMode}
              className={`relative px-2.5 py-1 rounded transition-transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 text-xs font-serif font-black uppercase tracking-wider ${
                isEditMode 
                  ? 'bg-[#8c2d19] text-[#fceddc] shadow-sm' 
                  : 'hover:bg-black/[0.06] text-[#8c2d19]'
              }`}
              title="Bật/Tắt chế độ chỉnh sửa bản đồ"
            >
              {isEditMode ? (
                <>
                  <Check size={13} className="text-[#fef08a]" />
                  <span className="text-[#fef08a]">XONG SỬA MAP</span>
                </>
              ) : (
                <>
                  <Edit3 size={13} />
                  <span>SỬA MAP</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
