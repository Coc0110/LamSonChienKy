import React from 'react';
import { 
  Users, 
  Coins, 
  Wheat, 
  Swords, 
  Shield, 
  Shirt, 
  Tent, 
  GitMerge, 
  Edit3, 
  Check 
} from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { TimePanel } from './TimePanel';

interface ParchmentSlipProps {
  children: React.ReactNode;
  highlight?: boolean;
  rotation?: string;
  className?: string;
}

const ParchmentSlip: React.FC<ParchmentSlipProps> = ({ 
  children, 
  highlight = false, 
  rotation = 'rotate-0',
  className = '' 
}) => (
  <div 
    className={`relative shrink-0 flex items-center justify-center font-sans font-bold text-sm tracking-wide transition-transform hover:scale-105 ${rotation} ${className}`}
    style={{
      filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.45)) drop-shadow(0 1px 1px rgba(30,20,10,0.3))',
    }}
  >
    <div 
      className={`absolute inset-0 rounded-[3px_5px_4px_6px] border ${
        highlight 
          ? 'bg-gradient-to-br from-[#ffd9d4] via-[#f7b5ab] to-[#e68d80] border-[#b83828]' 
          : 'bg-gradient-to-br from-[#fbf4e6] via-[#f2e5cb] to-[#e4d1aa] border-[#8a6a42]'
      }`}
      style={{
        filter: 'url(#torn-paper-edge)',
        boxShadow: highlight 
          ? 'inset 0 0 8px rgba(180, 40, 20, 0.4), inset 0 0 2px rgba(255,255,255,0.8)' 
          : 'inset 0 0 6px rgba(120, 80, 30, 0.25), inset 0 0 2px rgba(255,255,255,0.7)',
      }}
    />
    <div className={`relative z-10 flex items-center gap-1.5 px-2.5 py-1.5 ${highlight ? 'text-[#6b1408]' : 'text-[#2a1a0a]'}`}>
      {children}
    </div>
  </div>
);

export const TopBar: React.FC = () => {
  const { resources } = useGameStore();
  const { toggleEditMode, isEditMode } = useUIStore();

  return (
    <>
      {/* Định nghĩa SVG Filter mép giấy xé */}
      <svg className="absolute w-0 h-0 pointer-events-none" style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
        <defs>
          <filter id="torn-paper-edge" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* THANH TOP BAR: 2 CỘT RÕ RÀNG, KHÔNG BAO GIỜ BỊ ĐÈ HAY TRÀN RA NGOÀI */}
      <header className="absolute top-2 left-3 right-3 z-40 flex items-center justify-between gap-3 pointer-events-none">
        
        {/* 1. KHỐI THÔNG TIN QUÂN LƯƠNG & THỜI GIAN (Scroll mượt mà khi màn hình hẹp) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar pointer-events-auto max-w-[calc(100vw-180px)]">
          <TimePanel />

          <ParchmentSlip rotation="rotate-[0.5deg]">
            <Users size={15} className="text-[#3b2d1f]" />
            <span>Quân: {Math.floor(resources.troops).toLocaleString()}</span>
          </ParchmentSlip>

          <ParchmentSlip rotation="rotate-[-0.3deg]">
            <GitMerge size={15} className="text-[#4a3a28]" />
            <span>Ngựa: {Math.floor(resources.horses).toLocaleString()}</span>
          </ParchmentSlip>

          <ParchmentSlip rotation="rotate-[0.4deg]">
            <Tent size={15} className="text-[#593d25]" />
            <span>Voi: {Math.floor(resources.elephants).toLocaleString()}</span>
          </ParchmentSlip>

          <ParchmentSlip highlight={resources.food <= 0} rotation="rotate-[-0.6deg]">
            <Wheat size={15} className={resources.food <= 0 ? "text-[#a82415] animate-pulse" : "text-[#7a481c]"} />
            <span className={resources.food <= 0 ? "text-[#8a180b] font-black" : ""}>
              Lương: {Math.floor(resources.food).toLocaleString()}
            </span>
          </ParchmentSlip>

          <ParchmentSlip rotation="rotate-[0.3deg]">
            <Swords size={15} className="text-[#473523]" />
            <span>Khí giới: {Math.floor(resources.weapons).toLocaleString()}</span>
          </ParchmentSlip>

          <ParchmentSlip rotation="rotate-[-0.4deg]">
            <Shirt size={15} className="text-[#384852]" />
            <span>Nhu yếu: {Math.floor(resources.clothes).toLocaleString()}</span>
          </ParchmentSlip>

          <ParchmentSlip rotation="rotate-[0.5deg]">
            <Coins size={15} className="text-[#8c6519]" />
            <span>Vàng: {Math.floor(resources.gold).toLocaleString()}</span>
          </ParchmentSlip>

          <ParchmentSlip rotation="rotate-[-0.2deg]">
            <Shield size={15} className="text-[#2d5932]" />
            <span className="text-[#1c4521]">Sĩ khí: {Math.floor(resources.morale)}</span>
          </ParchmentSlip>
        </div>

        {/* 2. DẤU TRIỆN SỬA MAP (Góc trên cùng bên phải, cố định chắc chắn) */}
        <div className="pointer-events-auto shrink-0 flex items-center gap-1.5 z-50">
          <button 
            onClick={toggleEditMode}
            className="relative h-9 px-4 flex items-center justify-center font-sans font-bold text-xs uppercase tracking-wider transition hover:scale-105 active:scale-95 shadow-xl cursor-pointer"
          >
            <div 
              className={`absolute inset-0 rounded-[4px_7px_3px_6px] transition-colors ${
                isEditMode 
                  ? 'bg-gradient-to-br from-[#a62a1b] to-[#70160a] border border-[#f59e0b] ring-2 ring-[#f59e0b]' 
                  : 'bg-gradient-to-br from-[#8a271a] to-[#5e170c] border border-[#a83d2e]'
              }`}
              style={{
                filter: 'url(#torn-paper-edge)',
                boxShadow: 'inset 0 0 8px rgba(50,10,5,0.6), 2px 3px 6px rgba(40,15,10,0.45)',
              }}
            />
            <span className="relative z-10 flex items-center gap-1.5 text-[#fceddc] drop-shadow-sm">
              {isEditMode ? (
                <>
                  <Check size={14} className="text-amber-300" />
                  <span>XONG SỬA MAP</span>
                </>
              ) : (
                <>
                  <Edit3 size={14} />
                  <span>SỬA MAP</span>
                </>
              )}
            </span>
          </button>
        </div>

      </header>
    </>
  );
};
