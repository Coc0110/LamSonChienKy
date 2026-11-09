import React, { useMemo } from 'react';
import { X, MapPin, Eye, AlertTriangle } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { useUIStore } from '../../../store/uiStore';
import { notify } from '../../../store/dialogStore';
import { getCityIntelReport } from '../../../types';

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
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#8c2d19]/15 flex items-center justify-center text-[#8c2d19] border border-[#8c6b44]/40">
                <Eye size={18} />
              </div>
              <div>
                <h3 className="font-serif font-black text-lg text-[#261304] leading-tight">
                  Tình Báo Do Thám & Thám Mã
                </h3>
                <p className="text-[11px] text-[#704d2e] font-sans">
                  Nắm bắt thực lực các đồn lũy quân Minh và điều động thám mã trinh sát
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

          {/* Banner Thống kê Tình Báo */}
          <div className="grid grid-cols-3 gap-2 mb-3 p-2.5 rounded bg-black/[0.04] border border-[#8c6b44]/25 shrink-0 text-xs text-center">
            <div>
              <span className="text-[#5c3e23] block text-[11px]">Đã phái do thám:</span>
              <strong className="text-[#8c2d19] font-bold text-sm">
                {scoutedCities.length} thành trì
              </strong>
            </div>
            <div>
              <span className="text-[#5c3e23] block text-[11px]">Thám mã đang di chuyển:</span>
              <strong className="text-[#b45309] font-bold text-sm">
                {scoutMissions.length} đội
              </strong>
            </div>
            <div>
              <span className="text-[#5c3e23] block text-[11px]">Tráng phu rảnh rỗi:</span>
              <strong className="text-[#15803d] font-bold text-sm">
                {idleLaborers} người ({Math.floor(resources.food).toLocaleString()} lương)
              </strong>
            </div>
          </div>

          {/* Danh Sách Mục Tiêu Đồn Lũy Đã Phái Do Thám */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-1">
            <div className="text-xs font-bold text-[#8c2d19] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Eye size={14} /> Thành Trì & Đồn Lũy Đang Do Thám ({scoutedCities.length})
            </div>

            {scoutedCities.length === 0 ? (
              <div className="py-8 px-4 text-center space-y-2 border border-[#8c6b44]/25 rounded-lg bg-black/[0.02]">
                <div className="w-9 h-9 mx-auto rounded-full bg-[#8c6b44]/15 flex items-center justify-center text-[#8c6b44]">
                  <Eye size={18} />
                </div>
                <p className="text-xs text-[#704d2e] font-serif italic font-bold">
                  Chưa phái thám mã đến thành trì nào.
                </p>
                <p className="text-[11px] text-[#8c6b44] font-sans leading-relaxed">
                  Hãy nhấp chọn một đồn lũy hoặc thành trì quân Minh trên bản đồ để cử quân do thám thâm nhập.
                </p>
              </div>
            ) : (
              scoutedCities.map(city => {
              const assignedScouts = city.assignedScouts || 0;
              const traveling = scoutMissions.filter(m => m.targetCityId === city.id);
              const intelReport = getCityIntelReport(city.troops, assignedScouts, suspicion);

              const canDispatch = originBase && idleLaborers >= 1 && resources.food >= 30;

              return (
                <div
                  key={city.id}
                  className="p-3 rounded-lg border border-[#8c6b44]/30 bg-[#8c6b44]/5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-[#8c2d19]">{city.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#3a2010]/10 text-[#5c3e23] font-bold">
                        {city.type === 'city' ? 'Kiên thành' : 'Đồn lũy hiểm'}
                      </span>

                      {/* Huy hiệu tình báo */}
                      {assignedScouts > 0 ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#15803d]/20 text-[#15803d]">
                          👁️ Đã cắm chốt {assignedScouts} thám mã
                        </span>
                      ) : traveling.length > 0 ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#b45309]/20 text-[#b45309]">
                          ⏳ Đang tới ({traveling.length} thám mã • còn ~{traveling[0].daysRemaining.toFixed(1)} ngày)
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/10 text-[#704d2e]">
                          🌫️ Mù mờ tình báo
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-[#704d2e] flex items-center gap-4 pt-0.5">
                      <span>
                        Quân đồn trú: <strong className={assignedScouts > 0 ? "text-[#261304]" : "text-[#704d2e] italic"}>
                          {intelReport.displayedTroops}
                        </strong>
                      </span>
                      <span>
                        Độ nghi ngờ: <strong className="text-[#8c2d19]">
                          {intelReport.displayedSuspicion}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Cụm thao tác: Phái thám mã / Rút về / Định vị */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Nút Rút thám mã nếu đã cắm chốt */}
                    {assignedScouts > 0 && (
                      <button
                        onClick={() => {
                          const res = recallScout(city.id);
                          if (res.success) notify.success(res.message);
                          else notify.warning(res.message);
                        }}
                        className="px-2 py-1 rounded bg-[#8c6b44]/15 hover:bg-[#8c6b44]/30 text-[#5c3e23] text-[11px] font-bold cursor-pointer transition"
                        title="Rút 1 thám mã về lại Lam Sơn"
                      >
                        Rút về
                      </button>
                    )}

                    {/* Nút Phái thám mã */}
                    <button
                      disabled={!canDispatch}
                      onClick={() => {
                        if (!originBase) return;
                        const res = dispatchScoutMission(originBase.id, city.id, 1);
                        if (res.success) notify.success(`Đã phái 1 thám mã thâm nhập ${city.name}!`);
                      }}
                      className="px-2.5 py-1 rounded bg-[#8c2d19] hover:bg-[#6e1e0d] text-[#fff3db] font-bold text-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow"
                      title={
                        !canDispatch
                          ? 'Cần ít nhất 1 tráng phu nhàn rỗi và 30 lương để phái thám mã'
                          : `Phái 1 thám mã đi do thám ${city.name} (-30 lương)`
                      }
                    >
                      {assignedScouts > 0 ? '+ Phái Thêm' : '+ Phái Do Thám'}
                    </button>

                    {/* Nút Định vị thành trên bản đồ */}
                    <button
                      onClick={() => {
                        setFlyToTarget({ x: city.x, y: city.y });
                        setActiveModal(null);
                      }}
                      className="p-1.5 rounded hover:bg-[#8c6b44]/20 text-[#5c3e23] hover:text-[#8c2d19] transition cursor-pointer"
                      title={`Định vị ${city.name} trên bản đồ`}
                    >
                      <MapPin size={16} />
                    </button>
                  </div>
                </div>
              );
            }))}

            {/* PHẦN 2: CÁC ĐỘI THÁM MÃ ĐANG DI CHUYỂN */}
            {scoutMissions.length > 0 && (
              <div className="pt-3">
                <div className="text-xs font-bold text-[#b45309] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  ⏳ Đội Thám Mã Đang Trên Đường Hành Quân
                </div>

                <div className="space-y-1.5">
                  {scoutMissions.map(scout => (
                    <div
                      key={scout.id}
                      className="p-2.5 rounded-lg border border-[#8c6b44]/25 bg-black/[0.02] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#261304]">
                          {scout.originCityName} → {scout.targetCityName} ({scout.scoutCount} thám mã)
                        </div>
                        <div className="text-[11px] text-[#704d2e]">
                          Còn ~{scout.daysRemaining.toFixed(1)} ngày ({Math.round(scout.daysRemaining * 12)} canh) trước khi cắm chốt
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setFlyToTarget({ x: scout.currentPos.x, y: scout.currentPos.y });
                          setActiveModal(null);
                        }}
                        className="p-1.5 rounded hover:bg-[#8c6b44]/20 text-[#5c3e23] hover:text-[#8c2d19] transition cursor-pointer"
                        title="Định vị thám mã trên bản đồ"
                      >
                        <MapPin size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-2.5 border-t border-[#8c6b44]/30 mt-2 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-[#704d2e] italic flex items-center gap-1">
              <AlertTriangle size={13} className="text-[#8c2d19]" />
              Mỗi thám mã cắm chốt giúp làm rõ thực lực quân giặc. Phái 1 thám mã tiêu hao 30 lương thảo.
            </span>
          </div>
        </div>
      </div>
  );
});

ScoutOverviewModal.displayName = 'ScoutOverviewModal';
