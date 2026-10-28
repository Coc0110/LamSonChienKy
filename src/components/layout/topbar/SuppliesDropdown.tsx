import React from 'react';
import { useGameStore } from '../../../store/gameStore';
import { useUIStore } from '../../../store/uiStore';

export const SuppliesDropdown: React.FC = React.memo(() => {
  const weapons = useGameStore(state => state.resources.weapons);
  const clothes = useGameStore(state => state.resources.clothes);

  const activeDropdown = useUIStore(state => state.activeDropdown);
  const toggleDropdown = useUIStore(state => state.toggleDropdown);

  const isOpen = activeDropdown === 'weapons';

  return (
    <div className="relative topbar-dropdown-container shrink-0 self-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleDropdown('weapons');
        }}
        className={`relative px-1.5 py-0.5 rounded flex items-center gap-1.5 transition-all cursor-pointer ${
          isOpen ? 'scale-105' : 'hover:bg-black/[0.04] active:scale-95'
        }`}
        title="Bấm để xem danh sách chi tiết các loại khí giới"
      >
        {!isOpen && (
          <img 
            src="/icons/weapon_crossed.png" 
            alt="Khí giới" 
            className="w-8 h-8 object-contain relative z-10 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
          />
        )}
        {isOpen ? (
          <div className="relative px-3.5 py-1 flex items-center justify-center">
            <img
              src="/ink_stroke_1.png"
              alt="Vết mực"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
            />
            <span className="relative z-10 font-serif font-bold text-xs md:text-sm text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
              Khí giới: {Math.floor(weapons).toLocaleString()}
            </span>
          </div>
        ) : (
          <span className="relative z-10 font-serif font-bold text-[#2a1708]">
            Khí giới: {Math.floor(weapons).toLocaleString()}
          </span>
        )}
      </button>

      {/* Tờ giấy xổ xuống: Danh sách chi tiết khí giới */}
      {isOpen && (
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
                {Math.floor(weapons).toLocaleString()} món
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
                  {Math.floor(weapons * 0.35).toLocaleString()}
                </span>
              </div>

              {/* 2. Cung */}
              <div className="flex items-center justify-between px-2 py-1 rounded hover:bg-black/[0.04] transition">
                <div className="flex items-center gap-2">
                  <img src="/icons/weapon_bow.png" alt="Cung" className="w-6 h-6 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
                  <span className="font-bold">Cung</span>
                </div>
                <span className="font-mono font-bold text-[#8c2d19]">
                  {Math.floor(weapons * 0.25).toLocaleString()}
                </span>
              </div>

              {/* 3. Giáo */}
              <div className="flex items-center justify-between px-2 py-1 rounded hover:bg-black/[0.04] transition">
                <div className="flex items-center gap-2">
                  <img src="/icons/weapon_spear.png" alt="Giáo" className="w-6 h-6 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
                  <span className="font-bold">Giáo</span>
                </div>
                <span className="font-mono font-bold text-[#8c2d19]">
                  {Math.max(0, Math.floor(weapons) - Math.floor(weapons * 0.35) - Math.floor(weapons * 0.25)).toLocaleString()}
                </span>
              </div>

              {/* 4. Giáp trụ / Áo chiến */}
              <div className="flex items-center justify-between px-2 py-1 rounded hover:bg-black/[0.04] transition">
                <div className="flex items-center gap-2">
                  <img src="/icons/weapon_armor.png" alt="Giáp trụ" className="w-6 h-6 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
                  <span className="font-bold">Giáp trụ</span>
                </div>
                <span className="font-mono font-bold text-[#8c2d19]">
                  {Math.floor(clothes).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

SuppliesDropdown.displayName = 'SuppliesDropdown';
