import React, { useMemo } from 'react';
import { X, Flag, ArrowUpCircle, Users, Coins, AlertTriangle } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { useUIStore } from '../../../store/uiStore';
import { notify } from '../../../store/dialogStore';
import { MiniGeneralCard } from '../../generals/MiniGeneralCard';
import { findShortestScoutPath } from '../../../utils/scoutPathfinding';
import type { CityNode, General } from '../../../types';
import {
  CAMP_CAPACITY_BY_LEVEL,
  CAMP_UPGRADE_COSTS,
  getCityIntelReport,
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
  const dispatchScoutMission = useGameStore(state => state.dispatchScoutMission);
  const recallScout = useGameStore(state => state.recallScout);
  const scoutMissions = useGameStore(state => state.scoutMissions || []);
  const cities = useGameStore(state => state.cities);
  const resources = useGameStore(state => state.resources);
  const [isDispatchOpen, setIsDispatchOpen] = React.useState(false);
  const [scoutSendCount, setScoutSendCount] = React.useState(1);
  const upgradeCamp = useGameStore(state => state.upgradeCamp);
  const triggerUprising = useGameStore(state => state.triggerUprising);
  const hasUprising = useGameStore(state => state.hasUprising);
  const pendingRefugees = useGameStore(state => state.pendingRefugees || []);
  const openRefugeeModal = useGameStore(state => state.openRefugeeModal);
  const tradeFoodForGold = useGameStore(state => state.tradeFoodForGold);
  const bribeMingOfficials = useGameStore(state => state.bribeMingOfficials);
  const bribeCount = useGameStore(state => state.bribeCount || 0);

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



  // Các toán thám mã đang trên đường tới thành này
  const travelingMissions = useMemo(() => {
    return scoutMissions.filter(m => m.targetCityId === selectedCity.id && m.status === 'traveling');
  }, [scoutMissions, selectedCity.id]);

  // Căn cứ nghĩa quân xuất phát (ưu tiên Lam Sơn)
  const originBase = useMemo(() => {
    return cities.find(c => c.id === 'lam_son' && c.faction === 'lam_son') ||
           cities.find(c => c.faction === 'lam_son' && (c.population?.idleLaborers || 0) > 0) ||
           cities.find(c => c.faction === 'lam_son');
  }, [cities]);

  // Ước tính lộ trình ngắn thời gian nhất khi phái thám mã
  const scoutRoutePreview = useMemo(() => {
    if (!originBase || !selectedCity || selectedCity.faction === 'lam_son') return null;
    return findShortestScoutPath(originBase, selectedCity, scoutSendCount);
  }, [originBase, selectedCity, scoutSendCount]);

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

            {/* LƯU DÂN CHỜ TRƯỚC CỔNG: 1 NÚT XEM CHI TIẾT */}
            <div className="p-2.5 rounded-lg border border-[#8c6b44]/40 bg-[#f7eed8]/70 flex items-center justify-between text-xs font-serif">
              <span className="text-[#5c3e23] font-bold flex items-center gap-1.5">
                <Users size={14} className="text-[#8c2d19]" />
                Lưu dân chờ trước cổng:
              </span>

              <button
                onClick={() => openRefugeeModal()}
                className="px-3 py-1 rounded bg-[#8c2d19] hover:bg-[#6b1e10] text-[#fff3db] text-xs font-serif font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>Xem chi tiết</span>
                {pendingRefugees.filter(w => !w.departed && (w.daysRemaining ?? 0) > 0).length > 0 && (
                  <span className="px-1.5 py-0.2 bg-[#fff3db] text-[#8c2d19] rounded-full text-[10px] font-bold font-mono">
                    {pendingRefugees.filter(w => !w.departed && (w.daysRemaining ?? 0) > 0).length}
                  </span>
                )}
              </button>
            </div>

            {/* 1.1b. BÍ MẬT GIAO THƯƠNG (XUẤT BÁN LƯƠNG ĐỔI VÀNG) */}
            <div className="p-2.5 rounded-lg border border-[#8c6b44]/40 bg-[#f7eed8]/70 space-y-1.5 text-xs font-serif">
              <div className="flex items-center justify-between">
                <span className="text-[#5c3e23] font-bold flex items-center gap-1.5">
                  <Coins size={14} className="text-[#b45309]" />
                  Bí Mật Giao Thương:
                </span>
                <span className="text-[11px] text-[#704d2e]">
                  Kho: <strong className="text-[#8c2d19]">{Math.floor(resources.food).toLocaleString()}</strong> lương
                </span>
              </div>

              <div className="text-[11px] text-[#704d2e] italic">
                Bí mật xuất bán thóc lúa thặng dư cho thương lái ven sông Chu gây quỹ ngân khố:
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                <button
                  disabled={resources.food < 100}
                  onClick={() => {
                    const res = tradeFoodForGold(100);
                    if (res.success) notify.success(res.message);
                    else notify.warning(res.message);
                  }}
                  className="py-1 px-1 rounded border border-[#8c6b44]/40 bg-black/5 hover:bg-black/10 disabled:opacity-40 disabled:cursor-not-allowed text-[#261304] text-[11px] font-serif font-bold text-center transition cursor-pointer"
                  title="Xuất bán 100 lương thu về 15 vàng"
                >
                  -100 🌾 (+15 🪙)
                </button>
                <button
                  disabled={resources.food < 300}
                  onClick={() => {
                    const res = tradeFoodForGold(300);
                    if (res.success) notify.success(res.message);
                    else notify.warning(res.message);
                  }}
                  className="py-1 px-1 rounded border border-[#8c6b44]/40 bg-black/5 hover:bg-black/10 disabled:opacity-40 disabled:cursor-not-allowed text-[#261304] text-[11px] font-serif font-bold text-center transition cursor-pointer"
                  title="Xuất bán 300 lương thu về 45 vàng"
                >
                  -300 🌾 (+45 🪙)
                </button>
                <button
                  disabled={resources.food < 500}
                  onClick={() => {
                    const res = tradeFoodForGold(500);
                    if (res.success) notify.success(res.message);
                    else notify.warning(res.message);
                  }}
                  className="py-1 px-1 rounded border border-[#8c6b44]/40 bg-black/5 hover:bg-black/10 disabled:opacity-40 disabled:cursor-not-allowed text-[#261304] text-[11px] font-serif font-bold text-center transition cursor-pointer"
                  title="Xuất bán 500 lương thu về 75 vàng"
                >
                  -500 🌾 (+75 🪙)
                </button>
              </div>
            </div>

            {/* 1.1c. ĐỘ NGHI NGỜ CỦA QUÂN MINH & ĐÚT LÓT */}
            <div className="p-2.5 rounded-lg border border-[#8c6b44]/40 bg-[#f7eed8]/70 space-y-1.5 text-xs font-serif">
              <div className="flex items-center justify-between">
                <span className="text-[#5c3e23] font-bold flex items-center gap-1.5">
                  <AlertTriangle size={14} className={suspicion >= 70 ? 'text-[#b91c1c]' : suspicion >= 35 ? 'text-[#d97706]' : 'text-[#15803d]'} />
                  Độ Nghi Ngờ Của Quân Minh:
                </span>
                <span className={`font-serif font-black text-sm ${suspicion >= 70 ? 'text-[#b91c1c]' : suspicion >= 35 ? 'text-[#d97706]' : 'text-[#15803d]'}`}>
                  {Math.round(suspicion)}%
                </span>
              </div>

              <div className="w-full h-1.5 rounded-full bg-[#3d240f]/20 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    suspicion >= 70 ? 'bg-[#b91c1c]' : suspicion >= 35 ? 'bg-[#d97706]' : 'bg-[#15803d]'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(3, suspicion))}%` }}
                />
              </div>

              <div className="flex items-center justify-between pt-0.5 text-[11px] text-[#704d2e]">
                <span className="italic">
                  {suspicion >= 70 ? '⚠️ Nguy cấp: Giặc sắp kéo quân càn quét!' : suspicion >= 35 ? 'Lò rèn & thao luyện đang khiến địch chú ý' : 'Căn cứ bí mật, giặc chưa cảnh giác'}
                </span>

                <button
                  onClick={() => bribeMingOfficials()}
                  className="px-2 py-0.5 rounded border border-[#8c6b44]/50 bg-[#8c6b44]/20 hover:bg-[#8c6b44]/35 text-[#42250d] font-bold cursor-pointer transition shrink-0 ml-2"
                  title="Cử người đem vàng đút lót quan tướng giặc hạ độ nghi ngờ"
                >
                  Đút lót (-{100 + bribeCount * 60}🪙)
                </button>
              </div>
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
            {!hasUprising && (
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
          /* KHỐI 2: THÀNH TRÌ / ĐỒN LŨY QUÂN MINH (THÁM MÃ)                           */
          /* ========================================================================= */
          <div className="space-y-3 pt-2">
            {/* TOÁN THÁM MÃ ĐANG DI CHUYỂN */}
            {travelingMissions.length > 0 && (
              <div className="flex items-center justify-between py-1 px-2.5 rounded bg-[#8c6b44]/10 border border-[#8c6b44]/20 text-xs font-serif text-[#5c3e23]">
                <div className="flex items-center gap-2">
                  <img src="/troops/scout.png" alt="Thám mã" className="w-[20px] h-[20px] object-contain" />
                  <span>Đang tới: <strong>{travelingMissions.reduce((acc, m) => acc + m.scoutCount, 0)} thám mã</strong></span>
                </div>
                <span className="font-mono text-[11px] text-[#8c2d19]">
                  còn ~{travelingMissions[0].daysRemaining.toFixed(1)} ngày ({Math.round(travelingMissions[0].daysRemaining * 12)} canh)
                </span>
              </div>
            )}

            {/* HIỂN THỊ CON MẮT LỚN (KÍCH THƯỚC X10 ~280px) & TRẠNG THÁI */}
            {assignedScouts === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 text-center space-y-2">
                <button
                  onClick={() => setIsDispatchOpen(prev => !prev)}
                  className="cursor-pointer transition-transform hover:scale-105 active:scale-95 group"
                  title="Nhấn vào để phái thám mã"
                >
                  <img
                    src="/troops/scout.png"
                    alt="Thám mã"
                    className="w-[280px] max-h-[170px] object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)] group-hover:brightness-110"
                  />
                </button>
                <div className="font-serif font-bold text-sm text-[#8c2d19]">
                  {isDispatchOpen ? 'Cử quân do thám' : 'Chưa có thông tin'}
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="flex justify-center">
                  <button
                    onClick={() => setIsDispatchOpen(prev => !prev)}
                    className="cursor-pointer transition-transform hover:scale-105 active:scale-95 group"
                    title="Phái thêm thám mã"
                  >
                    <img
                      src="/troops/scout.png"
                      alt="Thám mã"
                      className="w-[240px] max-h-[150px] object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)] group-hover:brightness-110"
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs font-serif text-[#5c3e23] border-b border-[#8c6b44]/20 pb-1.5">
                  <span>Đã cắm chốt: <strong>{assignedScouts} thám mã</strong></span>
                  <button
                    onClick={() => recallScout(selectedCity.id)}
                    className="text-[#8c2d19] hover:underline cursor-pointer text-[11px]"
                    title="Rút 1 thám mã về Lam Sơn"
                  >
                    (Rút 1)
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-[#8c6b44]/25 rounded p-2 bg-[#8c6b44]/5">
                    <div className="text-[11px] font-serif text-[#704d2e]">Quân đồn trú:</div>
                    <div className="font-serif font-bold text-base text-[#261304] mt-0.5">
                      {intelReport.displayedTroops}
                    </div>
                  </div>

                  <div className="border border-[#8c6b44]/25 rounded p-2 bg-[#8c6b44]/5">
                    <div className="text-[11px] font-serif text-[#704d2e]">Độ nghi ngờ:</div>
                    <div className="font-serif font-bold text-base text-[#8c2d19] mt-0.5">
                      {intelReport.displayedSuspicion}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CƠ CHẾ PHÁI THÁM MÃ (HIỂN THỊ TRỰC TIẾP TRÊN GIẤY) */}
            {isDispatchOpen && (
              <div className="py-2.5 px-3 rounded border border-[#8c6b44]/35 bg-[#8c6b44]/10 space-y-2">
                <div className="flex items-center justify-between text-xs font-serif text-[#261304]">
                  <span className="font-bold">Số lượng:</span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={scoutSendCount <= 1}
                      onClick={() => setScoutSendCount(c => Math.max(1, c - 1))}
                      className="w-6 h-6 rounded bg-[#8c6b44]/20 hover:bg-[#8c6b44]/35 disabled:opacity-30 disabled:cursor-not-allowed font-bold cursor-pointer text-[#261304] flex items-center justify-center text-sm"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-serif font-bold text-sm text-[#8c2d19]">
                      {scoutSendCount}
                    </span>
                    <button
                      disabled={scoutSendCount >= 5}
                      onClick={() => setScoutSendCount(c => Math.min(5, c + 1))}
                      className="w-6 h-6 rounded bg-[#8c6b44]/20 hover:bg-[#8c6b44]/35 disabled:opacity-30 disabled:cursor-not-allowed font-bold cursor-pointer text-[#261304] flex items-center justify-center text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-xs font-serif text-[#5c3e23] border-t border-[#8c6b44]/20 pt-1.5">
                  <div className="flex justify-between">
                    <span>Tráng phu:</span>
                    <strong className={(originBase?.population?.idleLaborers || 0) < scoutSendCount ? 'text-[#b91c1c]' : 'text-[#261304]'}>
                      {scoutSendCount} (Lam Sơn: {originBase?.population?.idleLaborers || 0})
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Lộ phí:</span>
                    <strong className={resources.food < scoutSendCount * 30 ? 'text-[#b91c1c]' : 'text-[#261304]'}>
                      {scoutSendCount * 30} lương (Kho: {Math.floor(resources.food).toLocaleString()})
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Lộ trình:</span>
                    <span className="font-serif font-bold text-[#261304]">
                      ~{scoutRoutePreview?.totalDays.toFixed(1) || '1.5'} ngày ({Math.round((scoutRoutePreview?.totalDays || 1.5) * 12)} canh)
                    </span>
                  </div>
                </div>

                <button
                  disabled={
                    !originBase ||
                    (originBase.population?.idleLaborers || 0) < scoutSendCount ||
                    resources.food < scoutSendCount * 30
                  }
                  onClick={() => {
                    if (!originBase) return;
                    dispatchScoutMission(originBase.id, selectedCity.id, scoutSendCount);
                    setIsDispatchOpen(false);
                  }}
                  className="w-full relative h-[32px] px-3 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer mt-1"
                >
                  <img
                    src="/ink_stroke_1.png"
                    alt="Vết mực"
                    className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
                  />
                  <span className="relative z-10 font-serif font-bold text-xs text-[#fcf4e4] tracking-wider uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    Xuất phát
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
});

BaseDetailContent.displayName = 'BaseDetailContent';
