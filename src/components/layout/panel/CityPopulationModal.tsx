import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import type { CityNode, General } from '../../../types';
import type { ArmyRosterCounts } from '../../../types/armyFormation';
import { TrainingSlider } from './TrainingSlider';
import { UI_TEXT } from '../../../data/uiText';
import { formatRemainingDays } from '../../../utils/formatters';

interface CityPopulationModalProps {
  city: CityNode;
  generals: General[];
  weaponsAvailable: number;
  onStartTraining: (
    cityId: string,
    generalId: string,
    count: number,
    swappedCount: number,
    days: number,
    targetRoster?: Partial<ArmyRosterCounts>
  ) => void;
  onCancelTraining: (cityId: string) => void;
  onClose: () => void;
}

export const CityPopulationModal: React.FC<CityPopulationModalProps> = ({
  city,
  generals,
  weaponsAvailable,
  onStartTraining,
  onCancelTraining,
  onClose,
}) => {
  const [isSliderOpen, setIsSliderOpen] = useState(false);
  const structures = useGameStore(state => state.structures);
  const formations = useGameStore(state => state.formations);
  const resources = useGameStore(state => state.resources);

  const pop = city.population || {
    combatTroops: city.troops,
    idleLaborers: 0,
    farmLaborers: 0,
    forgeLaborers: 0,
    swappedCombatants: 0,
    unfitPopulation: 0,
  };

  const formationTroops = useMemo(() => {
    return formations
      .filter(f => f.cityId === city.id)
      .reduce((acc, f) => acc + (f.totalTroops || 0), 0);
  }, [formations, city.id]);

  const builderWorkers = useMemo(() => {
    return structures
      .filter(s => s.cityId === city.id && s.status === 'building')
      .reduce((acc, s) => acc + (s.builderWorkers || 0), 0);
  }, [structures, city.id]);

  const training = city.training;
  const trainingGeneral = training ? generals.find(g => g.id === training.generalId) : null;

  // Lọc các tướng đang dẫn quân (commander hoặc assigned trong bất kỳ formation nào)
  const commandingGeneralIds = useMemo(() => {
    const ids = new Set<string>();
    formations.forEach(f => {
      if (f.commanderGeneralId) ids.add(f.commanderGeneralId);
      if (f.assignedGeneralIds && Array.isArray(f.assignedGeneralIds)) {
        f.assignedGeneralIds.forEach(id => ids.add(id));
      }
    });
    return ids;
  }, [formations]);

  const availableGenerals = useMemo(
    () => generals.filter(g => !commandingGeneralIds.has(g.id)),
    [generals, commandingGeneralIds]
  );

  const totalPop =
    pop.combatTroops +
    pop.idleLaborers +
    pop.farmLaborers +
    pop.forgeLaborers +
    (pop.swappedCombatants || 0) +
    pop.unfitPopulation +
    (training?.traineesCount || 0) +
    builderWorkers +
    formationTroops;

  return (
    <div className="fixed inset-x-3 bottom-3 md:inset-auto md:absolute md:top-[82px] md:left-[98px] z-40 md:w-[480px] max-h-[85vh] flex flex-col pointer-events-auto transition-all duration-300 select-none filter drop-shadow-[0_18px_30px_rgba(0,0,0,0.7)] drop-shadow-[0_3px_8px_rgba(0,0,0,0.45)]">
      <img
        src="/parchment_torn_panel.png"
        alt="Sớ Thao Luyện"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
        draggable={false}
      />
      
      <div className="relative z-10 p-5 md:p-6 flex flex-col h-full font-serif text-[#261304] overflow-y-auto no-scrollbar space-y-3">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-[#8c6b44]/35 pb-2.5">
          <div>
            <h2 className="font-serif font-black text-base text-[#261304] tracking-wide">
              {UI_TEXT.trainingPanel.title(city.name)}
            </h2>
            <p className="text-[11px] text-[#704d2e] font-serif">
              Tổng nhân khẩu: {totalPop} người
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#6e4927] hover:text-[#261304] transition p-1 hover:bg-[#8c6b44]/15 rounded cursor-pointer"
            title="Đóng bảng"
          >
            <X size={18} />
          </button>
        </div>

        {/* 1. KHỐI THỐNG KÊ CHI TIẾT DẠNG BÁO CÁO CÔNG VĂN (DÒNG CHẢY DỌC TOÀN TRANG, KHÔNG CHIA ĐÔI CỘT) */}
        <div className="flex flex-col gap-2.5 font-serif">
          {/* Mục 1: Nghĩa Binh */}
          <div className="p-3 rounded-lg border border-[#8c6b44]/30 bg-[#8c6b44]/5 flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between border-b border-[#8c6b44]/20 pb-1">
              <h4 className="font-serif font-black text-sm text-[#8c2d19] tracking-wide">
                Nghĩa Binh
              </h4>
              <strong className="text-sm font-bold text-[#8c2d19]">
                {pop.combatTroops + formationTroops} người
              </strong>
            </div>
            <ul className="space-y-1.5 text-xs text-[#261304] border-l-2 border-[#8c2d19]/40 pl-3 py-0.5">
              <li>
                <span className="text-[#6b4423]">Tại trại: </span>
                <strong className="text-[#261304] font-bold">{pop.combatTroops} người</strong>
              </li>
              {formationTroops > 0 && (
                <li>
                  <span className="text-[#6b4423]">Biên chế: </span>
                  <strong className="text-[#b45309] font-bold">{formationTroops} người</strong>
                </li>
              )}
            </ul>
          </div>

          {/* Mục 2: Tráng Phu & Hậu Cần */}
          <div className="p-3 rounded-lg border border-[#8c6b44]/30 bg-[#8c6b44]/5 flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between border-b border-[#8c6b44]/20 pb-1">
              <h4 className="font-serif font-black text-sm text-[#8c2d19] tracking-wide">
                Tráng Phu & Hậu Cần
              </h4>
            </div>
            <ul className="space-y-1.5 text-xs text-[#261304] border-l-2 border-[#8c2d19]/40 pl-3 py-0.5">
              <li>
                <span className="text-[#6b4423]">Rảnh rỗi: </span>
                <strong className="text-[#15803d] font-bold">{pop.idleLaborers} người</strong>
              </li>
              <li>
                <span className="text-[#6b4423]">Nông đinh: </span>
                <strong className="text-[#b45309] font-bold">{pop.farmLaborers} người</strong>
              </li>
              <li>
                <span className="text-[#6b4423]">Rèn đúc: </span>
                <strong className="text-[#8c2d19] font-bold">{pop.forgeLaborers} người</strong>
              </li>
              <li>
                <span className="text-[#6b4423]">Lão, Ấu: </span>
                <span className="text-[#704d2e] font-bold">{pop.unfitPopulation} người</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 2. KHỐI THAO LUYỆN (Hoặc Đang Diễn Ra, Hoặc Nút Bấm Mở Slider) */}
        {training ? (
          /* Đang trong quá trình thao luyện */
          <div className="p-3.5 rounded-lg border border-[#8c6b44]/35 bg-[#8c6b44]/5 space-y-2 font-serif text-xs">
            <div className="flex items-center justify-between border-b border-[#8c6b44]/20 pb-1">
              <h4 className="font-bold text-sm text-[#8c2d19]">
                Tiến Trình Thao Luyện
              </h4>
              <span className="text-xs px-2 py-0.5 rounded bg-[#8c2d19]/15 text-[#8c2d19] font-bold">
                Còn {formatRemainingDays(training.remainingDays)} / {training.totalDays} ngày
              </span>
            </div>

            <ul className="space-y-1 text-xs text-[#261304] border-l-2 border-[#8c2d19]/40 pl-3 py-0.5">
              <li>
                <span className="text-[#6b4423]">Tân binh thao luyện: </span>
                <strong className="font-bold text-[#b45309]">{training.traineesCount} tráng đinh</strong>
              </li>
              <li>
                <span className="text-[#6b4423]">Vị tướng phụ trách: </span>
                <strong className="text-[#261304] font-bold">{trainingGeneral?.name || 'Chưa chỉ định'}</strong>
              </li>
            </ul>

            {/* Thanh tiến độ */}
            <div className="w-full h-2 rounded-full bg-stone-900/20 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-[#8c2d19] transition-all duration-300"
                style={{
                  width: `${((training.totalDays - training.remainingDays) / training.totalDays) * 100}%`
                }}
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => onCancelTraining(city.id)}
                className="text-xs text-[#8c2d19] hover:underline cursor-pointer"
              >
                {UI_TEXT.trainingPanel.cancelTrainingBtn}
              </button>
            </div>
          </div>
        ) : isSliderOpen ? (
          /* Giao diện Thanh Kéo 3 Màu */
          <TrainingSlider
            population={pop}
            generals={availableGenerals}
            weaponsAvailable={weaponsAvailable}
            resources={resources}
            onCancel={() => setIsSliderOpen(false)}
            onConfirm={(genId, count, swapped, days, targetRoster) => {
              onStartTraining(city.id, genId, count, swapped, days, targetRoster);
              setIsSliderOpen(false);
            }}
          />
        ) : (
          /* Nút mở thao luyện */
          availableGenerals.length === 0 ? (
            <div className="pt-1 flex flex-col gap-1 font-serif border border-[#8c6b44]/35 bg-[#8c6b44]/10 rounded-lg p-2.5 text-center">
              <p className="text-xs font-bold text-[#8c2d19]">
                Cần có tướng rảnh rỗi tại căn cứ để chủ trì thao luyện.
              </p>
            </div>
          ) : (
            <div className="pt-1 flex justify-end font-serif">
              <button
                onClick={() => setIsSliderOpen(true)}
                className="w-full py-2.5 rounded-lg bg-[#8c2d19] hover:bg-[#6e1e0d] text-[#fff3db] font-serif font-black text-xs uppercase tracking-wider shadow transition cursor-pointer active:scale-95 text-center"
              >
                <span>{UI_TEXT.trainingPanel.startTrainingBtn}</span>
              </button>
            </div>
          )
        )}

      </div>
    </div>
  );
};
