import React from 'react';
import { Users, Wheat, Swords, Coins, Shield, Shirt, GitMerge, Tent } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { TimePanel } from './TimePanel';

// Mẩu giấy Dó cổ truyền (Torn Parchment Slip)
const ParchmentSlip: React.FC<{
  children: React.ReactNode;
  highlight?: boolean;
  className?: string;
  rotation?: string;
}> = ({ children, highlight, className = '', rotation = 'rotate-0' }) => (
  <div className={`relative group shrink-0 pointer-events-auto h-11 flex items-center transition-transform hover:scale-105 duration-150 ${rotation} ${className}`}>
    {/* Lớp nền giấy Dó xé viền (Torn Deckled Edge) */}
    <div 
      className={`absolute inset-0 rounded-[3px_7px_4px_6px] transition-colors ${
        highlight 
          ? 'bg-gradient-to-br from-[#ebd3cc] via-[#e2b6ab] to-[#d69f92] border border-[#a84435]' 
          : 'bg-gradient-to-br from-[#f6ebd7] via-[#ebdcbf] to-[#ddcaa2] border border-[#b89b74]'
      }`}
      style={{
        filter: 'url(#torn-paper-edge)',
        boxShadow: highlight
          ? 'inset 0 0 10px rgba(160, 40, 20, 0.4), 2px 3px 5px rgba(50, 15, 10, 0.45)'
          : 'inset 0 0 10px rgba(110, 65, 25, 0.3), 2px 3px 6px rgba(40, 25, 10, 0.38)',
      }}
    />

    {/* Lớp vân sớ giấy xơ xác (Pulp Fiber lines overlay) */}
    <div 
      className="absolute inset-0 opacity-20 pointer-events-none rounded-[3px_7px_4px_6px]"
      style={{
        backgroundImage: 'radial-gradient(ellipse at top left, rgba(140,90,40,0.3) 0%, transparent 70%), repeating-linear-gradient(45deg, rgba(80,45,15,0.04) 0px, rgba(80,45,15,0.04) 2px, transparent 2px, transparent 6px)',
      }}
    />

    {/* Nội dung chữ mực Tàu sắc nét */}
    <div className="relative z-10 px-3.5 py-1.5 flex items-center gap-2 font-serif font-bold text-[#2d1e13] tracking-wide whitespace-nowrap text-sm select-none">
      {children}
    </div>
  </div>
);

export const TopBar: React.FC = () => {
  const { resources, cities } = useGameStore();
  const { toggleEditMode, isEditMode } = useUIStore();

  return (
    <>
      {/* Định nghĩa SVG Filter để tạo mép rách giấy Dó tự nhiên cho toàn bộ thanh bar */}
      <svg className="absolute w-0 h-0 pointer-events-none" style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
        <defs>
          <filter id="torn-paper-edge" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>

          {/* Filter làm méo hữu cơ cho viền băng và mảng cháy */}
          <filter
            id="organic-warp"
            x="-20%"
            y="-30%"
            width="140%"
            height="160%"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.035 0.22"
              numOctaves="2"
              seed="8"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="2.5"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <div className="absolute top-3 left-4 right-4 z-40 flex items-center gap-2 pointer-events-none overflow-x-auto pb-4 hide-scrollbar">
        
        {/* 1. Điệp Văn Thời Gian (TimePanel Component theo mẫu người dùng) */}
        <TimePanel />

        {/* 2. Các thẻ Quân Lương viết trên giấy Dó xé tay */}
        <ParchmentSlip rotation="rotate-[0.5deg]">
          <Users size={16} className="text-[#3b2d1f]" />
          <span>Quân: {Math.floor(resources.troops).toLocaleString()}</span>
        </ParchmentSlip>

        <ParchmentSlip rotation="rotate-[-0.3deg]">
          <GitMerge size={16} className="text-[#4a3a28]" />
          <span>Ngựa: {Math.floor(resources.horses).toLocaleString()}</span>
        </ParchmentSlip>

        <ParchmentSlip rotation="rotate-[0.4deg]">
          <Tent size={16} className="text-[#593d25]" />
          <span>Voi: {Math.floor(resources.elephants).toLocaleString()}</span>
        </ParchmentSlip>

        <ParchmentSlip 
          highlight={resources.food <= 0} 
          rotation="rotate-[-0.6deg]"
        >
          <Wheat size={16} className={resources.food <= 0 ? "text-[#a82415] animate-pulse" : "text-[#7a481c]"} />
          <span className={resources.food <= 0 ? "text-[#8a180b] font-black" : ""}>
            Lương: {Math.floor(resources.food).toLocaleString()}
          </span>
        </ParchmentSlip>

        <ParchmentSlip rotation="rotate-[0.3deg]">
          <Swords size={16} className="text-[#473523]" />
          <span>Khí giới: {Math.floor(resources.weapons).toLocaleString()}</span>
        </ParchmentSlip>

        <ParchmentSlip rotation="rotate-[-0.4deg]">
          <Shirt size={16} className="text-[#384852]" />
          <span>Nhu yếu: {Math.floor(resources.clothes).toLocaleString()}</span>
        </ParchmentSlip>

        <ParchmentSlip rotation="rotate-[0.5deg]">
          <Coins size={16} className="text-[#8c6519]" />
          <span>Vàng: {Math.floor(resources.gold).toLocaleString()}</span>
        </ParchmentSlip>

        <ParchmentSlip rotation="rotate-[-0.2deg]">
          <Shield size={16} className="text-[#2d5932]" />
          <span className="text-[#1c4521]">Sĩ khí: {Math.floor(resources.morale)}</span>
        </ParchmentSlip>

        {/* 3. Thẻ Dấu Triện / Nút Sửa Bản Đồ */}
        <div className="ml-auto pointer-events-auto shrink-0 pl-2 flex items-center gap-2">
          {isEditMode && (
            <button 
              onClick={() => {
                const exportData = cities.map(c => `{ id: '${c.id}', name: '${c.name}', type: '${c.type}', x: ${c.x}, y: ${c.y}, faction: '${c.faction}', troops: ${c.troops} }`).join(',\n    ');
                navigator.clipboard.writeText(`export const INITIAL_CITIES: CityNode[] = [\n    ${exportData}\n];`);
                alert('Đã copy dữ liệu tọa độ mới vào Clipboard!');
              }}
              className="relative h-11 px-4 flex items-center justify-center font-serif font-bold text-xs uppercase tracking-wider text-[#f5ebd7] transition hover:scale-105 cursor-pointer"
            >
              <div 
                className="absolute inset-0 rounded-[3px_6px_3px_5px] bg-gradient-to-br from-[#2f4d66] to-[#1a2d3d] border border-[#486b8c]"
                style={{
                  filter: 'url(#torn-paper-edge)',
                  boxShadow: 'inset 0 0 8px rgba(10,25,40,0.5), 2px 3px 5px rgba(10,15,25,0.4)',
                }}
              />
              <span className="relative z-10">COPY TỌA ĐỘ</span>
            </button>
          )}

          <button 
            onClick={toggleEditMode}
            className="relative h-11 px-5 flex items-center justify-center font-serif font-bold text-xs uppercase tracking-wider transition hover:scale-105 cursor-pointer"
          >
            {/* Dấu Triện Son Khắc (Red Wax Seal / Wooden Plaque) */}
            <div 
              className={`absolute inset-0 rounded-[4px_7px_3px_6px] transition-colors ${
                isEditMode 
                  ? 'bg-gradient-to-br from-[#a62a1b] to-[#70160a] border border-[#c94b3c] animate-pulse' 
                  : 'bg-gradient-to-br from-[#8a271a] to-[#5e170c] border border-[#a83d2e]'
              }`}
              style={{
                filter: 'url(#torn-paper-edge)',
                boxShadow: 'inset 0 0 8px rgba(50,10,5,0.6), 2px 3px 6px rgba(40,15,10,0.45)',
              }}
            />
            <span className="relative z-10 text-[#fceddc] drop-shadow-sm">
              {isEditMode ? 'LƯU MAP (XONG)' : 'SỬA MAP'}
            </span>
          </button>
        </div>

      </div>
    </>
  );
};
