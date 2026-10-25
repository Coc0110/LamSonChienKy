import React from 'react';
import type { ParchmentMode } from '../../types/map';

interface ParchmentControlsProps {
  parchmentMode: ParchmentMode;
  onChangeMode: (mode: ParchmentMode) => void;
  showDistricts: boolean;
  onToggleDistricts: () => void;
}

export const ParchmentControls: React.FC<ParchmentControlsProps> = ({
  parchmentMode,
  onChangeMode,
  showDistricts,
  onToggleDistricts,
}) => {
  return (
    <div className="absolute bottom-5 left-5 z-[900] flex items-center gap-1.5 bg-[#1e130a]/90 border border-[#a87c4f]/70 rounded-lg p-1.5 shadow-2xl backdrop-blur-sm text-sm font-sans">
      <span className="px-2 py-1 text-[#ebd0a7] font-bold tracking-wider uppercase">
        Sa bàn Thanh Hóa:
      </span>
      <button
        onClick={() => onChangeMode('cutout')}
        className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
          parchmentMode === 'cutout'
            ? 'bg-[#8c5828] text-[#fff3db] border border-[#deb887] font-bold shadow'
            : 'text-[#c9a679] hover:bg-[#332010]'
        }`}
      >
        Chỉ vùng Thanh Hóa
      </button>
      <button
        onClick={() => onChangeMode('sheet')}
        className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
          parchmentMode === 'sheet'
            ? 'bg-[#8c5828] text-[#fff3db] border border-[#deb887] font-bold shadow'
            : 'text-[#c9a679] hover:bg-[#332010]'
        }`}
      >
        Nguyên tấm Da Cừu
      </button>
      <button
        onClick={() => onChangeMode('off')}
        className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
          parchmentMode === 'off'
            ? 'bg-[#8c5828] text-[#fff3db] border border-[#deb887] font-bold shadow'
            : 'text-[#c9a679] hover:bg-[#332010]'
        }`}
      >
        Vệ tinh gốc
      </button>
      <div className="h-4 w-[1px] bg-[#a87c4f]/40 mx-1" />
      <button
        onClick={onToggleDistricts}
        className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
          showDistricts && parchmentMode !== 'off'
            ? 'bg-[#6e2214] text-[#fff3db] border border-[#e6a87c] font-bold shadow'
            : 'text-[#c9a679] hover:bg-[#332010]'
        }`}
        title="Bật/tắt ranh giới và vùng tương tác huyện thành"
      >
        Địa bàn Huyện Thành: {showDistricts ? 'Bật' : 'Tắt'}
      </button>
    </div>
  );
};
