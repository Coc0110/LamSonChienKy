import React, { useState } from 'react';
import { Swords, AlertTriangle, Shield, Check, X } from 'lucide-react';
import type { CityPopulation, General } from '../../../types';

interface TrainingSliderProps {
  population: CityPopulation;
  generals: General[];
  onConfirm: (generalId: string, count: number, swappedCount: number, days: number) => void;
  onCancel: () => void;
  weaponsAvailable: number;
}

export const TrainingSlider: React.FC<TrainingSliderProps> = ({
  population,
  generals,
  onConfirm,
  onCancel,
  weaponsAvailable,
}) => {
  const { idleLaborers, farmLaborers, forgeLaborers, unfitPopulation, combatTroops } = population;
  const workingLaborers = farmLaborers + forgeLaborers;
  const totalTrainable = idleLaborers + workingLaborers;
  const totalSliderMax = idleLaborers + workingLaborers + unfitPopulation;

  // Giới hạn số người có thể lấy: không vượt quá số tráng phu nhàn rỗi + số nghĩa binh có thể thế chỗ
  const maxAllowed = idleLaborers + Math.min(workingLaborers, combatTroops);

  // Mặc định chọn kéo hết số tráng phu rảnh rỗi (hoặc 10 nếu có)
  const initialCount = Math.min(Math.max(1, idleLaborers), weaponsAvailable > 0 ? weaponsAvailable : 1);
  const [trainCount, setTrainCount] = useState<number>(initialCount);

  // Chọn tướng phụ trách
  const [selectedGeneralId, setSelectedGeneralId] = useState<string>(
    generals.length > 0 ? generals[0].id : 'le_loi'
  );

  const selectedCoach = generals.find(g => g.id === selectedGeneralId) || generals[0];

  // Tính số lượng rơi vào từng vùng màu
  const idleUsed = Math.min(trainCount, idleLaborers);
  const workingUsed = Math.max(0, trainCount - idleLaborers);
  const swappedCombatantsNeeded = workingUsed;

  // Tính thời gian thao luyện dựa trên Thống Lĩnh và Võ Nghệ của tướng
  // Thống lĩnh cao + võ nghệ cao => thao luyện nhanh hơn
  const baseDays = 25;
  const generalSkill = selectedCoach
    ? (selectedCoach.stats.command * 0.6 + selectedCoach.stats.martial * 0.4)
    : 75;
  const trainingDays = Math.max(8, Math.round(baseDays - ((generalSkill - 70) * 0.35)));

  // Tính phần trăm các vùng trên thanh trượt
  const idlePercent = totalSliderMax > 0 ? (idleLaborers / totalSliderMax) * 100 : 0;
  const workingPercent = totalSliderMax > 0 ? (workingLaborers / totalSliderMax) * 100 : 0;
  const unfitPercent = totalSliderMax > 0 ? (unfitPopulation / totalSliderMax) * 100 : 0;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = Number(e.target.value);
    // Tuyệt đối không cho kéo vào vùng màu đen (người già, phụ nữ, trẻ nhỏ)
    if (val > totalTrainable) val = totalTrainable;
    // Không thể rút tráng phu đang làm việc nếu không đủ nghĩa binh thế chỗ
    if (val > maxAllowed) val = maxAllowed;
    // Không thể kéo vượt quá số khí giới sẵn có
    if (weaponsAvailable > 0 && val > weaponsAvailable) val = weaponsAvailable;
    setTrainCount(val);
  };

  const isWeaponShortage = trainCount > weaponsAvailable;

  return (
    <div className="p-3.5 rounded-xl bg-[#26170c] border border-[#a87c4f] shadow-xl text-[#f7ecd7] space-y-3.5">
      <div className="flex items-center justify-between border-b border-[#59391e] pb-2">
        <div className="flex items-center gap-2">
          <Swords size={18} className="text-[#f59e0b]" />
          <span className="font-serif font-black text-sm tracking-wide text-amber-200">
            Hạ Lệnh Thao Luyện Nghĩa Binh
          </span>
        </div>
        <button
          onClick={onCancel}
          className="text-stone-400 hover:text-white transition p-1"
        >
          <X size={16} />
        </button>
      </div>

      {/* 1. Chọn Tướng Phụ Trách */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-stone-300">
          Vị Tướng Phụ Trách Huấn Luyện:
        </label>
        <select
          value={selectedGeneralId}
          onChange={(e) => setSelectedGeneralId(e.target.value)}
          className="w-full bg-[#3d2514] border border-[#7a4e28] text-amber-100 rounded px-2.5 py-1.5 text-xs font-serif font-bold focus:outline-none focus:ring-1 focus:ring-amber-400"
        >
          {generals.map(g => (
            <option key={g.id} value={g.id}>
              {g.name} ({g.title}) — Thống {g.stats.command} / Võ {g.stats.martial}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Thanh trượt 3 màu trực quan */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-stone-200">
            Số tráng đinh thao luyện: <strong className="text-amber-300 text-sm font-sans">{trainCount}</strong> người
          </span>
          <span className="text-[11px] text-stone-400 font-sans">
            Thời gian: <strong className="text-emerald-400">{trainingDays} ngày</strong>
          </span>
        </div>

        {/* Thanh màu nền đa phân đoạn (Multi-color bar) */}
        <div className="relative w-full h-3.5 rounded-full overflow-hidden flex border border-[#59391e] shadow-inner bg-stone-900">
          {/* Vùng Xanh Lá: Tráng phu rảnh rỗi */}
          <div
            style={{ width: `${idlePercent}%` }}
            className="h-full bg-emerald-600 transition-all"
            title={`Tráng phu rảnh rỗi: ${idleLaborers} người`}
          />
          {/* Vùng Cam: Tráng phu đang có việc (cày ruộng, rèn đúc) */}
          <div
            style={{ width: `${workingPercent}%` }}
            className="h-full bg-amber-600 transition-all"
            title={`Tráng phu đang làm việc: ${workingLaborers} người (Nghĩa binh sẽ thế chỗ)`}
          />
          {/* Vùng Đen: Không thể huấn luyện (người già, phụ nữ, trẻ nhỏ) */}
          <div
            style={{ width: `${unfitPercent}%` }}
            className="h-full bg-stone-800 border-l border-stone-700"
            title={`Dân cư phi chiến đấu: ${unfitPopulation} người (Không thể thao luyện)`}
          />
        </div>

        {/* Chú giải 3 màu */}
        <div className="flex items-center justify-between text-[10px] text-stone-300 pt-0.5">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
            <span>Rảnh: {idleLaborers}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-600 inline-block" />
            <span>Đang làm: {workingLaborers}</span>
          </span>
          <span className="flex items-center gap-1 text-stone-400">
            <span className="w-2.5 h-2.5 rounded-xs bg-stone-800 border border-stone-600 inline-block" />
            <span>Không luyện: {unfitPopulation}</span>
          </span>
        </div>

        {/* Input Range kéo */}
        <input
          type="range"
          min="1"
          max={totalTrainable > 0 ? totalTrainable : 1}
          value={trainCount}
          onChange={handleSliderChange}
          className="w-full accent-amber-500 cursor-pointer h-2 bg-stone-800 rounded-lg"
        />
      </div>

      {/* 3. Diễn giải tác động chiến lược */}
      <div className="text-[11px] leading-relaxed p-2.5 rounded-lg bg-[#1c1108] border border-[#59391e]/60 space-y-1">
        {workingUsed > 0 ? (
          <div className="text-amber-300 flex items-start gap-1.5 font-sans">
            <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-400" />
            <span>
              Kéo lấn vào vùng Cam: Dùng <strong>{idleUsed}</strong> tráng phu nhàn rỗi và rút <strong>{workingUsed}</strong> tráng phu đang làm việc $\rightarrow$ Điều động <strong>{swappedCombatantsNeeded} Nghĩa Binh</strong> thế chỗ cày cấy/rèn đúc để duy trì sản xuất!
            </span>
          </div>
        ) : (
          <div className="text-emerald-300 flex items-center gap-1.5 font-sans">
            <Shield size={14} className="text-emerald-400" />
            <span>
              Vùng Xanh an toàn: Huấn luyện <strong>{idleUsed}</strong> tráng phu nhàn rỗi, không làm gián đoạn sản xuất đồn điền.
            </span>
          </div>
        )}

        <div className="text-[11px] text-stone-400 pt-1 border-t border-stone-800 flex justify-between">
          <span>Khí giới tiêu tốn: <strong className={isWeaponShortage ? 'text-red-400' : 'text-stone-200'}>{trainCount} món</strong> (Hiện có: {weaponsAvailable})</span>
        </div>
      </div>

      {/* 4. Nút bấm Xác nhận */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 py-1.5 rounded-lg bg-[#3d2514] hover:bg-[#4a2e18] text-stone-300 font-sans font-bold text-xs border border-[#6e4321] transition cursor-pointer"
        >
          Hủy Bỏ
        </button>
        <button
          onClick={() => {
            if (isWeaponShortage) {
              alert('Khí giới trong kho không đủ để trang bị cho đợt thao luyện này!');
              return;
            }
            onConfirm(selectedGeneralId, trainCount, swappedCombatantsNeeded, trainingDays);
          }}
          disabled={isWeaponShortage}
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 font-sans font-bold text-xs uppercase tracking-wider shadow-md transition cursor-pointer ${
            isWeaponShortage
              ? 'bg-stone-700 text-stone-400 border border-stone-600 cursor-not-allowed'
              : 'bg-gradient-to-r from-[#991b1b] to-[#7f1d1d] hover:brightness-110 text-amber-100 border border-[#b91c1c]'
          }`}
        >
          <Check size={14} />
          <span>Hạ Lệnh Thao Luyện</span>
        </button>
      </div>
    </div>
  );
};
