import React from 'react';
import { X, MapPin, Plus, Minus, Wheat, Calendar } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { useUIStore } from '../../../store/uiStore';
import { getNextHarvestSeason } from '../../../utils/harvestSeasons';

export const FarmsOverviewModal: React.FC = React.memo(() => {
  const activeModal = useUIStore(state => state.activeModal);
  const setActiveModal = useUIStore(state => state.setActiveModal);
  const setFlyToTarget = useUIStore(state => state.setFlyToTarget);
  const toggleBuildPaper = useUIStore(state => state.toggleBuildPaper);

  const day = useGameStore(state => state.day);
  const month = useGameStore(state => state.month);
  const year = useGameStore(state => state.year);
  const structures = useGameStore(state => state.structures);
  const assignFarmWorkers = useGameStore(state => state.assignFarmWorkers);

  if (activeModal !== 'farms') return null;

  const farmStructures = structures.filter(s => s.type === 'farm');
  const nextHarvest = getNextHarvestSeason(day, month, year);

  // Tính tổng sản lượng ước tính của toàn bộ đồn điền
  const totalExpectedHarvest = farmStructures.reduce((acc, s) => {
    if (s.status !== 'active' || !s.assignedWorkers) return acc;
    const projectedDays = (s.cropDays || 0) + nextHarvest.daysRemaining;
    const efficiency = s.gridSize === 7 ? 0.26 : s.gridSize === 6 ? 0.24 : 0.22;
    const baseCrop = Math.round(s.assignedWorkers * projectedDays * efficiency);
    const taxRate = 0.10;
    return acc + Math.max(0, Math.round(baseCrop * (1 - taxRate)));
  }, 0);

  const totalAssignedWorkers = farmStructures.reduce((acc, s) => acc + (s.assignedWorkers || 0), 0);
  const totalMaxWorkers = farmStructures.reduce((acc, s) => acc + (s.maxWorkers || 25), 0);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 pt-20 bg-black/70 backdrop-blur-xs select-none"
      onClick={() => setActiveModal(null)}
    >
      <div 
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col pointer-events-auto filter drop-shadow-[0_20px_45px_rgba(0,0,0,0.9)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nền giấy Dó sứt mẻ tự nhiên */}
        <img
          src="/parchment_torn_panel.png"
          alt="Bảng Tổng Quản Đồn Điền"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
          draggable={false}
        />

        <div className="relative z-10 p-6 md:p-8 flex flex-col h-full font-serif text-[#261304] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#8c6b44]/35 pb-2.5 mb-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#8c2d19]/15 flex items-center justify-center text-[#8c2d19] border border-[#8c6b44]/40">
                <Wheat size={18} />
              </div>
              <div>
                <h3 className="font-serif font-black text-lg text-[#261304] leading-tight">
                  Tổng Quản Đồn Điền & Mùa Vụ
                </h3>
                <p className="text-[11px] text-[#704d2e] font-sans">
                  Quản lý khai hoang, tiến độ canh tác và sản lượng kho lương nghĩa quân
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="text-[#6e4927] hover:text-[#261304] transition p-1 hover:bg-[#8c6b44]/15 rounded cursor-pointer"
              title="Đóng bảng"
            >
              <X size={20} />
            </button>
          </div>

          {/* Banner Thông Tin Mùa Vụ & Chỉ Số Chung */}
          <div className="grid grid-cols-2 gap-2.5 mb-3 p-2.5 rounded bg-black/[0.04] border border-[#8c6b44]/25 shrink-0 text-xs">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-[#8c2d19] shrink-0" />
              <div>
                <div className="text-[11px] text-[#5c3e23]">Mùa gặt kế tiếp:</div>
                <div className="font-bold text-[#8c2d19]">
                  {nextHarvest.season.name} ({nextHarvest.targetDay}/{nextHarvest.targetMonth}) — còn {nextHarvest.daysRemaining} ngày
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pl-3 border-l border-[#8c6b44]/25">
              <div>
                <div className="text-[11px] text-[#5c3e23]">Nông đinh canh tác:</div>
                <div className="font-bold text-[#15803d]">
                  {totalAssignedWorkers} / {totalMaxWorkers} người
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-[#5c3e23]">Dự thu vụ này:</div>
                <div className="font-bold text-[#b45309]">
                  +{totalExpectedHarvest.toLocaleString()} thạch
                </div>
              </div>
            </div>
          </div>

          {/* Danh Sách Toàn Bộ Ruộng Đồn Điền */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 pr-1">
            {farmStructures.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#704d2e] italic">
                Nghĩa quân chưa khai hoang thửa ruộng nào. Hãy bấm Khai Hoang bên dưới để mở đất!
              </div>
            ) : (
              farmStructures.map(farm => {
                const tierName = farm.gridSize === 7 ? 'Đại Điền (7x7)' : farm.gridSize === 6 ? 'Trung Điền (6x6)' : 'Tiểu Điền (5x5)';
                const isBuilding = farm.status === 'building';
                const assigned = farm.assignedWorkers || 0;
                const max = farm.maxWorkers || 25;

                return (
                  <div
                    key={farm.id}
                    className="p-3 rounded-lg border border-[#8c6b44]/30 bg-[#8c6b44]/5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#8c2d19]">{farm.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#8c6b44]/15 border border-[#8c6b44]/25 text-[#5c3e23] font-bold">
                          {tierName}
                        </span>
                        {isBuilding ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-800 font-bold">
                            Đang đắp bờ (còn {Math.ceil(farm.buildDaysRemaining)} ngày)
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-800 font-bold">
                            Đã canh tác {farm.cropDays || 0} ngày
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-[#704d2e]">
                        Địa thế: {farm.terrain === 'plains' ? 'Bãi bồi phù sa' : farm.terrain === 'forest' ? 'Nương rẫy ven rừng' : 'Bán sơn địa'}
                        {farm.recentEvent && ` • ${farm.recentEvent}`}
                      </div>
                    </div>

                    {/* Phân bổ Nông đinh & Nút tăng giảm */}
                    <div className="flex items-center gap-3 shrink-0">
                      {!isBuilding && (
                        <div className="flex items-center gap-1.5 bg-[#8c6b44]/10 p-1 rounded border border-[#8c6b44]/25">
                          <button
                            onClick={() => assignFarmWorkers(farm.id, -1)}
                            disabled={assigned <= 0}
                            className="w-5 h-5 rounded flex items-center justify-center bg-white/70 hover:bg-white border border-[#8c6b44]/40 text-[#261304] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="Bớt 1 nông đinh"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="font-bold text-xs px-1 text-[#8c2d19] min-w-[42px] text-center font-mono">
                            {assigned}/{max}
                          </span>
                          <button
                            onClick={() => assignFarmWorkers(farm.id, 1)}
                            disabled={assigned >= max}
                            className="w-5 h-5 rounded flex items-center justify-center bg-white/70 hover:bg-white border border-[#8c6b44]/40 text-[#261304] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="Thêm 1 nông đinh (tự động điều động lính rảnh nếu thiếu tráng phu)"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      )}

                      {/* Nút Định Vị Trên Bản Đồ */}
                      <button
                        onClick={() => {
                          setFlyToTarget({ x: farm.x, y: farm.y });
                          setActiveModal(null);
                        }}
                        className="p-1.5 rounded hover:bg-[#8c6b44]/20 text-[#5c3e23] hover:text-[#8c2d19] transition cursor-pointer"
                        title="Định vị thửa ruộng này trên bản đồ"
                      >
                        <MapPin size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer nút hành động */}
          <div className="pt-3 border-t border-[#8c6b44]/30 mt-2 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-[#704d2e] italic">
              * Chính sách "Ngụ binh ư nông": khi thiếu tráng phu, nghĩa binh rảnh tại căn cứ sẽ tự động thế chỗ cày ruộng.
            </span>
            <button
              onClick={() => {
                setActiveModal(null);
                toggleBuildPaper();
              }}
              className="relative group px-4 py-1.5 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
            >
              <img
                src="/ink_stroke_red.png"
                alt="Khai hoang"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
              />
              <span className="relative z-10 text-[#fcf4e4] font-serif font-black text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                + Khai Hoang Ruộng Mới
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

FarmsOverviewModal.displayName = 'FarmsOverviewModal';
