import React, { useMemo, useState } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { notify } from '../../store/dialogStore';
import { TACTICAL_UNIT_CONFIGS } from '../../types/armyFormation';
import type { ArmyRosterCounts } from '../../types/armyFormation';
import {
  EMPTY_ROSTER,
  buildLayersFromRoster,
  calculateCommandCapacity,
  computeFormationSpeedAndVision,
  ensureFormationRosterAndLayers,
  getCityTrainedRoster,
  rosterTotal,
} from '../../utils/armyCompositionUtils';

type UnitKey = keyof ArmyRosterCounts;

const UNIT_CARDS: { key: UnitKey; label: string; layer: 'front' | 'back' | 'flank'; note: string }[] = [
  { key: 'swordsman', label: 'Đao Khiên', layer: 'front', note: 'Giảm 40% tên bắn, giữ ải' },
  { key: 'spearman', label: 'Giáo Binh', layer: 'front', note: 'Khắc kỵ binh địch ×2.2' },
  { key: 'elephant', label: 'Tượng Binh', layer: 'front', note: 'Phá tuyến, gây khiếp sợ' },
  { key: 'archer', label: 'Cung Nỏ', layer: 'back', note: 'Bắn yểm trợ tầm xa' },
  { key: 'supply_cart', label: 'Xe Lương', layer: 'back', note: '+12 ngày lương mỗi xe' },
  { key: 'cavalry', label: 'Kỵ Binh', layer: 'flank', note: 'Bọc sườn, truy kích' },
  { key: 'scout', label: 'Thám Mã', layer: 'flank', note: 'Mở tầm nhìn, dò phục binh' },
];

const FOOD_PER_CART = 150;

// Nhu cầu kho theo biên chế (đồng bộ với armySlice.updateFormationRoster)
function needsOf(r: ArmyRosterCounts) {
  return {
    troops: rosterTotal(r),
    swords: r.swordsman + r.cavalry,
    spears: r.spearman + r.elephant + r.scout,
    bows: r.archer,
    horses: r.cavalry + r.scout,
    elephants: r.elephant,
    food: r.supply_cart * FOOD_PER_CART,
  };
}

const pct = (hp: number, max: number) => (max > 0 ? Math.round((hp / max) * 100) : 0);

const LayerBar: React.FC<{ label: string; hp: number; max: number; color: string }> = ({ label, hp, max, color }) => (
  <div className="text-[11px]">
    <div className="flex justify-between text-[#5c3e23]">
      <span>{label}</span>
      <span className="font-bold text-[#261304]">{Math.round(hp).toLocaleString()} HP</span>
    </div>
    <div className="h-2 rounded bg-black/15 border border-[#8c6b44]/30 overflow-hidden">
      <div className="h-full" style={{ width: `${pct(hp, max)}%`, backgroundColor: color }} />
    </div>
  </div>
);

export const ArmyRosterModal: React.FC = React.memo(() => {
  const activeModal = useUIStore(state => state.activeModal);
  const setActiveModal = useUIStore(state => state.setActiveModal);

  const formations = useGameStore(state => state.formations);
  const generals = useGameStore(state => state.generals);
  const cities = useGameStore(state => state.cities);
  const resources = useGameStore(state => state.resources);
  const activeFormationId = useGameStore(state => state.activeFormationId);
  const setActiveFormationId = useGameStore(state => state.setActiveFormationId);
  const updateFormationRoster = useGameStore(state => state.updateFormationRoster);
  const assignGeneralToFormation = useGameStore(state => state.assignGeneralToFormation);
  const removeGeneralFromFormation = useGameStore(state => state.removeGeneralFromFormation);
  const setFormationCommander = useGameStore(state => state.setFormationCommander);

  const isOpen = activeModal === 'tactical_grid';
  const ownFormations = useMemo(() => formations.filter(f => (f.faction ?? 'lam_son') === 'lam_son'), [formations]);
  const formation = useMemo(
    () => ownFormations.find(f => f.id === activeFormationId) ?? ownFormations[0] ?? null,
    [ownFormations, activeFormationId]
  );
  const saved = useMemo(() => (formation ? ensureFormationRosterAndLayers(formation).roster! : EMPTY_ROSTER), [formation]);

  // Bản nháp gắn với biên chế đã lưu: đổi đạo quân / lưu xong thì tự trở về biên chế đã lưu
  const [draftState, setDraftState] = useState<{ base: ArmyRosterCounts; value: ArmyRosterCounts }>({ base: saved, value: saved });
  const draft = draftState.base === saved ? draftState.value : saved;

  if (!isOpen) return null;

  if (!formation) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 select-none">
        <div className="relative p-6 font-serif text-[#261304] bg-[#e8d4a8] rounded border border-[#8c6b44]">
          Chưa có đạo quân nào. Hãy lập đạo quân mới trong Bảng Binh Lực.
          <button className="ml-4 underline cursor-pointer" onClick={() => setActiveModal('army')}>Quay lại</button>
        </div>
      </div>
    );
  }

  const city = cities.find(c => c.id === formation.cityId);
  const cityTroops = city?.population?.combatTroops ?? 0;
  const trainedRoster = city?.population ? getCityTrainedRoster(city.population) : EMPTY_ROSTER;
  const commander = generals.find(g => g.id === formation.commanderGeneralId);
  const staff = formation.assignedGeneralIds
    .map(id => generals.find(g => g.id === id))
    .filter((g): g is NonNullable<typeof g> => !!g);
  const deputies = staff.filter(g => g.id !== formation.commanderGeneralId).slice(0, 2);
  const capacity = calculateCommandCapacity(commander, deputies);
  const martial = staff.reduce((s, g) => s + g.stats.martial, 0);
  const bestIntellect = staff.reduce((m, g) => Math.max(m, g.stats.intellect), 0);
  const bestMartial = staff.reduce((m, g) => Math.max(m, g.stats.martial), 0);
  const stratagems = [
    '📣 Phục kích',
    ...(bestIntellect >= 45 ? ['🏳️ Khiêu khích - Trá bại'] : []),
    ...(bestIntellect >= 50 ? ['🪨 Đá lăn'] : []),
    ...(bestIntellect >= 60 ? ['🔥 Hỏa công', '🎭 Nghi binh'] : []),
    ...(bestMartial >= 70 ? ['⚔️ Đột kích trảm tướng'] : []),
  ];

  const editable = formation.status === 'idle' || formation.status === 'stationed';
  const cur = needsOf(saved);
  const next = needsOf(draft);
  const free = {
    troops: Math.min(cityTroops - (next.troops - cur.troops), capacity - next.troops),
    swords: Math.floor(resources.swords) - (next.swords - cur.swords),
    spears: Math.floor(resources.spears) - (next.spears - cur.spears),
    bows: Math.floor(resources.bows) - (next.bows - cur.bows),
    horses: Math.floor(resources.horses) - (next.horses - cur.horses),
    elephants: Math.floor(resources.elephants) - (next.elephants - cur.elephants),
    food: Math.floor(resources.food) - (next.food - cur.food),
  };

  const maxAddFor = (key: UnitKey): number => {
    const limits = [free.troops];
    if (key !== 'supply_cart') {
      const branchTrainedLeft = trainedRoster[key] - (draft[key] - saved[key]);
      limits.push(branchTrainedLeft);
    }
    if (key === 'swordsman') limits.push(free.swords);
    if (key === 'cavalry') limits.push(free.swords, free.horses);
    if (key === 'spearman') limits.push(free.spears);
    if (key === 'elephant') limits.push(free.spears, free.elephants);
    if (key === 'scout') limits.push(free.spears, free.horses);
    if (key === 'archer') limits.push(free.bows);
    if (key === 'supply_cart') limits.push(Math.floor(free.food / FOOD_PER_CART));
    return Math.max(0, Math.min(...limits));
  };

  const setCount = (key: UnitKey, value: number) => {
    if (!editable) return;
    const max = draft[key] + maxAddFor(key);
    setDraftState({ base: saved, value: { ...draft, [key]: Math.max(0, Math.min(max, Math.floor(value) || 0)) } });
  };

  const layers = buildLayersFromRoster(draft);
  const speed = computeFormationSpeedAndVision(draft, 'plains');
  const dirty = (Object.keys(draft) as UnitKey[]).some(k => draft[k] !== saved[k]);
  const candidates = generals.filter(g => g.unlocked && !formation.assignedGeneralIds.includes(g.id));

  const handleSave = () => {
    const res = updateFormationRoster(formation.id, draft);
    if (res.success) notify.success(res.message);
    else notify.warning(res.message);
  };

  const handleAssign = (generalId: string) => {
    if (!generalId) return;
    if (staff.length >= 3) {
      notify.warning('Ban chỉ huy tối đa 1 Chủ tướng và 2 Phó tướng / Quân sư!');
      return;
    }
    const res = assignGeneralToFormation(formation.id, generalId);
    if (!res.success) notify.warning(res.message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 pt-20 bg-black/60 select-none">
      <div className="relative w-full max-w-6xl max-h-full flex flex-col">
        <img
          src="/parchment_torn_horizontal.png"
          alt="Biên chế đạo quân"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0"
          draggable={false}
        />
        <div className="relative z-10 p-5 md:p-8 flex flex-col min-h-0 font-serif text-[#261304]">
          <div className="flex items-center justify-between border-b border-[#8c6b44]/40 pb-2 mb-3 shrink-0">
            <h2 className="font-black text-xl tracking-wide">Biên Chế Đạo Quân</h2>
            <button
              onClick={() => setActiveModal('army')}
              className="p-1 rounded hover:bg-[#8c6b44]/15 cursor-pointer"
              title="Đóng"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr_280px] gap-4 min-h-0 overflow-y-auto no-scrollbar">
            {/* Cột trái: đạo quân & ban chỉ huy */}
            <div className="space-y-3 text-xs">
              <select
                value={formation.id}
                onChange={e => setActiveFormationId(e.target.value)}
                className="w-full p-1.5 rounded border border-[#8c6b44]/50 bg-[#f4e4bc] font-bold"
              >
                {ownFormations.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>

              <div className="p-2 rounded border border-[#8c6b44]/30 bg-black/[0.04] space-y-1">
                <div className="font-bold text-[#8c2d19] uppercase tracking-wider">Ban Chỉ Huy ({staff.length}/3)</div>
                {staff.length === 0 && <div className="italic text-[#704d2e]">Chưa bổ nhiệm tướng.</div>}
                {staff.map(g => (
                  <div key={g.id} className="flex items-center justify-between gap-1">
                    <button
                      onClick={() => setFormationCommander(formation.id, g.id)}
                      className="text-left cursor-pointer hover:underline"
                      title="Đặt làm Chủ tướng"
                    >
                      {g.id === formation.commanderGeneralId ? '★ ' : ''}{g.name}
                      <span className="text-[#6b4423]"> (TL {g.stats.command} · VN {g.stats.martial} · ML {g.stats.intellect})</span>
                    </button>
                    <button
                      onClick={() => removeGeneralFromFormation(formation.id, g.id)}
                      className="text-[#8c2d19] cursor-pointer"
                      title="Miễn nhiệm"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {staff.length < 3 && candidates.length > 0 && (
                  <select
                    value=""
                    onChange={e => handleAssign(e.target.value)}
                    className="w-full mt-1 p-1 rounded border border-[#8c6b44]/40 bg-[#f4e4bc]"
                  >
                    <option value="">+ Bổ nhiệm tướng…</option>
                    {candidates.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="p-2 rounded border border-[#8c6b44]/30 bg-black/[0.04] space-y-1">
                <div>Thống lĩnh: <strong className="text-[#b45309]">{capacity.toLocaleString()} quân</strong></div>
                <div>Võ nghệ: <strong className="text-[#8c2d19]">{martial}</strong></div>
                <div className="text-[#6b4423]">Mưu lược mở khóa:</div>
                <div className="flex flex-wrap gap-1">
                  {stratagems.map(s => (
                    <span key={s} className="px-1.5 py-0.5 rounded bg-[#8c6b44]/15 border border-[#8c6b44]/30">{s}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Cột giữa: 7 binh chủng */}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-x-4 text-[11px] text-[#5c3e23]">
                <span>Nghĩa binh dự bị: <strong>{Math.max(0, cityTroops - (next.troops - cur.troops))}</strong></span>
                <span>Kiếm {Math.max(0, free.swords)}</span>
                <span>Giáo {Math.max(0, free.spears)}</span>
                <span>Cung {Math.max(0, free.bows)}</span>
                <span>Ngựa {Math.max(0, free.horses)}</span>
                <span>Voi {Math.max(0, free.elephants)}</span>
              </div>
              {!editable && (
                <div className="text-xs text-[#8c2d19] font-bold">Đạo quân đang ngoài chiến trường, không thể đổi biên chế.</div>
              )}
              {UNIT_CARDS.map(card => {
                const cfg = TACTICAL_UNIT_CONFIGS[card.key];
                const isSupplyCart = card.key === 'supply_cart';
                const branchMaxSoldiers = isSupplyCart
                  ? saved.supply_cart + Math.max(0, Math.min(cityTroops, Math.floor(resources.food / FOOD_PER_CART)))
                  : saved[card.key] + trainedRoster[card.key];
                const branchReserveLeft = Math.max(0, branchMaxSoldiers - draft[card.key]);
                return (
                  <div key={card.key} className="p-2 rounded border border-[#8c6b44]/30 bg-black/[0.04] flex items-center gap-3">
                    <img src={cfg.icon} alt={card.label} className="w-9 h-9 object-contain shrink-0 pointer-events-none" draggable={false} />
                    <div className="w-32 shrink-0 text-xs">
                      <div className="font-black flex items-center justify-between gap-1">
                        <span>{card.label}</span>
                        <span className="text-[10px] font-normal text-[#704d2e]">
                          {isSupplyCart ? 'Không cần luyện' : `Dự bị: ${branchReserveLeft}`}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#6b4423] leading-tight">{card.note}</div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(1, branchMaxSoldiers)}
                      value={draft[card.key]}
                      disabled={!editable || branchMaxSoldiers === 0}
                      onChange={e => setCount(card.key, Number(e.target.value))}
                      className="flex-1 accent-[#8c2d19] cursor-pointer"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        disabled={!editable}
                        onClick={() => setCount(card.key, draft[card.key] - 1)}
                        className="p-1 rounded border border-[#8c6b44]/40 bg-[#8c6b44]/15 cursor-pointer disabled:opacity-40"
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={draft[card.key]}
                        disabled={!editable}
                        onChange={e => setCount(card.key, Number(e.target.value))}
                        className="w-14 text-center text-xs p-0.5 rounded border border-[#8c6b44]/40 bg-[#f4e4bc]"
                      />
                      <button
                        disabled={!editable}
                        onClick={() => setCount(card.key, draft[card.key] + 1)}
                        className="p-1 rounded border border-[#8c6b44]/40 bg-[#8c6b44]/15 cursor-pointer disabled:opacity-40"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cột phải: xem trước 3 tuyến */}
            <div className="space-y-3 text-xs">
              <div className="p-2 rounded border border-[#8c6b44]/30 bg-black/[0.04] space-y-2">
                <div className="font-bold text-[#8c2d19] uppercase tracking-wider">Đội hình 3 tuyến</div>
                <LayerBar label="🛡️ Tuyến Tiền Phong" hp={layers.frontlineMaxHp} max={layers.frontlineMaxHp} color="#b45309" />
                <LayerBar label="🏹 Tuyến Hậu Phương" hp={layers.backlineMaxHp} max={layers.backlineMaxHp} color="#15803d" />
                <LayerBar label="🐎 Tuyến Cơ Động" hp={layers.flankMaxHp} max={layers.flankMaxHp} color="#7c3aed" />
              </div>
              <div className="p-2 rounded border border-[#8c6b44]/30 bg-black/[0.04] space-y-1">
                <div>Tổng quân: <strong className="text-[#b45309]">{next.troops.toLocaleString()}</strong> / {capacity.toLocaleString()}</div>
                <div>Tốc độ hành quân: <strong>×{speed.speedMultiplier.toFixed(2)}</strong></div>
                <div>Lương mang theo: <strong className="text-[#15803d]">{speed.maxSupplyDays} ngày</strong></div>
                <div>Tầm nhìn: <strong>{speed.visionRadiusPct}%</strong></div>
              </div>
              <button
                onClick={handleSave}
                disabled={!editable || !dirty}
                className="w-full py-2 rounded bg-[#8c2d19] hover:bg-[#6e1e0d] text-[#fef2d6] font-black uppercase tracking-wider text-xs shadow cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Lưu Biên Chế Đạo Quân
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

ArmyRosterModal.displayName = 'ArmyRosterModal';
