import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { useUIStore } from '../../../store/uiStore';
import { useGameStore } from '../../../store/gameStore';
import type { CityNode } from '../../../types';

interface BuildPaperPanelProps {
  activeLamSonBase?: CityNode;
  selectedCity?: CityNode | null;
}

export const BuildPaperPanel: React.FC<BuildPaperPanelProps> = React.memo(({
  activeLamSonBase,
  selectedCity,
}) => {
  const isBuildPaperOpen = useUIStore(state => state.isBuildPaperOpen);
  const setIsBuildPaperOpen = useUIStore(state => state.setBuildPaperOpen);
  const placementMode = useUIStore(state => state.placementMode);
  const setPlacementMode = useUIStore(state => state.setPlacementMode);
  const baseRelocateMode = useUIStore(state => state.baseRelocateMode);
  const setBaseRelocateMode = useUIStore(state => state.setBaseRelocateMode);
  const selectedCityId = useUIStore(state => state.selectedCityId);
  const isMilitaryBookOpen = useUIStore(state => state.isMilitaryBookOpen);

  const cities = useGameStore(state => state.cities);

  // Xác định căn cứ Lam Sơn trực thuộc (không phụ thuộc vào việc người chơi có đang mở căn cứ hay không)
  const lamSonBase = useMemo(() => {
    if (selectedCity && selectedCity.faction === 'lam_son') return selectedCity;
    if (activeLamSonBase && activeLamSonBase.faction === 'lam_son') return activeLamSonBase;
    return cities.find(c => c.faction === 'lam_son' && (c.hasBase || c.type === 'camp')) 
      || cities.find(c => c.faction === 'lam_son') 
      || cities[0];
  }, [selectedCity, activeLamSonBase, cities]);

  if (!isBuildPaperOpen) return null;

  // Nếu đang mở một bảng chi tiết khác bên trái (như CHI NGA, huyện, hay quân thư),
  // tờ giấy công trình sẽ đặt lệch sang phải (md:left-[435px]) để hoàn toàn không bị chồng đè!
  const hasLeftPanelOpen = Boolean(selectedCityId || isMilitaryBookOpen);
  const panelLeftClass = hasLeftPanelOpen ? 'md:left-[435px]' : 'md:left-6';

  const handleClose = () => {
    setIsBuildPaperOpen(false);
    setPlacementMode(null);
    setBaseRelocateMode(null);
  };

  const baseId = lamSonBase?.id || 'lam_son';

  return (
    <div 
      className={`fixed inset-x-3 bottom-3 md:inset-auto md:absolute md:top-24 ${panelLeftClass} z-40 md:w-56 max-h-[78vh] flex flex-col pointer-events-auto transition-all duration-200 select-none filter drop-shadow-[0_18px_30px_rgba(0,0,0,0.7)] drop-shadow-[0_3px_8px_rgba(0,0,0,0.45)]`}
    >
      {/* Nền giấy sứt mẻ tự nhiên */}
      <img
        src="/parchment_torn_panel.png"
        alt="Giấy công trình sứt mẻ"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
        draggable={false}
      />

      <div className="relative z-10 px-5 pt-5 pb-8 flex flex-col h-full font-serif">
        {/* Header tờ giấy công trình */}
        <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-[#8c6b44]/25">
          <span className="font-serif font-black text-xs uppercase tracking-wider text-[#8c2d19]">
            Công Trình
          </span>
          <button 
            onClick={handleClose}
            className="relative group w-6 h-6 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer"
            title="Đóng giấy công trình"
          >
            <img
              src="/ink_blot_red.png"
              alt="Chấm mực đóng"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-0 group-hover:opacity-90 transition-opacity"
            />
            <span className="relative z-10 text-[#593922] group-hover:text-[#fcf4e4] transition-colors">
              <X size={16} strokeWidth={2.5} />
            </span>
          </button>
        </div>

        {/* 3 Mục Công Trình Xây Dựng */}
        <div className="flex flex-col gap-2 pt-2">
          {/* 1. CĂN CỨ (DOANH TRẠI) */}
          <button
            type="button"
            onClick={() => {
              if (baseRelocateMode?.baseId === baseId) {
                setBaseRelocateMode(null);
              } else {
                setPlacementMode(null);
                setBaseRelocateMode({ baseId });
              }
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition-all cursor-pointer ${
              baseRelocateMode?.baseId === baseId
                ? 'bg-[#8c2d19]/20 ring-1 ring-[#8c2d19]/50'
                : 'hover:bg-black/[0.05] active:bg-black/[0.1]'
            }`}
            title="Căn Cứ / Doanh Trại"
          >
            <div className="w-9 h-9 rounded flex items-center justify-center shrink-0 bg-[#3a2010]/10 p-1">
              <img src="/icons/structure_camp.png" alt="Căn Cứ" className="w-full h-full object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
            </div>
            <div className="flex items-center justify-between flex-1">
              <span className="font-serif font-bold text-sm text-[#261304]">Căn Cứ</span>
              <span className="text-[10px] font-serif text-[#8c2d19] font-bold">Doanh Trại</span>
            </div>
          </button>

          {/* 2. RUỘNG NƯƠNG (3 MỐC) */}
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => {
                if (placementMode?.type === 'farm') {
                  setPlacementMode(null);
                } else {
                  setBaseRelocateMode(null);
                  setPlacementMode({ type: 'farm', cityId: baseId, gridSize: 5, farmTier: 15 });
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded transition-all cursor-pointer ${
                placementMode?.type === 'farm'
                  ? 'bg-[#854d0e]/20 ring-1 ring-[#854d0e]/50'
                  : 'hover:bg-black/[0.05] active:bg-black/[0.1]'
              }`}
              title="Ruộng Lúa Nước (Canh tác lương thảo)"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded flex items-center justify-center shrink-0 bg-[#3a2010]/10 p-1">
                  <img src="/icons/structure_farm.png" alt="Ruộng" className="w-full h-full object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
                </div>
                <span className="font-serif font-bold text-sm text-[#261304]">
                  Ruộng Nương
                </span>
              </div>
              <span className="text-[10px] font-serif text-[#8c2d19] font-bold">
                {placementMode?.type === 'farm' ? `${placementMode.gridSize || 5}x${placementMode.gridSize || 5}` : '3 mốc'}
              </span>
            </button>

            {/* 3 mốc quy mô Ruộng: 5x5, 6x6, 7x7 */}
            {placementMode?.type === 'farm' && (
              <div className="grid grid-cols-3 gap-1 px-1 pt-0.5">
                {[
                  { size: 5, workers: 15, label: '5x5 (15 đinh)' },
                  { size: 6, workers: 30, label: '6x6 (30 đinh)' },
                  { size: 7, workers: 50, label: '7x7 (50 đinh)' },
                ].map(t => {
                  const isSel = (placementMode.gridSize || 5) === t.size;
                  return (
                    <button
                      key={t.size}
                      type="button"
                      onClick={() => setPlacementMode({
                        ...placementMode,
                        gridSize: t.size,
                        farmTier: t.workers as any,
                      })}
                      className={`py-1 text-[10px] font-serif font-bold rounded transition cursor-pointer text-center ${
                        isSel
                          ? 'bg-[#8c2d19] text-[#fcf4e4] shadow-xs'
                          : 'bg-black/[0.06] hover:bg-black/[0.1] text-[#3d2714]'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. LÒ RÈN (3x3) */}
          <button
            type="button"
            onClick={() => {
              if (placementMode?.type === 'forge') {
                setPlacementMode(null);
              } else {
                setBaseRelocateMode(null);
                setPlacementMode({ type: 'forge', cityId: baseId });
              }
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition-all cursor-pointer ${
              placementMode?.type === 'forge'
                ? 'bg-[#3d2714]/20 ring-1 ring-[#3d2714]/50'
                : 'hover:bg-black/[0.05] active:bg-black/[0.1]'
            }`}
            title="Lò Rèn (Đúc khí giới)"
          >
            <div className="w-9 h-9 rounded flex items-center justify-center shrink-0 bg-[#3a2010]/10 p-1">
              <img src="/icons/structure_forge.png" alt="Lò Rèn" className="w-full h-full object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
            </div>
            <div className="flex items-center justify-between flex-1">
              <span className="font-serif font-bold text-sm text-[#261304]">Lò Rèn</span>
              <span className="text-[10px] font-serif text-[#8c2d19] font-bold">3x3</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
});

BuildPaperPanel.displayName = 'BuildPaperPanel';
