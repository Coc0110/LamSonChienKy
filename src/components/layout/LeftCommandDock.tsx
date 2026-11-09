import React from 'react';
import { Eye, Users } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { UI_TEXT } from '../../data/uiText';

type DockTarget = 'army' | 'training' | 'scout' | 'farms' | 'forges' | 'build' | 'refugees' | 'generals' | 'military_book';

export const LeftCommandDock: React.FC = React.memo(() => {
  const activeModal = useUIStore(state => state.activeModal);
  const setActiveModal = useUIStore(state => state.setActiveModal);
  const isBuildPaperOpen = useUIStore(state => state.isBuildPaperOpen);
  const setBuildPaperOpen = useUIStore(state => state.setBuildPaperOpen);
  const isMilitaryBookOpen = useUIStore(state => state.isMilitaryBookOpen);
  const setMilitaryBookOpen = useUIStore(state => state.setMilitaryBookOpen);
  const selectCity = useUIStore(state => state.selectCity);
  
  const pendingRefugees = useGameStore(state => state.pendingRefugees || []);
  const openRefugeeModal = useGameStore(state => state.openRefugeeModal);
  const closeRefugeeModal = useGameStore(state => state.closeRefugeeModal);
  const isRefugeeModalOpen = useGameStore(state => state.isRefugeeModalOpen);
  const militaryNotices = useGameStore(state => state.militaryNotices || []);

  const pendingRefugeesCount = pendingRefugees.filter(w => !w.departed && (w.daysRemaining ?? 0) > 0).length;
  const unreadNoticesCount = militaryNotices.filter(n => !n.read).length;

  // Xử lý chuyển đổi độc quyền: Đóng toàn bộ các mục khác khi bấm vào 1 mục, không bao giờ mở chồng chéo
  const handleDockClick = (target: DockTarget) => {
    const isTargetOpen = 
      (target === 'army' && activeModal === 'army') ||
      (target === 'training' && activeModal === 'training') ||
      (target === 'scout' && activeModal === 'scout') ||
      (target === 'farms' && activeModal === 'farms') ||
      (target === 'forges' && activeModal === 'forges') ||
      (target === 'build' && isBuildPaperOpen) ||
      (target === 'refugees' && isRefugeeModalOpen) ||
      (target === 'generals' && activeModal === 'generals') ||
      (target === 'military_book' && isMilitaryBookOpen);

    // 1. Đóng sạch toàn bộ các cửa sổ đang mở
    setActiveModal(null);
    setBuildPaperOpen(false);
    setMilitaryBookOpen(false);
    if (isRefugeeModalOpen) {
      closeRefugeeModal();
    }
    selectCity(null);

    // 2. Nếu mục đó chưa mở thì kích hoạt mở mục đó
    if (!isTargetOpen) {
      if (target === 'build') {
        setBuildPaperOpen(true);
      } else if (target === 'refugees') {
        openRefugeeModal();
      } else if (target === 'military_book') {
        setMilitaryBookOpen(true);
      } else {
        setActiveModal(target);
      }
    }
  };

  return (
    <nav
      aria-label="Thanh lệnh điều hành quân vụ"
      className="fixed left-2 top-[80px] z-[2500] w-[82px] md:w-[86px] pointer-events-auto select-none filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.65)] drop-shadow-[0_2px_5px_rgba(0,0,0,0.4)]"
    >
      {/* Nền Giấy Dó sứt mẻ tự nhiên giống TopBar & LeftPanel */}
      <img
        src="/parchment_torn_panel.png"
        alt="Nền giấy dó thanh điều hành"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
        draggable={false}
      />

      {/* Nội dung danh sách nút điều hành 9 mục */}
      <div className="relative z-10 py-3.5 px-1.5 flex flex-col items-center gap-1 font-serif select-none max-h-[calc(100vh-92px)] overflow-y-auto no-scrollbar">

        {/* ========================================================================= */}
        {/* NHÓM 1: QUÂN VỤ (BINH LỰC & TÁC CHIẾN)                                     */}
        {/* ========================================================================= */}
        <span className="text-[9px] font-serif font-black uppercase tracking-widest text-[#8c5828]/80 pb-0.5">
          {UI_TEXT.leftDock.groups.military}
        </span>

        {/* 1.1. BỐ TRẬN SA BÀN */}
        <button
          type="button"
          onClick={() => handleDockClick('army')}
          className={`relative w-[74px] py-1 px-1 rounded flex flex-col items-center justify-center transition-all cursor-pointer ${
            activeModal === 'army' ? 'scale-105' : 'hover:bg-black/[0.05] active:scale-95'
          }`}
          title={UI_TEXT.leftDock.buttons.army.tooltip}
        >
          {activeModal === 'army' && (
            <img
              src="/ink_stroke_red.png"
              alt="Vết mực đỏ"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
            />
          )}
          <img
            src="/icons/flag.png"
            alt={UI_TEXT.leftDock.buttons.army.label}
            className="relative z-10 w-6 h-6 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
          />
          <span className={`relative z-10 font-serif font-black text-[11px] mt-0.5 leading-tight ${
            activeModal === 'army'
              ? 'text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]'
              : 'text-[#2a1708]'
          }`}>
            {UI_TEXT.leftDock.buttons.army.label}
          </span>
        </button>

        {/* 1.2. THAO LUYỆN */}
        <button
          type="button"
          onClick={() => handleDockClick('training')}
          className={`relative w-[74px] py-1 px-1 rounded flex flex-col items-center justify-center transition-all cursor-pointer ${
            activeModal === 'training' ? 'scale-105' : 'hover:bg-black/[0.05] active:scale-95'
          }`}
          title={UI_TEXT.leftDock.buttons.training.tooltip}
        >
          {activeModal === 'training' && (
            <img
              src="/ink_stroke_red.png"
              alt="Vết mực đỏ"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
            />
          )}
          <img
            src="/icons/war_mode_sword_spear.png"
            alt={UI_TEXT.leftDock.buttons.training.label}
            className="relative z-10 w-6 h-6 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
          />
          <span className={`relative z-10 font-serif font-black text-[11px] mt-0.5 leading-tight ${
            activeModal === 'training'
              ? 'text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]'
              : 'text-[#2a1708]'
          }`}>
            {UI_TEXT.leftDock.buttons.training.label}
          </span>
        </button>

        {/* 1.3. DO THÁM (THAY THẾ HÀNH QUÂN THEO YÊU CẦU) */}
        <button
          type="button"
          onClick={() => handleDockClick('scout')}
          className={`relative w-[74px] py-1 px-1 rounded flex flex-col items-center justify-center transition-all cursor-pointer ${
            activeModal === 'scout' ? 'scale-105' : 'hover:bg-black/[0.05] active:scale-95'
          }`}
          title={UI_TEXT.leftDock.buttons.scout.tooltip}
        >
          {activeModal === 'scout' && (
            <img
              src="/ink_stroke_red.png"
              alt="Vết mực đỏ"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
            />
          )}
          <div className="relative z-10 w-6 h-6 flex items-center justify-center">
            <Eye size={20} className={activeModal === 'scout' ? 'text-[#fff3db]' : 'text-[#8c2d19]'} />
          </div>
          <span className={`relative z-10 font-serif font-black text-[11px] mt-0.5 leading-tight ${
            activeModal === 'scout'
              ? 'text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]'
              : 'text-[#2a1708]'
          }`}>
            {UI_TEXT.leftDock.buttons.scout.label}
          </span>
        </button>

        {/* Phân cách */}
        <div className="w-12 h-px bg-[#8c6b44]/40 my-0.5 shrink-0" />

        {/* ========================================================================= */}
        {/* NHÓM 2: NỘI CHÍNH (ĐỒN ĐIỀN, LÒ RÈN, XÂY DỰNG)                           */}
        {/* ========================================================================= */}
        <span className="text-[9px] font-serif font-black uppercase tracking-widest text-[#8c5828]/80 pb-0.5">
          {UI_TEXT.leftDock.groups.domestic}
        </span>

        {/* 2.1. ĐỒN ĐIỀN */}
        <button
          type="button"
          onClick={() => handleDockClick('farms')}
          className={`relative w-[74px] py-1 px-1 rounded flex flex-col items-center justify-center transition-all cursor-pointer ${
            activeModal === 'farms' ? 'scale-105' : 'hover:bg-black/[0.05] active:scale-95'
          }`}
          title={UI_TEXT.leftDock.buttons.farms.tooltip}
        >
          {activeModal === 'farms' && (
            <img
              src="/ink_stroke_red.png"
              alt="Vết mực đỏ"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
            />
          )}
          <img
            src="/icons/structure_farm.png"
            alt={UI_TEXT.leftDock.buttons.farms.label}
            className="relative z-10 w-6 h-6 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
          />
          <span className={`relative z-10 font-serif font-black text-[11px] mt-0.5 leading-tight ${
            activeModal === 'farms'
              ? 'text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]'
              : 'text-[#2a1708]'
          }`}>
            {UI_TEXT.leftDock.buttons.farms.label}
          </span>
        </button>

        {/* 2.2. LÒ RÈN */}
        <button
          type="button"
          onClick={() => handleDockClick('forges')}
          className={`relative w-[74px] py-1 px-1 rounded flex flex-col items-center justify-center transition-all cursor-pointer ${
            activeModal === 'forges' ? 'scale-105' : 'hover:bg-black/[0.05] active:scale-95'
          }`}
          title={UI_TEXT.leftDock.buttons.forges.tooltip}
        >
          {activeModal === 'forges' && (
            <img
              src="/ink_stroke_red.png"
              alt="Vết mực đỏ"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
            />
          )}
          <img
            src="/icons/structure_forge.png"
            alt={UI_TEXT.leftDock.buttons.forges.label}
            className="relative z-10 w-6 h-6 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
          />
          <span className={`relative z-10 font-serif font-black text-[11px] mt-0.5 leading-tight ${
            activeModal === 'forges'
              ? 'text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]'
              : 'text-[#2a1708]'
          }`}>
            {UI_TEXT.leftDock.buttons.forges.label}
          </span>
        </button>

        {/* 2.3. XÂY DỰNG */}
        <button
          type="button"
          onClick={() => handleDockClick('build')}
          className={`relative w-[74px] py-1 px-1 rounded flex flex-col items-center justify-center transition-all cursor-pointer ${
            isBuildPaperOpen ? 'scale-105' : 'hover:bg-black/[0.05] active:scale-95'
          }`}
          title={UI_TEXT.leftDock.buttons.build.tooltip}
        >
          {isBuildPaperOpen && (
            <img
              src="/ink_stroke_red.png"
              alt="Vết mực đỏ"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
            />
          )}
          <img
            src="/icons/structure_camp.png"
            alt={UI_TEXT.leftDock.buttons.build.label}
            className="relative z-10 w-6 h-6 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
          />
          <span className={`relative z-10 font-serif font-black text-[11px] mt-0.5 leading-tight ${
            isBuildPaperOpen
              ? 'text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]'
              : 'text-[#2a1708]'
          }`}>
            {UI_TEXT.leftDock.buttons.build.label}
          </span>
        </button>

        {/* Phân cách */}
        <div className="w-12 h-px bg-[#8c6b44]/40 my-0.5 shrink-0" />

        {/* ========================================================================= */}
        {/* NHÓM 3: NHÂN SỰ & QUÂN CƠ                                                  */}
        {/* ========================================================================= */}
        <span className="text-[9px] font-serif font-black uppercase tracking-widest text-[#8c5828]/80 pb-0.5">
          {UI_TEXT.leftDock.groups.intelligence}
        </span>

        {/* 3.1. LƯU DÂN */}
        <button
          type="button"
          onClick={() => handleDockClick('refugees')}
          className={`relative w-[74px] py-1 px-1 rounded flex flex-col items-center justify-center transition-all cursor-pointer ${
            isRefugeeModalOpen ? 'scale-105' : 'hover:bg-black/[0.05] active:scale-95'
          }`}
          title={UI_TEXT.leftDock.buttons.refugees.tooltip}
        >
          {isRefugeeModalOpen && (
            <img
              src="/ink_stroke_red.png"
              alt="Vết mực đỏ"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
            />
          )}
          <div className="relative z-10 w-6 h-6 flex items-center justify-center">
            <Users size={20} className={isRefugeeModalOpen ? 'text-[#fff3db]' : 'text-[#8c2d19]'} />
            {pendingRefugeesCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 bg-[#8c2d19] text-[#fff3db] border border-[#fef08a] rounded-full text-[9px] font-mono font-bold flex items-center justify-center shadow-md animate-pulse">
                {pendingRefugeesCount}
              </span>
            )}
          </div>
          <span className={`relative z-10 font-serif font-black text-[11px] mt-0.5 leading-tight ${
            isRefugeeModalOpen
              ? 'text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]'
              : 'text-[#2a1708]'
          }`}>
            {UI_TEXT.leftDock.buttons.refugees.label}
          </span>
        </button>

        {/* 3.2. THẺ TƯỚNG */}
        <button
          type="button"
          onClick={() => handleDockClick('generals')}
          className={`relative w-[74px] py-1 px-1 rounded flex flex-col items-center justify-center transition-all cursor-pointer ${
            activeModal === 'generals' ? 'scale-105' : 'hover:bg-black/[0.05] active:scale-95'
          }`}
          title={UI_TEXT.leftDock.buttons.generals.tooltip}
        >
          {activeModal === 'generals' && (
            <img
              src="/ink_stroke_red.png"
              alt="Vết mực đỏ"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
            />
          )}
          <img
            src="/icons/general_token.png"
            alt={UI_TEXT.leftDock.buttons.generals.label}
            className="relative z-10 w-6 h-6 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
          />
          <span className={`relative z-10 font-serif font-black text-[11px] mt-0.5 leading-tight ${
            activeModal === 'generals'
              ? 'text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]'
              : 'text-[#2a1708]'
          }`}>
            {UI_TEXT.leftDock.buttons.generals.label}
          </span>
        </button>

        {/* 3.3. QUÂN THƯ */}
        <button
          type="button"
          onClick={() => handleDockClick('military_book')}
          className={`relative w-[74px] py-1 px-1 rounded flex flex-col items-center justify-center transition-all cursor-pointer ${
            isMilitaryBookOpen ? 'scale-105' : 'hover:bg-black/[0.05] active:scale-95'
          }`}
          title={UI_TEXT.leftDock.buttons.military_book.tooltip}
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
              alt={UI_TEXT.leftDock.buttons.military_book.label}
              className="w-full h-full object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
            />
            {unreadNoticesCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 bg-[#8c2d19] text-[#fff3db] border border-[#fef08a] rounded-full text-[9px] font-mono font-bold flex items-center justify-center shadow-md animate-pulse">
                {unreadNoticesCount}
              </span>
            )}
          </div>
          <span className={`relative z-10 font-serif font-black text-[11px] mt-0.5 leading-tight ${
            isMilitaryBookOpen
              ? 'text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]'
              : 'text-[#2a1708]'
          }`}>
            {UI_TEXT.leftDock.buttons.military_book.label}
          </span>
        </button>

      </div>
    </nav>
  );
});

LeftCommandDock.displayName = 'LeftCommandDock';
