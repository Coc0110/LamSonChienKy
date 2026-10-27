import React, { useState } from 'react';
import { Users, Swords, Clock, X, AlertCircle } from 'lucide-react';
import type { CityNode, General } from '../../../types';
import { TrainingSlider } from './TrainingSlider';

interface CityPopulationModalProps {
  city: CityNode;
  generals: General[];
  weaponsAvailable: number;
  onStartTraining: (cityId: string, generalId: string, count: number, swappedCount: number, days: number) => void;
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
  const pop = city.population || {
    combatTroops: city.troops,
    idleLaborers: 0,
    farmLaborers: 0,
    forgeLaborers: 0,
    swappedCombatants: 0,
    unfitPopulation: 0,
  };

  const totalPop =
    pop.combatTroops +
    pop.idleLaborers +
    pop.farmLaborers +
    pop.forgeLaborers +
    pop.unfitPopulation;

  const training = city.training;
  const trainingGeneral = training ? generals.find(g => g.id === training.generalId) : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 pointer-events-auto">
      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden border-2 border-[#b89158] shadow-[0_20px_60px_rgba(0,0,0,0.85)] bg-gradient-to-br from-[#2a1a0e] via-[#1f130a] to-[#140b05] text-[#f7ecd7] p-5 space-y-4">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-[#6e4622] pb-3">
          <div className="flex items-center gap-2.5">
            <Users className="text-[#f59e0b]" size={22} />
            <div>
              <h2 className="font-serif font-black text-lg text-[#f5e2c4] tracking-wide">
                Tổng Quản Binh Lực & Dân Cư — {city.name}
              </h2>
              <p className="text-xs text-[#b8956e] font-sans">
                Tổng nhân khẩu quy tụ: <strong className="text-amber-300 font-bold">{totalPop}</strong> người
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-black/40 text-stone-400 hover:text-white transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* 1. KHỐI THỐNG KÊ CHI TIẾT 3 TẦNG NHÂN LỰC */}
        <div className="grid grid-cols-2 gap-3 font-sans">
          {/* Cột 1: Nghĩa Binh (Chiến đấu) */}
          <div className="p-3 rounded-xl bg-[#362111] border border-[#7a4c25] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-amber-200/90 font-bold">
                <span className="flex items-center gap-1.5">
                  <Swords size={15} className="text-red-400" />
                  Nghĩa Binh (Chiến binh)
                </span>
              </div>
              <div className="mt-1 text-2xl font-black text-amber-300">
                {pop.combatTroops}{' '}
                <span className="text-xs font-normal text-stone-300">người</span>
              </div>
            </div>

            {pop.swappedCombatants > 0 && (
              <div className="text-[11px] text-amber-400/90 mt-1.5 flex items-center gap-1 bg-amber-950/40 p-1.5 rounded">
                <AlertCircle size={13} className="shrink-0" />
                <span>{pop.swappedCombatants} nghĩa binh đang thế chỗ cày cấy/rèn đúc</span>
              </div>
            )}
          </div>

          {/* Cột 2: Tráng Phu & Dân cư */}
          <div className="p-3 rounded-xl bg-[#362111] border border-[#7a4c25] shadow-xs space-y-1.5">
            <div className="text-xs text-amber-200/90 font-bold flex items-center gap-1.5">
              <Users size={15} className="text-emerald-400" />
              <span>Tráng Phu & Hậu Cần</span>
            </div>
            
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-stone-300">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-xs bg-emerald-500 inline-block" />
                  Rảnh rỗi:
                </span>
                <strong className="text-emerald-400">{pop.idleLaborers} người</strong>
              </div>
              <div className="flex justify-between text-stone-300">
                <span className="flex items-center gap-1">
                  <img src="/icons/structure_farm.png" alt="Ruộng" className="w-3.5 h-3.5 object-contain inline-block" />
                  Cày cấy đồn điền:
                </span>
                <strong className="text-amber-300">{pop.farmLaborers} người</strong>
              </div>
              <div className="flex justify-between text-stone-300">
                <span className="flex items-center gap-1">
                  <img src="/icons/structure_forge.png" alt="Lò rèn" className="w-3.5 h-3.5 object-contain inline-block" />
                  Rèn đúc vũ khí:
                </span>
                <strong className="text-sky-300">{pop.forgeLaborers} người</strong>
              </div>
              <div className="flex justify-between text-stone-400 pt-1 border-t border-[#4a2e18]">
                <span>Phi chiến đấu (già, trẻ, gái):</span>
                <span>{pop.unfitPopulation} người</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. KHỐI THAO LUYỆN (Hoặc Đang Diễn Ra, Hoặc Nút Bấm Mở Slider) */}
        {training ? (
          /* Đang trong quá trình thao luyện */
          <div className="p-3.5 rounded-xl bg-[#2b170c] border border-amber-600/80 shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <Clock size={16} className="text-amber-400 animate-spin-slow" />
                <span>Đang Thao Luyện: {training.traineesCount} tráng đinh</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-amber-900/60 text-amber-200 font-bold">
                Còn {training.remainingDays} / {training.totalDays} ngày
              </span>
            </div>

            <p className="text-xs text-stone-300 font-sans leading-relaxed">
              Vị tướng phụ trách: <strong className="text-amber-200">{trainingGeneral?.name || 'Vị tướng'}</strong> đang ngày đêm truyền dạy cung kiếm, quyền cước cho nghĩa sĩ bí mật trong rừng.
            </p>

            {/* Thanh tiến độ */}
            <div className="w-full h-2 rounded-full bg-stone-900 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300"
                style={{
                  width: `${((training.totalDays - training.remainingDays) / training.totalDays) * 100}%`
                }}
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => onCancelTraining(city.id)}
                className="text-xs text-red-400 hover:text-red-300 underline cursor-pointer"
              >
                Hủy bỏ đợt thao luyện (Hoàn trả khí giới)
              </button>
            </div>
          </div>
        ) : isSliderOpen ? (
          /* Giao diện Thanh Kéo 3 Màu */
          <TrainingSlider
            population={pop}
            generals={generals}
            weaponsAvailable={weaponsAvailable}
            onCancel={() => setIsSliderOpen(false)}
            onConfirm={(genId, count, swapped, days) => {
              onStartTraining(city.id, genId, count, swapped, days);
              setIsSliderOpen(false);
            }}
          />
        ) : (
          /* Nút mở thao luyện */
          <div className="pt-1 flex items-center justify-between gap-3">
            <div className="text-xs text-stone-300 font-sans">
              Có <strong className="text-emerald-400">{pop.idleLaborers}</strong> tráng phu nhàn rỗi sẵn sàng tiếp nhận cung kiếm để học võ.
            </div>
            <button
              onClick={() => setIsSliderOpen(true)}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#991b1b] to-[#7f1d1d] hover:brightness-110 text-amber-100 font-serif font-black text-sm uppercase tracking-wider border border-[#b91c1c] shadow-lg flex items-center gap-1.5 transition cursor-pointer"
            >
              <Swords size={16} />
              <span>Thao Luyện Nghĩa Binh</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
