import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { useUIStore } from '../../../store/uiStore';
import { STATUS_LABELS, getFormationMapPos } from '../../../utils/marchPathUtils';
import { UI_TEXT } from '../../../data/uiText';

export const ArmyOverviewPanel: React.FC = React.memo(() => {
  const activeModal = useUIStore(state => state.activeModal);
  const setActiveModal = useUIStore(state => state.setActiveModal);
  const setFlyToTarget = useUIStore(state => state.setFlyToTarget);
  const setMarchDrawMode = useUIStore(state => state.setMarchDrawMode);

  const formations = useGameStore(state => state.formations);
  const cities = useGameStore(state => state.cities);
  const generals = useGameStore(state => state.generals);
  const createFormation = useGameStore(state => state.createFormation);
  const setActiveFormationId = useGameStore(state => state.setActiveFormationId);

  const originBase = useMemo(() => cities.find(c => c.faction === 'lam_son') || cities[0], [cities]);

  if (activeModal !== 'army') return null;

  const validFormations = formations.filter(f => f.totalTroops >= 0);
  const totalTroops = formations.reduce((acc, f) => acc + (f.totalTroops || 0), 0);
  const totalWeapons = formations.reduce((acc, f) => acc + (f.totalWeapons || 0), 0);
  const totalFood = formations.reduce((acc, f) => acc + (f.totalFoodCarried || 0), 0);

  return (
    <div 
      className="fixed inset-x-3 bottom-3 md:inset-auto md:absolute md:top-[82px] md:left-[98px] z-40 md:w-[470px] max-h-[82vh] flex flex-col pointer-events-auto transition-all duration-300 select-none filter drop-shadow-[0_18px_30px_rgba(0,0,0,0.7)] drop-shadow-[0_3px_8px_rgba(0,0,0,0.45)]"
    >
      {/* Nền Giấy Dó cổ sứt mẻ tự nhiên */}
      <img
        src="/parchment_torn_panel.png"
        alt="Sớ Bố Trận & Binh Lực"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
        draggable={false}
      />

      <div className="relative z-10 p-5 md:p-6 flex flex-col h-full font-serif text-[#261304] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#8c6b44]/35 pb-2.5 mb-2.5 shrink-0">
          <h3 className="font-serif font-black text-lg text-[#261304] leading-tight tracking-wide">
            {UI_TEXT.armyPanel.title}
          </h3>

          <button
            onClick={() => setActiveModal(null)}
            className="text-[#6e4927] hover:text-[#261304] transition p-1 hover:bg-[#8c6b44]/15 rounded cursor-pointer"
            title="Đóng bảng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Banner Tổng kết lực lượng */}
        <div className="grid grid-cols-3 gap-2 mb-2.5 p-2 rounded bg-black/[0.04] border border-[#8c6b44]/25 shrink-0 text-xs text-center">
          <div>
            <span className="text-[#5c3e23] block text-[11px]">{UI_TEXT.armyPanel.stats.totalArmies}:</span>
            <strong className="text-[#8c2d19] font-bold text-sm">
              {formations.length} đạo
            </strong>
          </div>
          <div>
            <span className="text-[#5c3e23] block text-[11px]">{UI_TEXT.armyPanel.stats.totalTroops}:</span>
            <strong className="text-[#b45309] font-bold text-sm">
              {totalTroops.toLocaleString()} quân
            </strong>
          </div>
          <div>
            <span className="text-[#5c3e23] block text-[11px]">{UI_TEXT.armyPanel.stats.supplies}:</span>
            <strong className="text-[#15803d] font-bold text-sm">
              {totalWeapons} khí / {Math.floor(totalFood)} thạch
            </strong>
          </div>
        </div>

        {/* Nút Mở Sa Bàn 32x32 Nổi Bật */}
        <button
          onClick={() => {
            setActiveModal('tactical_grid');
          }}
          className="relative w-full py-2 px-3 rounded flex items-center justify-center gap-2 group transition-transform hover:scale-[1.01] active:scale-95 cursor-pointer shadow-md mb-2.5 shrink-0"
          title={UI_TEXT.armyPanel.openTacticalGridTooltip}
        >
          <img
            src="/ink_stroke_red.png"
            alt="Mở sa bàn"
            className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] group-hover:brightness-110"
          />
          <span className="relative z-10 font-serif font-black text-xs uppercase tracking-wider text-[#fef2d6] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
            {UI_TEXT.armyPanel.openTacticalGridBtn}
          </span>
        </button>

        {/* Danh Sách Các Đạo Quân */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-1">
          <div className="text-xs font-bold text-[#8c2d19] uppercase tracking-wider mb-1 font-serif">
            {UI_TEXT.armyPanel.sectionTitle} ({validFormations.length})
          </div>

          {validFormations.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#704d2e] italic">
              {UI_TEXT.armyPanel.emptyText}
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
                  className="p-3 rounded-lg border border-[#8c6b44]/30 bg-[#8c6b44]/5 flex flex-col gap-2 font-serif text-xs"
                >
                  {/* Đầu mục: Tên đạo quân & Trạng thái */}
                  <div className="flex items-center justify-between border-b border-[#8c6b44]/20 pb-1.5">
                    <h4 className="font-serif font-black text-sm text-[#8c2d19] tracking-wide">
                      {form.name}
                    </h4>
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                      style={{ backgroundColor: `${statusMeta.color}20`, color: statusMeta.color }}
                    >
                      {statusMeta.label}
                    </span>
                  </div>

                  {/* Danh sách thông tin báo cáo: mỗi thông tin một dòng, không có icon */}
                  <ul className="space-y-1.5 text-xs text-[#261304] border-l-2 border-[#8c2d19]/40 pl-3 py-0.5">
                    <li>
                      <span className="text-[#6b4423]">{UI_TEXT.armyPanel.commanderLabel} </span>
                      <strong className="text-[#261304] font-bold">
                        {commander?.name || UI_TEXT.armyPanel.unassignedCommander}
                      </strong>
                    </li>
                    <li>
                      <span className="text-[#6b4423]">Binh lực: </span>
                      <strong className="text-[#b45309] font-bold">
                        {form.totalTroops.toLocaleString()} quân
                      </strong>
                    </li>
                    <li>
                      <span className="text-[#6b4423]">Khí giới & Lương: </span>
                      <strong className="text-[#15803d] font-bold">
                        {form.totalWeapons} khí / {Math.floor(form.totalFoodCarried)} thạch
                      </strong>
                    </li>
                    <li>
                      <span className="text-[#6b4423]">Sĩ khí: </span>
                      <strong className="text-[#8c2d19] font-bold">
                        {avgMorale}/100
                      </strong>
                    </li>
                  </ul>

                  {/* Dòng thao tác: Định vị, Sa bàn, Vẽ đường */}
                  <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-[#8c6b44]/20">
                    <button
                      onClick={() => {
                        setFlyToTarget({ x: pos.x, y: pos.y });
                      }}
                      className="px-2.5 py-1 rounded border border-[#8c6b44]/40 bg-[#8c6b44]/10 hover:bg-[#8c6b44]/25 text-[#5c3e23] hover:text-[#8c2d19] text-xs font-bold transition cursor-pointer active:scale-95"
                      title={UI_TEXT.armyPanel.actions.locate}
                    >
                      Định vị
                    </button>

                    <button
                      onClick={() => {
                        setActiveFormationId(form.id);
                        setActiveModal('tactical_grid');
                      }}
                      className="px-2.5 py-1 rounded bg-[#8c6b44]/15 hover:bg-[#8c6b44]/25 text-[#3a2010] border border-[#8c6b44]/35 text-xs font-bold transition cursor-pointer active:scale-95"
                      title={UI_TEXT.armyPanel.actions.tacticalGridTooltip}
                    >
                      {UI_TEXT.armyPanel.actions.tacticalGrid}
                    </button>

                    <button
                      onClick={() => {
                        setMarchDrawMode({ formationId: form.id });
                        setActiveModal(null);
                      }}
                      className="px-3 py-1 rounded bg-[#8c2d19] hover:bg-[#6e1e0d] text-white font-bold text-xs shadow transition cursor-pointer active:scale-95"
                      title={UI_TEXT.armyPanel.actions.drawRouteTooltip}
                    >
                      {UI_TEXT.armyPanel.actions.drawRoute}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: Nút Lập Đạo Quân Mới */}
        <div className="pt-2 border-t border-[#8c6b44]/30 mt-2 flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              if (originBase) {
                createFormation(originBase.id);
              }
            }}
            className="flex items-center gap-1 px-3 py-1 rounded border border-[#8c6b44]/40 bg-[#8c6b44]/15 hover:bg-[#8c6b44]/25 text-[#3a2010] font-bold text-xs cursor-pointer transition active:scale-95"
          >
            <span>+ {UI_TEXT.armyPanel.createFormationBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
});

ArmyOverviewPanel.displayName = 'ArmyOverviewPanel';
