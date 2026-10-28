import React, { useMemo } from 'react';
import { X, Wrench, Trash2, Castle } from 'lucide-react';
import type { PlacedStructure } from '../../types';
import { TERRAIN_DEFINITIONS } from '../../data/terrainData';
import { useGameStore } from '../../store/gameStore';
import districtData from '../../data/districtPolygons.json';
import { findDistrictForCoord } from '../../utils/mapGeo';
import { cleanStructureName } from '../../utils/formatters';
import { FarmDetailSection } from './structure/FarmDetailSection';
import { ForgeDetailSection } from './structure/ForgeDetailSection';

const DEFAULT_DISTRICTS = (districtData as any).districts || [];

interface StructureDetailModalProps {
  structure: PlacedStructure;
  onClose: () => void;
  onRelocate: (structure: PlacedStructure) => void;
  onDemolish: (structure: PlacedStructure) => void;
  onOpenCity: (cityId: string) => void;
}

export const StructureDetailModal: React.FC<StructureDetailModalProps> = ({
  structure,
  onClose,
  onRelocate,
  onDemolish,
  onOpenCity,
}) => {
  const cities = useGameStore(state => state.cities);
  const liveStructure = useGameStore(state => state.structures.find(s => s.id === structure.id)) || structure;

  const city = useMemo(() => cities.find(c => c.id === structure.cityId), [cities, structure.cityId]);
  const matchedDistrict = useMemo(
    () => findDistrictForCoord(structure.x, structure.y, DEFAULT_DISTRICTS),
    [structure.x, structure.y]
  );

  // Kiểm tra địa hạt có quân Minh chiếm đóng hay không
  const isMingOccupied = useMemo(() => {
    if (!matchedDistrict) return false;
    return cities.some(
      c => (c.districtId === matchedDistrict.id || c.id === matchedDistrict.id) && c.faction === 'ming' && c.troops > 0
    );
  }, [cities, matchedDistrict]);

  const taxRatePercent = isMingOccupied ? 50 : 10;
  const cleanedName = cleanStructureName(structure.name);
  const maxAvailableSmiths = city?.population?.idleLaborers || 0;

  const structureIcon = 
    structure.type === 'farm' 
      ? '/icons/structure_farm.png' 
      : structure.type === 'forge' 
      ? '/icons/structure_forge.png' 
      : '/icons/structure_camp.png';

  const structureTypeName = 
    structure.type === 'farm' 
      ? 'Ruộng Nương' 
      : structure.type === 'forge' 
      ? 'Lò Rèn' 
      : 'Doanh Trại';

  return (
    <div 
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md max-h-[90vh] flex flex-col pointer-events-auto filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.85)] drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nền giấy Dó sứt mẻ tự nhiên */}
        <img
          src="/parchment_torn_panel.png"
          alt="Bảng công trình giấy"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
          draggable={false}
        />

        <div className="relative z-10 px-7 pt-6 pb-8 flex flex-col h-full overflow-y-auto no-scrollbar font-serif">
          
          {/* Header Bảng Giấy */}
          <div className="flex items-start justify-between border-b border-[#8c6b44]/30 pb-2.5 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#3a2010]/10 flex items-center justify-center p-1.5 shrink-0 border border-[#8c6b44]/30">
                <img
                  src={structureIcon}
                  alt={structureTypeName}
                  className="w-full h-full object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
                />
              </div>
              <div>
                <h3 className="font-serif font-black text-lg md:text-xl text-[#261304] leading-tight">
                  {cleanedName}
                </h3>
                <div className="text-xs text-[#704d2e] mt-0.5 flex items-center gap-1.5">
                  <span className="font-bold text-[#8c2d19]">
                    {structureTypeName}
                  </span>
                  <span>•</span>
                  <span>Huyện {matchedDistrict?.name || 'Lam Sơn'}</span>
                  <span>•</span>
                  <span>Đất {TERRAIN_DEFINITIONS[structure.terrain]?.name || structure.terrain}</span>
                </div>
              </div>
            </div>

            {/* Nút Đóng X dạng chấm mực son */}
            <button
              onClick={onClose}
              className="relative group w-7 h-7 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              title="Đóng bảng"
            >
              <img
                src="/ink_blot_red.png"
                alt="Chấm mực đóng"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-0 group-hover:opacity-90 transition-opacity"
              />
              <span className="relative z-10 text-[#593922] group-hover:text-[#fcf4e4] transition-colors">
                <X size={18} strokeWidth={2.5} />
              </span>
            </button>
          </div>

          {/* TRƯỜNG HỢP 1: RUỘNG NƯƠNG (ĐỒN ĐIỀN) */}
          {structure.type === 'farm' && (
            <FarmDetailSection
              structure={liveStructure}
              isMingOccupied={isMingOccupied}
              taxRatePercent={taxRatePercent}
            />
          )}

          {/* TRƯỜNG HỢP 2: LÒ RÈN VŨ KHÍ */}
          {structure.type === 'forge' && (
            <ForgeDetailSection
              structure={structure}
              liveStructure={liveStructure}
              maxAvailableSmiths={maxAvailableSmiths}
            />
          )}

          {/* CÁC NÚT THAO TÁC CƠ SỞ: DI DỜI, PHÁ BỎ, MỞ CĂN CỨ DẠNG QUẸT MỰC */}
          <div className="pt-3 mt-3 border-t border-[#8c6b44]/30 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onRelocate(structure)}
                className="relative group py-2 min-h-[36px] flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                title="Di dời công trình sang vị trí khác"
              >
                <img
                  src="/ink_stroke_1.png"
                  alt="Vệt mực"
                  className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.3)] group-hover:brightness-125 transition-all"
                />
                <span className="relative z-10 text-[#fcf4e4] font-serif font-bold text-xs flex items-center justify-center gap-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  <Wrench size={13} className="text-[#f6d289]" />
                  <span>Di Dời Vị Trí</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => onDemolish(structure)}
                className="relative group py-2 min-h-[36px] flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                title="Phá dỡ công trình và thu hồi vàng"
              >
                <img
                  src="/ink_stroke_red.png"
                  alt="Vệt mực đỏ"
                  className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.3)] group-hover:brightness-110 transition-all"
                />
                <span className="relative z-10 text-[#fcf4e4] font-serif font-bold text-xs flex items-center justify-center gap-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  <Trash2 size={13} className="text-[#fca5a5]" />
                  <span>Phá Bỏ (Hồi Vàng)</span>
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => onOpenCity(structure.cityId)}
              className="relative group w-full py-2 min-h-[36px] flex items-center justify-center transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer"
              title="Mở bảng quản lý căn cứ liên kết"
            >
              <img
                src="/ink_stroke_1.png"
                alt="Vệt mực"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.3)] group-hover:brightness-125 transition-all"
              />
              <span className="relative z-10 text-[#fcf4e4] font-serif font-bold text-xs flex items-center justify-center gap-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                <Castle size={14} className="text-[#f6d289]" />
                <span>Mở Bảng Quản Lý Căn Cứ</span>
              </span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
