import React, { useMemo } from 'react';
import { X, Users, Swords, HeartHandshake, ShieldAlert } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { CAMP_CAPACITY_BY_LEVEL } from '../../types';

export const RefugeeIntakeModal: React.FC = () => {
  const activeWave = useGameStore((state) => state.activeRefugeeModal);
  const setActiveRefugeeModal = useGameStore((state) => state.setActiveRefugeeModal);
  const pendingRefugees = useGameStore((state) => state.pendingRefugees);
  const acceptRefugeeWave = useGameStore((state) => state.acceptRefugeeWave);
  const cities = useGameStore((state) => state.cities);
  const resources = useGameStore((state) => state.resources);
  const structures = useGameStore((state) => state.structures);
  const formations = useGameStore((state) => state.formations);

  const wave = activeWave || (pendingRefugees.length > 0 ? pendingRefugees[0] : null);

  const city = useMemo(() => {
    if (!wave) return null;
    return cities.find((c) => c.id === wave.cityId) || cities.find((c) => c.id === 'lam_son') || null;
  }, [cities, wave]);

  const { currentPop, maxCapacity, remainingCap } = useMemo(() => {
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
  }, [city, structures, formations]);

  if (!wave) return null;

  const halfFood = Math.max(1, Math.round(wave.foodCost * 0.5));
  const canAcceptFull = resources.food >= wave.foodCost && remainingCap >= wave.totalCount;
  const canAcceptAbleOnly = resources.food >= halfFood && remainingCap >= wave.idleCount;
  const canReliefOnly = resources.food >= 5;

  const handleClose = () => {
    setActiveRefugeeModal(null);
  };

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col pointer-events-auto filter drop-shadow-[0_20px_45px_rgba(0,0,0,0.9)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nền giấy Dó sứt mẻ */}
        <img
          src="/parchment_torn_panel.png"
          alt="Khung quân lệnh"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
          draggable={false}
        />

        <div className="relative z-10 px-8 pt-7 pb-7 flex flex-col h-full font-serif text-[#261304]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#8c6b44]/35 pb-2.5 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#8c2d19]/15 flex items-center justify-center text-[#8c2d19] border border-[#8c6b44]/40">
                <Users size={20} />
              </div>
              <div>
                <h3 className="font-serif font-black text-lg text-[#261304] leading-tight">
                  Lưu Dân & Hào Kiệt Quy Phụ
                </h3>
                <span className="text-[11px] font-sans text-[#704d2e]">
                  {wave.dateStr} • Đến từ {wave.originName}
                </span>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="text-[#6e4927] hover:text-[#261304] transition p-1 hover:bg-[#8c6b44]/15 rounded cursor-pointer"
              title="Đóng (Để họ chờ ngoài cổng)"
            >
              <X size={18} />
            </button>
          </div>

          {/* Câu chuyện / Bối cảnh */}
          <div className="p-3 rounded bg-black/[0.04] border border-[#8c6b44]/25 mb-3 space-y-1">
            <p className="text-xs text-[#42250d] italic leading-relaxed">
              "{wave.story}"
            </p>
            <div className="text-[11px] text-[#704d2e] font-sans pt-1 border-t border-[#8c6b44]/15 flex justify-between">
              <span>Đoàn người: <strong>{wave.totalCount} nhân khẩu</strong></span>
              <span>Căn cứ đến: <strong>{city?.name || 'Lam Sơn'}</strong></span>
            </div>
          </div>

          {/* Bảng chi tiết thành phần & sức chứa */}
          <div className="grid grid-cols-2 gap-2 mb-3.5 text-xs">
            {/* Tráng đinh */}
            <div className="p-2.5 rounded border border-[#8c6b44]/30 bg-[#8c6b44]/5 flex items-center gap-2">
              <Swords size={18} className="text-[#8c2d19] shrink-0" />
              <div>
                <div className="text-[10.5px] text-[#704d2e]">Tráng phu (lao dịch/luyện binh):</div>
                <div className="font-serif font-bold text-sm text-[#8c2d19]">
                  {wave.idleCount} người
                </div>
              </div>
            </div>

            {/* Già yếu */}
            <div className="p-2.5 rounded border border-[#8c6b44]/30 bg-[#8c6b44]/5 flex items-center gap-2">
              <HeartHandshake size={18} className="text-[#b45309] shrink-0" />
              <div>
                <div className="text-[10.5px] text-[#704d2e]">Người già, phụ nữ, trẻ nhỏ:</div>
                <div className="font-serif font-bold text-sm text-[#261304]">
                  {wave.unfitCount} người
                </div>
              </div>
            </div>

            {/* Lương cứu tế */}
            <div className="p-2.5 rounded border border-[#8c6b44]/30 bg-[#8c6b44]/5 flex items-center gap-2">
              <div className="text-[10.5px] text-[#704d2e] w-full">
                <div className="flex justify-between">
                  <span>Lương cứu tế:</span>
                  <strong className={resources.food < wave.foodCost ? 'text-[#b91c1c]' : 'text-[#261304]'}>
                    {wave.foodCost} thạch
                  </strong>
                </div>
                <div className="text-[10px] text-[#8c6b44]">
                  Kho hiện có: {Math.floor(resources.food).toLocaleString()} thạch
                </div>
              </div>
            </div>

            {/* Sức chứa căn cứ */}
            <div className="p-2.5 rounded border border-[#8c6b44]/30 bg-[#8c6b44]/5 flex items-center gap-2">
              <div className="text-[10.5px] text-[#704d2e] w-full">
                <div className="flex justify-between">
                  <span>Trại còn trống:</span>
                  <strong className={remainingCap < wave.totalCount ? 'text-[#b91c1c]' : 'text-[#15803d]'}>
                    {remainingCap.toLocaleString()} chỗ
                  </strong>
                </div>
                <div className="text-[10px] text-[#8c6b44]">
                  Đã ở: {currentPop}/{maxCapacity} người
                </div>
              </div>
            </div>
          </div>

          {/* 4 Lựa chọn quyết sách của người chơi */}
          <div className="space-y-2">
            {/* Quyết sách 1: Cưu mang toàn bộ */}
            <button
              disabled={!canAcceptFull}
              onClick={() => acceptRefugeeWave(wave.id, 'full')}
              className={`w-full relative h-[36px] px-3.5 flex items-center justify-between rounded transition-all cursor-pointer ${
                canAcceptFull
                  ? 'hover:brightness-110 active:scale-[0.99]'
                  : 'opacity-40 cursor-not-allowed'
              }`}
            >
              <img
                src="/ink_stroke_1.png"
                alt="Vết mực"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
              />
              <span className="relative z-10 font-serif font-bold text-xs text-[#fcf4e4] tracking-wide flex items-center gap-1.5">
                <Users size={14} /> Cưu Mang Toàn Bộ
              </span>
              <span className="relative z-10 font-sans text-[11px] text-[#fef08a]">
                +{wave.idleCount} tráng phu • +{wave.unfitCount} già yếu • -{wave.foodCost} lương
              </span>
            </button>

            {/* Quyết sách 2: Chỉ chiêu mộ tráng đinh */}
            <button
              disabled={!canAcceptAbleOnly}
              onClick={() => acceptRefugeeWave(wave.id, 'able_bodied_only')}
              className={`w-full relative h-[36px] px-3.5 flex items-center justify-between rounded transition-all cursor-pointer ${
                canAcceptAbleOnly
                  ? 'hover:brightness-110 active:scale-[0.99]'
                  : 'opacity-40 cursor-not-allowed'
              }`}
            >
              <img
                src="/ink_stroke_red.png"
                alt="Vết mực đỏ"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
              />
              <span className="relative z-10 font-serif font-bold text-xs text-[#fcf4e4] tracking-wide flex items-center gap-1.5">
                <Swords size={14} /> Chỉ Chiêu Mộ Tráng Đinh
              </span>
              <span className="relative z-10 font-sans text-[11px] text-[#fee2e2]">
                +{wave.idleCount} tráng phu • -{halfFood} lương hỗ trợ
              </span>
            </button>

            {/* Hàng nút phụ: Phát chẩn hoặc Từ chối */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                disabled={!canReliefOnly}
                onClick={() => acceptRefugeeWave(wave.id, 'relief_only')}
                className="p-2 rounded border border-[#8c6b44]/40 bg-[#8c6b44]/15 hover:bg-[#8c6b44]/25 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs font-serif font-bold text-[#5c3e23] flex items-center justify-center gap-1.5 transition-all"
                title="Xuất 5 thạch lương phát chẩn cứu đói thiện tâm và khuyên lánh nạn sang vùng khác"
              >
                <HeartHandshake size={14} /> Phát chẩn tiễn đi (-5 lương)
              </button>

              <button
                onClick={() => acceptRefugeeWave(wave.id, 'reject')}
                className="p-2 rounded border border-[#8c6b44]/40 bg-[#8c6b44]/10 hover:bg-black/10 cursor-pointer text-xs font-serif text-[#704d2e] flex items-center justify-center gap-1.5 transition-all"
                title="Đóng cổng trại từ chối tiếp nhận để bảo toàn bí mật căn cứ"
              >
                <ShieldAlert size={14} /> Từ chối tiếp nhận
              </button>
            </div>
          </div>

          {/* Footer: Trạng thái hàng chờ & Nút để sau */}
          <div className="pt-2.5 mt-2.5 border-t border-[#8c6b44]/25 flex items-center justify-between text-[11px] text-[#704d2e] font-sans">
            <span>
              {pendingRefugees.length > 1
                ? `Còn ${pendingRefugees.length - 1} đoàn khác đang chờ trước cổng trại.`
                : 'Đoàn duy nhất đang chờ.'}
            </span>
            <button
              onClick={handleClose}
              className="text-[#8c2d19] hover:underline font-serif font-bold cursor-pointer"
            >
              Để sau (Chờ ngoài cổng)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
