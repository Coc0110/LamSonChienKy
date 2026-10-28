import React, { useState, useMemo } from 'react';
import { X, Wrench, Trash2, Castle, Plus, Minus} from 'lucide-react';
import type { PlacedStructure, WeaponCraftType } from '../../types';
import { TERRAIN_DEFINITIONS } from '../../data/terrainData';
import { useGameStore } from '../../store/gameStore';
import districtData from '../../data/districtPolygons.json';
import { findDistrictForCoord } from '../../utils/mapGeo';

interface StructureDetailModalProps {
  structure: PlacedStructure;
  onClose: () => void;
  onRelocate: (structure: PlacedStructure) => void;
  onDemolish: (structure: PlacedStructure) => void;
  onOpenCity: (cityId: string) => void;
}

export const cleanStructureName = (name: string): string => {
  return name.replace(/\s*[\(\[]\d+x\d+.*?[\)\]]/gi, '').trim();
};

const WEAPONS_CATALOG: {
  type: WeaponCraftType;
  name: string;
  cost: number;
  workDaysPerUnit: number;
}[] = [
  {
    type: 'sword',
    name: 'Kiếm',
    cost: 2.0,
    workDaysPerUnit: 1.8,
  },
  {
    type: 'bow',
    name: 'Cung',
    cost: 1.5,
    workDaysPerUnit: 1.4,
  },
  {
    type: 'spear',
    name: 'Giáo',
    cost: 1.0,
    workDaysPerUnit: 1.0,
  },
  {
    type: 'armor',
    name: 'Giáp',
    cost: 3.0,
    workDaysPerUnit: 2.2,
  },
];

export const StructureDetailModal: React.FC<StructureDetailModalProps> = ({
  structure,
  onClose,
  onRelocate,
  onDemolish,
  onOpenCity,
}) => {
  const cities = useGameStore(state => state.cities);
  const resources = useGameStore(state => state.resources);
  const assignFarmWorkers = useGameStore(state => state.assignFarmWorkers);
  const startForgeOrder = useGameStore(state => state.startForgeOrder);
  const cancelForgeOrder = useGameStore(state => state.cancelForgeOrder);
  const liveStructure = useGameStore(state => state.structures.find(s => s.id === structure.id)) || structure;

  const [forgeTab, setForgeTab] = useState<'progress' | 'craft'>(
    liveStructure.activeOrder ? 'progress' : 'craft'
  );
  const [selectedWeaponType, setSelectedWeaponType] = useState<WeaponCraftType>('sword');
  const [craftQuantity, setCraftQuantity] = useState<number>(25);
  const [craftSmiths, setCraftSmiths] = useState<number>(5);

  const city = useMemo(() => cities.find(c => c.id === structure.cityId), [cities, structure.cityId]);
  const defaultDistricts = (districtData as any).districts || [];
  const matchedDistrict = useMemo(
    () => findDistrictForCoord(structure.x, structure.y, defaultDistricts),
    [structure.x, structure.y, defaultDistricts]
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

  // Tính toán sản lượng ruộng nương
  const efficiency = structure.gridSize === 7 ? 0.26 : structure.gridSize === 6 ? 0.24 : 0.22;
  const weatherMult = structure.seasonCondition === 'bountiful' ? 1.25 : structure.seasonCondition === 'poor' ? 0.70 : 1.0;
  const workers = structure.assignedWorkers || 0;
  const expectedTotalFood = Math.round(workers * 90 * efficiency * weatherMult);
  const expectedTax = Math.round(expectedTotalFood * (taxRatePercent / 100));
  const expectedNetHarvest = Math.max(0, expectedTotalFood - expectedTax);

  // Tính toán đặt rèn
  const selectedWeapon = WEAPONS_CATALOG.find(w => w.type === selectedWeaponType) || WEAPONS_CATALOG[0];
  const totalGoldCost = Math.ceil(craftQuantity * selectedWeapon.cost);
  const estimatedDays = Math.max(4, Math.ceil((craftQuantity * selectedWeapon.workDaysPerUnit * 1.5) / Math.max(1, craftSmiths)));
  const maxAvailableSmiths = city?.population?.idleLaborers || 0;

  const handleStartForge = () => {
    const res = startForgeOrder(structure.id, {
      weaponType: selectedWeaponType,
      quantity: craftQuantity,
      smiths: craftSmiths,
    });
    alert(res.message);
    if (res.success) {
      setForgeTab('progress');
    }
    if (res.success) {
      setForgeTab('progress');
    }
  };

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
            <div className="space-y-3 text-xs text-[#2a1708]">
              {/* Trạng thái thi công / hoạt động */}
              <div className="p-2.5 rounded bg-black/[0.04] border border-[#8c6b44]/25 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[#5c3e23] font-bold">Trạng thái:</span>
                  <span className={`font-bold ${structure.status === 'building' ? 'text-[#b45309]' : 'text-[#15803d]'}`}>
                    {structure.status === 'building'
                      ? `🚧 Đang thi công (còn ${structure.buildDaysRemaining} ngày)`
                      : '🟢 Canh tác bình thường'}
                  </span>
                </div>

                {/* Điều động nông đinh canh tác với nút quẹt mực - / + */}
                {structure.status === 'active' && (
                  <div className="flex justify-between items-center pt-1 border-t border-[#8c6b44]/20">
                    <span className="text-[#5c3e23] font-bold">Nông đinh canh tác:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => assignFarmWorkers(structure.id, -1)}
                        className="relative group w-7 h-7 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                        title="Bớt 1 nông đinh"
                      >
                        <img
                          src="/ink_blot.png"
                          alt="Chấm mực"
                          className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] group-hover:brightness-125 transition-all"
                        />
                        <span className="relative z-10 text-[#fcf4e4] font-bold">
                          <Minus size={13} strokeWidth={2.8} />
                        </span>
                      </button>
                      <span className="font-mono font-bold text-sm min-w-[50px] text-center text-[#8c2d19]">
                        {structure.assignedWorkers}/{structure.maxWorkers}
                      </span>
                      <button
                        onClick={() => assignFarmWorkers(structure.id, 1)}
                        className="relative group w-7 h-7 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                        title="Thêm 1 nông đinh"
                      >
                        <img
                          src="/ink_blot.png"
                          alt="Chấm mực"
                          className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] group-hover:brightness-125 transition-all"
                        />
                        <span className="relative z-10 text-[#fcf4e4] font-bold">
                          <Plus size={13} strokeWidth={2.8} />
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Tình trạng mùa màng & Sản lượng dự kiến */}
              {structure.status === 'active' && (
                <div className="p-3 rounded bg-black/[0.04] border border-[#8c6b44]/25 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[#5c3e23] font-bold">Thời tiết vụ mùa:</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      structure.seasonCondition === 'bountiful' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : structure.seasonCondition === 'poor'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {structure.seasonCondition === 'bountiful' 
                        ? '🌾 Được mùa bội thu (+25%)' 
                        : structure.seasonCondition === 'poor'
                        ? '🍂 Mất mùa / Hạn hán (-30%)'
                        : '🌧️ Mưa thuận gió hòa (100%)'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#5c3e23]">Tiến độ vụ mùa:</span>
                    <span className="font-mono font-bold text-[#261304]">
                      Ngày {structure.cropDays}/{structure.cropCycleDays} (~{Math.round((structure.cropDays/structure.cropCycleDays)*100)}%)
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#5c3e23]">Tổng sản lượng dự kiến:</span>
                    <span className="font-mono font-bold text-[#8c2d19]">
                      ~{expectedTotalFood.toLocaleString()} thạch thóc
                    </span>
                  </div>

                  {/* Thuế suất & Ảnh hưởng quân Minh */}
                  <div className="pt-1.5 border-t border-[#8c6b44]/25 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-[#5c3e23]">Sưu thuế nộp: </span>
                      <span className={`font-bold ${isMingOccupied ? 'text-red-700' : 'text-emerald-700'}`}>
                        {taxRatePercent}% ({isMingOccupied ? 'Giặc Minh chiếm đóng' : 'Nuôi nghĩa quân'})
                      </span>
                    </div>
                    <span className="font-mono font-bold text-red-700">
                      -{expectedTax.toLocaleString()} thạch
                    </span>
                  </div>

                  {/* Thực thu nhập kho */}
                  <div className="pt-1 border-t border-[#8c6b44]/25 flex justify-between items-center text-sm font-bold">
                    <span className="text-[#261304]">Thực thu nhập kho lương:</span>
                    <span className="font-mono text-[#15803d]">
                      +{expectedNetHarvest.toLocaleString()} thạch
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TRƯỜNG HỢP 2: LÒ RÈN (CHIA LÀM 2 TAB: ĐANG RÈN & ĐẶT RÈN) */}
          {structure.type === 'forge' && (
            <div className="space-y-3">
              {/* Thanh chuyển 2 Tab: Đang Rèn vs Đặt Rèn dạng vệt mực */}
              <div className="flex border-b border-[#8c6b44]/30 pb-1.5 gap-2">
                <button
                  type="button"
                  onClick={() => setForgeTab('progress')}
                  className="relative group flex-1 py-1.5 min-h-[34px] flex items-center justify-center transition-transform hover:scale-[1.02] active:scale-98 cursor-pointer"
                >
                  {forgeTab === 'progress' ? (
                    <>
                      <img
                        src="/ink_stroke_red.png"
                        alt="Vệt mực đỏ"
                        className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.25)]"
                      />
                      <span className="relative z-10 text-xs font-serif font-black text-[#fcf4e4] tracking-wide flex items-center gap-1.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
                        Đang Rèn & Hàng Chờ
                      </span>
                    </>
                  ) : (
                    <span className="relative z-10 text-xs font-serif font-bold text-[#6b4a2e] hover:text-[#261304] transition-colors flex items-center gap-1.5">
                      Đang Rèn & Hàng Chờ
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setForgeTab('craft')}
                  className="relative group flex-1 py-1.5 min-h-[34px] flex items-center justify-center transition-transform hover:scale-[1.02] active:scale-98 cursor-pointer"
                >
                  {forgeTab === 'craft' ? (
                    <>
                      <img
                        src="/ink_stroke_red.png"
                        alt="Vệt mực đỏ"
                        className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.25)]"
                      />
                      <span className="relative z-10 text-xs font-serif font-black text-[#fcf4e4] tracking-wide flex items-center gap-1.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
                        Đặt Rèn
                      </span>
                    </>
                  ) : (
                    <span className="relative z-10 text-xs font-serif font-bold text-[#6b4a2e] hover:text-[#261304] transition-colors flex items-center gap-1.5">
                      Đặt Rèn
                    </span>
                  )}
                </button>
              </div>

              {/* TAB 1: ĐANG RÈN & HÀNG CHỜ */}
              {forgeTab === 'progress' && (
                <div className="space-y-2 text-xs text-[#2a1708]">
                  {/* Tiến trình mẻ rèn hiện tại */}
                  {liveStructure.activeOrder ? (
                    <div className="p-3 rounded bg-black/[0.04] border border-[#8c6b44]/25 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#8c2d19] text-sm">
                            Đang đúc: {liveStructure.activeOrder.name}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                          {liveStructure.activeOrder.quantity} món
                        </span>
                      </div>

                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[11px] text-[#5c3e23]">
                          <span>Tiến độ đúc:</span>
                          <span className="font-mono font-bold">
                            Còn {liveStructure.activeOrder.remainingDays}/{liveStructure.activeOrder.totalDays} ngày
                          </span>
                        </div>
                        {/* Thanh mực tiến độ */}
                        <div className="w-full h-2 rounded-full bg-black/10 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-600 to-red-600 transition-all duration-300"
                            style={{
                              width: `${Math.round(((liveStructure.activeOrder.totalDays - liveStructure.activeOrder.remainingDays) / liveStructure.activeOrder.totalDays) * 100)}%`
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-[#5c3e23] pt-1">
                        <span>Thợ rèn tham gia:</span>
                        <span className="font-bold text-[#261304]">
                          {liveStructure.activeOrder.assignedSmiths} thợ rèn
                        </span>
                      </div>

                      {/* Nút hủy mẻ rèn dạng quẹt mực */}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Hủy đơn đúc này? Bạn sẽ chỉ thu hồi 50% vàng chi phí.')) {
                            cancelForgeOrder(structure.id);
                          }
                        }}
                        className="relative group w-full py-1.5 min-h-[30px] flex items-center justify-center transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer mt-2"
                      >
                        <img
                          src="/ink_stroke_red.png"
                          alt="Vệt mực đỏ"
                          className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)] opacity-90 group-hover:opacity-100 transition-opacity"
                        />
                        <span className="relative z-10 text-[#fcf4e4] font-serif font-bold text-xs tracking-wide">
                          Hủy Mẻ Rèn (Hoàn 50% Vàng)
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded bg-black/[0.04] border border-[#8c6b44]/25 text-center text-[#704d2e] italic">
                      Lò rèn hiện đang tắt lửa. Hãy chuyển sang tab "Đặt Rèn" bên cạnh để bắt đầu đúc binh khí!
                    </div>
                  )}

                  {/* Hàng chờ các mẻ rèn tiếp theo */}
                  <div className="space-y-1.5 pt-1">
                    <span className="font-bold text-xs text-[#5c3e23] uppercase tracking-wider">
                      Hàng Chờ Đúc ({liveStructure.forgeQueue?.length || 0})
                    </span>

                    {liveStructure.forgeQueue && liveStructure.forgeQueue.length > 0 ? (
                      <div className="space-y-1">
                        {liveStructure.forgeQueue.map((item, idx) => (
                          <div key={item.id} className="p-2 rounded bg-black/[0.03] border border-[#8c6b44]/20 flex items-center justify-between">
                            <div>
                              <span className="font-bold text-[#261304]">
                                #{idx + 1}. {item.name}
                              </span>
                              <div className="text-[10px] text-[#704d2e]">
                                {item.quantity} món • Cần {item.totalDays} ngày
                              </div>
                            </div>
                            <div className="flex items-center gap-1 font-mono text-xs font-bold text-[#8c2d19]">
                                <img src="/icons/gold.png" alt="Vàng" className="w-3.5 h-3.5 object-contain inline-block" />
                                <span>{item.goldCost}</span>
                              </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-[#704d2e] italic">
                        Chưa có mẻ rèn nào trong hàng chờ.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: ĐẶT RÈN (DANH SÁCH VẬT PHẨM: KIẾM, CUNG, GIÁO, GIÁP) */}
              {forgeTab === 'craft' && (
                <div className="space-y-2.5 text-xs text-[#2a1708]">
                  {/* Danh sách 4 loại vũ khí */}
                  <div className="grid grid-cols-2 gap-2">
                    {WEAPONS_CATALOG.map(w => {
                      const isSel = selectedWeaponType === w.type;
                      return (
                        <button
                          key={w.type}
                          type="button"
                          onClick={() => setSelectedWeaponType(w.type)}
                          className={`relative group px-3.5 py-2 min-h-[40px] rounded flex items-center justify-between transition cursor-pointer overflow-hidden ${
                            isSel
                              ? 'shadow-sm'
                              : 'bg-black/[0.03] border border-[#8c6b44]/25 hover:bg-black/[0.06]'
                          }`}
                        >
                          {isSel && (
                            <img
                              src="/ink_stroke_1.png"
                              alt="Vệt mực chọn"
                              className="absolute inset-0 w-full h-full object-fill pointer-events-none opacity-90"
                            />
                          )}
                          <span className={`font-serif font-bold text-sm relative z-10 ${
                            isSel ? 'text-[#fcf4e4] drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]' : 'text-[#261304]'
                          }`}>
                            {w.name}
                          </span>
                          <div className={`flex items-center gap-1 relative z-10 font-mono font-bold text-xs ${
                            isSel ? 'text-[#f6d289]' : 'text-[#8c2d19]'
                          }`}>
                            <img 
                              src="/icons/gold.png" 
                              alt="Vàng" 
                              className="w-3.5 h-3.5 object-contain inline-block" 
                            />
                            <span>{w.cost}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Tùy chỉnh Số Lượng dạng vệt mực */}
                  <div className="p-2.5 rounded bg-black/[0.04] border border-[#8c6b44]/25 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[#5c3e23] font-bold">Số lượng đặt rèn:</span>
                      <span className="font-mono font-bold text-sm text-[#8c2d19]">
                        {craftQuantity} món
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[10, 25, 50, 100].map(q => {
                        const isChosen = craftQuantity === q;
                        return (
                          <button
                            key={q}
                            type="button"
                            onClick={() => setCraftQuantity(q)}
                            className="relative group flex-1 py-1 min-h-[28px] flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                          >
                            {isChosen ? (
                              <>
                                <img
                                  src="/ink_stroke_red.png"
                                  alt="Vệt mực đỏ"
                                  className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
                                />
                                <span className="relative z-10 text-xs font-serif font-black text-[#fcf4e4] drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                                  {q}
                                </span>
                              </>
                            ) : (
                              <span className="relative z-10 text-xs font-serif font-bold text-[#3d2714] hover:text-[#8c2d19] transition-colors">
                                {q}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tùy chỉnh Thợ Rèn Điều Động */}
                  <div className="p-2.5 rounded bg-black/[0.04] border border-[#8c6b44]/25 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[#5c3e23] font-bold">Thợ rèn điều động: </span>
                        <span className="text-[10px] text-[#704d2e]">(Rảnh rỗi: {maxAvailableSmiths})</span>
                      </div>
                      <span className="font-mono font-bold text-sm text-[#261304]">
                        {craftSmiths} thợ
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={15}
                      value={craftSmiths}
                      onChange={(e) => setCraftSmiths(parseInt(e.target.value) || 1)}
                      className="w-full accent-[#8c2d19] cursor-pointer"
                    />
                  </div>

                  {/* Tóm tắt chi phí & thời gian */}
                  <div className="flex justify-between items-center px-1 text-xs">
                    <div>
                      <span className="text-[#5c3e23]">Cần: </span>
                      <img src="/icons/gold.png" alt="Vàng" className="w-3.5 h-3.5 object-contain inline-block mx-0.5" />
                      <span className="font-mono font-bold text-[#8c2d19]">{totalGoldCost}</span>
                      <span className="text-[#704d2e] text-[10px]"> (Có {Math.floor(resources.gold)})</span>
                    </div>
                    <div>
                      <span className="text-[#5c3e23]">Thời gian: </span>
                      <span className="font-mono font-bold text-[#261304]">{estimatedDays} ngày</span>
                    </div>
                  </div>

                  {/* Nút Đặt Rèn dạng vệt mực đỏ lớn */}
                  <button
                    type="button"
                    onClick={handleStartForge}
                    disabled={resources.gold < totalGoldCost}
                    className="relative group w-full py-2 min-h-[42px] flex items-center justify-center transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <img
                      src="/ink_stroke_red.png"
                      alt="Vệt mực đỏ"
                      className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] group-hover:brightness-110 transition-all"
                    />
                    <span className="relative z-10 font-serif font-bold text-sm text-[#fcf4e4] flex items-center justify-center gap-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      <span>
                        {liveStructure.activeOrder ? 'Xếp Thêm Vào Hàng Chờ' : 'Bắt Đầu Nổi Lửa Rèn'}
                      </span>
                    </span>
                  </button>
                </div>
              )}
            </div>
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
