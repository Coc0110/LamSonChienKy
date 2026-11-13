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

  if (activeModal !== 'farms') return null;

  const farmStructures = structures.filter(s => s.type === 'farm');
  const nextHarvest = getNextHarvestSeason(day, month, year);

  const activeFarm = farmStructures.find(s => s.status === 'active');
  const currentCondition = activeFarm?.seasonCondition || 'normal';
  const weatherLabel =
    currentCondition === 'bountiful'
      ? 'Thuận lợi (Tiết trời ấm áp, khả năng được mùa cao)'
      : currentCondition === 'poor'
      ? 'Bất lợi (Mưa bão thất thường, rủi ro ngập úng)'
      : 'Bình hòa (Mưa thuận gió hòa, đúng tiết khí)';

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
            <h3 className="font-serif font-black text-lg text-[#261304] leading-tight tracking-wide">
              {UI_TEXT.farmsPanel.title}
            </h3>

            <button
              onClick={() => setActiveModal(null)}
              className="text-[#6e4927] hover:text-[#261304] transition p-1 hover:bg-[#8c6b44]/15 rounded cursor-pointer"
              title="Đóng bảng"
            >
              <X size={20} />
            </button>
          </div>

          {/* Banner Thông Tin Mùa Vụ & Chỉ Số Chung (Xếp hàng tuần tự theo dòng dọc, không chia cột) */}
          <div className="flex flex-col gap-1.5 mb-3 p-2.5 rounded bg-black/[0.04] border border-[#8c6b44]/25 shrink-0 text-xs font-serif">
            <div className="flex items-center justify-between">
              <span className="text-[#5c3e23]">Vụ mùa hiện tại:</span>
              <strong className="text-[#8c2d19] font-bold">
                {nextHarvest.season.name} ({nextHarvest.targetDay}/{nextHarvest.targetMonth}) — còn {nextHarvest.daysRemaining} ngày
              </strong>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[#8c6b44]/15">
              <span className="text-[#5c3e23]">Thời tiết vụ mùa:</span>
              <strong className={`font-bold ${
                currentCondition === 'bountiful' ? 'text-[#15803d]' : currentCondition === 'poor' ? 'text-[#b45309]' : 'text-[#5c3e23]'
              }`}>
                {weatherLabel}
              </strong>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[#8c6b44]/15">
              <span className="text-[#5c3e23]">Nông đinh canh tác:</span>
              <strong className="text-[#15803d] font-bold">
                {totalAssignedWorkers} / {totalMaxWorkers} người
              </strong>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[#8c6b44]/15">
              <span className="text-[#5c3e23]">Sản lượng ước tính:</span>
              <strong className="text-[#b45309] font-bold">
                +{totalExpectedHarvest.toLocaleString()} thạch
              </strong>
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
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${
                            assigned >= max
                              ? 'bg-emerald-100/70 text-emerald-800 border-emerald-600/30'
                              : 'bg-amber-100/70 text-amber-900 border-amber-600/30'
                          }`}>
                            {assigned >= max ? '✓ Đủ người cày cấy' : `Thiếu ${max - assigned} người`}
                          </span>
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
          <div className="pt-3 border-t border-[#8c6b44]/30 mt-2 flex justify-end shrink-0">
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
