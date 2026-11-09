import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { useUIStore } from '../../../store/uiStore';
import { notify } from '../../../store/dialogStore';
import { getCityIntelReport } from '../../../types';
import { UI_TEXT } from '../../../data/uiText';

export const ScoutOverviewModal: React.FC = React.memo(() => {
  const activeModal = useUIStore(state => state.activeModal);
  const setActiveModal = useUIStore(state => state.setActiveModal);
  const setFlyToTarget = useUIStore(state => state.setFlyToTarget);

  const cities = useGameStore(state => state.cities);
  const resources = useGameStore(state => state.resources);
  const suspicion = useGameStore(state => state.suspicion);
  const scoutMissions = useGameStore(state => state.scoutMissions || []);
  const dispatchScoutMission = useGameStore(state => state.dispatchScoutMission);
  const recallScout = useGameStore(state => state.recallScout);

  const originBase = useMemo(() => cities.find(c => c.faction === 'lam_son') || cities[0], [cities]);
  const idleLaborers = originBase?.population?.idleLaborers || 0;

  // Lọc chỉ những thành trì người chơi đã phái quân do thám (đã cắm chốt hoặc đang trên đường tới)
  const scoutedCities = useMemo(() => {
    return cities.filter(c => 
      c.faction !== 'lam_son' && 
      ((c.assignedScouts || 0) > 0 || scoutMissions.some(m => m.targetCityId === c.id))
    );
  }, [cities, scoutMissions]);

  if (activeModal !== 'scout') return null;

  return (
    <div 
      className="fixed inset-x-3 bottom-3 md:inset-auto md:absolute md:top-[82px] md:left-[98px] z-40 md:w-[460px] max-h-[82vh] flex flex-col pointer-events-auto transition-all duration-300 select-none filter drop-shadow-[0_18px_30px_rgba(0,0,0,0.7)] drop-shadow-[0_3px_8px_rgba(0,0,0,0.45)]"
    >
      {/* Nền Giấy Dó cổ sứt mẻ */}
      <img
        src="/parchment_torn_panel.png"
        alt="Bảng Tình Báo Do Thám"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
        draggable={false}
      />

      <div className="relative z-10 p-5 md:p-6 flex flex-col h-full font-serif text-[#261304] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#8c6b44]/35 pb-2.5 mb-3 shrink-0">
            <h3 className="font-serif font-black text-lg text-[#261304] leading-tight tracking-wide">
              {UI_TEXT.scoutPanel.title}
            </h3>

            <button
              onClick={() => setActiveModal(null)}
              className="text-[#6e4927] hover:text-[#261304] transition p-1 hover:bg-[#8c6b44]/15 rounded cursor-pointer"
              title="Đóng bảng"
            >
              <X size={20} />
            </button>
          </div>

          {/* Banner Thống kê Tình Báo (2 Cột rộng rãi, bỏ số lượng đội đang di chuyển) */}
          <div className="grid grid-cols-2 gap-2 mb-3 p-2.5 rounded bg-black/[0.04] border border-[#8c6b44]/25 shrink-0 text-xs text-center">
            <div className="border-r border-[#8c6b44]/20 pr-1">
              <span className="text-[#5c3e23] block text-[11px]">{UI_TEXT.scoutPanel.stats.scouted}</span>
              <strong className="text-[#8c2d19] font-bold text-sm">
                {scoutedCities.length} thành trì
              </strong>
            </div>
            <div className="pl-1">
              <span className="text-[#5c3e23] block text-[11px]">{UI_TEXT.scoutPanel.stats.laborers}</span>
              <strong className="text-[#15803d] font-bold text-sm">
                {idleLaborers} người ({Math.floor(resources.food).toLocaleString()} lương)
              </strong>
            </div>
          </div>

          {/* Danh Sách Mục Tiêu Đồn Lũy Đã Phái Do Thám */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-1">
            <div className="text-xs font-bold text-[#8c2d19] uppercase tracking-wider mb-1 font-serif">
              {UI_TEXT.scoutPanel.sectionTitle} ({scoutedCities.length})
            </div>

            {scoutedCities.length === 0 ? (
              <div className="py-8 px-4 text-center space-y-2 border border-[#8c6b44]/25 rounded-lg bg-black/[0.02]">
                <p className="text-xs text-[#704d2e] font-serif italic font-bold">
                  {UI_TEXT.scoutPanel.emptyText}
                </p>
                <p className="text-[11px] text-[#8c6b44] font-sans leading-relaxed">
                  {UI_TEXT.scoutPanel.emptySubtext}
                </p>
              </div>
            ) : (
              scoutedCities.map(city => {
              const assignedScouts = city.assignedScouts || 0;
              const traveling = scoutMissions.filter(m => m.targetCityId === city.id);
              const intelReport = getCityIntelReport(city.troops, assignedScouts, suspicion);

              const canDispatch = originBase && idleLaborers >= 1 && resources.food >= 30;

              const scoutStatusText = assignedScouts > 0
                ? UI_TEXT.scoutPanel.badges.stationed(assignedScouts)
                : traveling.length > 0
                ? UI_TEXT.scoutPanel.badges.traveling(traveling.length, Number(traveling[0].daysRemaining.toFixed(1)))
                : UI_TEXT.scoutPanel.badges.unknown;

              return (
                <div
                  key={city.id}
                  className="p-3 rounded-lg border border-[#8c6b44]/30 bg-[#8c6b44]/5 flex flex-col gap-2 font-serif text-xs"
                >
                  {/* Đầu mục: Tên thành trì */}
                  <div className="flex items-center justify-between border-b border-[#8c6b44]/20 pb-1.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-serif font-black text-sm text-[#8c2d19] tracking-wide">
                        {city.name}
                      </h4>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#3a2010]/10 text-[#5c3e23] font-bold">
                        {city.type === 'city' ? 'Kiên thành' : 'Đồn lũy hiểm'}
                      </span>
                    </div>
                  </div>

                  {/* Báo cáo từng dòng dạng công văn thời xưa */}
                  <ul className="space-y-1.5 text-xs text-[#261304] border-l-2 border-[#8c2d19]/40 pl-3 py-0.5">
                    <li>
                      <span className="text-[#6b4423]">Thám mã: </span>
                      <strong className={assignedScouts > 0 ? "text-[#15803d] font-bold" : traveling.length > 0 ? "text-[#b45309] font-bold" : "text-[#704d2e]"}>
                        {scoutStatusText}
                      </strong>
                    </li>
                    <li>
                      <span className="text-[#6b4423]">{UI_TEXT.scoutPanel.labels.troops} </span>
                      <strong className={assignedScouts > 0 ? "text-[#261304] font-bold" : "text-[#704d2e] italic"}>
                        {intelReport.displayedTroops}
                      </strong>
                    </li>
                    <li>
                      <span className="text-[#6b4423]">{UI_TEXT.scoutPanel.labels.suspicion} </span>
                      <strong className="text-[#8c2d19] font-bold">
                        {intelReport.displayedSuspicion}
                      </strong>
                    </li>
                  </ul>

                  {/* Dòng thao tác: Định vị, Rút về, Phái thêm/Phái do thám */}
                  <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-[#8c6b44]/20">
                    <button
                      onClick={() => {
                        setFlyToTarget({ x: city.x, y: city.y });
                        setActiveModal(null);
                      }}
                      className="px-2.5 py-1 rounded border border-[#8c6b44]/40 bg-[#8c6b44]/10 hover:bg-[#8c6b44]/25 text-[#5c3e23] hover:text-[#8c2d19] text-xs font-bold transition cursor-pointer active:scale-95"
                      title={UI_TEXT.scoutPanel.actions.locate}
                    >
                      Định vị
                    </button>

                    {assignedScouts > 0 && (
                      <button
                        onClick={() => {
                          const res = recallScout(city.id);
                          if (res.success) notify.success(res.message);
                          else notify.warning(res.message);
                        }}
                        className="px-2.5 py-1 rounded bg-[#8c6b44]/15 hover:bg-[#8c6b44]/25 text-[#5c3e23] border border-[#8c6b44]/35 text-xs font-bold cursor-pointer transition active:scale-95"
                        title={UI_TEXT.scoutPanel.actions.recallTooltip}
                      >
                        {UI_TEXT.scoutPanel.actions.recall}
                      </button>
                    )}

                    <button
                      disabled={!canDispatch}
                      onClick={() => {
                        if (!originBase) return;
                        const res = dispatchScoutMission(originBase.id, city.id, 1);
                        if (res.success) notify.success(`Đã phái 1 thám mã thâm nhập ${city.name}!`);
                      }}
                      className="px-3.5 py-1 rounded bg-[#8c2d19] hover:bg-[#6e1e0d] text-[#fff3db] font-bold text-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow active:scale-95"
                      title={
                        !canDispatch
                          ? 'Cần ít nhất 1 tráng phu nhàn rỗi và 30 lương để phái thám mã'
                          : `Phái 1 thám mã đi do thám ${city.name} (-30 lương)`
                      }
                    >
                      {assignedScouts > 0 ? UI_TEXT.scoutPanel.actions.dispatchMore : UI_TEXT.scoutPanel.actions.dispatch}
                    </button>
                  </div>
                </div>
              );
            }))}

            {/* PHẦN 2: CÁC ĐỘI THÁM MÃ ĐANG DI CHUYỂN */}
            {scoutMissions.length > 0 && (
              <div className="pt-3 border-t border-[#8c6b44]/25">
                <div className="text-xs font-bold text-[#8c2d19] uppercase tracking-wider mb-2 font-serif">
                  {UI_TEXT.scoutPanel.travelingSectionTitle} ({scoutMissions.length})
                </div>

                <div className="space-y-2">
                  {scoutMissions.map(scout => (
                    <div
                      key={scout.id}
                      className="p-3 rounded-lg border border-[#8c6b44]/30 bg-[#8c6b44]/5 flex flex-col gap-2 font-serif text-xs"
                    >
                      <div className="flex items-center justify-between border-b border-[#8c6b44]/20 pb-1">
                        <h4 className="font-serif font-bold text-sm text-[#261304]">
                          {scout.originCityName} → {scout.targetCityName}
                        </h4>
                      </div>
                      <ul className="space-y-1 text-xs text-[#261304] border-l-2 border-[#b45309]/50 pl-3 py-0.5">
                        <li>
                          <span className="text-[#6b4423]">Lực lượng: </span>
                          <strong className="text-[#b45309] font-bold">{scout.scoutCount} thám mã</strong>
                        </li>
                        <li>
                          <span className="text-[#6b4423]">Hạn định: </span>
                          <span className="text-[#704d2e]">
                            Còn ~{scout.daysRemaining.toFixed(1)} ngày ({Math.round(scout.daysRemaining * 12)} canh) trước khi cắm chốt
                          </span>
                        </li>
                      </ul>

                      <div className="flex justify-end pt-1.5 border-t border-[#8c6b44]/15">
                        <button
                          onClick={() => {
                            setFlyToTarget({ x: scout.currentPos.x, y: scout.currentPos.y });
                            setActiveModal(null);
                          }}
                          className="px-2.5 py-1 rounded border border-[#8c6b44]/40 bg-[#8c6b44]/10 hover:bg-[#8c6b44]/25 text-[#5c3e23] hover:text-[#8c2d19] text-xs font-bold transition cursor-pointer"
                          title="Định vị thám mã trên bản đồ"
                        >
                          Định vị
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-2.5 border-t border-[#8c6b44]/30 mt-2 shrink-0">
            <span className="text-[11px] text-[#704d2e] italic">
              * {UI_TEXT.scoutPanel.footerTip}
            </span>
          </div>
        </div>
      </div>
  );
});

ScoutOverviewModal.displayName = 'ScoutOverviewModal';
