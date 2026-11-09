import React from 'react';
import { X } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { useUIStore } from '../../../store/uiStore';
import { getNextHarvestSeason } from '../../../utils/harvestSeasons';
import { UI_TEXT } from '../../../data/uiText';

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
      className="fixed inset-x-3 bottom-3 md:inset-auto md:absolute md:top-[82px] md:left-[98px] z-40 md:w-[460px] max-h-[82vh] flex flex-col pointer-events-auto transition-all duration-300 select-none filter drop-shadow-[0_18px_30px_rgba(0,0,0,0.7)] drop-shadow-[0_3px_8px_rgba(0,0,0,0.45)]"
    >
      {/* Nền giấy Dó sứt mẻ tự nhiên */}
      <img
        src="/parchment_torn_panel.png"
        alt="Bảng Tổng Quản Đồn Điền"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
        draggable={false}
      />

      <div className="relative z-10 p-5 md:p-6 flex flex-col h-full font-serif text-[#261304] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#8c6b44]/35 pb-2.5 mb-3 shrink-0">
            <div>
              <h3 className="font-serif font-black text-lg text-[#261304] leading-tight tracking-wide">
                {UI_TEXT.farmsPanel.title}
              </h3>
              <p className="text-[11px] text-[#704d2e] font-sans">
                {UI_TEXT.farmsPanel.subtitle}
              </p>
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
            <div>
              <div className="text-[11px] text-[#5c3e23]">{UI_TEXT.farmsPanel.stats.nextSeason}</div>
              <div className="font-bold text-[#8c2d19]">
                {nextHarvest.season.name} ({nextHarvest.targetDay}/{nextHarvest.targetMonth}) — còn {nextHarvest.daysRemaining} ngày
              </div>
            </div>

            <div className="flex items-center justify-between pl-3 border-l border-[#8c6b44]/25">
              <div>
                <div className="text-[11px] text-[#5c3e23]">{UI_TEXT.farmsPanel.stats.workers}</div>
                <div className="font-bold text-[#15803d]">
                  {totalAssignedWorkers} / {totalMaxWorkers} người
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-[#5c3e23]">{UI_TEXT.farmsPanel.stats.expectedYield}</div>
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
                {UI_TEXT.farmsPanel.emptyText}
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
                    className="p-3 rounded-lg border border-[#8c6b44]/30 bg-[#8c6b44]/5 flex flex-col gap-2 font-serif text-xs"
                  >
                    {/* Đầu mục: Tên khu ruộng & Cấp bậc */}
                    <div className="flex items-center justify-between border-b border-[#8c6b44]/20 pb-1.5">
                      <h4 className="font-serif font-black text-sm text-[#8c2d19] tracking-wide">
                        {farm.name}
                      </h4>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#8c6b44]/15 border border-[#8c6b44]/25 text-[#5c3e23] font-bold">
                        {tierName}
                      </span>
                    </div>

                    {/* Danh sách thông tin báo cáo: mỗi thông tin một dòng, không có icon */}
                    <ul className="space-y-1.5 text-xs text-[#261304] border-l-2 border-[#8c2d19]/40 pl-3 py-0.5">
                      <li>
                        <span className="text-[#6b4423]">Tình trạng: </span>
                        {isBuilding ? (
                          <strong className="text-amber-800 font-bold">
                            Đang đắp bờ (còn {Math.ceil(farm.buildDaysRemaining)} ngày)
                          </strong>
                        ) : (
                          <strong className="text-emerald-800 font-bold">
                            Đang canh tác ({farm.cropDays || 0} ngày)
                          </strong>
                        )}
                      </li>
                      <li>
                        <span className="text-[#6b4423]">Địa thế: </span>
                        <span className="text-[#261304]">
                          {farm.terrain === 'plains' ? 'Bãi bồi phù sa' : farm.terrain === 'forest' ? 'Nương rẫy ven rừng' : 'Bán sơn địa'}
                          {farm.recentEvent && ` • ${farm.recentEvent}`}
                        </span>
                      </li>
                      <li>
                        <span className="text-[#6b4423]">Nông đinh: </span>
                        <strong className="text-[#15803d] font-bold">
                          {assigned} / {max} người
                        </strong>
                      </li>
                    </ul>

                    {/* Dòng thao tác: Điều chỉnh nông đinh, Định vị */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-[#8c6b44]/20">
                      <div>
                        {!isBuilding && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => assignFarmWorkers(farm.id, -1)}
                              disabled={assigned <= 0}
                              className="px-2 py-0.5 rounded border border-[#8c6b44]/40 bg-white/70 hover:bg-white text-[#261304] text-[11px] font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition active:scale-95"
                              title={UI_TEXT.farmsPanel.actions.decreaseWorker}
                            >
                              - Bớt Đinh
                            </button>
                            <button
                              onClick={() => assignFarmWorkers(farm.id, 1)}
                              disabled={assigned >= max}
                              className="px-2 py-0.5 rounded border border-[#8c6b44]/40 bg-white/70 hover:bg-white text-[#8c2d19] text-[11px] font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition active:scale-95"
                              title={UI_TEXT.farmsPanel.actions.increaseWorker}
                            >
                              + Thêm Đinh
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setFlyToTarget({ x: farm.x, y: farm.y });
                          setActiveModal(null);
                        }}
                        className="px-2.5 py-1 rounded border border-[#8c6b44]/40 bg-[#8c6b44]/10 hover:bg-[#8c6b44]/25 text-[#5c3e23] hover:text-[#8c2d19] text-xs font-bold transition cursor-pointer active:scale-95"
                        title={UI_TEXT.farmsPanel.actions.locate}
                      >
                        Định vị
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
              className="px-4 py-1.5 rounded bg-[#8c2d19] hover:bg-[#6e1e0d] text-[#fff3db] font-serif font-black text-xs shadow transition cursor-pointer active:scale-95"
            >
              <span>{UI_TEXT.farmsPanel.actions.buildNew}</span>
            </button>
          </div>
        </div>
      </div>
  );
});

FarmsOverviewModal.displayName = 'FarmsOverviewModal';
