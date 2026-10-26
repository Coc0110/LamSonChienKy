import React from 'react';
import type { ParchmentMode } from '../../types/map';
import { useUIStore } from '../../store/uiStore';

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
  const showGrid = useUIStore(state => state.showGrid);
  const toggleGrid = useUIStore(state => state.toggleGrid);
  const showTerrainOverlay = useUIStore(state => state.showTerrainOverlay);
  const toggleTerrainOverlay = useUIStore(state => state.toggleTerrainOverlay);

  return (
    <div className="absolute bottom-5 left-5 z-[900] flex flex-wrap items-center gap-1.5 bg-[#1e130a]/90 border border-[#a87c4f]/70 rounded-lg p-1.5 shadow-2xl backdrop-blur-sm text-sm font-sans">
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
        Địa bàn Huyện: {showDistricts ? 'Bật' : 'Tắt'}
      </button>

      <div className="h-4 w-[1px] bg-[#a87c4f]/40 mx-1" />

      {/* Nút Bật/Tắt Lưới ô vuông (250m) */}
      <button
        onClick={toggleGrid}
        className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
          showGrid
            ? 'bg-[#2b4c38] text-[#e6f4ea] border border-[#529b68] font-bold shadow'
            : 'text-[#a3b899] hover:bg-[#1a2e22]'
        }`}
        title="Bật/tắt lưới tọa độ ô vuông (cạnh 250m, mốc phân vạch 1km và 5km)"
      >
        Lưới Ô Vuông: {showGrid ? 'Bật' : 'Tắt'}
      </button>

      {/* Nút Bật/Tắt Lớp phủ màu Địa Hình */}
      <button
        onClick={toggleTerrainOverlay}
        className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
          showTerrainOverlay
            ? 'bg-[#9a5b13] text-[#fffbeb] border border-[#f59e0b] font-bold shadow'
            : 'text-[#d4af37] hover:bg-[#2b1807]'
        }`}
        title="Bật/tắt lớp phủ màu phân định địa hình trên từng ô lưới"
      >
        Màu Địa Hình: {showTerrainOverlay ? 'Bật' : 'Tắt'}
      </button>
    </div>
  );
};
