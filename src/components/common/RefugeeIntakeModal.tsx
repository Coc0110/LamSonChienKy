import React from 'react';
import { X, Users } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { CAMP_CAPACITY_BY_LEVEL } from '../../types';
import { UI_TEXT } from '../../data/uiText';

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
      className="fixed inset-x-3 bottom-3 md:inset-auto md:absolute md:top-[82px] md:left-[98px] z-40 md:w-[460px] max-h-[82vh] flex flex-col pointer-events-auto transition-all duration-300 select-none filter drop-shadow-[0_18px_30px_rgba(0,0,0,0.7)] drop-shadow-[0_3px_8px_rgba(0,0,0,0.45)]"
    >
      {/* Nền giấy Dó sứt mẻ */}
      <img
        src="/parchment_torn_panel.png"
        alt="Khung quân lệnh"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
        draggable={false}
      />

      <div className="relative z-10 px-6 pt-6 pb-6 flex flex-col h-full font-serif text-[#261304] overflow-hidden">
        {/* Header */}
          <div className="flex items-center justify-between border-b border-[#8c6b44]/35 pb-2.5 mb-2.5 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#8c2d19]/15 flex items-center justify-center text-[#8c2d19] border border-[#8c6b44]/40">
                <Users size={18} />
              </div>
              <h3 className="font-serif font-black text-lg text-[#261304] leading-tight">
                {UI_TEXT.refugeesPanel.title}
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
                {UI_TEXT.refugeesPanel.emptyText}
              </div>
            ) : (
              pendingRefugees.map((wave) => {
                const halfFood = Math.max(1, Math.round(wave.foodCost * 0.5));
                const canAcceptFull = resources.food >= wave.foodCost && remainingCap >= wave.totalCount;
                const canAcceptAbleOnly = resources.food >= halfFood && remainingCap >= wave.idleCount;
                const isDeparted = Boolean(wave.departed || (wave.daysRemaining ?? 0) <= 0);

                return (
                  <div
                    key={wave.id}
                    className={`p-3 rounded-lg border transition ${
                      isDeparted
                        ? 'border-[#8c6b44]/20 bg-black/[0.02] opacity-75'
                        : 'border-[#8c6b44]/30 bg-[#8c6b44]/5'
                    } flex flex-col gap-1.5`}
                  >
                    {/* Dòng 1: Tên đoàn */}
                    <div className="font-serif font-black text-sm text-[#8c2d19] leading-snug">
                      Lưu dân từ {wave.originName}
                    </div>

                    {/* Dòng 2: Ngày tới & hạn chờ */}
                    <div className="text-[11px] text-[#704d2e] font-sans leading-snug">
                      Ngày tới: {wave.dateStr} •{' '}
                      {isDeparted ? (
                        <span className="text-[#8c2d19] font-bold italic">Đã hết hạn chờ</span>
                      ) : (
                        <span className="text-[#8c2d19] font-bold">còn {wave.daysRemaining ?? 30} ngày</span>
                      )}
                    </div>

                    {/* Dòng 3: Tráng đinh & Lão ấu đặt trong 2 vết mực */}
                    <div className="flex items-center gap-2.5 text-xs font-serif pt-0.5">
                      {/* Vết mực Tráng phu */}
                      <div className="relative h-[25px] px-3.5 flex items-center justify-center select-none">
                        <img
                          src="/ink_stroke_1.png"
                          alt="Vết mực tráng phu"
                          className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
                        />
                        <span className="relative z-10 flex items-center gap-1.5 font-serif font-bold text-xs text-[#a7f3d0] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {wave.idleCount} tráng phu
                        </span>
                      </div>

                      {/* Vết mực Lão ấu */}
                      <div className="relative h-[25px] px-3.5 flex items-center justify-center select-none">
                        <img
                          src="/ink_stroke_brown.png"
                          alt="Vết mực lão ấu"
                          className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
                        />
                        <span className="relative z-10 flex items-center gap-1.5 font-serif font-bold text-xs text-[#fef2d6] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          {wave.unfitCount} lão, ấu
                        </span>
                      </div>
                    </div>

                    {/* Dòng 4: 1 dòng 3 nút chọn đặt trên các vết mực, thông tin lương xuống dòng */}
                    {isDeparted ? (
                      <div className="flex items-center justify-between pt-2 border-t border-[#8c6b44]/20 mt-1">
                        <span className="text-xs italic text-[#704d2e] font-serif">
                          Đoàn lưu dân đã rời đi tìm nơi nương tựa khác...
                        </span>
                        <div className="relative min-w-[90px] h-[30px] flex items-center justify-center px-3 select-none">
                          <img
                            src="/ink_stroke_1.png"
                            alt="Đã rời đi"
                            className="absolute inset-0 w-full h-full object-fill opacity-60 pointer-events-none"
                          />
                          <span className="relative z-10 text-[#fcf4e4]/70 text-xs font-serif font-bold">
                            Đã rời đi
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 pt-2 border-t border-[#8c6b44]/20 mt-1">
                        {/* 1. Nhận toàn bộ */}
                        <button
                          disabled={!canAcceptFull}
                          onClick={() => acceptRefugeeWave(wave.id, 'full')}
                          className="relative group flex-1 min-h-[44px] py-1 px-2 flex flex-col items-center justify-center transition-transform hover:scale-[1.02] active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
                          title={`Cần ${wave.foodCost} lương, ${wave.totalCount} chỗ`}
                        >
                          <img
                            src="/ink_stroke_red.png"
                            alt="Vết mực nhận toàn bộ"
                            className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] group-hover:brightness-110 transition-all"
                          />
                          <span className="relative z-10 text-[#fcf4e4] font-serif font-black text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] leading-tight whitespace-nowrap">
                            {UI_TEXT.refugeesPanel.actions.acceptAll}
                          </span>
                          <span className="relative z-10 text-[#fef2d6]/90 text-[10.5px] font-sans font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)] leading-tight whitespace-nowrap">
                            (-{wave.foodCost} lương{wave.goldContribution ? `, +${wave.goldContribution}v` : ''})
                          </span>
                        </button>

                        {/* 2. Chỉ nhận tráng đinh */}
                        <button
                          disabled={!canAcceptAbleOnly}
                          onClick={() => acceptRefugeeWave(wave.id, 'able_bodied_only')}
                          className="relative group flex-1 min-h-[44px] py-1 px-2 flex flex-col items-center justify-center transition-transform hover:scale-[1.02] active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
                          title={`Cần ${halfFood} lương, ${wave.idleCount} chỗ`}
                        >
                          <img
                            src="/ink_stroke_brown.png"
                            alt="Vết mực chỉ nhận tráng đinh"
                            className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] group-hover:brightness-115 transition-all"
                          />
                          <span className="relative z-10 text-[#fcf4e4] font-serif font-black text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] leading-tight whitespace-nowrap">
                            {UI_TEXT.refugeesPanel.actions.acceptAbleOnly}
                          </span>
                          <span className="relative z-10 text-[#fef2d6]/90 text-[10.5px] font-sans font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)] leading-tight whitespace-nowrap">
                            (-{halfFood} lương)
                          </span>
                        </button>

                        {/* 3. Từ chối */}
                        <button
                          onClick={() => acceptRefugeeWave(wave.id, 'reject')}
                          className="relative group w-24 shrink-0 min-h-[44px] py-1 px-2 flex flex-col items-center justify-center transition-transform hover:scale-[1.02] active:scale-98 cursor-pointer"
                          title="Từ chối đoàn lưu dân này"
                        >
                          <img
                            src="/ink_stroke_1.png"
                            alt="Vết mực từ chối"
                            className="absolute inset-0 w-full h-full object-fill pointer-events-none opacity-80 group-hover:opacity-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] group-hover:brightness-125 transition-all"
                          />
                          <span className="relative z-10 text-[#e6d5bc] group-hover:text-white font-serif font-black text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] leading-tight whitespace-nowrap">
                            {UI_TEXT.refugeesPanel.actions.reject}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
  );
};
