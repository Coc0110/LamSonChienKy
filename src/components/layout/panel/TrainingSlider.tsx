import React, { useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { notify } from '../../../store/dialogStore';
import { calculateTrainingDays, calculateTrainingWearCount } from '../../../store/slices/militarySlice';
import type { CityPopulation, General, Resources } from '../../../types';
import type { ArmyRosterCounts } from '../../../types/armyFormation';
import { TACTICAL_UNIT_CONFIGS } from '../../../types/armyFormation';
import { EMPTY_ROSTER, rosterTotal } from '../../../utils/armyCompositionUtils';

type UnitKey = keyof ArmyRosterCounts;

const TRAINING_BRANCHES: { key: UnitKey; label: string; weaponNote: string }[] = [
  { key: 'swordsman', label: 'Đao Khiên', weaponNote: '1 Kiếm' },
  { key: 'spearman', label: 'Giáo Binh', weaponNote: '1 Giáo' },
  { key: 'archer', label: 'Cung Nỏ', weaponNote: '1 Cung' },
  { key: 'cavalry', label: 'Kỵ Binh', weaponNote: '1 Kiếm + 1 Ngựa' },
  { key: 'elephant', label: 'Tượng Binh', weaponNote: '1 Giáo + 1 Voi' },
  { key: 'scout', label: 'Thám Mã', weaponNote: '1 Giáo + 1 Ngựa' },
  { key: 'supply_cart', label: 'Xe Lương', weaponNote: '0 vũ khí' },
];

interface TrainingSliderProps {
  population: CityPopulation;
  generals: General[];
  onConfirm: (
    generalId: string,
    count: number,
    swappedCount: number,
    days: number,
    targetRoster: Partial<ArmyRosterCounts>
  ) => void;
  onCancel: () => void;
  weaponsAvailable: number;
  resources: Pick<Resources, 'swords' | 'bows' | 'spears' | 'horses' | 'elephants'>;
}

export const TrainingSlider: React.FC<TrainingSliderProps> = ({
  population,
  generals,
  onConfirm,
  onCancel,
  weaponsAvailable,
  resources,
}) => {
  const { idleLaborers, farmLaborers, forgeLaborers, unfitPopulation, combatTroops } = population;
  const workingLaborers = farmLaborers + forgeLaborers;
  const totalSliderMax = idleLaborers + workingLaborers + unfitPopulation;

  // Giới hạn số tráng phu có thể huy động: không vượt quá nhàn rỗi + số nghĩa binh rảnh có thể thế chỗ
  const maxAllowed = Math.max(0, idleLaborers + Math.min(workingLaborers, combatTroops));

  const availSwords = Math.max(0, Math.floor(resources.swords));
  const availSpears = Math.max(0, Math.floor(resources.spears));
  const availBows = Math.max(0, Math.floor(resources.bows));
  const availHorses = Math.max(0, Math.floor(resources.horses));
  const availElephants = Math.max(0, Math.floor(resources.elephants));

  const [roster, setRoster] = useState<ArmyRosterCounts>(() => ({
    ...EMPTY_ROSTER,
    swordsman: Math.min(10, maxAllowed, availSwords),
  }));

  const [selectedGeneralId, setSelectedGeneralId] = useState<string>(generals[0]?.id || '');
  const effectiveGeneralId = generals.some(g => g.id === selectedGeneralId)
    ? selectedGeneralId
    : (generals[0]?.id || '');
  const selectedCoach = generals.find(g => g.id === effectiveGeneralId) || generals[0];

  const trainCount = rosterTotal(roster);
  const idleUsed = Math.min(trainCount, idleLaborers);
  const workingUsed = Math.max(0, trainCount - idleLaborers);
  const swappedCombatantsNeeded = workingUsed;
  const trainingDays = calculateTrainingDays(selectedCoach);

  const idlePercent = totalSliderMax > 0 ? (idleLaborers / totalSliderMax) * 100 : 0;
  const workingPercent = totalSliderMax > 0 ? (workingLaborers / totalSliderMax) * 100 : 0;
  const unfitPercent = totalSliderMax > 0 ? (unfitPopulation / totalSliderMax) * 100 : 0;

  const swordsUsed = roster.swordsman + roster.cavalry;
  const spearsUsed = roster.spearman + roster.elephant + roster.scout;
  const bowsUsed = roster.archer;
  const horsesUsed = roster.cavalry + roster.scout;
  const elephantsUsed = roster.elephant;
  const weaponsUsedTotal = swordsUsed + spearsUsed + bowsUsed;

  // Trần độc lập cho từng thanh kéo để kéo 1 binh chủng không làm trượt các thanh khác
  const independentCeiling = (key: UnitKey): number => {
    switch (key) {
      case 'swordsman':
        return Math.min(maxAllowed, availSwords);
      case 'spearman':
        return Math.min(maxAllowed, availSpears);
      case 'archer':
        return Math.min(maxAllowed, availBows);
      case 'cavalry':
        return Math.min(maxAllowed, availSwords, availHorses);
      case 'elephant':
        return Math.min(maxAllowed, availSpears, availElephants);
      case 'scout':
        return Math.min(maxAllowed, availSpears, availHorses);
      case 'supply_cart':
        return maxAllowed;
    }
  };

  const maxAllowedForBranchNow = (key: UnitKey): number => {
    const othersTotal = trainCount - roster[key];
    const remTroops = Math.max(0, maxAllowed - othersTotal);
    const remSwords = Math.max(0, availSwords - (swordsUsed - (key === 'swordsman' || key === 'cavalry' ? roster[key] : 0)));
    const remSpears = Math.max(
      0,
      availSpears - (spearsUsed - (key === 'spearman' || key === 'elephant' || key === 'scout' ? roster[key] : 0))
    );
    const remBows = Math.max(0, availBows - (bowsUsed - (key === 'archer' ? roster[key] : 0)));
    const remHorses = Math.max(0, availHorses - (horsesUsed - (key === 'cavalry' || key === 'scout' ? roster[key] : 0)));
    const remElephants = Math.max(0, availElephants - (elephantsUsed - (key === 'elephant' ? roster[key] : 0)));

    switch (key) {
      case 'swordsman':
        return Math.min(remTroops, remSwords);
      case 'spearman':
        return Math.min(remTroops, remSpears);
      case 'archer':
        return Math.min(remTroops, remBows);
      case 'cavalry':
        return Math.min(remTroops, remSwords, remHorses);
      case 'elephant':
        return Math.min(remTroops, remSpears, remElephants);
      case 'scout':
        return Math.min(remTroops, remSpears, remHorses);
      case 'supply_cart':
        return remTroops;
    }
  };

  const setBranchCount = (key: UnitKey, raw: number) => {
    const limit = maxAllowedForBranchNow(key);
    const clamped = Math.max(0, Math.min(limit, Math.floor(raw) || 0));
    setRoster(prev => ({ ...prev, [key]: clamped }));
  };

  const stockDisplayFor = (key: UnitKey): string => {
    switch (key) {
      case 'swordsman':
        return `Kiếm tồn: ${availSwords}`;
      case 'spearman':
        return `Giáo tồn: ${availSpears}`;
      case 'archer':
        return `Cung tồn: ${availBows}`;
      case 'cavalry':
        return `Kiếm: ${availSwords} • Ngựa: ${availHorses}`;
      case 'elephant':
        return `Giáo: ${availSpears} • Voi: ${availElephants}`;
      case 'scout':
        return `Giáo: ${availSpears} • Ngựa: ${availHorses}`;
      case 'supply_cart':
        return 'Không cần vũ khí';
    }
  };

  const isWeaponShortage =
    swordsUsed > availSwords ||
    spearsUsed > availSpears ||
    bowsUsed > availBows ||
    horsesUsed > availHorses ||
    elephantsUsed > availElephants;

  return (
    <div className="p-3.5 rounded-lg bg-[#8c6b44]/10 border border-[#8c6b44]/40 text-[#261304] space-y-3 font-serif">
      {/* Tiêu đề mục */}
      <div className="flex items-center justify-between border-b border-[#8c6b44]/30 pb-2">
        <span className="font-serif font-black text-sm tracking-wide text-[#8c2d19]">
          Hạ Lệnh Thao Luyện Theo Binh Chủng
        </span>
        <button
          onClick={onCancel}
          className="text-[#6e4927] hover:text-[#261304] transition p-1 hover:bg-[#8c6b44]/15 rounded cursor-pointer"
          title="Hủy bỏ"
        >
          <X size={16} />
        </button>
      </div>

      {/* 1. Chọn Tướng Phụ Trách */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-[#6b4423]">
          Vị Tướng Phụ Trách Huấn Luyện:
        </label>
        {generals.length === 0 ? (
          <div className="p-2 rounded bg-[#8c2d19]/10 border border-[#8c2d19]/30 text-xs text-[#8c2d19]">
            Không có tướng lĩnh rảnh rỗi tại căn cứ (toàn bộ tướng đều đang chỉ huy đạo quân).
          </div>
        ) : (
          <select
            value={effectiveGeneralId}
            onChange={(e) => setSelectedGeneralId(e.target.value)}
            className="w-full bg-[#fdf8f0] border border-[#8c6b44]/40 text-[#261304] rounded px-2.5 py-1.5 text-xs font-serif font-bold focus:outline-none focus:ring-1 focus:ring-[#8c2d19]"
          >
            {generals.map(g => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.title}) — Thống {g.stats.command} / Võ {g.stats.martial}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 2. Tổng quan nhân lực 3 màu */}
      <div className="space-y-1.5 pt-0.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#261304]">
            Tổng tráng đinh thao luyện: <strong className="text-[#8c2d19] text-sm">{trainCount}</strong> / {maxAllowed} người
          </span>
          <span className="text-[11px] text-[#6b4423]">
            Thời gian: <strong className="text-[#15803d]">{trainingDays} ngày</strong>
          </span>
        </div>

        <div className="relative w-full h-2.5 rounded-full overflow-hidden flex border border-[#8c6b44]/40 bg-[#dfceb7] shadow-inner">
          <div style={{ width: `${idlePercent}%` }} className="h-full bg-[#15803d]" />
          <div style={{ width: `${workingPercent}%` }} className="h-full bg-[#b45309]" />
          <div style={{ width: `${unfitPercent}%` }} className="h-full bg-[#78716c] border-l border-[#57534e]/40" />
        </div>

        <div className="flex items-center justify-between text-[10px] text-[#261304]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-[#15803d] inline-block" />
            Rảnh: {idleLaborers}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-[#b45309] inline-block" />
            Đang làm: {workingLaborers}
          </span>
          <span className="flex items-center gap-1 text-[#704d2e]">
            <span className="w-2 h-2 rounded-xs bg-[#78716c] inline-block" />
            Không luyện: {unfitPopulation}
          </span>
        </div>
      </div>

      {/* 3. Chọn số lượng huấn luyện từng binh chủng + kho vũ khí tồn */}
      <div className="space-y-1.5">
        {TRAINING_BRANCHES.map(branch => {
          const cfg = TACTICAL_UNIT_CONFIGS[branch.key];
          const ceiling = independentCeiling(branch.key);
          const current = roster[branch.key];
          return (
            <div
              key={branch.key}
              className="p-2 rounded border border-[#8c6b44]/30 bg-[#fdf8f0]/65 flex items-center gap-2"
            >
              <img
                src={cfg.icon}
                alt={branch.label}
                className="w-7 h-7 object-contain shrink-0 pointer-events-none"
                draggable={false}
              />
              <div className="w-28 shrink-0">
                <div className="text-[11px] font-black leading-tight">{branch.label}</div>
                <div className="text-[10px] text-[#6b4423] leading-tight">
                  {stockDisplayFor(branch.key)}
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(1, ceiling)}
                value={current}
                disabled={ceiling === 0}
                onChange={e => setBranchCount(branch.key, Number(e.target.value))}
                className="flex-1 accent-[#8c2d19] cursor-pointer disabled:opacity-40"
              />
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setBranchCount(branch.key, current - 1)}
                  disabled={current <= 0}
                  className="p-0.5 rounded border border-[#8c6b44]/40 bg-[#8c6b44]/15 cursor-pointer disabled:opacity-40"
                >
                  <Minus size={11} />
                </button>
                <input
                  type="number"
                  min={0}
                  max={ceiling}
                  value={current}
                  onChange={e => setBranchCount(branch.key, Number(e.target.value))}
                  className="w-11 text-center text-[11px] p-0.5 rounded border border-[#8c6b44]/40 bg-[#f4e4bc]"
                />
                <button
                  type="button"
                  onClick={() => setBranchCount(branch.key, current + 1)}
                  disabled={current >= maxAllowedForBranchNow(branch.key)}
                  className="p-0.5 rounded border border-[#8c6b44]/40 bg-[#8c6b44]/15 cursor-pointer disabled:opacity-40"
                >
                  <Plus size={11} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Diễn giải tác động chiến lược */}
      <div className="text-xs leading-relaxed p-2.5 rounded-lg bg-[#8c6b44]/5 border border-[#8c6b44]/25 space-y-1.5 text-[#261304]">
        {workingUsed > 0 ? (
          <div className="text-[#b45309]">
            * Cảnh báo sản xuất: Điều động <strong>{idleUsed}</strong> tráng phu nhàn rỗi và rút <strong>{workingUsed}</strong> tráng phu đang làm việc → Cắt cử <strong>{swappedCombatantsNeeded} Nghĩa Binh</strong> dày dạn thế chỗ cày cấy / rèn đúc!
          </div>
        ) : (
          <div className="text-[#15803d]">
            * Điều động an toàn: Huấn luyện <strong>{idleUsed}</strong> tráng phu nhàn rỗi, không làm gián đoạn sản xuất.
          </div>
        )}

        <div className="text-[11px] text-[#6b4423] pt-1 border-t border-[#8c6b44]/20 space-y-0.5">
          <div>
            Binh khí tạm xuất: <strong className={isWeaponShortage ? 'text-[#8c2d19]' : 'text-[#261304]'}>{weaponsUsedTotal} món</strong>
            {' '}(Kiếm {swordsUsed}/{availSwords} • Giáo {spearsUsed}/{availSpears} • Cung {bowsUsed}/{availBows} — Tổng kho: {weaponsAvailable})
          </div>
          <div className="text-[10px] text-[#7a5430]">
            * Hoàn trả về kho sau khi luyện xong (chỉ hao mòn tối đa ~{calculateTrainingWearCount(weaponsUsedTotal)} món).
          </div>
        </div>
      </div>

      {/* 5. Nút bấm thao tác */}
      <div className="flex items-center gap-2 pt-1 font-serif">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg bg-[#8c6b44]/15 hover:bg-[#8c6b44]/25 text-[#6e4927] font-serif font-bold text-xs border border-[#8c6b44]/35 transition cursor-pointer"
        >
          Hủy Bỏ
        </button>
        <button
          onClick={() => {
            if (generals.length === 0 || !effectiveGeneralId) {
              notify.error('Cần có một vị tướng rảnh rỗi tại căn cứ để chủ trì thao luyện!');
              return;
            }
            if (trainCount <= 0) {
              notify.warning('Vui lòng chọn ít nhất 1 binh sĩ để thao luyện!');
              return;
            }
            if (isWeaponShortage) {
              notify.error('Binh khí hoặc chiến mã/voi trong kho không đủ cho cơ cấu binh chủng đã chọn!');
              return;
            }
            onConfirm(effectiveGeneralId, trainCount, swappedCombatantsNeeded, trainingDays, roster);
          }}
          disabled={isWeaponShortage || generals.length === 0 || trainCount <= 0}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center font-serif font-black text-xs uppercase tracking-wider shadow transition cursor-pointer ${
            isWeaponShortage || generals.length === 0 || trainCount <= 0
              ? 'bg-[#78716c]/40 text-[#57534e] border border-[#78716c]/40 cursor-not-allowed'
              : 'bg-[#8c2d19] hover:bg-[#6e1e0d] text-[#fff3db] active:scale-95'
          }`}
        >
          <span>Hạ Lệnh Thao Luyện ({trainCount})</span>
        </button>
      </div>
    </div>
  );
};
