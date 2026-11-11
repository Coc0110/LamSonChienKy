import React, { useMemo } from 'react';
import { X, Shield, Crosshair, Swords, Flame, Mountain, Flag, Square } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { useUIStore } from '../../../store/uiStore';
import { notify } from '../../../store/dialogStore';
import { getGridTerrainAt } from '../../../data/terrainGrid';
import { TERRAIN_DEFINITIONS } from '../../../data/terrainData';
import { getFormationMapPos } from '../../../utils/marchPathUtils';
import { ensureFormationRosterAndLayers } from '../../../utils/armyCompositionUtils';
import { TERRAIN_COMBAT_WIDTH } from '../../../utils/worldMapCombatEngine';
import type { StratagemType, TacticalFormation } from '../../../types/armyFormation';

const pct = (hp: number, max: number): number =>
  max > 0 ? Math.max(0, Math.min(100, Math.round((hp / max) * 100))) : 0;

const LayerGauge: React.FC<{ label: string; hp: number; max: number; barColor: string }> = ({
  label,
  hp,
  max,
  barColor,
}) => (
  <div className="space-y-0.5 text-[11px]">
    <div className="flex items-center justify-between text-[#4a2e16]">
      <span>{label}</span>
      <span className="font-mono font-bold text-[#261304]">
        {Math.round(hp).toLocaleString()} / {Math.round(max).toLocaleString()}
      </span>
    </div>
    <div className="h-1.5 w-full rounded bg-black/15 border border-[#8c6b44]/35 overflow-hidden">
      <div className="h-full" style={{ width: `${pct(hp, max)}%`, backgroundColor: barColor }} />
    </div>
  </div>
);

const FormationSummaryBlock: React.FC<{
  title: string;
  formation: TacticalFormation;
  commanderName?: string;
  isEnemy?: boolean;
}> = ({ title, formation, commanderName, isEnemy }) => {
  const layers = formation.layers!;
  const morale = Math.max(0, Math.min(100, Math.round(formation.morale ?? 100)));
  const moraleColor = morale < 20 ? '#dc2626' : morale < 45 ? '#ea580c' : '#d97706';

  return (
    <div
      className={`p-2 rounded border space-y-1.5 ${
        isEnemy ? 'border-red-800/40 bg-red-950/10' : 'border-[#8c6b44]/35 bg-black/[0.04]'
      }`}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={`font-black truncate ${isEnemy ? 'text-red-900' : 'text-[#8c2d19]'}`}>
          {title}: {formation.name}
        </span>
        <span className="font-mono text-[11px] font-bold text-[#261304] shrink-0">
          {formation.totalTroops.toLocaleString()} quân
        </span>
      </div>
      {commanderName && (
        <div className="text-[10.5px] text-[#5c3e23]">Chủ tướng: <strong>{commanderName}</strong></div>
      )}
      <LayerGauge label="🛡️ Tiền Phong" hp={layers.frontlineHp} max={layers.frontlineMaxHp} barColor="#b45309" />
      <LayerGauge label="🏹 Hậu Phương" hp={layers.backlineHp} max={layers.backlineMaxHp} barColor="#15803d" />
      <LayerGauge label="🐎 Cơ Động" hp={layers.flankHp} max={layers.flankMaxHp} barColor="#7c3aed" />
      <div className="space-y-0.5 text-[11px] pt-0.5">
        <div className="flex items-center justify-between text-[#4a2e16]">
          <span>Sĩ Khí</span>
          <span className="font-mono font-bold" style={{ color: moraleColor }}>
            {morale}/100 {formation.isRouting ? '• 🏳️ Vỡ Trận' : ''}
          </span>
        </div>
        <div className="h-1.5 w-full rounded bg-black/15 border border-[#8c6b44]/35 overflow-hidden">
          <div className="h-full" style={{ width: `${morale}%`, backgroundColor: moraleColor }} />
        </div>
      </div>
    </div>
  );
};

export const WorldCombatHUD: React.FC = React.memo(() => {
  const formations = useGameStore(state => state.formations);
  const cities = useGameStore(state => state.cities);
  const generals = useGameStore(state => state.generals);
  const prepareTerrainTrap = useGameStore(state => state.prepareTerrainTrap);
  const triggerFormationStratagem = useGameStore(state => state.triggerFormationStratagem);
  const stopFormationMarch = useGameStore(state => state.stopFormationMarch);
  const updateMarchEndpointAction = useGameStore(state => state.updateMarchEndpointAction);

  const selectedMapFormationId = useUIStore(state => state.selectedMapFormationId);
  const setSelectedMapFormationId = useUIStore(state => state.setSelectedMapFormationId);
  const setMarchDrawMode = useUIStore(state => state.setMarchDrawMode);

  const selected = useMemo(() => {
    if (!selectedMapFormationId) return null;
    const found = formations.find(f => f.id === selectedMapFormationId);
    return found ? ensureFormationRosterAndLayers(found) : null;
  }, [formations, selectedMapFormationId]);

  const enemyTarget = useMemo(() => {
    if (!selected) return null;
    if (selected.combatState?.targetFormationId) {
      const direct = formations.find(f => f.id === selected.combatState!.targetFormationId);
      if (direct) return ensureFormationRosterAndLayers(direct);
    }
    const selPos = getFormationMapPos(selected, cities);
    const selFaction = selected.faction ?? 'lam_son';
    let best: TacticalFormation | null = null;
    let bestDist = 4.5;
    for (const f of formations) {
      if (f.id === selected.id || f.totalTroops <= 0) continue;
      if ((f.faction ?? 'lam_son') === selFaction) continue;
      const p = getFormationMapPos(f, cities);
      const d = Math.hypot(p.x - selPos.x, p.y - selPos.y);
      if (d <= bestDist) {
        bestDist = d;
        best = ensureFormationRosterAndLayers(f);
      }
    }
    return best;
  }, [selected, formations, cities]);

  if (!selected) return null;

  const pos = getFormationMapPos(selected, cities);
  const terrain = getGridTerrainAt(pos.x, pos.y);
  const terrainDef = TERRAIN_DEFINITIONS[terrain];
  const combatWidth = TERRAIN_COMBAT_WIDTH[terrain];
  const isLamSon = (selected.faction ?? 'lam_son') === 'lam_son';
  const commander = generals.find(g => g.id === selected.commanderGeneralId);
  const enemyCommander = enemyTarget ? generals.find(g => g.id === enemyTarget.commanderGeneralId) : undefined;
  const isMoving = selected.status === 'marching' || selected.status === 'retreating';

  const runStratagem = (stratagem: StratagemType) => {
    if (!enemyTarget) {
      notify.warning('Không có đạo quân địch nào trong tầm để thi triển mưu kế!');
      return;
    }
    const res = triggerFormationStratagem(selected.id, enemyTarget.id, stratagem);
    if (res.success) notify.success(res.message);
    else notify.warning(res.message);
  };

  const handleAmbushAction = () => {
    if (selected.isStealthed) {
      runStratagem('ambush_strike');
      return;
    }
    const res = updateMarchEndpointAction(selected.id, 'ambush');
    if (res.success) notify.success(res.message);
    else notify.warning(res.message);
  };

  const handleFireAction = () => {
    if (enemyTarget && (selected.preparedTrap === 'fire' || terrain === 'forest' || terrain === 'swamp')) {
      runStratagem('fire_attack');
      return;
    }
    const res = prepareTerrainTrap(selected.id, 'fire');
    if (res.success) notify.success(res.message);
    else notify.warning(res.message);
  };

  const handleRockfallAction = () => {
    if (enemyTarget && (selected.preparedTrap === 'rockfall' || terrain === 'cliff' || terrain === 'mountain')) {
      runStratagem('rockfall_trap');
      return;
    }
    const res = prepareTerrainTrap(selected.id, 'rockfall');
    if (res.success) notify.success(res.message);
    else notify.warning(res.message);
  };

  const handleTauntAction = () => {
    if (enemyTarget) {
      runStratagem('taunt_lure');
    } else {
      setMarchDrawMode({ formationId: selected.id, isDualRoute: true });
    }
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-[1010] w-80 md:w-96 max-h-[80vh] flex flex-col pointer-events-auto select-none"
      onMouseDown={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
      onWheel={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      <div className="relative flex flex-col min-h-0 rounded-xl border-2 border-[#8c6b44] shadow-2xl overflow-hidden bg-[#efe0bc]">
        <img
          src="/parchment_torn_panel.png"
          alt="Chỉ huy chiến trường"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none opacity-85 z-0"
          draggable={false}
        />

        <div className="relative z-10 p-3.5 flex flex-col gap-2.5 font-serif text-[#261304] overflow-y-auto no-scrollbar">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#8c6b44]/40 pb-1.5">
            <div className="flex items-center gap-1.5">
              <Swords size={16} className="text-[#8c2d19]" />
              <h3 className="font-black text-sm tracking-wide">Chỉ Huy Chiến Trường</h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedMapFormationId(null)}
              className="p-1 rounded hover:bg-[#8c6b44]/20 text-[#5c3e23] cursor-pointer"
              title="Đóng bảng chỉ huy"
            >
              <X size={16} />
            </button>
          </div>

          {/* Địa hình & Độ Rộng Mặt Trận */}
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded border border-[#8c6b44]/35 bg-black/[0.06] text-xs">
            <div>
              <span className="text-[#5c3e23]">Địa hình: </span>
              <strong style={{ color: terrainDef.color }}>{terrainDef.name}</strong>
            </div>
            <div className="text-right">
              <span className="text-[#5c3e23]">Mặt trận: </span>
              <strong className="text-[#8c2d19] font-mono">{combatWidth.toLocaleString()} quân</strong>
            </div>
          </div>

          {/* Nhãn trạng thái tác chiến */}
          {(selected.isStealthed || selected.preparedTrap || selected.isSupplyCut || selected.isRouting) && (
            <div className="flex flex-wrap gap-1 text-[10px] font-bold">
              {selected.isStealthed && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-900 text-emerald-100">🌲 Đang Ẩn Thân</span>
              )}
              {selected.preparedTrap === 'fire' && (
                <span className="px-1.5 py-0.5 rounded bg-orange-900 text-orange-100">🔥 Bẫy Lửa Sẵn Sàng</span>
              )}
              {selected.preparedTrap === 'rockfall' && (
                <span className="px-1.5 py-0.5 rounded bg-stone-700 text-stone-100">🪨 Bẫy Đá Sẵn Sàng</span>
              )}
              {selected.isSupplyCut && (
                <span className="px-1.5 py-0.5 rounded bg-red-900 text-red-100">🌾 Tuyệt Lương</span>
              )}
              {selected.isRouting && (
                <span className="px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-100">🏳️ Vỡ Trận</span>
              )}
            </div>
          )}

          {/* 3 Tuyến của Đạo Quân đang chọn */}
          <FormationSummaryBlock
            title={isLamSon ? 'Quân Ta' : 'Quân Minh'}
            formation={selected}
            commanderName={commander?.name}
            isEnemy={!isLamSon}
          />

          {/* Mục tiêu đang giao chiến / trong tầm */}
          {enemyTarget && (
            <FormationSummaryBlock
              title={selected.combatState ? 'Đang Giao Chiến' : 'Địch Trong Tầm'}
              formation={enemyTarget}
              commanderName={enemyCommander?.name}
              isEnemy={isLamSon}
            />
          )}

          {selected.combatState?.lastLogMessage && (
            <div className="text-[11px] italic text-[#5c3e23] px-2 py-1 rounded bg-black/[0.04] border border-[#8c6b44]/25">
              {selected.combatState.lastLogMessage}
            </div>
          )}

          {/* Các nút Phát Lệnh & Mưu Kế Tức Thời */}
          {isLamSon && (
            <div className="space-y-1.5 pt-1 border-t border-[#8c6b44]/35">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#6b4423] flex items-center gap-1">
                <Shield size={12} /> Lệnh Chiến Thuật & Mưu Kế
              </div>
              <div className="grid grid-cols-1 gap-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={handleAmbushAction}
                  className="w-full px-2.5 py-1.5 rounded border border-emerald-800/60 bg-emerald-900/90 hover:bg-emerald-800 text-emerald-50 text-left flex items-center justify-between cursor-pointer transition"
                >
                  <span>
                    {selected.isStealthed ? '📣 Phát Pháo Hiệu Xuất Kích' : '🌲 Mai Phục Ẩn Thân'}
                  </span>
                  <Crosshair size={13} />
                </button>

                <button
                  type="button"
                  onClick={handleFireAction}
                  className="w-full px-2.5 py-1.5 rounded border border-orange-800/60 bg-[#9a3412] hover:bg-[#7c2d12] text-orange-50 text-left flex items-center justify-between cursor-pointer transition"
                >
                  <span>🔥 Dựng / Phóng Hỏa Công</span>
                  <Flame size={13} />
                </button>

                <button
                  type="button"
                  onClick={handleRockfallAction}
                  className="w-full px-2.5 py-1.5 rounded border border-stone-700 bg-stone-700 hover:bg-stone-600 text-stone-50 text-left flex items-center justify-between cursor-pointer transition"
                >
                  <span>🪨 Bẫy Đá Lăn Hẻm Núi</span>
                  <Mountain size={13} />
                </button>

                <button
                  type="button"
                  onClick={handleTauntAction}
                  className="w-full px-2.5 py-1.5 rounded border border-purple-800/60 bg-purple-900/90 hover:bg-purple-800 text-purple-50 text-left flex items-center justify-between cursor-pointer transition"
                >
                  <span>🏳️ Khiêu Khích & Trá Bại</span>
                  <Flag size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => runStratagem('duel_snipe')}
                  className="w-full px-2.5 py-1.5 rounded border border-[#8c2d19] bg-[#8c2d19] hover:bg-[#6e1e0d] text-[#fef2d6] text-left flex items-center justify-between cursor-pointer transition"
                >
                  <span>⚔️ Đơn Kỵ Đột Kích Trảm Tướng</span>
                  <Swords size={13} />
                </button>

                {isMoving && (
                  <button
                    type="button"
                    onClick={() => {
                      const res = stopFormationMarch(selected.id);
                      if (res.success) notify.info(res.message);
                    }}
                    className="w-full px-2.5 py-1.5 rounded border border-red-700 bg-red-900/85 hover:bg-red-800 text-red-50 text-left flex items-center justify-between cursor-pointer transition"
                  >
                    <span>🛑 Dừng Hành Quân Tại Đây</span>
                    <Square size={12} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

WorldCombatHUD.displayName = 'WorldCombatHUD';
