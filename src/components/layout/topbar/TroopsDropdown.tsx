import React from 'react';
import { useGameStore } from '../../../store/gameStore';
import { useUIStore } from '../../../store/uiStore';

export const TroopsDropdown: React.FC = React.memo(() => {
  const troops = useGameStore(state => state.resources.troops);
  const horses = useGameStore(state => state.resources.horses);
  const elephants = useGameStore(state => state.resources.elephants);

  const activeDropdown = useUIStore(state => state.activeDropdown);
  const toggleDropdown = useUIStore(state => state.toggleDropdown);

  const isOpen = activeDropdown === 'troops';

  return (
    <div className="relative topbar-dropdown-container shrink-0 self-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleDropdown('troops');
        }}
        className={`relative px-1.5 py-0.5 rounded flex items-center gap-1.5 transition-all cursor-pointer ${
          isOpen ? 'scale-105' : 'hover:bg-black/[0.04] active:scale-95'
        }`}
        title="Bấm để xem danh sách chi tiết các binh chủng"
      >
        {!isOpen && (
          <img 
            src="/icons/soldier_bust.png" 
            alt="Quân" 
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
              Quân: {Math.floor(troops).toLocaleString()}
            </span>
          </div>
        ) : (
          <span className="relative z-10 font-serif font-bold text-[#2a1708]">
            Quân: {Math.floor(troops).toLocaleString()}
          </span>
        )}
      </button>

      {/* Tờ giấy xổ xuống: Danh sách chi tiết binh chủng */}
      {isOpen && (
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
                {Math.floor(troops).toLocaleString()} đinh
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
                  {Math.floor(troops * 0.45).toLocaleString()}
                </span>
              </div>

              {/* 2. Cung thủ */}
              <div className="flex items-center justify-between px-2 py-1 rounded hover:bg-black/[0.04] transition">
                <div className="flex items-center gap-2">
                  <img src="/icons/unit_bow.png" alt="Cung thủ" className="w-6 h-6 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
                  <span className="font-bold">Cung thủ</span>
                </div>
                <span className="font-mono font-bold text-[#8c2d19]">
                  {Math.floor(troops * 0.25).toLocaleString()}
                </span>
              </div>

              {/* 3. Giáo binh */}
              <div className="flex items-center justify-between px-2 py-1 rounded hover:bg-black/[0.04] transition">
                <div className="flex items-center gap-2">
                  <img src="/icons/unit_spear.png" alt="Giáo binh" className="w-6 h-6 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
                  <span className="font-bold">Giáo binh</span>
                </div>
                <span className="font-mono font-bold text-[#8c2d19]">
                  {Math.max(0, Math.floor(troops) - Math.floor(troops * 0.45) - Math.floor(troops * 0.25)).toLocaleString()}
                </span>
              </div>

              {/* 4. Kỵ binh */}
              <div className="flex items-center justify-between px-2 py-1 rounded hover:bg-black/[0.04] transition">
                <div className="flex items-center gap-2">
                  <img src="/icons/unit_cavalry.png" alt="Kỵ binh" className="w-6 h-6 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
                  <span className="font-bold">Kỵ binh</span>
                </div>
                <span className="font-mono font-bold text-[#8c2d19]">
                  {Math.floor(horses).toLocaleString()}
                </span>
              </div>

              {/* 5. Tượng binh */}
              <div className="flex items-center justify-between px-2 py-1 rounded hover:bg-black/[0.04] transition">
                <div className="flex items-center gap-2">
                  <img src="/icons/unit_elephant.png" alt="Tượng binh" className="w-6 h-6 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
                  <span className="font-bold">Tượng binh</span>
                </div>
                <span className="font-mono font-bold text-[#8c2d19]">
                  {Math.floor(elephants).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

TroopsDropdown.displayName = 'TroopsDropdown';
