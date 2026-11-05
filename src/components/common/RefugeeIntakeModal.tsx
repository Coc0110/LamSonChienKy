import React from 'react';
import { X, Users } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { CAMP_CAPACITY_BY_LEVEL } from '../../types';

export const RefugeeIntakeModal: React.FC = () => {
  const isRefugeeModalOpen = useGameStore((state) => state.isRefugeeModalOpen);
  const closeRefugeeModal = useGameStore((state) => state.closeRefugeeModal);
  const pendingRefugees = useGameStore((state) => state.pendingRefugees || []);
  const acceptRefugeeWave = useGameStore((state) => state.acceptRefugeeWave);
  const cities = useGameStore((state) => state.cities);
  const resources = useGameStore((state) => state.resources);
  const structures = useGameStore((state) => state.structures);
  const formations = useGameStore((state) => state.formations);

  if (!isRefugeeModalOpen) return null;

  const city = cities.find((c) => c.id === 'lam_son') || cities.find((c) => c.faction === 'lam_son') || null;

  const { currentPop, maxCapacity, remainingCap } = (() => {
    if (!city || !city.population) return { currentPop: 0, maxCapacity: 500, remainingCap: 500 };
    const pop = city.population;
    const builderCount = structures
      .filter((s) => s.cityId === city.id && s.status === 'building')
      .reduce((acc, s) => acc + (s.builderWorkers || 0), 0);
    const formationTroops = formations
      .filter((f) => f.cityId === city.id)
      .reduce((acc, f) => acc + (f.totalTroops || 0), 0);
    const campBuilderCount = city.upgrading?.builders || 0;

    const total =
      pop.combatTroops +
      pop.idleLaborers +
      pop.farmLaborers +
      pop.forgeLaborers +
      (pop.swappedCombatants || 0) +
      pop.unfitPopulation +
      (city.training?.traineesCount || 0) +
      builderCount +
      formationTroops +
      campBuilderCount;

    const cap = CAMP_CAPACITY_BY_LEVEL[city.level || 1] || 500;
    return {
      currentPop: total,
      maxCapacity: cap,
      remainingCap: Math.max(0, cap - total),
    };
  })();

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none"
      onClick={closeRefugeeModal}
    >
      <div
        className="relative w-full max-w-xl max-h-[85vh] flex flex-col pointer-events-auto filter drop-shadow-[0_20px_45px_rgba(0,0,0,0.9)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nền giấy Dó sứt mẻ */}
        <img
          src="/parchment_torn_panel.png"
          alt="Khung quân lệnh"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
          draggable={false}
        />

        <div className="relative z-10 px-8 pt-7 pb-7 flex flex-col h-full font-serif text-[#261304] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#8c6b44]/35 pb-2.5 mb-2.5 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#8c2d19]/15 flex items-center justify-center text-[#8c2d19] border border-[#8c6b44]/40">
                <Users size={18} />
              </div>
              <h3 className="font-serif font-black text-lg text-[#261304] leading-tight">
                Danh sách lưu dân
              </h3>
            </div>

            <button
              onClick={closeRefugeeModal}
              className="text-[#6e4927] hover:text-[#261304] transition p-1 hover:bg-[#8c6b44]/15 rounded cursor-pointer"
              title="Đóng"
            >
              <X size={18} />
            </button>
          </div>

          {/* Thông tin chung: Trại còn trống & Kho lương */}
          <div className="p-2.5 rounded bg-black/[0.04] border border-[#8c6b44]/25 mb-3 flex items-center justify-between text-xs shrink-0 font-serif">
            <div>
              <span className="text-[#5c3e23]">Trại còn trống: </span>
              <strong className={remainingCap <= 0 ? 'text-[#b91c1c] font-black' : 'text-[#15803d] font-bold'}>
                {remainingCap.toLocaleString()} chỗ
              </strong>
              <span className="text-[#704d2e] text-[11px] font-sans"> ({currentPop}/{maxCapacity})</span>
            </div>

            <div>
              <span className="text-[#5c3e23]">Kho lương: </span>
              <strong className="text-[#8c2d19] font-bold">
                {Math.floor(resources.food).toLocaleString()} thạch
              </strong>
            </div>
          </div>

          {/* Danh sách toàn bộ các đoàn lưu dân */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 pr-1">
            {pendingRefugees.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#704d2e] italic font-serif">
                Hiện không có đoàn lưu dân nào đang chờ trước cổng trại.
              </div>
            ) : (
              pendingRefugees.map((wave) => {
                const halfFood = Math.max(1, Math.round(wave.foodCost * 0.5));
                const canAcceptFull = resources.food >= wave.foodCost && remainingCap >= wave.totalCount;
                const canAcceptAbleOnly = resources.food >= halfFood && remainingCap >= wave.idleCount;

                return (
                  <div
                    key={wave.id}
                    className="p-3 rounded-lg border border-[#8c6b44]/30 bg-[#8c6b44]/5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 transition"
                  >
                    {/* Thông tin đoàn */}
                    <div className="space-y-1 text-xs">
                      <div className="font-serif font-black text-sm text-[#8c2d19]">
                        Lưu dân từ {wave.originName}
                      </div>

                      <div className="text-[#261304] font-serif font-bold">
                        {wave.idleCount} tráng phu, {wave.unfitCount} lão, ấu
                      </div>

                      <div className="text-[11px] text-[#704d2e] font-sans">
                        Ngày tới: {wave.dateStr} • <span className="text-[#8c2d19] font-bold">còn {wave.daysRemaining ?? 7} ngày</span>
                      </div>
                    </div>

                    {/* Bộ 3 nút thao tác cho từng đoàn */}
                    <div className="flex items-center gap-1.5 shrink-0 pt-1 md:pt-0">
                      {/* 1. Nhận toàn bộ */}
                      <button
                        disabled={!canAcceptFull}
                        onClick={() => acceptRefugeeWave(wave.id, 'full')}
                        className="py-1 px-2.5 rounded bg-[#8c2d19] hover:bg-[#6b1e10] disabled:opacity-40 disabled:cursor-not-allowed text-[#fff3db] text-xs font-serif font-bold transition shadow-xs cursor-pointer whitespace-nowrap"
                        title={`Cần ${wave.foodCost} lương, ${wave.totalCount} chỗ`}
                      >
                        Nhận toàn bộ (-{wave.foodCost} lương)
                      </button>

                      {/* 2. Chỉ nhận tráng đinh */}
                      <button
                        disabled={!canAcceptAbleOnly}
                        onClick={() => acceptRefugeeWave(wave.id, 'able_bodied_only')}
                        className="py-1 px-2.5 rounded border border-[#8c6b44]/50 bg-[#8c6b44]/20 hover:bg-[#8c6b44]/35 disabled:opacity-40 disabled:cursor-not-allowed text-[#42250d] text-xs font-serif font-bold transition cursor-pointer whitespace-nowrap"
                        title={`Cần ${halfFood} lương, ${wave.idleCount} chỗ`}
                      >
                        Chỉ nhận tráng đinh (-{halfFood} lương)
                      </button>

                      {/* 3. Không nhận */}
                      <button
                        onClick={() => acceptRefugeeWave(wave.id, 'reject')}
                        className="py-1 px-2 rounded border border-[#8c6b44]/35 hover:bg-black/10 text-[#704d2e] hover:text-[#261304] text-xs font-serif transition cursor-pointer whitespace-nowrap"
                        title="Từ chối đoàn lưu dân này"
                      >
                        Không nhận
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
