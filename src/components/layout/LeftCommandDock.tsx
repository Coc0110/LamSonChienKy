import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { UI_TEXT } from '../../data/uiText';

type DockTarget = 'training' | 'build';

export const LeftCommandDock: React.FC = React.memo(() => {
  const activeModal = useUIStore(state => state.activeModal);
  const setActiveModal = useUIStore(state => state.setActiveModal);
  const setBuildPaperOpen = useUIStore(state => state.setBuildPaperOpen);
  const activeRegion3D = useUIStore(state => state.activeRegion3D);
  const setActiveRegion3D = useUIStore(state => state.setActiveRegion3D);
  const is3DBuildPaletteOpen = useUIStore(state => state.is3DBuildPaletteOpen);
  const set3DBuildPaletteOpen = useUIStore(state => state.set3DBuildPaletteOpen);

  const selectCity = useUIStore(state => state.selectCity);
  const cities = useGameStore(state => state.cities);

  const handleDockClick = (target: DockTarget) => {
    const isTargetOpen = 
      (target === 'training' && activeModal === 'training') ||
      (target === 'build' && is3DBuildPaletteOpen && activeRegion3D?.mode === 'base_build');

    setActiveModal(null);
    setBuildPaperOpen(false);
    set3DBuildPaletteOpen(false);
    selectCity(null);

    if (!isTargetOpen) {
      if (target === 'build') {
        if (!activeRegion3D || activeRegion3D.mode !== 'base_build') {
          const baseCity = cities.find(c => c.faction === 'lam_son' && c.hasBase) || cities.find(c => c.id === 'lam_son');
          setActiveRegion3D({ cityId: baseCity?.id || 'lam_son', mode: 'base_build' });
        }
        set3DBuildPaletteOpen(true);
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

        {/* Phân cách */}
        <div className="w-12 h-px bg-[#8c6b44]/40 my-0.5 shrink-0" />

        {/* ========================================================================= */}
        {/* NHÓM 2: NỘI CHÍNH (XÂY DỰNG 3D)                                            */}
        {/* ========================================================================= */}
        <span className="text-[9px] font-serif font-black uppercase tracking-widest text-[#8c5828]/80 pb-0.5">
          {UI_TEXT.leftDock.groups.domestic}
        </span>

        {/* 2.1. XÂY DỰNG 3D */}
        <button
          type="button"
          onClick={() => handleDockClick('build')}
          className={`relative w-[74px] py-1 px-1 rounded flex flex-col items-center justify-center transition-all cursor-pointer ${
            is3DBuildPaletteOpen ? 'scale-105' : 'hover:bg-black/[0.05] active:scale-95'
          }`}
          title="Xây dựng công trình trực tiếp trên bản đồ 3D"
        >
          {is3DBuildPaletteOpen && (
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
            is3DBuildPaletteOpen
              ? 'text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]'
              : 'text-[#2a1708]'
          }`}>
            {UI_TEXT.leftDock.buttons.build.label}
          </span>
        </button>

        {/* Đã chuyển Lưu dân ra cổng 3D và Thẻ tướng vào Nhà Chính */}
      </div>
    </nav>
  );
});

LeftCommandDock.displayName = 'LeftCommandDock';
