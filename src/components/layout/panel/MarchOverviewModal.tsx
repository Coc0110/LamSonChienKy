import React from 'react';
import { X, MapPin, Compass, Shield, Footprints, AlertTriangle } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { useUIStore } from '../../../store/uiStore';
import { STATUS_LABELS, getFormationMapPos } from '../../../utils/marchPathUtils';

export const MarchOverviewModal: React.FC = React.memo(() => {
  const activeModal = useUIStore(state => state.activeModal);
  const setActiveModal = useUIStore(state => state.setActiveModal);
  const setFlyToTarget = useUIStore(state => state.setFlyToTarget);
  const setSelectedMapFormationId = useUIStore(state => state.setSelectedMapFormationId);

  const formations = useGameStore(state => state.formations);
  const cities = useGameStore(state => state.cities);
  const generals = useGameStore(state => state.generals);
  const scoutMissions = useGameStore(state => state.scoutMissions || []);
  const setActiveFormationId = useGameStore(state => state.setActiveFormationId);

  if (activeModal !== 'march') return null;

  const validFormations = formations.filter(f => f.totalTroops > 0);
  const marchingCount = validFormations.filter(f => f.status === 'marching' || f.status === 'retreating').length;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 pt-20 bg-black/70 backdrop-blur-xs select-none"
      onClick={() => setActiveModal(null)}
    >
      <div 
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col pointer-events-auto filter drop-shadow-[0_20px_45px_rgba(0,0,0,0.9)]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src="/parchment_torn_panel.png"
          alt="Bảng Tổng Quản Quân Vụ"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
          draggable={false}
        />

        <div className="relative z-10 p-6 md:p-8 flex flex-col h-full font-serif text-[#261304] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#8c6b44]/35 pb-2.5 mb-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#8c2d19]/15 flex items-center justify-center text-[#8c2d19] border border-[#8c6b44]/40">
                <Compass size={18} />
              </div>
              <div>
                <h3 className="font-serif font-black text-lg text-[#261304] leading-tight">
                  Lực Lượng Xuất Trận & Trinh Sát
                </h3>
                <p className="text-[11px] text-[#704d2e] font-sans">
                  Theo dõi lộ trình các đạo quân và đội thám mã ngoài thực địa
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

          {/* Banner Thống kê */}
          <div className="flex items-center justify-between mb-3 p-2.5 rounded bg-black/[0.04] border border-[#8c6b44]/25 shrink-0 text-xs">
            <div>
              <span className="text-[#5c3e23]">Tổng lực lượng: </span>
              <strong className="text-[#8c2d19] font-bold">{validFormations.length} đạo quân</strong>
            </div>
            <div>
              <span className="text-[#5c3e23]">Đang hành quân: </span>
              <strong className="text-[#b45309] font-bold">{marchingCount} đạo</strong>
            </div>
            <div>
              <span className="text-[#5c3e23]">Thám mã tuần tra: </span>
              <strong className="text-[#15803d] font-bold">{scoutMissions.length} đội</strong>
            </div>
          </div>

          {/* Danh Sách Các Đạo Quân & Thám Mã */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 pr-1">
            {/* PHẦN 1: CÁC ĐẠO QUÂN */}
            <div className="text-xs font-bold text-[#8c2d19] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Shield size={14} /> Danh Sách Các Đạo Quân
            </div>

            {validFormations.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#704d2e] italic">
                Chưa có đạo quân nào được biên chế. Hãy mở Bố Trận để sắp xếp quân lực!
              </div>
            ) : (
              validFormations.map(form => {
                const commander = generals.find(g => g.id === form.commanderGeneralId);
                const statusMeta = STATUS_LABELS[form.status] || STATUS_LABELS.stationed;
                const pos = getFormationMapPos(form, cities);

                let unitCount = 0;
                let totalMorale = 0;
                for (const row of form.grid) {
                  for (const cell of row) {
                    if (cell) {
                      unitCount++;
                      totalMorale += cell.morale || 100;
                    }
                  }
                }
                const avgMorale = unitCount > 0 ? Math.round(totalMorale / unitCount) : 100;

                return (
                  <div
                    key={form.id}
                    className="p-3 rounded-lg border border-[#8c6b44]/30 bg-[#8c6b44]/5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#8c2d19]">{form.name}</span>
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                          style={{ backgroundColor: `${statusMeta.color}25`, color: statusMeta.color }}
                        >
                          {statusMeta.icon} {statusMeta.label}
                        </span>
                        <span className="text-[11px] text-[#5c3e23]">
                          • Tướng: <b>{commander?.name || 'Chưa chỉ định'}</b>
                        </span>
                      </div>

                      <div className="text-[11px] text-[#704d2e] flex items-center gap-3">
                        <span>Quân số: <b>{form.totalTroops.toLocaleString()}</b> người</span>
                        <span>Lương thảo: <b>{Math.floor(form.totalFoodCarried).toLocaleString()}</b> thạch</span>
                        <span>Sĩ khí: <b>{avgMorale}/100</b></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setActiveFormationId(form.id);
                          setSelectedMapFormationId(form.id);
                          setActiveModal('army');
                        }}
                        className="px-2.5 py-1 rounded bg-[#8c2d19]/15 hover:bg-[#8c2d19]/25 text-[#8c2d19] border border-[#8c6b44]/40 font-bold text-xs transition cursor-pointer"
                        title="Mở sa bàn bố trận đạo quân này"
                      >
                        Bố Trận
                      </button>

                      <button
                        onClick={() => {
                          setFlyToTarget({ x: pos.x, y: pos.y });
                          setSelectedMapFormationId(form.id);
                          setActiveModal(null);
                        }}
                        className="p-1.5 rounded hover:bg-[#8c6b44]/20 text-[#5c3e23] hover:text-[#8c2d19] transition cursor-pointer"
                        title="Định vị đạo quân này trên bản đồ"
                      >
                        <MapPin size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {/* PHẦN 2: THÁM MÃ */}
            {scoutMissions.length > 0 && (
              <div className="pt-3">
                <div className="text-xs font-bold text-[#8c2d19] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Footprints size={14} /> Đội Thám Mã Đang Do Thám
                </div>

                <div className="space-y-2">
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
                          Còn {scout.daysRemaining} ngày trước khi vẽ xong sương mù hồi doanh
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
          <div className="pt-3 border-t border-[#8c6b44]/30 mt-2 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-[#704d2e] italic flex items-center gap-1">
              <AlertTriangle size={13} className="text-[#8c2d19]" />
              Ban đêm (Canh 3, 4, 5: Tý, Sửu, Dần), nghĩa quân tạm hạ trại nghỉ ngơi để bảo toàn thể lực.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

MarchOverviewModal.displayName = 'MarchOverviewModal';
