import React from 'react';
import type { CityNode, PlacedStructure } from '../../../types';
import type { PlacementMode, BaseRelocateMode } from '../../../store/uiStore';

interface PlacementControlBarProps {
  baseRelocateMode: BaseRelocateMode | null;
  placementMode: PlacementMode | null;
  cities: CityNode[];
  structures: PlacedStructure[];
  onCancelBaseRelocate: () => void;
  onCancelPlacement: () => void;
  onSetPlacementGridSize: (gridSize: number, farmTier?: 15 | 30 | 50) => void;
}

export const PlacementControlBar: React.FC<PlacementControlBarProps> = React.memo(({
  baseRelocateMode,
  placementMode,
  cities,
  structures,
  onCancelBaseRelocate,
  onCancelPlacement,
  onSetPlacementGridSize,
}) => {
  // 1. THANH ĐIỀU KHIỂN DI DỜI CĂN CỨ
  if (baseRelocateMode) {
    const cityName = cities.find(c => c.id === baseRelocateMode.baseId)?.name || '';
    return (
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto flex items-center justify-between gap-4 px-6 py-3 rounded-2xl bg-[#1e130c]/98 border-2 border-amber-500 shadow-[0_10px_35px_rgba(0,0,0,0.85)] backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-200 max-w-2xl w-[95vw] md:w-auto">
        <div className="flex items-center gap-3">
          <span className="text-2xl animate-bounce shrink-0">🚚</span>
          <div>
            <div className="font-serif font-black text-amber-300 text-sm flex items-center gap-2">
              <span>Đang Di Dời: Căn Cứ {cityName}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-200 border border-amber-600/70 font-sans font-bold">
                Đất bằng / Rừng già / Núi non
              </span>
            </div>
            <div className="text-[11px] text-stone-300 mt-0.5">
              👉 Nhấp chuột trái vào bất kỳ ô đất nào trên bản đồ để lập doanh trại mới. (Tránh sông sâu & vách đá).
            </div>
          </div>
        </div>

        <button
          onClick={onCancelBaseRelocate}
          className="shrink-0 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 hover:to-red-600 text-amber-100 font-bold text-xs shadow-lg border border-red-500 transition hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap flex items-center gap-1.5"
        >
          <span>✕</span>
          <span>HỦY BỎ (ESC)</span>
        </button>
      </div>
    );
  }

  // 2. THANH ĐIỀU KHIỂN CHẾ ĐỘ XÂY DỰNG & DI DỜI CÔNG TRÌNH
  if (placementMode) {
    const isRelocating = Boolean(placementMode.relocateStructureId);
    const relocatingStructure = isRelocating ? structures.find(s => s.id === placementMode.relocateStructureId) : null;
    const isFarm = placementMode.type === 'farm';
    const currentGridSize = placementMode.gridSize || (isFarm ? 5 : 3);

    return (
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] w-[95vw] max-w-2xl bg-[#1e130c]/98 text-[#f5ebd7] px-4 py-3 rounded-2xl border-2 border-amber-500 shadow-[0_10px_35px_rgba(0,0,0,0.85)] backdrop-blur-md flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 pointer-events-auto">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 shrink-0 flex items-center justify-center">
            {isRelocating ? (
              <span className="text-2xl animate-bounce">🚚</span>
            ) : (
              <img
                src={isFarm ? '/icons/structure_farm.png' : '/icons/structure_forge.png'}
                alt="Công trình"
                className="w-8 h-8 object-contain filter drop-shadow-md"
              />
            )}
          </span>
          <div>
            <div className="font-serif font-black text-amber-300 text-sm flex items-center gap-2 flex-wrap">
              <span>
                {isRelocating 
                  ? `Đang Di Dời: ${relocatingStructure?.name || 'Công trình'}`
                  : `Chế Độ Xây Dựng: ${isFarm ? 'Ruộng Lúa Nước' : 'Lò Rèn Bí Mật (3x3)'}`
                }
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-200 border border-amber-600/70 font-sans font-bold">
                {isFarm ? 'Đất Đồng Bằng' : 'Tránh Sông & Vách đá'}
              </span>

              {/* Chọn 3 mốc quy mô Ruộng (5x5, 6x6, 7x7) */}
              {isFarm && !isRelocating && (
                <div className="flex items-center gap-1.5 ml-1">
                  {[
                    { size: 5, workers: 15 as const, label: '5x5 (15 người)' },
                    { size: 6, workers: 30 as const, label: '6x6 (30 người)' },
                    { size: 7, workers: 50 as const, label: '7x7 (50 người)' },
                  ].map(tier => {
                    const isSelected = (placementMode.gridSize || 5) === tier.size;
                    return (
                      <button
                        key={tier.size}
                        type="button"
                        onClick={() => onSetPlacementGridSize(tier.size, tier.workers)}
                        className={`px-2 py-0.5 rounded text-[11px] font-serif font-bold transition cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-stone-950 shadow ring-1 ring-amber-300'
                            : 'bg-[#2b170c] text-amber-300/80 hover:bg-[#3f2212] border border-amber-700/60'
                        }`}
                      >
                        {tier.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="text-[11px] text-stone-300 mt-0.5">
              👉 Di chuyển chuột để xem khung {currentGridSize}x{currentGridSize} ô (xanh = hợp lệ không trùng). Bấm chuột trái để cắm mốc xây.
            </div>
          </div>
        </div>

        <button
          onClick={onCancelPlacement}
          className="shrink-0 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 hover:to-red-600 text-amber-100 font-bold text-xs shadow-lg border border-red-500 transition hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap flex items-center gap-1.5"
        >
          <span>✕</span>
          <span>HỦY BỎ (ESC)</span>
        </button>
      </div>
    );
  }

  return null;
});

PlacementControlBar.displayName = 'PlacementControlBar';
