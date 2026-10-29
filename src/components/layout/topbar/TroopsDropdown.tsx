import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '../../../store/gameStore';
import { useUIStore } from '../../../store/uiStore';

export const TroopsDropdown: React.FC = React.memo(() => {
  const troops = useGameStore(state => state.resources.troops);
  const horses = useGameStore(state => state.resources.horses);
  const elephants = useGameStore(state => state.resources.elephants);

  const activeDropdown = useUIStore(state => state.activeDropdown);
  const toggleDropdown = useUIStore(state => state.toggleDropdown);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number }>({ top: 38, left: 180 });

  const isOpen = activeDropdown === 'troops';

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const panelWidth = 250;
      const left = Math.max(8, Math.min(rect.left - 10, window.innerWidth - panelWidth - 8));
      const top = window.innerWidth >= 768 ? 38 : 34;
      setPanelPos({ top, left });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen]);

  // Phân bổ số lượng từng binh chủng
  const swordTroops = Math.floor(troops * 0.45);
  const bowTroops = Math.floor(troops * 0.25);
  const spearTroops = Math.max(0, Math.floor(troops) - swordTroops - bowTroops);

  return (
    <div className="relative topbar-dropdown-container shrink-0 self-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleDropdown('troops');
        }}
        className={`relative px-1.5 py-0.5 rounded flex items-center gap-1.5 transition-all cursor-pointer ${
          isOpen ? 'scale-105' : 'hover:bg-black/[0.04] active:scale-95'
        }`}
        title="Bấm để mở tờ giấy biên chế chi tiết các binh chủng"
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

      {/* TỜ GIẤY THÔNG TIN QUÂN SỰ KHUẤT DƯỚI LỚP GIẤY THANH TRÊN (z-30) */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          style={{ top: `${panelPos.top}px`, left: `${panelPos.left}px` }}
          className="fixed z-30 w-[250px] flex flex-col pointer-events-auto filter drop-shadow-[0_16px_32px_rgba(0,0,0,0.75)] drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)] animate-in fade-in slide-in-from-top-2 duration-150 topbar-paper-panel select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Nền giấy dó sứt mẻ tự nhiên */}
          <img
            src="/parchment_torn_panel.png"
            alt="Giấy quân lệnh"
            className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
            draggable={false}
          />

          <div className="relative z-10 px-4 pt-11 pb-4 flex flex-col font-serif">
            {/* Dòng Tổng quân */}
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#8c6b44]/30">
              <span className="font-serif font-black text-xs uppercase tracking-wider text-[#5c3e23]">
                Tổng quân:
              </span>
              <span className="font-serif font-black text-base text-[#8c2d19]">
                {Math.floor(troops).toLocaleString()}
              </span>
            </div>

            {/* Danh sách 5 Binh Chủng */}
            <div className="space-y-1 text-xs text-[#2a1708]">
              {/* 1. Quân binh (Kiếm) */}
              <div className="flex items-center justify-between py-0.5 px-1 rounded hover:bg-black/[0.04] transition">
                <div className="flex items-center gap-2.5">
                  <img 
                    src="/icons/unit_sword.png" 
                    alt="Quân binh" 
                    className="w-11 h-11 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] shrink-0" 
                  />
                  <span className="font-serif font-bold text-sm text-[#261304]">
                    Quân Binh (Kiếm)
                  </span>
                </div>
                <span className="font-serif font-black text-base text-[#8c2d19]">
                  {swordTroops.toLocaleString()}
                </span>
              </div>

              {/* 2. Cung thủ */}
              <div className="flex items-center justify-between py-0.5 px-1 rounded hover:bg-black/[0.04] transition">
                <div className="flex items-center gap-2.5">
                  <img 
                    src="/icons/unit_bow.png" 
                    alt="Cung thủ" 
                    className="w-11 h-11 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] shrink-0" 
                  />
                  <span className="font-serif font-bold text-sm text-[#261304]">
                    Cung Thủ
                  </span>
                </div>
                <span className="font-serif font-black text-base text-[#8c2d19]">
                  {bowTroops.toLocaleString()}
                </span>
              </div>

              {/* 3. Trường thương binh */}
              <div className="flex items-center justify-between py-0.5 px-1 rounded hover:bg-black/[0.04] transition">
                <div className="flex items-center gap-2.5">
                  <img 
                    src="/icons/unit_spear.png" 
                    alt="Giáo binh" 
                    className="w-11 h-11 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] shrink-0" 
                  />
                  <span className="font-serif font-bold text-sm text-[#261304]">
                    Trường Thương Binh
                  </span>
                </div>
                <span className="font-serif font-black text-base text-[#8c2d19]">
                  {spearTroops.toLocaleString()}
                </span>
              </div>

              {/* 4. Thiết kỵ binh */}
              <div className="flex items-center justify-between py-0.5 px-1 rounded hover:bg-black/[0.04] transition">
                <div className="flex items-center gap-2.5">
                  <img 
                    src="/icons/unit_cavalry.png" 
                    alt="Kỵ binh" 
                    className="w-11 h-11 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] shrink-0" 
                  />
                  <span className="font-serif font-bold text-sm text-[#261304]">
                    Thiết Kỵ Binh
                  </span>
                </div>
                <span className="font-serif font-black text-base text-[#8c2d19]">
                  {Math.floor(horses).toLocaleString()}
                </span>
              </div>

              {/* 5. Thiết tượng binh */}
              <div className="flex items-center justify-between py-0.5 px-1 rounded hover:bg-black/[0.04] transition">
                <div className="flex items-center gap-2.5">
                  <img 
                    src="/icons/unit_elephant.png" 
                    alt="Tượng binh" 
                    className="w-11 h-11 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] shrink-0" 
                  />
                  <span className="font-serif font-bold text-sm text-[#261304]">
                    Thiết Tượng Binh
                  </span>
                </div>
                <span className="font-serif font-black text-base text-[#8c2d19]">
                  {Math.floor(elephants).toLocaleString()}
                </span>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
});

TroopsDropdown.displayName = 'TroopsDropdown';
