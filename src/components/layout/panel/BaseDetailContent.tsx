import React, { useMemo } from 'react';
import { X, Eye, EyeOff, UserPlus, UserMinus, ShieldAlert, Coins, Flag, ArrowUpCircle } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { useUIStore } from '../../../store/uiStore';
import { notify } from '../../../store/dialogStore';
import { MiniGeneralCard } from '../../generals/MiniGeneralCard';
import type { CityNode, General } from '../../../types';
import {
  CAMP_CAPACITY_BY_LEVEL,
  CAMP_UPGRADE_COSTS,
  getCityIntelReport,
  getBriberyCostAndEffect,
} from '../../../types';

interface BaseDetailContentProps {
  selectedCity: CityNode;
  stationedGenerals: General[];
  lamSonBasesCount: number;
  onOpenPopulationModal: () => void;
}

export const BaseDetailContent: React.FC<BaseDetailContentProps> = React.memo(({
  selectedCity,
  stationedGenerals,
  lamSonBasesCount,
  onOpenPopulationModal,
}) => {
  const structures = useGameStore(state => state.structures);
  const formations = useGameStore(state => state.formations);
  const demolishBase = useGameStore(state => state.demolishBase);
  const suspicion = useGameStore(state => state.suspicion);
  const bribeCount = useGameStore(state => state.bribeCount || 0);
  const bribeMingOfficials = useGameStore(state => state.bribeMingOfficials);
  const dispatchScout = useGameStore(state => state.dispatchScout);
  const recallScout = useGameStore(state => state.recallScout);
  const upgradeCamp = useGameStore(state => state.upgradeCamp);
  const triggerUprising = useGameStore(state => state.triggerUprising);
  const isWarMode = useGameStore(state => state.isWarMode);

  const selectCity = useUIStore(state => state.selectCity);
  const setBaseRelocateMode = useUIStore(state => state.setBaseRelocateMode);
  const isBuildPaperOpen = useUIStore(state => state.isBuildPaperOpen);
  const setIsBuildPaperOpen = useUIStore(state => state.setBuildPaperOpen);
  const setActiveModal = useUIStore(state => state.setActiveModal);
  const setMarchDrawMode = useUIStore(state => state.setMarchDrawMode);
  const setSelectedMapFormationId = useUIStore(state => state.setSelectedMapFormationId);

  const isLamSon = selectedCity.faction === 'lam_son';

  const baseFormations = useMemo(() => {
    return formations.filter(f => f.cityId === selectedCity.id);
  }, [formations, selectedCity.id]);

  const totalCityPop = useMemo(() => {
    if (!selectedCity.population) return 0;
    const pop = selectedCity.population;
    const builderCount = structures
      .filter(s => s.cityId === selectedCity.id && s.status === 'building')
      .reduce((acc, s) => acc + (s.builderWorkers || 0), 0);
    const formationTroops = formations
      .filter(f => f.cityId === selectedCity.id)
      .reduce((acc, f) => acc + (f.totalTroops || 0), 0);
    const campBuilderCount = selectedCity.upgrading?.builders || 0;

    return (
      pop.combatTroops +
      pop.idleLaborers +
      pop.farmLaborers +
      pop.forgeLaborers +
      (pop.swappedCombatants || 0) +
      pop.unfitPopulation +
      (selectedCity.training?.traineesCount || 0) +
      builderCount +
      formationTroops +
      campBuilderCount
    );
  }, [selectedCity, structures, formations]);

  // Cấp độ & Sức chứa doanh trại Lam Sơn
  const campLevel = selectedCity.level || 1;
  const maxCapacity = CAMP_CAPACITY_BY_LEVEL[campLevel] || 500;
  const capacityPercent = Math.min(100, Math.round((totalCityPop / maxCapacity) * 100));
  const nextUpgradeCost = CAMP_UPGRADE_COSTS[campLevel + 1];

  // Báo cáo tình báo thám mã đối với thành trì quân Minh
  const assignedScouts = selectedCity.assignedScouts || 0;
  const intelReport = useMemo(() => {
    return getCityIntelReport(selectedCity.troops, assignedScouts, suspicion);
  }, [selectedCity.troops, assignedScouts, suspicion]);

  // Chi phí và hiệu quả đút lót hiện tại
  const bribery = useMemo(() => {
    return getBriberyCostAndEffect(bribeCount);
  }, [bribeCount]);

  return (
    <>
      {/* TIÊU ĐỀ BẢN DOANH & NÚT HÀNH ĐỘNG VẾT MỰC */}
      <div className="relative z-10 px-7 pt-6 pb-1 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-serif font-bold text-xs uppercase tracking-widest ${
              isLamSon ? 'text-[#8c2d19]' : 'text-[#1e40af]'
            }`}>
              {isLamSon ? 'Bản Doanh Nghĩa Binh' : 'Thành Trì Quân Minh'}
            </span>
            <span className="text-[11px] font-serif text-[#704d2e]">
              {isLamSon ? `Căn Cứ Cấp ${campLevel}` : selectedCity.type === 'city' ? 'Trấn Sở / Kiên Thành' : 'Đồn Binh'}
            </span>
          </div>

          <h3 className="font-serif font-bold text-2xl text-[#261304] tracking-wide mt-0.5 truncate">
            {selectedCity.name}
          </h3>

          {/* NÚT THAO TÁC CỦA NGHĨA QUÂN LAM SƠN: XÂY DỰNG, DI DỜI, GIẢI THỂ */}
          {isLamSon && (
            <div className="flex items-center gap-2 mt-2 pt-1">
              <button
                onClick={() => setIsBuildPaperOpen(!isBuildPaperOpen)}
                className={`relative group flex-1 h-[32px] px-3 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer ${
                  isBuildPaperOpen ? 'brightness-125' : ''
                }`}
                title={isBuildPaperOpen ? "Đóng danh sách công trình" : "Mở danh sách công trình xây dựng bên phải"}
              >
                <img
                  src="/ink_stroke_1.png"
                  alt="Vết mực"
                  className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] group-hover:brightness-125 transition-all"
                />
                <span className="relative z-10 font-serif font-bold text-xs text-[#fcf4e4] tracking-wider uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  Xây Dựng
                </span>
              </button>

              <button
                onClick={() => setBaseRelocateMode({ baseId: selectedCity.id })}
                className="relative group flex-1 h-[32px] px-3 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                title="Di dời căn cứ đến vị trí mới trên bản đồ (lưới địa hình)"
              >
                <img
                  src="/ink_stroke_1.png"
                  alt="Vết mực"
                  className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] group-hover:brightness-125 transition-all"
                />
                <span className="relative z-10 font-serif font-bold text-xs text-[#fcf4e4] tracking-wider uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  Di Dời
                </span>
              </button>

              <button
                disabled={lamSonBasesCount <= 1}
                onClick={() => {
                  if (lamSonBasesCount <= 1) {
                    notify.warning('Nghĩa quân cần ít nhất một căn cứ để duy trì đại nghiệp! Không thể giải thể bản doanh cuối cùng.');
                    return;
                  }
                  notify.confirm({
                    title: 'Giải Thể Căn Cứ',
                    message: `Bạn có chắc chắn muốn giải thể Căn cứ [${selectedCity.name}]?\n\nToàn bộ ${selectedCity.troops} quân binh, tráng phu và danh tướng sẽ tự động rút về tụ hợp tại căn cứ gần nhất.`,
                    confirmText: 'Phá Hủy',
                    cancelText: 'Giữ Lại',
                    onConfirm: () => {
                      const res = demolishBase(selectedCity.id);
                      if (res.success) {
                        notify.success(res.message);
                      } else {
                        notify.error(res.message);
                      }
                    },
                  });
                }}
                className={`relative group h-[32px] px-3.5 flex items-center justify-center transition-transform ${
                  lamSonBasesCount <= 1
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:scale-105 active:scale-95 cursor-pointer'
                }`}
                title={lamSonBasesCount <= 1 ? "Căn cứ duy nhất của nghĩa quân, không thể giải thể!" : "Giải thể căn cứ và rút quân về căn cứ gần nhất"}
              >
                <img
                  src="/ink_stroke_red.png"
                  alt="Vết mực son"
                  className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] group-hover:brightness-125 transition-all"
                />
                <span className="relative z-10 font-serif font-bold text-xs text-[#fcf4e4] tracking-wider uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  Giải Thể
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Nút đóng */}
        <button
          onClick={() => selectCity(null)}
          className="text-[#6e4927] hover:text-[#261304] transition p-1 hover:bg-[#8c6b44]/15 rounded cursor-pointer -mr-1"
          title="Đóng chiến thư"
        >
          <X size={18} />
        </button>
      </div>

      {/* NỘI DUNG CUỘN CHI TIẾT */}
      <div className="relative z-10 px-7 pt-3 pb-6 flex-1 overflow-y-auto no-scrollbar space-y-3.5 text-[#3a220f]">
        
        {/* ========================================================================= */}
        {/* KHỐI 1: NẾU LÀ CĂN CỨ NGHĨA QUÂN LAM SƠN */}
        {/* ========================================================================= */}
        {isLamSon ? (
          <>
            {/* 1.1. SỨC CHỨA CĂN CỨ & NÂNG CẤP DOANH TRẠI */}
            <div className="p-3 rounded-lg border border-[#8c6b44]/40 bg-[#f7eed8]/70 shadow-inner space-y-2">
              <div className="flex items-center justify-between text-xs font-serif font-bold">
                <span className="text-[#5c3e23]">Sức Chứa Căn Cứ (Cấp {campLevel}):</span>
                <span className={`${capacityPercent >= 95 ? 'text-[#8c2d19] font-black' : 'text-[#261304]'}`}>
                  {totalCityPop.toLocaleString()} / {maxCapacity.toLocaleString()} người ({capacityPercent}%)
                </span>
              </div>

              {/* Thanh đo sức chứa */}
              <div className="w-full h-2 rounded-full bg-[#3d240f]/20 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    capacityPercent >= 95 ? 'bg-[#b91c1c]' : capacityPercent >= 80 ? 'bg-[#d97706]' : 'bg-[#15803d]'
                  }`}
                  style={{ width: `${capacityPercent}%` }}
                />
              </div>

              {/* Tiến trình hoặc nút nâng cấp */}
              {selectedCity.upgrading ? (
                <div className="pt-1 text-xs font-serif text-[#8c2d19] flex items-center justify-between">
                  <span>🚧 Đang thi công mở rộng lên Cấp {selectedCity.upgrading.targetLevel}...</span>
                  <span className="font-bold">Còn {selectedCity.upgrading.remainingDays} ngày</span>
                </div>
              ) : campLevel < 4 && nextUpgradeCost ? (
                <div className="pt-1 flex items-center justify-between gap-2 border-t border-[#8c6b44]/25">
                  <div className="text-[11px] font-serif text-[#704d2e]">
                    Mở rộng lên Cấp {campLevel + 1} ({CAMP_CAPACITY_BY_LEVEL[campLevel + 1].toLocaleString()} người):
                    <div className="text-[10px] text-[#5c3e23]">
                      Cần: {nextUpgradeCost.gold} Vàng • {nextUpgradeCost.food} Lương • {nextUpgradeCost.workers} Thợ ({nextUpgradeCost.days} ngày)
                    </div>
                  </div>
                  <button
                    onClick={() => upgradeCamp(selectedCity.id)}
                    className="px-2.5 py-1 rounded bg-[#8c5828] hover:bg-[#6e421a] text-[#fef2d6] text-xs font-serif font-bold flex items-center gap-1 shadow cursor-pointer shrink-0 transition"
                  >
                    <ArrowUpCircle size={13} />
                    <span>Nâng Cấp</span>
                  </button>
                </div>
              ) : (
                <div className="text-[11px] font-serif text-[#15803d] italic text-center">
                  Doanh trại đã đạt cấp độ tối đa (Cấp 4 - 5.000 người).
                </div>
              )}
            </div>

            {/* 1.2. THÔNG TIN QUÂN LỰC & PHÒNG THỦ */}
            <div className="grid grid-cols-2 gap-4">
              <div 
                onClick={onOpenPopulationModal}
                className="cursor-pointer group p-2 rounded hover:bg-black/[0.03] transition"
                title="Bấm vào để xem chi tiết Nghĩa binh, Tráng phu và Thao luyện võ nghệ"
              >
                <div className="text-xs font-serif font-bold text-[#704d2e]">
                  Quân đồn trú
                </div>
                <div className="mt-0.5 font-serif text-2xl text-[#2a1708] flex items-baseline gap-1">
                  <span className="font-serif font-bold">{selectedCity.troops.toLocaleString()}</span>
                  <span className="text-xs font-normal text-[#5c3e23]">binh</span>
                </div>
                <div className="mt-0.5 text-[11px] text-[#8c4b26] font-serif">
                  <span>Chi tiết nhân lực • </span>
                  <span className="text-[#a82415] underline font-serif font-bold">Thao luyện</span>
                </div>
              </div>

              <div className="p-2">
                <div className="text-xs font-serif font-bold text-[#704d2e]">
                  Địa thế phòng thủ
                </div>
                <div className="mt-0.5 font-serif text-base text-[#2a1708] font-bold">
                  {selectedCity.type === 'city' ? 'Kiên thành' : 'Rừng núi hiểm trở'}
                </div>
                <div className="text-[11px] text-[#704d2e] font-serif">
                  Dễ ẩn náu, khó công dễ thủ
                </div>
              </div>
            </div>

            {/* 1.3. DANH SÁCH TƯỚNG LĨNH ĐÓNG TRÚ */}
            <div className="space-y-1.5 pt-0.5">
              <div className="text-xs font-serif font-bold text-[#5c3e23] uppercase tracking-wider">
                Tướng Lĩnh Đóng Trú ({stationedGenerals.length})
              </div>
              {stationedGenerals.length === 0 ? (
                <p className="py-1 text-xs text-[#704d2e] font-serif italic">
                  Chưa có danh tướng nào đóng quân tại đây.
                </p>
              ) : (
                <div className="grid grid-cols-6 gap-1.5 pt-0.5">
                  {stationedGenerals.map(gen => (
                    <MiniGeneralCard
                      key={gen.id}
                      general={gen}
                      onClick={() => setActiveModal('generals')}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 1.4. ĐẠO QUÂN THUỘC QUYỀN */}
            {baseFormations.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-xs font-serif font-bold text-[#5c3e23] uppercase tracking-wider">
                  Đạo Quân Thuộc Quyền ({baseFormations.length})
                </div>
                <div className="space-y-1">
                  {baseFormations.map(form => (
                    <div
                      key={form.id}
                      onClick={() => setSelectedMapFormationId(form.id)}
                      className="py-1.5 px-2.5 rounded border border-[#8c6b44]/35 bg-black/[0.03] hover:bg-black/[0.06] flex items-center justify-between cursor-pointer transition"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-serif font-bold text-xs text-[#261304] truncate">
                          🚩 {form.name}
                        </div>
                        <div className="text-[10.5px] font-serif text-[#704d2e]">
                          {form.totalTroops} binh • Khí giới: {form.totalWeapons}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (form.totalTroops <= 0) {
                            notify.warning('Hãy đặt ít nhất 1 đơn vị lính vào đạo quân trước khi vẽ đường hành quân!');
                            return;
                          }
                          setMarchDrawMode({ formationId: form.id });
                        }}
                        className="px-2.5 py-1 rounded bg-[#8c2d19] hover:bg-[#6e1e0d] text-white font-serif font-bold text-[11px] shrink-0 shadow cursor-pointer"
                        title="Tự vẽ đường hành quân theo ô lưới trên bản đồ"
                      >
                        ✍️ Vẽ Đường
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 1.5. NÚT PHẤT CỜ KHỞI NGHĨA (NẾU ĐANG Ở GIAI ĐOẠN TIỀN KHỞI NGHĨA) */}
            {!isWarMode && (
              <div className="pt-2">
                <button
                  onClick={() => {
                    notify.confirm({
                      title: '🚩 Phất Cờ Khởi Nghĩa Lam Sơn',
                      message: `Bình Định Vương Lê Lợi dựng cờ đại nghĩa tại Lam Sơn!\n\nSau khi phất cờ, toàn quân sẽ bước vào Thời Chiến toàn diện, các hào kiệt 1418 sẽ quy tụ dưới trướng, và quân Minh từ thành Tây Đô sẽ xuất binh đánh dẹp.\n\nTướng quân đã chuẩn bị kỹ càng quân lương, khí giới và binh lực chưa?`,
                      confirmText: 'Phất Cờ Khởi Nghĩa!',
                      cancelText: 'Khoan Đã, Chuẩn Bị Thêm',
                      onConfirm: () => {
                        triggerUprising();
                      },
                    });
                  }}
                  className="w-full relative py-2.5 px-4 rounded flex items-center justify-center gap-2 group transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer shadow-lg"
                >
                  <img
                    src="/ink_stroke_red.png"
                    alt="Vết mực đỏ son"
                    className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)] group-hover:brightness-110"
                  />
                  <Flag size={16} className="relative z-10 text-[#fef08a]" />
                  <span className="relative z-10 font-serif font-black text-sm tracking-wider uppercase text-[#fef2d6] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                    Phất Cờ Khởi Nghĩa Lam Sơn
                  </span>
                </button>
              </div>
            )}
          </>
        ) : (
          /* ========================================================================= */
          /* KHỐI 2: THÀNH TRÌ / ĐỒN LŨY QUÂN MINH (TÌNH BÁO THÁM MÃ & ĐÚT LÓT)       */
          /* ========================================================================= */
          <>
            {/* 2.1. BẢNG TÌNH BÁO THÁM MÃ (FOG OF WAR THEO CẤP BẬC) */}
            <div className="p-3 rounded-lg border border-[#3b82f6]/40 bg-[#0f172a]/90 text-sky-100 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-sky-800/60 pb-2">
                <div className="flex items-center gap-2">
                  {intelReport.level === 0 ? (
                    <EyeOff size={16} className="text-stone-400" />
                  ) : (
                    <Eye size={16} className="text-sky-400" />
                  )}
                  <span className="font-serif font-bold text-xs uppercase tracking-wider text-sky-200">
                    Tình Báo Thám Mã
                  </span>
                </div>

                {/* Bộ điều khiển quân do thám */}
                <div className="flex items-center gap-1.5 bg-black/40 px-2 py-0.5 rounded border border-sky-700/50">
                  <span className="text-[11px] font-mono font-bold text-sky-300">
                    {assignedScouts} / {intelReport.maxScouts} Do thám
                  </span>
                  <div className="flex items-center gap-1 ml-1">
                    <button
                      disabled={assignedScouts <= 0}
                      onClick={() => recallScout(selectedCity.id)}
                      className="p-1 rounded bg-sky-950 hover:bg-sky-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition text-sky-200"
                      title="Rút 1 thám mã trở về Lam Sơn"
                    >
                      <UserMinus size={11} />
                    </button>
                    <button
                      disabled={assignedScouts >= intelReport.maxScouts}
                      onClick={() => dispatchScout(selectedCity.id)}
                      className="p-1 rounded bg-sky-950 hover:bg-sky-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition text-sky-200"
                      title="Phái 1 tráng phu Lam Sơn làm thám mã thâm nhập (Lộ phí 30 lương)"
                    >
                      <UserPlus size={11} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Thông số quân số đồn trú & Độ nghi ngờ theo cấp độ thám mã */}
              <div className="grid grid-cols-2 gap-3 pt-0.5">
                <div className="p-2 rounded bg-black/40 border border-sky-900/60">
                  <div className="text-[11px] text-sky-300/80 font-serif font-bold">
                    Quân đồn trú:
                  </div>
                  <div className={`mt-0.5 font-serif font-bold text-base ${
                    intelReport.level === 0 ? 'text-stone-400 italic text-sm' : intelReport.level === 4 ? 'text-amber-300 text-lg' : 'text-sky-100'
                  }`}>
                    {intelReport.displayedTroops}
                  </div>
                </div>

                <div className="p-2 rounded bg-black/40 border border-sky-900/60">
                  <div className="text-[11px] text-sky-300/80 font-serif font-bold flex items-center gap-1">
                    <ShieldAlert size={12} className="text-red-400" />
                    <span>Mức độ nghi ngờ:</span>
                  </div>
                  <div className={`mt-0.5 font-serif font-bold text-base ${
                    intelReport.level === 0 ? 'text-stone-400 italic text-sm' : intelReport.level === 4 ? 'text-red-400 text-lg' : 'text-amber-300'
                  }`}>
                    {intelReport.displayedSuspicion}
                  </div>
                </div>
              </div>

              {/* Ghi chú về tình báo */}
              <div className="text-[10.5px] font-serif text-sky-300/70 italic leading-snug">
                {intelReport.level === 0 ? (
                  <span>* Chưa có thám mã thâm nhập. Sương mù chiến tranh che phủ toàn bộ tình hình quân giặc bên trong thành.</span>
                ) : intelReport.level < 4 ? (
                  <span>* Cần cử thêm {intelReport.maxScouts - assignedScouts} do thám nữa để thâm nhập sâu vào phủ tướng và có số liệu chính xác tuyệt đối.</span>
                ) : (
                  <span className="text-emerald-300">* Đã cắm chốt đủ {assignedScouts} thám mã. Tình báo quân sự và mức độ cảnh giác của quan giặc đã được nắm bắt tường tận!</span>
                )}
              </div>
            </div>

            {/* 2.2. KHU VỰC NGOẠI GIAO & ĐÚT LÓT QUAN TƯỚNG */}
            <div className="p-3 rounded-lg border border-[#8c6b44]/40 bg-[#f7eed8]/70 shadow-inner space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-[#8c2d19] uppercase tracking-wider">
                <Coins size={14} />
                <span>Ngoại Giao & Đút Lót Quan Tướng</span>
              </div>

              {!intelReport.canBribe ? (
                <div className="p-2 rounded bg-amber-900/10 border border-amber-800/20 text-xs font-serif text-[#704d2e] italic">
                  Chưa có thám mã thâm nhập để bắt mối với lính gác và nha môn quân Minh. Hãy cử ít nhất 1 do thám để mở đường cống nạp!
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs font-serif text-[#5c3e23]">
                    Bí mật phái sứ giả đem cống lễ vàng bạc, sản vật dâng tiến quan tướng đồn trú để xoa dịu lòng nghi ngờ của giặc.
                  </div>

                  <div className="flex items-center justify-between text-xs font-serif border-t border-[#8c6b44]/25 pt-2">
                    <span className="text-[#704d2e]">
                      Chi phí: <strong className="text-[#8c2d19]">{bribery.cost} Vàng</strong>
                    </span>
                    <span className="text-[#15803d] font-bold">
                      Hiệu quả: -{bribery.reduction}% Nghi ngờ
                    </span>
                  </div>

                  <button
                    onClick={() => bribeMingOfficials(selectedCity.id)}
                    className="w-full relative py-2 px-3 rounded flex items-center justify-center gap-2 group transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer shadow"
                  >
                    <img
                      src="/ink_stroke_1.png"
                      alt="Vết mực"
                      className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] group-hover:brightness-125"
                    />
                    <Coins size={14} className="relative z-10 text-amber-300" />
                    <span className="relative z-10 font-serif font-bold text-xs text-[#fcf4e4] tracking-wide uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                      Tiến Cống Đút Lót ({bribery.cost} Vàng)
                    </span>
                  </button>

                  <div className="text-[10px] font-serif text-[#8c4b26] italic text-center">
                    * Đã đút lót {bribeCount} lần. Quan tướng giặc ngày càng tham lam, đòi hỏi lễ vật nhiều hơn và hiệu quả giảm dần.
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
});

BaseDetailContent.displayName = 'BaseDetailContent';
